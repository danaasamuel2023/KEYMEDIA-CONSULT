// routes/orders.js
// const express = require('express');
// const axios = require('axios');

const express = require('express');
const axios = require('axios');
const router = express.Router();
const { Order, Bundle, User, Transaction } = require('../schema/schema');
const AdminSettings = require('../AdminSettingSchema/AdminSettings.js'); // Import Admin Settings model
const auth = require('../AuthMiddle/middlewareauth.js');
const adminAuth = require('../adminMiddlware/middleware.js');
const mongoose = require('mongoose');
const ARKESEL_API_KEY = 'testing=';

const sendSMS = async (phoneNumber, message, options = {}) => {
  const {
    scheduleTime = null,
    useCase = null, 
    senderID = 'EL VENDER'
  } = options;
c 
  // Input validation
  if (!phoneNumber || !message) {
    throw new Error('Phone number and message are required');
  }

  // Base parameters
  const params = {
    action: 'send-sms',
    api_key: ARKESEL_API_KEY,
    to: phoneNumber,
    from: senderID,
    sms: message
  };

  // Add optional parameters
  if (scheduleTime) {
    params.schedule = scheduleTime;
  }

  if (useCase && ['promotional', 'transactional'].includes(useCase)) {
    params.use_case = useCase;
  }

  // Add Nigerian use case if phone number starts with 234
  if (phoneNumber.startsWith('234') && !useCase) {
    params.use_case = 'transactional';
  }

  try {
    const response = await axios.get('https://sms.arkesel.com/sms/api', {
      params,
      timeout: 10000 // 10 second timeout
    });

    // Map error codes to meaningful messages
    const errorCodes = {
      '100': 'Bad gateway request',
      '101': 'Wrong action',
      '102': 'Authentication failed',
      '103': 'Invalid phone number',
      '104': 'Phone coverage not active',
      '105': 'Insufficient balance',
      '106': 'Invalid Sender ID',
      '109': 'Invalid Schedule Time',
      '111': 'SMS contains spam word. Wait for approval'
    };

    if (response.data.code !== 'ok') {
      const errorMessage = errorCodes[response.data.code] || 'Unknown error occurred';
      throw new Error(`SMS sending failed: ${errorMessage}`);
    }

    console.log('SMS sent successfully:', {
      to: phoneNumber,
      status: response.data.code,
      balance: response.data.balance,
      mainBalance: response.data.main_balance
    });

    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    // Handle specific error types
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('SMS API responded with error:', {
        status: error.response.status,
        data: error.response.data
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from SMS API:', error.message);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('SMS request setup error:', error.message);
    }

    // Instead of swallowing the error, return error details
    return {
      success: false,
      error: {
        message: error.message,
        code: error.response?.data?.code,
        details: error.response?.data
      }
    };
  }
};

router.post('/placeord', auth, async (req, res) => {
  try {
    const { recipientNumber, capacity, price, bundleType } = req.body;
    
    // Validate required fields
    if (!recipientNumber || !capacity || !price) {
      return res.status(400).json({
        success: false,
        message: 'Recipient number, capacity, and price are all required'
      });
    }
    
    // Validate recipient number format
    // const phoneRegex = /^\+?[1-9]\d{9,14}$/;
    // if (!phoneRegex.test(recipientNumber)) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Invalid recipient phone number format'
    //   });
    // }
    
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
        bundle: bundle._id,
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
        message: 'Order placed successfully and payment processed',
        data: {
          order: {
            id: newOrder._id,
            orderReference: newOrder.orderReference,
            recipientNumber: newOrder.recipientNumber,
            status: newOrder.status,
            createdAt: newOrder.createdAt
          },
          bundle: {
            capacity: bundle.capacity,
            price: bundle.price,
            type: bundle.type
          },
          transaction: {
            id: transaction._id,
            reference: transaction.reference,
            amount: transaction.amount,
            status: transaction.status
          },
          walletBalance: user.wallet.balance
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
/**
 * @route   GET /api/orders/my-orders
 * @desc    Get all orders for the logged-in user
 * @access  Private
 */
router.get('/my-orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      // .populate('bundle', 'capacity price type')
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



router.get('/all', adminAuth, async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Filtering options
    const filter = {};
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.bundleType) {
      // First find bundles of this type
      const bundles = await Bundle.find({ type: req.query.bundleType }).select('_id');
      const bundleIds = bundles.map(bundle => bundle._id);
      filter.bundle = { $in: bundleIds };
    }
    
    if (req.query.userId) {
      filter.user = req.query.userId;
    }
    
    // Date range filtering
    if (req.query.startDate && req.query.endDate) {
      filter.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }
    
    // Get total count for pagination
    const total = await Order.countDocuments(filter);
    
    // Get orders with pagination
    const orders = await Order.find(filter)
      // .populate('bundle', 'name capacity price type')
      .populate('user', 'username email phone')
      // .populate('processedBy', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/orders/:id
 * @desc    Get specific order details (admin access)
 * @access  Admin
 */
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('bundle', 'name capacity price type')
      .populate('user', 'username email phone')
      .populate('processedBy', 'username');

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    res.status(200).json({ 
      success: true, 
      data: order 
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

/**
 * @route   GET /api/orders/user/:userId
 * @desc    Get all orders for a specific user (admin access)
 * @access  Admin
 */
router.get('/user/:userId', adminAuth, async (req, res) => {
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
      .populate('bundle', 'name capacity price type')
      .sort({ createdAt: -1 });
    
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

/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status (admin access)
 * @access  Admin
 */
/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status (admin access)
 * @access  Admin
 */
/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status (admin access)
 * @access  Admin
 */
router.put('/:id/status', adminAuth, async (req, res) => {
  try {
    const { status, senderID = 'EL VENDER', sendSMSNotification = false } = req.body; // Changed 'sendSMS' to 'sendSMSNotification'
    
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
        message: 'Invalid status value'
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
    
    // Process refund if status is being changed to refunded
    if (status === 'refunded' && previousStatus !== 'refunded') {
      try {
        // Find the user and update their account balance
        const user = await User.findById(order.user._id);
        if (user && user.wallet) {
          // Add the refund amount to the user's wallet balance
          user.wallet.balance += order.price;
          await user.save();
          
          console.log(`Refunded ${order.price} to user ${user._id} for order ${order._id}`);
        } else {
          console.error(`User not found or wallet not initialized for refund: ${order.user._id}`);
        }
      } catch (refundError) {
        console.error('Error processing refund:', refundError.message);
        // You might want to handle this differently, maybe even prevent the status change
      }
    }
    
    // Update the order
    order.status = status;
    order.processedBy = req.user.id;
    order.updatedAt = Date.now();
    
    // Set completed date if status is now completed
    if (status === 'completed' && previousStatus !== 'completed') {
      order.completedAt = new Date();
    }
    
    // Set failure reason if provided
    if ((status === 'failed' || status === 'refunded') && req.body.failureReason) {
      order.failureReason = req.body.failureReason;
    }
    
    await order.save();
    
    // Send SMS notifications based on status change only if sendSMSNotification is true
    if (sendSMSNotification) {
      try {
        // Format phone number for SMS - remove the '+' prefix
        const formatPhoneForSms = (phone) => {
          // Remove the '+' if it exists
          return phone.replace(/^\+233/, '');
        };
        
        // Get the user's phone who placed the order
        if (order.user && order.user.phone) {
          const userPhone = formatPhoneForSms(order.user.phone);
          
          if (status === 'completed' && previousStatus !== 'completed') {
            // Determine which SMS template to use based on bundleType
            let completionMessage = '';
            
            switch(order.bundleType.toLowerCase()) {
              case 'mtnup2u':
                // Convert MB to GB for display if necessary
                const dataAmount = order.capacity >= 1000 ? `${order.capacity/1000}GB` : `${order.capacity}GB`;
                completionMessage = `${dataAmount} has been credited to ${order.recipientNumber} and is valid for 3 months.`;
                break;
              case 'telecel-5959':
                // Convert MB to GB for display if necessary
                const dataSizeGB = order.capacity >= 1000 ? `${order.capacity/1000}GB` : `${order.capacity}GB`;
                completionMessage = `${dataSizeGB} has been allocated to ${order.recipientNumber} and is valid for 2 months.`;
                break;
              default:
                // Convert MB to GB for display if necessary
                const dataSize = order.capacity >= 1000 ? `${order.capacity/1000}GB` : `${order.capacity}GB`;
                completionMessage = `${dataSize} has been sent to ${order.recipientNumber}.\niGet`;
                break;
            }
            
            // Use the imported sendSMS function from the top of the file
            const smsResult = await sendSMS(userPhone, completionMessage, {
              useCase: 'transactional',
              senderID: senderID
            });
            
            if (smsResult.success) {
              console.log(`Completion SMS sent to user ${userPhone} for order ${order._id} using ${order.bundleType} template with senderID: ${senderID}`);
            } else {
              console.error(`Failed to send completion SMS: ${smsResult.error?.message || 'Unknown error'}`);
            }
          } 
          else if (status === 'failed' || status === 'refunded') {
            // Send refund SMS to the user who placed the order
            
            // Convert MB to GB for display if necessary
            const dataSize = order.capacity >= 1000 ? `${order.capacity/1000}GB` : `${order.capacity}GB`;
            
            const refundMessage = `Your ${dataSize} order to ${order.recipientNumber} failed. The amount has been reversed to your iGet balance. Kindly check your iGet balance to confirm.\niGet`;
            
            // Use the imported sendSMS function from the top of the file
            const smsResult = await sendSMS(userPhone, refundMessage, {
              useCase: 'transactional',
              senderID: senderID
            });
            
            if (smsResult.success) {
              console.log(`Refund SMS sent to user ${userPhone} for order ${order._id} with senderID: ${senderID}`);
            } else {
              console.error(`Failed to send refund SMS: ${smsResult.error?.message || 'Unknown error'}`);
            }
          }
        } else {
          console.error(`User not found or phone number missing for order ${order._id}`);
        }
      } catch (smsError) {
        // Log SMS error but continue with response
        console.error('Failed to send status update SMS:', smsError.message);
      }
    } else {
      console.log(`SMS notification skipped for order ${order._id} status update to ${status} (sendSMSNotification=${sendSMSNotification})`);
    }
    
    res.status(200).json({
      success: true,
      message: `Order status updated successfully${sendSMSNotification ? ' with SMS notification' : ' without SMS notification'}`,
      data: order
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


/**
 * @route   GET /api/orders/trends/weekly
 * @desc    Get order trends by day of week
 * @access  Admin
 */
router.get('/trends/weekly', adminAuth, async (req, res) => {
  try {
    // Parse query parameters for date filtering
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
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
          // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
          dayOfWeek: { $dayOfWeek: "$createdAt" }
        }
      },
      {
        $group: {
          _id: "$dayOfWeek",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
          orders: { $push: "$$ROOT" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Transform data to be more readable
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Create a complete dataset with all days of the week
    const completeData = daysOfWeek.map((day, index) => {
      // Find if we have data for this day (note: MongoDB's $dayOfWeek is 1-based with Sunday as 1)
      const dayData = ordersByDay.find(item => item._id === index + 1);
      
      return {
        day,
        dayIndex: index,
        count: dayData ? dayData.count : 0,
        totalAmount: dayData ? dayData.totalAmount : 0,
        percentage: 0 // Will calculate below
      };
    });
    
    // Calculate total orders to compute percentages
    const totalOrders = completeData.reduce((sum, item) => sum + item.count, 0);
    
    // Add percentage information
    completeData.forEach(item => {
      item.percentage = totalOrders > 0 ? ((item.count / totalOrders) * 100).toFixed(2) : 0;
    });
    
    // Find the day with the highest order count (trend)
    let highestOrderDay = completeData[0];
    completeData.forEach(item => {
      if (item.count > highestOrderDay.count) {
        highestOrderDay = item;
      }
    });
    
    // Calculate the average orders per day
    const averageOrdersPerDay = totalOrders / 7;
    
    // Calculate variance from average for each day (how much higher/lower than average)
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

/**
 * @route   GET /api/orders/trends/user-weekly/:userId
 * @desc    Get order trends by day of week for a specific user
 * @access  Private
 */


/**
 * @route   POST /api/orders
 * @desc    Place an order and deduct from user wallet
 * @access  Private
 */
/**
 * @route   POST /api/orders
 * @desc    Place an order and deduct from user wallet
 * @access  Private
 */
// routes/orders.js - Simplified placeorder route with direct API integration for mtnup2u
// routes/orders.js - Updated placeorder route with Hubnet API integration for mtnup2u
router.post('/placeorder', auth, async (req, res) => {
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
      // Create new order - always with 'pending' status
      const newOrder = new Order({
        user: req.user.id,
        bundleType: bundleType,
        capacity: capacity,
        price: price,
        recipientNumber: recipientNumber,
        status: 'pending', // Always set to pending
        updatedAt: Date.now()
      });
      
      // Generate order reference
      const orderReference = Math.floor(1000 + Math.random() * 900000);
      newOrder.orderReference = orderReference.toString();
      
      // No API calls - just save the order as pending
      console.log(`Order for bundle type ${bundleType} set to pending for manual processing.`);
      
      // Save the order
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
        message: 'Order placed successfully and set for manual processing',
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
          walletBalance: user.wallet.balance
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

// Updated bulk purchase route - no API integration
router.post('/bulk-purchase', auth, async (req, res) => {
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
    
    // Get network configuration to validate bundles
    const network = await NetworkConfig.findOne({ networkKey });
    if (!network) {
      return res.status(404).json({
        success: false,
        message: 'Network not found'
      });
    }
    
    if (!network.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This network is currently unavailable'
      });
    }
    
    // Prepare order data with pricing information
    const processedOrders = [];
    let totalAmount = 0;
    
    for (const order of orders) {
      const { recipient, capacity } = order;
      
      // Validate required fields
      if (!recipient || !capacity) {
        return res.status(400).json({
          success: false,
          message: 'Each order must include recipient and capacity'
        });
      }
      
      // Find the bundle in network configuration
      const bundle = network.bundles.find(b => b.capacity === parseFloat(capacity));
      if (!bundle) {
        return res.status(400).json({
          success: false,
          message: `Invalid bundle capacity: ${capacity} for network ${networkKey}`
        });
      }
      
      if (!bundle.isActive) {
        return res.status(400).json({
          success: false,
          message: `Bundle ${capacity}GB is currently unavailable for ${networkKey}`
        });
      }
      
      const price = bundle.price;
      const resellerPrice = bundle.resellerPrice;
      const profit = price - resellerPrice;
      
      processedOrders.push({
        recipient,
        capacity: parseFloat(capacity),
        price,
        resellerPrice,
        profit
      });
      
      totalAmount += price;
    }
    
    // Check wallet balance
    if (user.wallet.balance < totalAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. Required: GHC ${totalAmount.toFixed(2)}, Available: GHC ${user.wallet.balance.toFixed(2)}`
      });
    }
    
    // Process all orders - no API calls, just store as pending
    const results = {
      successful: 0,
      failed: 0,
      totalAmount: 0,
      orders: []
    };
    
    // Create a single transaction reference for the bulk purchase
    const bulkTransactionReference = new mongoose.Types.ObjectId().toString();
    
    // Process each order
    for (const orderData of processedOrders) {
      try {
        // Generate a reference number
        const prefix = "order";
        const numbers = Math.floor(100000 + Math.random() * 900000).toString();
        const reference = `${prefix}${numbers}`;
        const transactionReference = new mongoose.Types.ObjectId().toString();
        
        // Always set status to pending - no API calls
        const orderStatus = 'pending';
        
        console.log(`Processing order in-system for ${networkKey} - no API integration`);

        // Create order with all details
        const order = new OrderBoris({
          user: user._id,
          reference,
          transactionReference,
          networkKey,
          recipient: orderData.recipient,
          capacity: parseFloat(orderData.capacity),
          price: orderData.price,
          resellerPrice: orderData.resellerPrice,
          profit: orderData.profit,
          status: orderStatus,
          apiOrderId: null, // No API integration
          apiResponse: null, // No API response
          metadata: {
            userBalance: user.wallet.balance,
            orderTime: new Date(),
            isApiOrder: false, // Not an API order
            isBulkOrder: true,
            bulkTransactionReference
          }
        });

        await order.save({ session });
        
        // All orders are successful since we're not calling APIs
        results.successful++;
        results.totalAmount += orderData.price;
        
        // Add to results
        results.orders.push({
          recipient: orderData.recipient,
          capacity: orderData.capacity,
          price: orderData.price,
          status: orderStatus,
          reference: reference
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
    
    // Deduct the total amount from wallet for successful orders
    if (results.successful > 0) {
      // Create a bulk transaction record
      user.wallet.transactions.push({
        type: 'debit',
        amount: results.totalAmount,
        reference: bulkTransactionReference,
        description: `Bulk purchase: ${results.successful} data bundles for ${networkKey}`,
        timestamp: new Date()
      });
      
      // Update user balance
      user.wallet.balance -= results.totalAmount;
      await user.save({ session });
    }
    
    // Commit the transaction
    await session.commitTransaction();
    
    // Return results
    res.status(200).json({
      success: true,
      message: `Bulk purchase processed: ${results.successful} orders created and set to pending for manual processing`,
      data: {
        totalOrders: processedOrders.length,
        successful: results.successful,
        failed: results.failed,
        totalAmount: results.totalAmount,
        newBalance: user.wallet.balance,
        orders: results.orders
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