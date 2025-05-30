// routes/api.js - Updated to store orders as pending without external API calls
const express = require('express');
const router = express.Router();
const { Order, User, Transaction, Bundle } = require('../schema/schema');
const apiAuth = require('../middlewareApi/ApiAuth');
const { ApiLog } = require('../schema/schema');
const mongoose = require('mongoose');

/**
 * @route   POST /api/v1/orders/place
 * @desc    Place an order using API key auth - No external API integration
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
      const orderReference = Math.floor(100000 + Math.random() * 900000);
      
      // Create new order - ALWAYS PENDING (NO EXTERNAL API CALLS)
      const newOrder = new Order({
        user: req.user.id,
        bundleType: bundleType,
        capacity: capacity,
        price: price,
        recipientNumber: recipientNumber,
        status: 'pending', // Always pending - no external API integration
        orderReference: orderReference.toString(),
        updatedAt: Date.now(),
        // Clear all API-related fields since we don't use external APIs
        apiReference: null,
        hubnetReference: null,
        // Add metadata to track API source
        metadata: {
          source: 'api',
          apiVersion: 'v1',
          orderPlacedAt: new Date(),
          noExternalApiCall: true
        }
      });
      
      console.log(`API Order ${orderReference} for bundle type ${bundleType} - set to pending for manual processing (NO EXTERNAL API CALLS)`);
      
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
        message: 'Order placed successfully via API and set for manual processing',
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
            method: 'manual',
            note: 'Order will be processed manually by system administrators',
            externalApiUsed: false
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
          processedManually: true // Indicate this is processed manually
        },
        transaction: transaction ? {
          reference: transaction.reference,
          amount: transaction.amount,
          status: transaction.status
        } : null,
        processingInfo: {
          method: 'manual',
          externalApiUsed: false,
          note: 'All orders are processed manually by system administrators'
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
          method: 'manual',
          note: 'All orders are processed manually - no external API integration'
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