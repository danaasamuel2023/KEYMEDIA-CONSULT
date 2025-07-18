// routes/orders.js - Complete updated file with DataWorks API integration
const express = require('express');
const axios = require('axios');
const router = express.Router();
const mongoose = require('mongoose');

// Import models directly - more reliable approach
const { Order, Bundle, User, Transaction } = require('../schema/schema');
const AdminSettings = require('../AdminSettingSchema/AdminSettings.js');

// Import middleware
const auth = require('../AuthMiddle/middlewareauth.js');
const adminAuth = require('../adminMiddlware/middleware.js');

// mNotify SMS configuration - FIXED with working API key
const SMS_CONFIG = {
  API_KEY: process.env.MNOTIFY_API_KEY || 'iIXE2cLk0MPy5cZ9gwRhtdj7F', // Working API key
  SENDER_ID: process.env.MNOTIFY_SENDER_ID || 'KeyMediaCon', // Working sender ID
  BASE_URL: 'https://apps.mnotify.net/smsapi'
};

// DataWorks API configuration
const DATAWORKS_CONFIG = {
  API_URL: 'https://api.dataworksgh.com/api/abusua.php',
  SUPER_AGENT_EMAIL: process.env.DATAWORKS_AGENT_EMAIL || 'keymediaconsult34@gmail.com' // Set this in your .env file
};

// Middleware for Editor-only actions
const requireEditor = (req, res, next) => {
  console.log('📝 RequireEditor middleware - checking user role:', req.user?.role);
  
  if (!req.user || !['admin', 'Editor'].includes(req.user.role)) {
    return res.status(403).json({ 
      success: false,
      message: 'Editor privileges required for order status updates',
      yourRole: req.user?.role,
      allowedRoles: ['admin', 'Editor'],
      note: 'Only Editors and Full Admins can update order statuses'
    });
  }
  
  console.log('✅ RequireEditor: User authorized for order status updates');
  next();
};

// Enhanced database and model validation middleware
const validateModelsAndDb = (req, res, next) => {
  // Check database connection
  if (mongoose.connection.readyState !== 1) {
    console.error('Database connection error - readyState:', mongoose.connection.readyState);
    return res.status(500).json({
      success: false,
      message: 'Database connection error',
      error: 'Database is not connected'
    });
  }

  // Check if models are properly imported and initialized
  if (!Order) {
    console.error('Order model is not imported or undefined');
    return res.status(500).json({
      success: false,
      message: 'Order model initialization error',
      error: 'Order model is not properly loaded'
    });
  }

  // Check if Order model has required methods
  if (typeof Order.find !== 'function' || typeof Order.countDocuments !== 'function') {
    console.error('Order model methods are not available:', {
      hasFind: typeof Order.find === 'function',
      hasCountDocuments: typeof Order.countDocuments === 'function'
    });
    return res.status(500).json({
      success: false,
      message: 'Order model methods error',
      error: 'Required Order model methods are not available'
    });
  }

  console.log('✅ Models and database validation passed');
  next();
};

/**
 * Format phone number to Ghana format for mNotify
 * @param {string} phone - Phone number to format
 * @returns {string} - Formatted phone number
 */
const formatPhoneNumberForMnotify = (phone) => {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Validate minimum length
  if (cleaned.length < 9) {
    throw new Error('Phone number too short');
  }
  
  // If number starts with 0, replace with 233
  if (cleaned.startsWith('0')) {
    cleaned = '233' + cleaned.substring(1);
  }
  
  // If number doesn't start with country code, add it
  if (!cleaned.startsWith('233')) {
    cleaned = '233' + cleaned;
  }
  
  // Validate Ghana phone number format
  if (!cleaned.match(/^233[0-9]{9}$/)) {
    throw new Error('Invalid Ghana phone number format');
  }
  
  return cleaned;
};

/**
 * Call DataWorks API for MTN UP2U orders
 * @param {string} recipientNumber - Recipient phone number
 * @param {number} gig - Data size in GB
 * @param {string} referenceId - Unique reference ID
 * @returns {Promise<Object>} - API response
 */
