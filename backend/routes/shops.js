const express = require('express');
const router = express.Router();
const { Shop, User, UserShop } = require('../models');

const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Get user's shops
router.get('/', verifyToken, async (req, res) => {
  try {
    const userShops = await UserShop.findAll({
      where: { 
        userId: req.user.userId,
        isActive: true 
      },
      include: [{
        model: Shop,
        as: 'shop'
      }],
      order: [['createdAt', 'DESC']]
    });

    const shops = userShops.map(us => ({
      ...us.shop.toJSON(),
      role: us.role,
      joinedAt: us.joinedAt,
      isActive: us.isActive
    }));

    res.json({
      success: true,
      data: shops
    });
  } catch (error) {
    console.error('Get shops error:', error);
    res.status(500).json({ error: 'Failed to fetch shops' });
  }
});

// Create new shop
router.post('/', verifyToken, async (req, res) => {
  try {
    console.log('🔄 Backend: Create shop request received');
    console.log('📥 Backend: Request body:', JSON.stringify(req.body, null, 2));
    console.log('👤 Backend: User ID:', req.user?.userId);
    
    const { 
      name, 
      type, 
      address, 
      phone, 
      email, 
      gstNumber, 
      logo,
      settings 
    } = req.body;

    console.log('📋 Backend: Extracted data:', {
      name,
      type,
      address,
      phone,
      email,
      gstNumber,
      logo,
      settings
    });

    // Validation
    if (!name || !type) {
      console.log('❌ Backend: Validation failed - missing name or type');
      return res.status(400).json({ 
        error: 'Shop name and type are required' 
      });
    }

    // Check if user already has a shop with same name
    console.log('🔍 Backend: Checking for existing shop with name:', name.trim());
    
    const existingShop = await UserShop.findOne({
      where: { 
        userId: req.user.userId,
        isActive: true 
      },
      include: [{
        model: Shop,
        as: 'shop',
        where: { name: name.trim() }
      }]
    });

    console.log('📋 Backend: Existing shop check result:', existingShop ? 'Found existing shop' : 'No existing shop');

    if (existingShop) {
      console.log('❌ Backend: Shop already exists with name:', name.trim());
      return res.status(400).json({ 
        error: 'You already have a shop with this name' 
      });
    }

    // Create new shop
    const newShop = await Shop.create({
      name: name.trim(),
      type: type,
      address: address || '',
      phone: phone || '',
      email: email || '',
      gstNumber: gstNumber || '',
      logo: logo || '',
      settings: settings || {
        currency: 'INR',
        taxEnabled: true,
        taxRate: 18,
        invoicePrefix: 'INV',
        lowStockAlert: true,
        minStockLevel: 10
      }
    });

    // Create user-shop association (owner)
    await UserShop.create({
      userId: req.user.userId,
      shopId: newShop.id,
      role: 'admin',
      isActive: true,
      joinedAt: new Date(),
      permissions: {
        canManageProducts: true,
        canManageCustomers: true,
        canManageTransactions: true,
        canManageReports: true,
        canManageSettings: true,
        canManageUsers: true
      }
    });

    console.log('✅ Backend: Shop created successfully:', newShop.id);
    
    res.status(201).json({
      success: true,
      data: {
        ...newShop.toJSON(),
        role: 'admin',
        joinedAt: new Date(),
        isActive: true
      }
    });
  } catch (error) {
    console.error('❌ Backend: Create shop error:', error);
    console.error('❌ Backend: Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to create shop' });
  }
});

// Update shop
router.put('/:id', async (req, res) => {
  try {
    const { name, address, phone, email, gstNumber, settings } = req.body;
    
    const shop = await Shop.findByPk(req.params.id);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    
    await shop.update({ name, address, phone, email, gstNumber, settings });

    res.json({ success: true, shop });
  } catch (error) {
    console.error('Update shop error:', error);
    res.status(500).json({ error: 'Failed to update shop', message: error.message });
  }
});

// Get shop users
router.get('/:id/users', async (req, res) => {
  try {
    const users = await User.findAll({
      where: { shopId: req.params.id, isActive: true },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    
    res.json({ success: true, users });
  } catch (error) {
    console.error('Get shop users error:', error);
    res.status(500).json({ error: 'Failed to get users', message: error.message });
  }
});

module.exports = router;
