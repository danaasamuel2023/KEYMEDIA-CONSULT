// routes/api.js - Updated with DataWorks API integration for MTN UP2U orders
const express = require('express');
const router = express.Router();
const axios = require('axios'); // Add axios import
const { Order, User, Transaction, Bundle } = require('../schema/schema');
const apiAuth = require('../middlewareApi/ApiAuth');
const { ApiLog } = require('../schema/schema');
const mongoose = require('mongoose');

// DataWorks API configuration
const DATAWORKS_CONFIG = {
  API_URL: 'https://api.dataworksgh.com/api/abusua.php',
  SUPER_AGENT_EMAIL: process.env.DATAWORKS_AGENT_EMAIL || 'keymediaconsult34@gmail.com'
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
 * @route   POST /api/v1/orders/place
 * @desc    Place an order using API key auth - WITH DataWorks API integration for MTN UP2U
 * @access  Private (API Key)
 */
router.post('/orders/place', apiAuth, async (req, res) => {
  try {
    const { recipientNumber, capacity, bundleType } = req.body;
    
    // Validate required fields
    if (!recipientNumber || !capacity || !bundleType) {
      return res.status(400).json({
        success: false,
        message: 'Recipient number, capacity, and bundle type are all required'
      });
    }
    
    // Find the matching bundle to get the correct price
    const bundle = await Bundle.findOne({ 
      type: bundleType,
      capacity: capacity,
      isActive: true
    });
    
    if (!bundle) {
      return res.status(404).json({
        success: false,
        message: `No active bundle found matching type ${bundleType} with capacity ${capacity}MB`
      });
    }
    
    // Use the price from the bundle record
    const price = bundle.price;
    
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
        message: `Insufficient balance in wallet. Required: ${price} ${user.wallet.currency}, Available: ${user.wallet.balance} ${user.wallet.currency}`
      });
    }
    
    // Start a session for the transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Generate unique order reference
      const orderReference = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Determine initial status and whether to call API
      let initialStatus = 'pending';
      let apiCallResult = null;
      let apiReference = null;
      
      // Only call DataWorks API if bundle type is mtnup2u
      if (bundleType.toLowerCase() === 'mtnup2u') {
        console.log('🔄 Processing MTN UP2U order via API - calling DataWorks API...');
        
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
        // Add metadata to track API source and response
        metadata: {
          source: 'api',
          apiVersion: 'v1',
          orderPlacedAt: new Date(),
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
      
      console.log(`API Order ${orderReference} for bundle type ${bundleType} - status: ${initialStatus}`);
      
      await newOrder.save({ session });
      
      // Create transaction record - money is deducted
      const transaction = new Transaction({
        user: req.user.id,
        type: 'purchase',
        amount: price,
        currency: user.wallet.currency,
        description: `API Order: ${capacity}MB ${bundleType} for ${recipientNumber}`,
        status: 'completed',
        reference: 'API-TXN-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
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
      
      console.log(`API Order ${orderReference} placed successfully. User balance updated: ${user.wallet.balance}`);
      
      // Return the created order
      res.status(201).json({
        success: true,
        message: initialStatus === 'completed' 
          ? 'Order completed successfully via API!' 
          : 'Order placed successfully via API and set for manual processing',
        data: {
          order: {
            id: newOrder._id,
            orderReference: newOrder.orderReference,
            recipientNumber: newOrder.recipientNumber,
            bundleType: newOrder.bundleType,
            capacity: newOrder.capacity,
            price: price,
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
          processing: {
            method: initialStatus === 'completed' ? 'automatic' : 'manual',
            note: initialStatus === 'completed'
              ? 'Your MTN data bundle has been sent successfully!'
              : apiCallResult && !apiCallResult.success
                ? `Order pending due to API error: ${apiCallResult.message}. Our Editors will process it manually.`
                : 'Order will be processed manually by system administrators',
            externalApiUsed: bundleType.toLowerCase() === 'mtnup2u',
            apiIntegration: {
              enabled: bundleType.toLowerCase() === 'mtnup2u',
              attempted: !!apiCallResult,
              success: apiCallResult?.success || false,
              message: apiCallResult?.message || null
            }
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
    console.error('Error placing order via API:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/orders/reference/:orderRef
 * @desc    Get order details by order reference
 * @access  Private (API Key)
 */
router.get('/orders/reference/:orderRef', apiAuth, async (req, res) => {
  try {
    const orderReference = req.params.orderRef;
    
    // Validate order reference format
    if (!orderReference) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order reference is required' 
      });
    }
    
    // Find the order by reference, ensuring it belongs to the authenticated user
    const order = await Order.findOne({
      orderReference: orderReference,
      user: req.user.id
    });

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found or not authorized to access' 
      });
    }

    // Find related transaction for this order
    const transaction = await Transaction.findOne({
      orderId: order._id,
      user: req.user.id
    }).select('reference amount status');

    res.status(200).json({ 
      success: true, 
      data: {
        order: {
          id: order._id,
          orderReference: order.orderReference,
          recipientNumber: order.recipientNumber,
          bundleType: order.bundleType,
          capacity: order.capacity,
          price: order.price,
          status: order.status,
          createdAt: order.createdAt,
          completedAt: order.completedAt,
          failureReason: order.failureReason,
          processedManually: order.status === 'pending' || !order.apiReference
        },
        transaction: transaction ? {
          reference: transaction.reference,
          amount: transaction.amount,
          status: transaction.status
        } : null,
        processingInfo: {
          method: order.status === 'completed' && order.apiReference ? 'automatic' : 'manual',
          externalApiUsed: order.bundleType?.toLowerCase() === 'mtnup2u' && !!order.apiReference,
          note: order.status === 'completed' && order.apiReference
            ? 'Order was processed automatically via DataWorks API'
            : 'Order requires manual processing by system administrators'
        }
      }
    });
  } catch (error) {
    console.error('Error fetching order by reference:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/v1/account/balance
 * @desc    Get user wallet balance via API
 * @access  Private (API Key)
 */
router.get('/account/balance', apiAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('wallet username');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        username: user.username,
        balance: user.wallet.balance,
        currency: user.wallet.currency,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Error fetching balance via API:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/orders/my-orders
 * @desc    Get user's orders via API
 * @access  Private (API Key)
 */
router.get('/orders/my-orders', apiAuth, async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Filter parameters
    const filter = { user: req.user.id };
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.bundleType) {
      filter.bundleType = req.query.bundleType;
    }
    
    // Get total count
    const total = await Order.countDocuments(filter);
    
    // Get orders
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-user'); // Don't return user field for security
    
    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalOrders: total,
          ordersPerPage: limit
        },
        processingInfo: {
          method: 'automatic for MTN UP2U, manual for others',
          note: 'MTN UP2U orders are processed automatically via DataWorks API. Other bundle types require manual processing.'
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user orders via API:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;