const callDataWorksAPI = async (recipientNumber, gig, referenceId) => {
  try {
    // Ensure recipient number is exactly 10 digits
    const formattedRecipient = recipientNumber.replace(/\D/g, '');
    if (formattedRecipient.length !== 10) {
      throw new Error('Recipient number must be exactly 10 digits');
    }

    const data = {
      super_agent_email: DATAWORKS_CONFIG.SUPER_AGENT_EMAIL,
      recipient_number: formattedRecipient,
      network: 'MTN',
      gig: gig,
      reference_id: referenceId
    };

    console.log('📡 Calling DataWorks API with data:', {
      ...data,
      super_agent_email: '***' // Hide email in logs
    });

    const response = await axios.post(DATAWORKS_CONFIG.API_URL, data, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    console.log('DataWorks API Response:', response.data);

    // Check for successful response
    if (response.status === 200 || (response.data && response.data.status === 200)) {
      return {
        success: true,
        message: response.data.message || 'Successful',
        data: response.data
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'API call failed',
        data: response.data
      };
    }

  } catch (error) {
    console.error('DataWorks API Error:', error.message);
    if (error.response) {
      console.error('API Error Response:', error.response.data);
      return {
        success: false,
        message: `API Error: ${error.response.status} - ${error.response.statusText}`,
        error: error.response.data
      };
    }
    return {
      success: false,
      message: error.message,
      error: error
    };
  }
};

/**
 * Send SMS notification using mNotify - FIXED VERSION
 * @param {string} to - Recipient phone number
 * @param {string} message - Message to send
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - SMS API response
 */
const sendSMS = async (to, message, options = {}) => {
  try {
    // Check if SMS is properly configured
    if (!SMS_CONFIG.API_KEY) {
      console.warn('SMS service not configured - skipping SMS notification');
      return { 
        success: false, 
        error: { message: 'SMS service not configured' },
        skipped: true
      };
    }
    
    // Validate inputs
    if (!to || !message) {
      return { success: false, error: { message: 'Phone number and message are required' } };
    }
    
    if (message.length > 918) { // mNotify SMS limit
      return { success: false, error: { message: 'Message too long (max 918 characters)' } };
    }
    
    // Use senderID from options or default
    const senderID = options.senderID || SMS_CONFIG.SENDER_ID;
    
    // Validate and format phone number
    const formattedPhone = formatPhoneNumberForMnotify(to);
    
    // Construct SMS API URL
    const url = `${SMS_CONFIG.BASE_URL}?key=${SMS_CONFIG.API_KEY}&to=${formattedPhone}&msg=${encodeURIComponent(message)}&sender_id=${senderID}`;
    
    // Send SMS request with timeout
    const response = await axios.get(url, { 
      timeout: 15000,
      headers: {
        'User-Agent': 'KeyMediaConsult/1.0'
      }
    });
    
    // Log the response for debugging
    console.log('mNotify SMS API Response:', {
      status: response.status,
      data: response.data,
      to: formattedPhone,
      senderID: senderID
    });
    
    // SIMPLIFIED RESPONSE HANDLING (like the working admin version)
    let responseCode;
    
    if (typeof response.data === 'number') {
      responseCode = response.data;
    } else if (typeof response.data === 'string') {
      const match = response.data.match(/\d+/);
      if (match) {
        responseCode = parseInt(match[0]);
      } else {
        responseCode = parseInt(response.data.trim());
      }
    } else if (typeof response.data === 'object' && response.data.code) {
      responseCode = parseInt(response.data.code);
    }
    
    // LESS STRICT: Assume success if we can't parse but HTTP is OK
    if (isNaN(responseCode)) {
      console.error('Could not parse mNotify response code from:', response.data);
      if (response.status === 200) {
        return { success: true, message: 'SMS sent (assumed successful)', rawResponse: response.data };
      }
      return { success: false, error: { message: `Invalid response format: ${JSON.stringify(response.data)}` } };
    }
    
    // Handle response codes
    switch (responseCode) {
      case 1000:
        console.log(`✅ SMS sent successfully to ${formattedPhone}`);
        return { 
          success: true, 
          message: 'SMS sent successfully', 
          code: responseCode,
          data: {
            recipient: formattedPhone,
            senderID: senderID,
            messageLength: message.length
          }
        };
        
      case 1002:
        return { success: false, error: { message: 'SMS sending failed - delivery error' } };
        
      case 1003:
        return { success: false, error: { message: 'Insufficient SMS balance in mNotify account' } };
        
      case 1004:
        return { success: false, error: { message: 'Invalid mNotify API key' } };
        
      case 1005:
        return { success: false, error: { message: `Invalid phone number: ${formattedPhone}` } };
        
      case 1006:
        return { success: false, error: { message: `Invalid Sender ID: ${senderID} (must be max 11 characters)` } };
        
      case 1007:
        console.log(`📅 SMS scheduled for later delivery to ${formattedPhone}`);
        return { 
          success: true, 
          message: 'SMS scheduled for delivery', 
          code: responseCode,
          data: {
            recipient: formattedPhone,
            scheduled: true
          }
        };
        
      case 1008:
        return { success: false, error: { message: 'Empty message content' } };
        
      case 1011:
        return { success: false, error: { message: 'Numeric Sender IDs are not allowed' } };
        
      case 1012:
        return { success: false, error: { message: `Sender ID '${senderID}' is not registered. Contact senderids@mnotify.com` } };
        
      default:
        return { success: false, error: { message: `Unknown mNotify response code: ${responseCode}` } };
    }
    
  } catch (error) {
    // Handle errors like the working admin version
    if (error.code === 'ECONNABORTED') {
      console.error('SMS API request timeout');
      return { success: false, error: { message: 'SMS API request timeout' } };
    }
    
    if (error.response) {
      console.error('mNotify SMS API Error Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
      
      return { 
        success: false, 
        error: {
          message: `SMS API error: ${error.response.status} - ${error.response.statusText}`,
          code: error.response.status,
          details: error.response.data
        }
      };
    }
    
    if (error.request) {
      console.error('SMS API network error - no response received');
      return { success: false, error: { message: 'Network error - SMS API unreachable' } };
    }
    
    console.error('SMS send error:', error.message);
    return { success: false, error: { message: error.message } };
  }
};

// POST place order (user endpoint) - LEGACY endpoint without API integration
router.post('/placeord', auth, validateModelsAndDb, async (req, res) => {
  try {
    const { recipientNumber, capacity, price, bundleType } = req.body;
    
    // Validate required fields
    if (!recipientNumber || !capacity || !price) {
      return res.status(400).json({
        success: false,
        message: 'Recipient number, capacity, and price are all required'
      });
    }
    
    // Get user for wallet balance check
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if user has enough balance
    if (user.wallet.balance < price) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance in wallet'
      });
    }
    
    // Create or find a bundle
    let bundle = await Bundle.findOne({ 
      capacity: capacity,
      price: price,
      type: bundleType || 'other'
    });
    
    if (!bundle) {
      bundle = new Bundle({
        capacity: capacity,
        price: price,
        type: bundleType || 'other'
      });
      await bundle.save();
    }
    
    // Start a session for the transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Create new order matching the schema exactly
      const newOrder = new Order({
        user: req.user.id,
        bundleType: bundleType,
        capacity: capacity,
        price: price,
        recipientNumber: recipientNumber,
        status: 'pending',
        updatedAt: Date.now()
        // orderReference will be generated by the pre-save hook
      });
      
      await newOrder.save({ session });
      
      // Create transaction record
      const transaction = new Transaction({
        user: req.user.id,
        type: 'purchase',
        amount: price,
        currency: user.wallet.currency,
        description: `Bundle purchase: ${capacity}MB for ${recipientNumber}`,
        status: 'completed',
        reference: 'TXN-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        orderId: newOrder._id,
        balanceBefore: user.wallet.balance,
        balanceAfter: user.wallet.balance - price,
        paymentMethod: 'wallet'
      });
      
      await transaction.save({ session });
      
      // Update user's wallet balance
      user.wallet.balance -= price;
      user.wallet.transactions.push(transaction._id);
      await user.save({ session });
      
      // Commit the transaction
      await session.commitTransaction();
      session.endSession();
      
      // Return the created order
      res.status(201).json({
        success: true,
        message: 'Order placed successfully and awaiting Editor approval',
        data: {
          order: {
            id: newOrder._id,
            orderReference: newOrder.orderReference,
            recipientNumber: newOrder.recipientNumber,
            bundleType: newOrder.bundleType,
            capacity: newOrder.capacity,
            price: newOrder.price,
            status: newOrder.status,
            createdAt: newOrder.createdAt
          },
          transaction: {
            id: transaction._id,
            reference: transaction.reference,
            amount: transaction.amount,
            status: transaction.status
          },
          walletBalance: user.wallet.balance,
          note: 'Your order is pending and will be processed by our Editors'
        }
      });
      
    } catch (error) {
      // If an error occurs, abort the transaction
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
    
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// GET user's orders
router.get('/my-orders', auth, validateModelsAndDb, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .sort({ createdAt: -1 });
    
    if (!orders.length) {
      return res.status(200).json({ 
        success: true, 
        message: 'No orders found', 
        data: [] 
      });
    }

    res.status(200).json({ 
      success: true, 
      count: orders.length, 
      data: orders 
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// GET all orders (admin access - ALL ADMIN TYPES including Editor can view orders)
router.get('/all', adminAuth, validateModelsAndDb, async (req, res) => {
  try {
    console.log('📋 Fetching all orders for admin:', req.user.username, 'Role:', req.user.role);
    
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    console.log('📄 Pagination params:', { page, limit, skip });
    
    // Filtering options
    const filter = {};
    
    if (req.query.status) {
      filter.status = req.query.status;
      console.log('🔍 Filtering by status:', req.query.status);
    }
    
    if (req.query.bundleType) {
      filter.bundleType = req.query.bundleType;
      console.log('🔍 Filtering by bundleType:', req.query.bundleType);
    }
    
    if (req.query.userId) {
      filter.user = req.query.userId;
      console.log('🔍 Filtering by userId:', req.query.userId);
    }
    
    // Date range filtering
    if (req.query.startDate && req.query.endDate) {
      filter.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
      console.log('🔍 Filtering by date range:', filter.createdAt);
    }
    
    console.log('🔍 Final filter object:', filter);
    
    // Get total count for pagination
    let total = 0;
    try {
      console.log('📊 Attempting to count documents...');
      total = await Order.countDocuments(filter);
      console.log('📊 Total documents count:', total);
    } catch (countError) {
      console.error('❌ Error counting documents:', countError.message);
      console.log('🔄 Falling back to manual count...');
      
      try {
        const allOrders = await Order.find(filter).select('_id');
        total = allOrders.length;
        console.log('📊 Manual count result:', total);
      } catch (fallbackError) {
        console.error('❌ Fallback count also failed:', fallbackError.message);
        total = 0;
      }
    }
    
    // Get orders with pagination
    console.log('📋 Fetching orders with pagination...');
    const orders = await Order.find(filter)
      .populate('user', 'username email phone')
      .populate('processedBy', 'username role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    console.log('📋 Orders fetched successfully. Count:', orders.length);
    
    // Add role-specific information to response
    const responseData = {
      success: true,
      count: orders.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: orders,
      accessedBy: {
        adminId: req.user._id,
        adminUsername: req.user.username,
        adminRole: req.user.role,
        timestamp: new Date()
      },
      permissions: {
        canUpdateOrderStatus: ['admin', 'Editor'].includes(req.user.role),
        canViewAllOrders: true,
        isEditor: req.user.role === 'Editor',
        isWalletAdmin: req.user.role === 'wallet_admin'
      },
      debug: {
        modelCheck: 'Order model is available',
        dbConnection: 'Connected',
        filterApplied: filter
      }
    };
    
    // Add role-specific note
    if (req.user.role === 'Editor') {
      responseData.editorNote = 'You can update order statuses. Click on any order to change its status.';
    } else if (req.user.role === 'wallet_admin') {
      responseData.walletAdminNote = 'You can view orders but cannot update their status. Contact an Editor for status updates.';
    }
    
    console.log('✅ Sending successful response with', orders.length, 'orders');
    res.status(200).json(responseData);
    
  } catch (error) {
    console.error('❌ Error fetching all orders:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message,
      details: 'Failed to fetch orders. Please check database connection and model initialization.',
      debug: {
        errorStack: error.stack,
        modelAvailable: !!Order,
        dbState: mongoose.connection.readyState
      }
    });
  }
});

// GET specific order details (admin access)
router.get('/:id', adminAuth, validateModelsAndDb, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'username email phone')
      .populate('processedBy', 'username role');

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    res.status(200).json({ 
      success: true, 
      data: order,
      permissions: {
        canUpdateStatus: ['admin', 'Editor'].includes(req.user.role),
        viewerRole: req.user.role,
        viewerUsername: req.user.username
      }
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// GET orders for specific user (admin access)
router.get('/user/:userId', adminAuth, validateModelsAndDb, async (req, res) => {
  try {
    // Verify user exists
    const userExists = await User.exists({ _id: req.params.userId });
    
    if (!userExists) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    const orders = await Order.find({ user: req.params.userId })
      .populate('processedBy', 'username role')
      .sort({ createdAt: -1 });
    
    res.status(200).json({ 
      success: true, 
      count: orders.length, 
      data: orders,
      permissions: {
        canUpdateOrderStatus: ['admin', 'Editor'].includes(req.user.role),
        viewerRole: req.user.role
      }
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status (EDITOR ROLE ONLY) - WITH API RETRY FOR MTN UP2U
 * @access  Editor/Admin
 */
router.put('/:id/status', adminAuth, requireEditor, validateModelsAndDb, async (req, res) => {
  try {
    const { status, senderID = 'DataMartGH', sendSMSNotification = true, failureReason, retryAPI = false } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    const validStatuses = ['pending', 'processing', 'completed', 'failed', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
        validStatuses: validStatuses
      });
    }
    
    // Find the order first to get previous status and recipient info
    const order = await Order.findById(req.params.id).populate('user');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    const previousStatus = order.status;
    
    // Prevent unnecessary status changes
    if (previousStatus === status) {
      return res.status(400).json({
        success: false,
        message: `Order is already in ${status} status`
      });
    }
    
    // If Editor is marking as completed AND it's mtnup2u AND retryAPI is true, try API again
    if (status === 'completed' && order.bundleType.toLowerCase() === 'mtnup2u' && retryAPI) {
      console.log('🔄 Editor requested API retry for MTN UP2U order...');
      
      const gigValue = order.capacity >= 1000 ? order.capacity / 1000 : order.capacity;
      const apiCallResult = await callDataWorksAPI(
        order.recipientNumber,
        gigValue,
        order.orderReference
      );
      
      if (!apiCallResult.success) {
        return res.status(400).json({
          success: false,
          message: `API retry failed: ${apiCallResult.message}`,
          apiError: apiCallResult.error
        });
      }
      
      // API retry successful, continue with status update
      order.apiReference = order.orderReference;
      order.metadata = {
        ...order.metadata,
        apiRetryResponse: {
          success: true,
          message: apiCallResult.message,
          timestamp: new Date(),
          retriedBy: req.user.username
        }
      };
    }
    
    // Process refund if status is being changed to refunded
    if (status === 'refunded' && previousStatus !== 'refunded') {
      try {
        // Find the user and update their account balance
        const user = await User.findById(order.user._id);
        if (user && user.wallet) {
          // Add the refund amount to the user's wallet balance
          user.wallet.balance += order.price;
          await user.save();
          
          console.log(`Refunded ${order.price} to user ${user._id} for order ${order._id} by Editor ${req.user.username}`);
        } else {
          console.error(`User not found or wallet not initialized for refund: ${order.user._id}`);
        }
      } catch (refundError) {
        console.error('Error processing refund:', refundError.message);
        return res.status(500).json({
          success: false,
          message: 'Error processing refund',
          error: refundError.message
        });
      }
    }
    
    // Update the order with Editor information
    order.status = status;
    order.processedBy = req.user.id;
    order.updatedAt = Date.now();
    
    // Add comprehensive Editor tracking
    order.editorInfo = {
      editorId: req.user._id,
      editorUsername: req.user.username,
      editorRole: req.user.role,
      previousStatus: previousStatus,
      newStatus: status,
      statusChangedAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      failureReason: failureReason || null,
      apiRetryAttempted: retryAPI || false
    };
    
    // Set completed date if status is now completed
    if (status === 'completed' && previousStatus !== 'completed') {
      order.completedAt = new Date();
    }
    
    // Set failure reason if provided
    if ((status === 'failed' || status === 'refunded') && failureReason) {
      order.failureReason = failureReason;
    }
    
    await order.save();
    
    // Send SMS notifications based on status change only if sendSMSNotification is true
    let smsResult = null;
    if (sendSMSNotification) {
      try {
        // Get the user's phone who placed the order
        if (order.user && order.user.phone) {
          // Use working mNotify formatting for phone numbers
          const userPhone = formatPhoneNumberForMnotify(order.user.phone);
          
          if (status === 'completed' && previousStatus !== 'completed') {
            // Determine which SMS template to use based on bundleType
            let completionMessage = '';
            
            switch(order.bundleType?.toLowerCase()) {
              case 'mtnup2u':
                const dataAmount = order.capacity >= 1000 ? `${order.capacity/1000}GB` : `${order.capacity}MB`;
                completionMessage = `${dataAmount} has been credited to ${order.recipientNumber} and is valid for 3 months.\nDataMartGH`;
                break;
              case 'telecel-5959':
                const dataSizeGB = order.capacity >= 1000 ? `${order.capacity/1000}GB` : `${order.capacity}MB`;
                completionMessage = `${dataSizeGB} has been allocated to ${order.recipientNumber} and is valid for 2 months.\nDataMartGH`;
                break;
              default:
                const dataSize = order.capacity >= 1000 ? `${order.capacity/1000}GB` : `${order.capacity}MB`;
                completionMessage = `${dataSize} has been sent to ${order.recipientNumber}.\nDataMartGH`;
                break;
            }
            
            smsResult = await sendSMS(userPhone, completionMessage, {
              useCase: 'transactional',
              senderID: senderID
            });
            
            if (smsResult.success) {
              console.log(`Completion SMS sent by Editor ${req.user.username} to user ${userPhone} for order ${order._id} using ${order.bundleType} template with senderID: ${senderID}`);
            } else {
              console.error(`Failed to send completion SMS: ${smsResult.error?.message || 'Unknown error'}`);
            }
          } 
          else if (status === 'failed' || status === 'refunded') {
            let refundMessage = '';
            
            // Handle AFA-registration bundle type differently
            if (order.bundleType && order.bundleType.toLowerCase() === 'afa-registration') {
              refundMessage = `Your AFA registration has been cancelled. The amount has been reversed to your DataMartGH balance. Kindly check your balance to confirm.\nDataMartGH`;
            } else {
              const dataSize = order.capacity >= 1000 ? `${order.capacity/1000}GB` : `${order.capacity}MB`;
              refundMessage = `Your ${dataSize} order to ${order.recipientNumber} failed. The amount has been reversed to your DataMartGH balance. Kindly check your balance to confirm.\nDataMartGH`;
            }
            
            smsResult = await sendSMS(userPhone, refundMessage, {
              useCase: 'transactional',
              senderID: senderID
            });
            
            if (smsResult.success) {
              console.log(`Refund SMS sent by Editor ${req.user.username} to user ${userPhone} for order ${order._id} (${order.bundleType}) with senderID: ${senderID}`);
            } else {
              console.error(`Failed to send refund SMS: ${smsResult.error?.message || 'Unknown error'}`);
            }
          }
        } else {
          console.error(`User not found or phone number missing for order ${order._id}`);
        }
      } catch (smsError) {
        console.error('Failed to send status update SMS:', smsError.message);
        smsResult = { success: false, error: { message: smsError.message } };
      }
    } else {
      console.log(`SMS notification skipped for order ${order._id} status update to ${status} by Editor ${req.user.username} (sendSMSNotification=${sendSMSNotification})`);
    }
    
    res.status(200).json({
      success: true,
      message: `Order status updated successfully${sendSMSNotification ? ' with SMS notification' : ' without SMS notification'}`,
      data: order,
      updatedBy: {
        editorId: req.user._id,
        editorUsername: req.user.username,
        editorRole: req.user.role,
        timestamp: new Date(),
        ipAddress: req.ip
      },
      statusChange: {
        from: previousStatus,
        to: status,
        changedAt: new Date(),
        reason: failureReason || null,
        apiRetryAttempted: retryAPI || false
      },
      smsNotification: sendSMSNotification ? {
        attempted: true,
        success: smsResult?.success || false,
        error: smsResult?.error?.message || null,
        provider: 'mNotify'
      } : {
        attempted: false
      }
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// GET weekly trends (admin access)
router.get('/trends/weekly', adminAuth, validateModelsAndDb, async (req, res) => {
  try {
    // Parse query parameters for date filtering
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    
    // Add time to end date to include the entire day
    endDate.setHours(23, 59, 59, 999);
    
    // Filter by user if provided
    const matchQuery = {
      createdAt: { $gte: startDate, $lte: endDate }
    };
    
    if (req.query.userId) {
      matchQuery.user = req.query.userId;
    }
    
    // Aggregate to get orders by day of week
    const ordersByDay = await Order.aggregate([
      { $match: matchQuery },
      {
        $addFields: {
          dayOfWeek: { $dayOfWeek: "$createdAt" }
        }
      },
      {
        $group: {
          _id: "$dayOfWeek",
          count: { $sum: 1 },
          totalAmount: { $sum: "$price" },
          orders: { $push: "$ROOT" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Transform data to be more readable
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Create a complete dataset with all days of the week
    const completeData = daysOfWeek.map((day, index) => {
      const dayData = ordersByDay.find(item => item._id === index + 1);
      
      return {
        day,
        dayIndex: index,
        count: dayData ? dayData.count : 0,
        totalAmount: dayData ? dayData.totalAmount : 0,
        percentage: 0
      };
    });
    
    // Calculate total orders to compute percentages
    const totalOrders = completeData.reduce((sum, item) => sum + item.count, 0);
    
    // Add percentage information
    completeData.forEach(item => {
      item.percentage = totalOrders > 0 ? ((item.count / totalOrders) * 100).toFixed(2) : 0;
    });
    
    // Find the day with the highest order count
    let highestOrderDay = completeData[0];
    completeData.forEach(item => {
      if (item.count > highestOrderDay.count) {
        highestOrderDay = item;
      }
    });
    
    // Calculate the average orders per day
    const averageOrdersPerDay = totalOrders / 7;
    
    // Calculate variance from average for each day
    completeData.forEach(item => {
      item.varianceFromAverage = averageOrdersPerDay > 0 
        ? ((item.count - averageOrdersPerDay) / averageOrdersPerDay * 100).toFixed(2) 
        : 0;
    });
    
    // Return the trends data
    res.status(200).json({
      success: true,
      data: {
        trends: completeData,
        totalOrders,
        averageOrdersPerDay: averageOrdersPerDay.toFixed(2),
        highestOrderDay: highestOrderDay.day,
        dateRange: {
          from: startDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0]
        }
      }
    });
  } catch (error) {
    console.error('Error analyzing weekly order trends:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// POST place order (main endpoint - WITH DATAWORKS API INTEGRATION FOR MTN UP2U)
router.post('/placeorder', auth, validateModelsAndDb, async (req, res) => {
  try {
    const { recipientNumber, capacity, price, bundleType } = req.body;
    
    // Validate required fields
    if (!recipientNumber || !capacity || !price || !bundleType) {
      return res.status(400).json({
        success: false,
        message: 'Recipient number, capacity, price, and bundle type are all required'
      });
    }
    
    // Get user for wallet balance check
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if user has enough balance
    if (user.wallet.balance < price) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance in wallet'
      });
    }
    
    // Start a session for the transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Generate order reference
      const orderReference = Math.floor(1000 + Math.random() * 900000).toString();
      
      // Determine initial status and whether to call API
      let initialStatus = 'pending';
      let apiCallResult = null;
      let apiReference = null;
      
      // Only call DataWorks API if bundle type is mtnup2u
      if (bundleType.toLowerCase() === 'mtnup2u') {
        console.log('🔄 Processing MTN UP2U order - calling DataWorks API...');
        
        // Convert capacity from MB to GB for the API
        const gigValue = capacity >= 1000 ? capacity / 1000 : capacity;
        
        // Call DataWorks API
        apiCallResult = await callDataWorksAPI(
          recipientNumber,
          gigValue,
          orderReference
        );
        
        if (apiCallResult.success) {
          console.log('✅ DataWorks API call successful');
          initialStatus = 'completed'; // Set to completed if API call succeeds
          apiReference = orderReference; // Store the reference used with the API
        } else {
          console.log('❌ DataWorks API call failed:', apiCallResult.message);
          // Keep status as pending so Editor can retry manually
          initialStatus = 'pending';
        }
      }
      
      // Create new order
      const newOrder = new Order({
        user: req.user.id,
        bundleType: bundleType,
        capacity: capacity,
        price: price,
        recipientNumber: recipientNumber,
        status: initialStatus,
        orderReference: orderReference,
        updatedAt: Date.now(),
        apiReference: apiReference,
        // Store API response for debugging
        metadata: {
          ...(apiCallResult && {
            apiResponse: {
              success: apiCallResult.success,
              message: apiCallResult.message,
              timestamp: new Date()
            }
          })
        }
      });
      
      // If API call was successful for mtnup2u, mark as auto-completed
      if (bundleType.toLowerCase() === 'mtnup2u' && apiCallResult?.success) {
        newOrder.completedAt = new Date();
        newOrder.processedBy = null; // System processed, not Editor
        newOrder.editorInfo = {
          previousStatus: 'pending',
          newStatus: 'completed',
          statusChangedAt: new Date(),
          note: 'Auto-completed via DataWorks API'
        };
      }
      
      console.log(`Order created for bundle type ${bundleType} - status: ${initialStatus}`);
      
      // Save the order
      await newOrder.save({ session });
      
      // Create transaction record - deduct money from user
      const transaction = new Transaction({
        user: req.user.id,
        type: 'purchase',
        amount: price,
        currency: user.wallet.currency,
        description: `Bundle purchase: ${capacity}MB for ${recipientNumber}`,
        status: 'completed',
        reference: 'TXN-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        orderId: newOrder._id,
        balanceBefore: user.wallet.balance,
        balanceAfter: user.wallet.balance - price,
        paymentMethod: 'wallet'
      });
      
      await transaction.save({ session });
      
      // Update user's wallet balance - MONEY IS DEDUCTED
      user.wallet.balance -= price;
      user.wallet.transactions.push(transaction._id);
      await user.save({ session });
      
      // Commit the transaction
      await session.commitTransaction();
      session.endSession();
      
      console.log(`Order ${orderReference} placed successfully. User balance updated: ${user.wallet.balance}`);
      
      // Send SMS if order was auto-completed
      if (initialStatus === 'completed' && user.phone) {
        try {
          const userPhone = formatPhoneNumberForMnotify(user.phone);
          const dataAmount = capacity >= 1000 ? `${capacity/1000}GB` : `${capacity}MB`;
          const completionMessage = `${dataAmount} has been credited to ${recipientNumber} and is valid for 3 months.\nDataMartGH`;
          
          await sendSMS(userPhone, completionMessage, {
            useCase: 'transactional',
            senderID: 'DataMartGH'
          });
        } catch (smsError) {
          console.error('Failed to send completion SMS:', smsError.message);
        }
      }
      
      // Return the created order
      res.status(201).json({
        success: true,
        message: initialStatus === 'completed' 
          ? 'Order completed successfully!' 
          : 'Order placed successfully and awaiting Editor approval',
        data: {
          order: {
            id: newOrder._id,
            orderReference: newOrder.orderReference,
            recipientNumber: newOrder.recipientNumber,
            bundleType: newOrder.bundleType,
            capacity: newOrder.capacity,
            price: newOrder.price,
            status: newOrder.status,
            createdAt: newOrder.createdAt
          },
          transaction: {
            id: transaction._id,
            reference: transaction.reference,
            amount: transaction.amount,
            status: transaction.status
          },
          walletBalance: user.wallet.balance,
          note: initialStatus === 'completed'
            ? 'Your MTN data bundle has been sent successfully!'
            : apiCallResult && !apiCallResult.success
              ? `Order pending due to API error: ${apiCallResult.message}. Our Editors will process it manually.`
              : 'Your order is pending and will be processed by our Editors.',
          apiIntegration: {
            enabled: bundleType.toLowerCase() === 'mtnup2u',
            attempted: !!apiCallResult,
            success: apiCallResult?.success || false,
            message: apiCallResult?.message || null
          }
        }
      });
      
    } catch (error) {
      // If an error occurs, abort the transaction
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
    
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// GET today's orders and revenue for admin
router.get('/today/admin', adminAuth, validateModelsAndDb, async (req, res) => {
  try {
    // Get today's date at 00:00:00
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    // Get end of today at 23:59:59
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    
    // Find all orders made today
    const todayOrders = await Order.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    })
      .populate('user', 'username email phone')
      .populate('processedBy', 'username role')
      .sort({ createdAt: -1 });
    
    // Calculate today's total revenue
    const todayRevenue = todayOrders.reduce((total, order) => {
      return total + (order.price || 0);
    }, 0);
    
    // Get breakdown by bundle type
    const bundleTypeBreakdown = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: "$bundleType",
          count: { $sum: 1 },
          revenue: { $sum: "$price" }
        }
      },
      {
        $sort: { revenue: -1 }
      }
    ]);
    
    // Get unique users who placed orders today
    const uniqueUsers = new Set(todayOrders.map(order => order.user._id.toString())).size;
    
    // Get status breakdown
    const statusBreakdown = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        todayOrdersCount: todayOrders.length,
        todayRevenue,
        uniqueUsers,
        bundleTypeBreakdown,
        statusBreakdown,
        todayOrders,
        date: startOfDay.toISOString().split('T')[0]
      },
      permissions: {
        canUpdateOrderStatus: ['admin', 'Editor'].includes(req.user.role),
        viewerRole: req.user.role
      }
    });
  } catch (error) {
    console.error('Error fetching today\'s orders and revenue for admin:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Bulk purchase endpoint with DataWorks API support
router.post('/bulk-purchase', auth, validateModelsAndDb, async (req, res) => {
  // Start a mongoose session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { networkKey, orders } = req.body;
    
    // Validate request
    if (!networkKey || !orders || !Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request format. Network key and orders array are required.'
      });
    }
    
    if (orders.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Maximum of 100 orders allowed in a single bulk request'
      });
    }
    
    // Get user for wallet balance check
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Process orders (keeping the existing bulk purchase logic)
    const results = {
      successful: 0,
      failed: 0,
      totalAmount: 0,
      orders: []
    };
    
    // Create a bulk transaction reference
    const bulkTransactionReference = new mongoose.Types.ObjectId().toString();
    
    // Check if this is an MTN UP2U bulk order
    const isMtnBulk = networkKey.toLowerCase() === 'mtnup2u' || 
                      (orders.length > 0 && orders[0].bundleType?.toLowerCase() === 'mtnup2u');
    
    // Process each order with API integration for MTN UP2U
    for (const orderData of orders) {
      try {
        // Generate a reference number
        const prefix = "order";
        const numbers = Math.floor(100000 + Math.random() * 900000).toString();
        const reference = `${prefix}${numbers}`;
        
        // Determine if we should call DataWorks API
        let orderStatus = 'pending';
        let apiCallResult = null;
        
        if (isMtnBulk) {
          console.log('🔄 Processing MTN UP2U bulk order item...');
          const gigValue = orderData.capacity >= 1000 ? orderData.capacity / 1000 : orderData.capacity;
          
          apiCallResult = await callDataWorksAPI(
            orderData.recipient,
            gigValue,
            reference
          );
          
          if (apiCallResult.success) {
            orderStatus = 'completed';
          }
        }
        
        // Create order
        const order = new Order({
          user: user._id,
          bundleType: orderData.bundleType || networkKey || 'bulk',
          capacity: parseFloat(orderData.capacity),
          price: orderData.price,
          recipientNumber: orderData.recipient,
          status: orderStatus,
          orderReference: reference,
          apiReference: apiCallResult?.success ? reference : null,
          metadata: {
            userBalance: user.wallet.balance,
            orderTime: new Date(),
            isBulkOrder: true,
            bulkTransactionReference,
            ...(apiCallResult && {
              apiResponse: {
                success: apiCallResult.success,
                message: apiCallResult.message,
                timestamp: new Date()
              }
            })
          }
        });
        
        if (orderStatus === 'completed') {
          order.completedAt = new Date();
          order.editorInfo = {
            previousStatus: 'pending',
            newStatus: 'completed',
            statusChangedAt: new Date(),
            note: 'Auto-completed via DataWorks API (bulk order)'
          };
        }

        await order.save({ session });
        
        results.successful++;
        results.totalAmount += orderData.price;
        
        // Add to results
        results.orders.push({
          recipient: orderData.recipient,
          capacity: orderData.capacity,
          price: orderData.price,
          status: orderStatus,
          reference: reference,
          note: orderStatus === 'completed' 
            ? 'Completed successfully via API' 
            : apiCallResult && !apiCallResult.success
              ? `Pending - API error: ${apiCallResult.message}`
              : 'Awaiting Editor approval'
        });
        
      } catch (orderError) {
        console.error(`Error processing individual order in bulk purchase:`, orderError);
        
        // Add failed order to results
        results.failed++;
        results.orders.push({
          recipient: orderData.recipient,
          capacity: orderData.capacity,
          price: orderData.price,
          status: 'failed',
          error: orderError.message
        });
      }
    }
    
    // If at least one order was successful, deduct the total amount from wallet
    if (results.successful > 0) {
      // Create a bulk transaction record
      const transaction = new Transaction({
        user: user._id,
        type: 'purchase',
        amount: results.totalAmount,
        currency: user.wallet.currency,
        description: `Bulk purchase: ${results.successful} data bundles`,
        status: 'completed',
        reference: bulkTransactionReference,
        balanceBefore: user.wallet.balance,
        balanceAfter: user.wallet.balance - results.totalAmount,
        paymentMethod: 'wallet'
      });
      
      await transaction.save({ session });
      
      // Update user balance
      user.wallet.balance -= results.totalAmount;
      user.wallet.transactions.push(transaction._id);
      await user.save({ session });
      
      // Send bulk SMS notification if MTN orders were auto-completed
      if (isMtnBulk && user.phone) {
        const completedCount = results.orders.filter(o => o.status === 'completed').length;
        if (completedCount > 0) {
          try {
            const userPhone = formatPhoneNumberForMnotify(user.phone);
            const message = `Bulk order processed: ${completedCount} MTN data bundles sent successfully. Check your order history for details.\nDataMartGH`;
            
            await sendSMS(userPhone, message, {
              useCase: 'transactional',
              senderID: 'DataMartGH'
            });
          } catch (smsError) {
            console.error('Failed to send bulk completion SMS:', smsError.message);
          }
        }
      }
    }
    
    // Commit the transaction
    await session.commitTransaction();
    
    // Return results
    res.status(200).json({
      success: true,
      message: `Bulk purchase processed: ${results.successful} orders created, ${results.failed} failed`,
      data: {
        totalOrders: orders.length,
        successful: results.successful,
        failed: results.failed,
        totalAmount: results.totalAmount,
        newBalance: user.wallet.balance,
        orders: results.orders,
        note: isMtnBulk 
          ? 'MTN orders are processed automatically via API. Failed orders require Editor approval.'
          : 'All orders are pending and require Editor approval before processing',
        apiIntegration: {
          enabled: isMtnBulk,
          provider: 'DataWorks'
        }
      }
    });
    
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    
    console.error('Bulk purchase error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing bulk purchase',
      error: error.message
    });
  } finally {
    session.endSession();
  }
});

module.exports = router;