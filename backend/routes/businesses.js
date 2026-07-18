const express = require('express');
const { DataTypes } = require('../models');
const { authenticateToken } = require('./auth');

const router = express.Router();
const { Business, Shop, User, UserShop } = require('../models');

// Get all businesses for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const businesses = await Business.findAll({
      where: { ownerId: userId, isActive: true },
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: businesses });
  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch businesses' });
  }
});

// Get a single business by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const business = await Business.findOne({
      where: { id, ownerId: userId, isActive: true },
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Shop,
          as: 'shops',
          where: { isActive: true },
          required: false,
          attributes: ['id', 'name', 'type', 'address', 'phone', 'businessId', 'settings']
        }
      ]
    });

    if (!business) {
      return res.status(404).json({ success: false, error: 'Business not found' });
    }

    res.json({ success: true, data: business });
  } catch (error) {
    console.error('Error fetching business:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch business' });
  }
});

// Create a new business
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, type, description } = req.body;

    if (!name || !type) {
      return res.status(400).json({ success: false, error: 'Name and type are required' });
    }

    // Enforce plan / trial restrictions on business creation.
    // A user may create their first business (which starts a free trial).
    // Additional businesses are only allowed once the user has a paid plan.
    const existingBusinesses = await Business.findAll({
      where: { ownerId: userId, isActive: true }
    });

    if (existingBusinesses.length > 0) {
      const hasActivePaidPlan = existingBusinesses.some((b) => {
        const sub = b.subscription || {};
        if (sub.status === 'expired') return false;
        if (sub.status === 'trial') {
          // Trial is only valid if it hasn't ended yet.
          if (!sub.trialEndsAt) return false;
          return new Date(sub.trialEndsAt).getTime() > Date.now();
        }
        // Any other status (active, paid, etc.) counts as a paid plan.
        return true;
      });

      if (!hasActivePaidPlan) {
        const trialExpired = existingBusinesses.some((b) => {
          const sub = b.subscription || {};
          if (sub.status === 'expired') return true;
          if (sub.status === 'trial' && sub.trialEndsAt) {
            return new Date(sub.trialEndsAt).getTime() <= Date.now();
          }
          return false;
        });

        return res.status(403).json({
          success: false,
          code: trialExpired ? 'TRIAL_EXPIRED' : 'TRIAL_LIMIT',
          error: trialExpired
            ? 'Your free trial has ended. Please purchase a plan to add more businesses.'
            : 'You can only have one business during the free trial. Purchase a plan to add more businesses.'
        });
      }
    }

    const business = await Business.create({
      name,
      type,
      description: description || '',
      ownerId: userId,
      subscription: {
        plan: 'starter',
        status: 'trial',
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days trial
        expiresAt: null,
        modules: ['core'], // Starter plan gets only Core ERP during trial
        usersLimit: 3,
        smsCredits: 100
      }
    });

    res.status(201).json({ success: true, data: business });
  } catch (error) {
    console.error('Error creating business:', error);
    res.status(500).json({ success: false, error: 'Failed to create business' });
  }
});

// Update a business
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { name, type, description, subscription } = req.body;

    const business = await Business.findOne({
      where: { id, ownerId: userId, isActive: true }
    });

    if (!business) {
      return res.status(404).json({ success: false, error: 'Business not found' });
    }

    await business.update({
      name: name || business.name,
      type: type || business.type,
      description: description !== undefined ? description : business.description,
      subscription: subscription || business.subscription
    });

    res.json({ success: true, data: business });
  } catch (error) {
    console.error('Error updating business:', error);
    res.status(500).json({ success: false, error: 'Failed to update business' });
  }
});

// Delete a business (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const business = await Business.findOne({
      where: { id, ownerId: userId, isActive: true }
    });

    if (!business) {
      return res.status(404).json({ success: false, error: 'Business not found' });
    }

    await business.update({ isActive: false });

    res.json({ success: true, message: 'Business deleted successfully' });
  } catch (error) {
    console.error('Error deleting business:', error);
    res.status(500).json({ success: false, error: 'Failed to delete business' });
  }
});

// Get business statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const business = await Business.findOne({
      where: { id, ownerId: userId, isActive: true }
    });

    if (!business) {
      return res.status(404).json({ success: false, error: 'Business not found' });
    }

    // Get shops count
    const shopsCount = await Shop.count({
      where: { businessId: id, isActive: true }
    });

    // Get users count (employees in this business's shops)
    const usersCount = await UserShop.count({
      include: [{
        model: Shop,
        as: 'shop',
        where: { businessId: id, isActive: true },
        required: true
      }]
    });

    // Get products count
    const productsCount = await Shop.findAll({
      where: { businessId: id, isActive: true },
      include: [{
        model: Shop,
        as: 'products',
        attributes: ['id']
      }]
    });

    const totalProducts = productsCount.reduce((sum, shop) => sum + (shop.products?.length || 0), 0);

    res.json({
      success: true,
      data: {
        shops: shopsCount,
        users: usersCount,
        products: totalProducts,
        subscription: business.subscription
      }
    });
  } catch (error) {
    console.error('Error fetching business stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch business statistics' });
  }
});

module.exports = router;