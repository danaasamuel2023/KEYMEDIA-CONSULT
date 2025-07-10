// routes/users.js
const express = require('express');
const router = express.Router();
const { User, ApiLog } = require('../schema/schema');
const authMiddleware = require('./../AuthMiddle/middlewareauth');

// Helper function to log API key operations
async function logApiKeyOperation(user, action, ipAddress, userAgent) {
  try {
    if (ApiLog) {
      await ApiLog.create({
        user: user._id,
        endpoint: `/api/users/api-key`,
        method: action,
        ipAddress: ipAddress,
        userAgent: userAgent,
        status: 200,
        adminMetadata: {
          actionType: action,
          actionDescription: `API key ${action} for user ${user.username}`,
          sensitiveAction: true
        }
      });
    }
  } catch (error) {
    console.error('Failed to log API key operation:', error);
  }
}

// Generate API key for authenticated user
router.post('/generate-api-key', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check if user's role is allowed to have an API key
    const allowedRoles = ['admin', 'agent', 'wallet_admin','super_agent'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `API keys are only available for ${allowedRoles.join(', ')} roles` 
      });
    }
    
    // Check if user already has an API key
    if (user.apiKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'API key already exists. Please revoke the existing key first or use regenerate endpoint.' 
      });
    }
    
    // Generate a new API key (now async)
    const apiKey = await user.generateApiKey();
    await user.save();
    
    // Log the operation
    await logApiKeyOperation(user, 'generated', req.ip, req.get('user-agent'));
    
    res.status(200).json({ 
      success: true, 
      message: 'API key generated successfully',
      data: { 
        apiKey: apiKey,
        // Include warning about storing the key
        warning: 'Please store this API key securely. It will not be shown again in full.' 
      }
    });
  } catch (error) {
    console.error('Error generating API key:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Regenerate API key (replaces existing key)
router.post('/regenerate-api-key', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check if user's role is allowed to have an API key
    const allowedRoles = ['admin', 'agent', 'wallet_admin'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `API keys are only available for ${allowedRoles.join(', ')} roles` 
      });
    }
    
    // Regenerate the API key (this method handles the async generation)
    const newApiKey = await user.regenerateApiKey();
    
    // Log the operation
    await logApiKeyOperation(user, 'regenerated', req.ip, req.get('user-agent'));
    
    res.status(200).json({ 
      success: true, 
      message: 'API key regenerated successfully',
      data: { 
        apiKey: newApiKey,
        warning: 'Your old API key is now invalid. Please update your applications with this new key.' 
      }
    });
  } catch (error) {
    console.error('Error regenerating API key:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get current API key status (if it exists)
router.get('/api-key', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check if user's role is allowed to have an API key
    const allowedRoles = ['admin', 'agent', 'wallet_admin'];
    const canHaveApiKey = allowedRoles.includes(user.role);
    
    if (!canHaveApiKey) {
      return res.status(200).json({ 
        success: true,
        hasApiKey: false,
        canHaveApiKey: false,
        message: `API keys are only available for ${allowedRoles.join(', ')} roles`,
        currentRole: user.role
      });
    }
    
    if (!user.apiKey) {
      return res.status(200).json({ 
        success: true, 
        hasApiKey: false,
        canHaveApiKey: true,
        message: 'No API key found. You can generate one.',
        currentRole: user.role
      });
    }
    
    res.status(200).json({ 
      success: true, 
      hasApiKey: true,
      canHaveApiKey: true,
      currentRole: user.role,
      // Show partial API key for verification
      apiKeyPreview: user.apiKey.substring(0, 6) + '••••••••' + user.apiKey.slice(-4),
      // Include when it was last updated
      lastUpdated: user.updatedAt
    });
  } catch (error) {
    console.error('Error fetching API key status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Revoke API key
router.delete('/api-key', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (!user.apiKey) {
      return res.status(404).json({ 
        success: false, 
        message: 'No API key found to revoke' 
      });
    }
    
    // Revoke the API key
    user.apiKey = undefined;
    await user.save();
    
    // Log the operation
    await logApiKeyOperation(user, 'revoked', req.ip, req.get('user-agent'));
    
    res.status(200).json({ 
      success: true, 
      message: 'API key revoked successfully. You can generate a new one if needed.'
    });
  } catch (error) {
    console.error('Error revoking API key:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -apiKey') // Exclude sensitive fields
      .populate('wallet.transactions', 'type amount status createdAt');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Add role description
    const profile = user.toObject();
    profile.roleDescription = user.getRoleDescription();
    profile.permissions = user.adminMetadata?.permissions || {};
    
    res.status(200).json({ 
      success: true, 
      data: profile
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update user profile (limited fields)
router.patch('/profile', authMiddleware, async (req, res) => {
  try {
    const allowedUpdates = ['phone', 'email']; // Only allow certain fields to be updated
    const updates = Object.keys(req.body)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {});
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No valid fields to update' 
      });
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password -apiKey');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        success: false, 
        message: `${field} already exists` 
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user's wallet balance
router.get('/wallet', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('wallet username email role');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.status(200).json({ 
      success: true, 
      data: {
        balance: user.wallet.balance,
        currency: user.wallet.currency,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;