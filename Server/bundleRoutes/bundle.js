// routes/bundles.js with role-based pricing including dealer role (no automatic pricing)
const express = require('express');
const router = express.Router();
const { Bundle, User } = require('../schema/schema');
const authMiddleware = require('../AuthMiddle/middlewareauth');
const adminMiddleware = require('../adminMiddlware/middleware');

// Role configuration
const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  AGENT: 'agent',
  EDITOR: 'Editor',
  DEALER: 'dealer'
};

// Allowed bundle types
const ALLOWED_BUNDLE_TYPES = [
  'mtnup2u', 
  'mtn-fibre', 
  'mtn-justforu', 
  'AT-ishare', 
  'Telecel-5959', 
  'AfA-registration', 
  'other'
];

// Helper function to format bundle with role-specific pricing
const formatBundleWithRolePricing = (bundle, userRole) => {
  const bundleObj = bundle.toObject();
  
  // Get the role-specific price or default to standard price
  const rolePrice = bundle.rolePricing && bundle.rolePricing[userRole] 
    ? bundle.rolePricing[userRole] 
    : bundle.price;
  
  // Format based on user role
  if (userRole === ROLES.ADMIN) {
    // Admins see all pricing information
    bundleObj.userPrice = rolePrice;
    bundleObj.allPrices = bundle.rolePricing || {};
    bundleObj.standardPrice = bundle.price;
  } else {
    // All other users (including dealers) see only their price
    bundleObj.price = rolePrice;
  }
  
  return bundleObj;
};

