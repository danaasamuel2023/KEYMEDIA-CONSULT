// routes/orders.js - Updated to store orders as pending without API calls
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