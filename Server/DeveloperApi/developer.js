// routes/api.js - Updated to store orders as pending without external API calls
const express = require('express');
const router = express.Router();
const { Order, User, Transaction, Bundle } = require('../schema/schema');
const apiAuth = require('../middlewareApi/ApiAuth');
const { ApiLog } = require('../schema/schema');
const mongoose = require('mongoose');
const AdminSettings = require('../AdminSettingSchema/AdminSettings.js'); // Import Admin Settings model

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
        message: `Insufficient balance in wallet. Required: ${price} ${user.wallet.currency}`
      });
    }
    
    // Start a session for the transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Create new order with bundle details directly embedded
      // Always set status to 'pending' - no external API calls
      const newOrder = new Order({
        user: req.user.id,
        bundleType: bundleType,
        capacity: capacity,
        price: price,
        recipientNumber: recipientNumber,
        status: 'pending', // Always pending for manual processing
        updatedAt: Date.now()
      });
      
      // Generate unique order reference for all order types
      const orderReference = Math.floor(1000 + Math.random() * 900000);
      newOrder.orderReference = orderReference.toString();
      
      // No external API calls - all orders are set to pending for manual processing
      console.log(`Order for bundle type ${bundleType} set to pending for manual processing. No external API integration.`);
      
      // Clear any API-related fields since we're not using external APIs
      newOrder.apiReference = null;
      newOrder.hubnetReference = null;
      
      await newOrder.save({ session });
      
      // Create transaction record
      const transaction = new Transaction({
        user: req.user.id,
        type: 'purchase',
        amount: price,
        currency: user.wallet.currency,
        description: `API: Bundle purchase: ${capacity}GB for ${recipientNumber}`,
        status: 'completed',
        reference: 'API-TXN-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
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
          failureReason: order.failureReason
        },
        transaction: transaction ? {
          reference: transaction.reference,
          amount: transaction.amount,
          status: transaction.status
        } : null
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

module.exports = router;