// Get all active bundles with prices based on user role
router.get('/bundle', authMiddleware, async (req, res) => {
  try {
    // Get user's role from auth middleware
    const userRole = req.user.role || ROLES.USER;
    
    // Find all active bundles
    const bundles = await Bundle.find({ isActive: true });
    
    // Format response with role-specific pricing
    const bundlesWithUserPrices = bundles.map(bundle => 
      formatBundleWithRolePricing(bundle, userRole)
    );
    
    res.status(200).json({ 
      success: true, 
      userRole: userRole,
      data: bundlesWithUserPrices 
    });
  } catch (error) {
    console.error('Error fetching bundles:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get bundles by type with prices based on user role
router.get('/bundle/:type', authMiddleware, async (req, res) => {
  try {
    const { type } = req.params;
    
    // Get user's role from auth middleware
    const userRole = req.user.role || ROLES.USER;
    
    // Validate if type is one of the allowed enum values
    if (!ALLOWED_BUNDLE_TYPES.includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid bundle type',
        allowedTypes: ALLOWED_BUNDLE_TYPES 
      });
    }
    
    // Find active bundles of the specified type
    const bundles = await Bundle.find({ isActive: true, type });
    
    // Format response with role-specific pricing
    const bundlesWithUserPrices = bundles.map(bundle => 
      formatBundleWithRolePricing(bundle, userRole)
    );
    
    res.status(200).json({ 
      success: true, 
      userRole: userRole,
      bundleType: type,
      count: bundlesWithUserPrices.length,
      data: bundlesWithUserPrices 
    });
  } catch (error) {
    console.error(`Error fetching bundles of type ${req.params.type}:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get a single bundle by ID with price based on user role
router.get('/bundle-details/:id', authMiddleware, async (req, res) => {
  try {
    // Get user's role from auth middleware
    const userRole = req.user.role || ROLES.USER;
    
    // Find the bundle by ID
    const bundle = await Bundle.findOne({ _id: req.params.id, isActive: true });
    
    if (!bundle) {
      return res.status(404).json({ success: false, message: 'Bundle not found' });
    }
    
    // Format response with role-specific pricing
    const bundleObj = formatBundleWithRolePricing(bundle, userRole);
    
    res.status(200).json({ 
      success: true, 
      userRole: userRole,
      data: bundleObj 
    });
  } catch (error) {
    console.error(`Error fetching bundle ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create a new bundle (admin only)
router.post('/addbundle', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const { capacity, price, type, rolePricing, description } = req.body;
    
    // Validate required fields
    if (!capacity || !price || !type) {
      return res.status(400).json({ 
        success: false, 
        message: 'Capacity, price, and type are required fields' 
      });
    }
    
    // Validate price is a positive number
    if (price <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Price must be a positive number' 
      });
    }
    
    // Validate bundle type
    if (!ALLOWED_BUNDLE_TYPES.includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid bundle type',
        allowedTypes: ALLOWED_BUNDLE_TYPES 
      });
    }
    
    // Create bundle - only include rolePricing if explicitly provided
    const bundleData = {
      capacity,
      price,
      type,
      description: description || '',
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    // Only add rolePricing if it's explicitly provided
    if (rolePricing) {
      bundleData.rolePricing = rolePricing;
    }
    
    const bundle = new Bundle(bundleData);
    
    await bundle.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Bundle created successfully',
      data: bundle 
    });
  } catch (error) {
    console.error('Error creating bundle:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update a bundle by ID (admin only)
router.put('/:id', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const updates = { ...req.body };
    
    // Validate price if it's being updated
    if (updates.price !== undefined && updates.price <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Price must be a positive number' 
      });
    }
    
    // Validate bundle type if it's being updated
    if (updates.type && !ALLOWED_BUNDLE_TYPES.includes(updates.type)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid bundle type',
        allowedTypes: ALLOWED_BUNDLE_TYPES 
      });
    }
    
    // Always update the timestamp
    updates.updatedAt = Date.now();
    
    const bundle = await Bundle.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!bundle) {
      return res.status(404).json({ success: false, message: 'Bundle not found' });
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Bundle updated successfully',
      data: bundle 
    });
  } catch (error) {
    console.error(`Error updating bundle ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update role pricing for a specific bundle (admin only)
router.patch('/:id/role-pricing', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const { rolePricing } = req.body;
    
    if (!rolePricing || typeof rolePricing !== 'object') {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid rolePricing object is required' 
      });
    }
    
    const bundle = await Bundle.findByIdAndUpdate(
      req.params.id,
      { 
        rolePricing: rolePricing,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );
    
    if (!bundle) {
      return res.status(404).json({ success: false, message: 'Bundle not found' });
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Role pricing updated successfully',
      data: bundle 
    });
  } catch (error) {
    console.error(`Error updating role pricing for bundle ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete/deactivate a bundle (admin only)
router.delete('/:id', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const bundle = await Bundle.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedAt: Date.now() },
      { new: true }
    );
    
    if (!bundle) {
      return res.status(404).json({ success: false, message: 'Bundle not found' });
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Bundle deactivated successfully',
      data: {} 
    });
  } catch (error) {
    console.error(`Error deactivating bundle ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reactivate a bundle (admin only)
router.patch('/:id/reactivate', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const bundle = await Bundle.findByIdAndUpdate(
      req.params.id,
      { isActive: true, updatedAt: Date.now() },
      { new: true }
    );
    
    if (!bundle) {
      return res.status(404).json({ success: false, message: 'Bundle not found' });
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Bundle reactivated successfully',
      data: bundle 
    });
  } catch (error) {
    console.error(`Error reactivating bundle ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user wallet balance
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    // The user ID is available from the authentication middleware
    const userId = req.user.id;
    
    // Find the user and select only the wallet field
    const user = await User.findById(userId).select('wallet');
    
    if (!user || !user.wallet) {
      return res.status(404).json({ 
        success: false, 
        message: 'User wallet not found' 
      });
    }
    
    res.status(200).json({ 
      success: true, 
      data: {
        balance: user.wallet.balance,
        currency: user.wallet.currency || 'GHS'
      }
    });
  } catch (error) {
    console.error(`Error fetching wallet balance for user ${req.user.id}:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all supported roles (admin only)
router.get('/supported-roles', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    res.status(200).json({ 
      success: true, 
      data: {
        roles: Object.values(ROLES),
        bundleTypes: ALLOWED_BUNDLE_TYPES
      }
    });
  } catch (error) {
    console.error('Error fetching supported roles:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;