const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const ConnectDB = require('./connection/connection.js');
const authRoutes = require('./AuthRoutes/Auth.js');
const dataOrderRoutes = require('./PlaceOrderRoutes/placeorder.js');
// const UserDashboard= require('./stat/page.js')
const AddBundle = require('./bundleRoutes/bundle.js');
const Deposite = require('./deposite/deposite.js')
const Orders = require('./orders/orders.js');
const apiKey = require('./api-key/api-key.js')
const userManagement = require('./Usermanagement/page.js');
const adminCheck = require('./AdminCheck/admincheck.js')
const DeveloperApi = require('./DeveloperApi/developer.js')
const Ishare =  require('./isharePlace/Ishare.js')
const UserDashboard = require('./usedashboard/page.js')
const Afa = require('./afa-registration/afa.js')
const NetworkAvailability = require('./NetworkStock/rout.js'); // Import the network availability route
// const Depoite = require('./routes/deposite.js');
const adminMessages = require('./MessageTemplate/adminMessage.js');
const AdminSettings = require('./admin-settingRoute/admin-settings.js'); // Import the AdminSettings model

dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
// Update your CORS configuration
app.use(cors());
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

// Function to fix database indexes
async function fixDatabaseIndexes() {
  try {
    console.log('Checking database indexes...');
    
    // Wait for connection to be ready
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => {
        mongoose.connection.once('open', resolve);
      });
    }
    
    const db = mongoose.connection.db;
    
    // Fix keymediausers collection indexes
    const usersCollection = db.collection('keymediausers');
    
    // Check existing indexes
    const indexes = await usersCollection.indexes();
    console.log('Current user indexes:', indexes.map(idx => ({ 
      name: idx.name, 
      key: idx.key, 
      unique: idx.unique,
      sparse: idx.sparse 
    })));
    
    // Fix apiKey index
    const apiKeyIndex = indexes.find(idx => idx.name === 'apiKey_1');
    if (apiKeyIndex && !apiKeyIndex.sparse) {
      console.log('Fixing apiKey index to be sparse...');
      try {
        await usersCollection.dropIndex('apiKey_1');
        await usersCollection.createIndex(
          { apiKey: 1 }, 
          { unique: true, sparse: true }
        );
        console.log('✓ apiKey index fixed successfully');
      } catch (error) {
        console.error('Error fixing apiKey index:', error.message);
      }
    }
    
    // Fix orders collection indexes
    const ordersCollection = db.collection('keymediaorders');
    try {
      const orderIndexes = await ordersCollection.indexes();
      const orderRefIndex = orderIndexes.find(idx => idx.name === 'orderReference_1');
      
      if (orderRefIndex && !orderRefIndex.sparse) {
        console.log('Fixing orderReference index to be sparse...');
        await ordersCollection.dropIndex('orderReference_1');
        await ordersCollection.createIndex(
          { orderReference: 1 }, 
          { unique: true, sparse: true }
        );
        console.log('✓ orderReference index fixed successfully');
      }
    } catch (error) {
      console.log('Orders collection might not exist yet');
    }
    
    // Fix transactions collection indexes
    const transactionsCollection = db.collection('keymediatransactions');
    try {
      const transactionIndexes = await transactionsCollection.indexes();
      const refIndex = transactionIndexes.find(idx => idx.name === 'reference_1');
      
      if (refIndex && !refIndex.sparse) {
        console.log('Fixing transaction reference index to be sparse...');
        await transactionsCollection.dropIndex('reference_1');
        await transactionsCollection.createIndex(
          { reference: 1 }, 
          { unique: true, sparse: true }
        );
        console.log('✓ transaction reference index fixed successfully');
      }
    } catch (error) {
      console.log('Transactions collection might not exist yet');
    }
    
    console.log('✓ Database index check completed');
    
    // Optional: Fix users that need API keys but don't have them
    try {
      const { User } = require('./schema/schema');
      const usersNeedingKeys = await User.find({
        apiKey: { $exists: false },
        role: { $in: ['admin', 'agent', 'wallet_admin'] }
      });
      
      if (usersNeedingKeys.length > 0) {
        console.log(`Found ${usersNeedingKeys.length} users that need API keys`);
        for (const user of usersNeedingKeys) {
          await user.generateApiKey();
          await user.save();
          console.log(`✓ Generated API key for user: ${user.username}`);
        }
      }
    } catch (error) {
      console.log('Could not check for users needing API keys:', error.message);
    }
    
  } catch (error) {
    console.error('Error during index maintenance:', error);
    // Don't throw - let the server continue starting
  }
}

// Connect to Database
const connectResult = ConnectDB();

// Handle both Promise and non-Promise ConnectDB implementations
if (connectResult && typeof connectResult.then === 'function') {
  // ConnectDB returns a Promise
  connectResult.then(() => {
    setTimeout(() => {
      fixDatabaseIndexes();
    }, 1000);
  }).catch(err => {
    console.error('Database connection error:', err);
  });
} else {
  // ConnectDB doesn't return a Promise, it just connects
  // Set up a listener for when connection is ready
  mongoose.connection.once('open', () => {
    console.log('MongoDB connection established');
    setTimeout(() => {
      fixDatabaseIndexes();
    }, 1000);
  });
  
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });
}

// Routes
app.use('/api', authRoutes);
app.use('/api/order', dataOrderRoutes);
app.use('/api', UserDashboard);
app.use('/api/iget', AddBundle);
app.use('/api/depsoite', Deposite);
app.use('/api/orders', Orders);
app.use('/api/v1', apiKey);
app.use('/api/admin', userManagement);
app.use('/api/auth', adminCheck);
app.use('/api/developer', DeveloperApi);
app.use('/api/ishare',Ishare)
app.use('/api/dashboard',UserDashboard)
app.use('/api/afa', Afa);
app.use('/api/network', NetworkAvailability); // Use the network availability route
app.use('/api/messages', adminMessages); // Use the message template route
app.use('/api/admin/settings', AdminSettings); // Use the admin settings route

// Default Route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({ 
      status: 'ok', 
      database: dbStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});