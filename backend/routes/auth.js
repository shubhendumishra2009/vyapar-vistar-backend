const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User, Shop } = require('../models');
const { Op } = require('sequelize');

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findByPk(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Helper: is a subscription considered locked (trial ended or paid plan expired)?
function isSubLocked(sub) {
  if (!sub) return false;
  if (sub.status === 'expired') return true;
  if (sub.status === 'trial') {
    if (!sub.trialEndsAt) return false;
    return new Date(sub.trialEndsAt).getTime() <= Date.now();
  }
  if (sub.expiresAt) {
    return new Date(sub.expiresAt).getTime() <= Date.now();
  }
  return false;
}

// Middleware that blocks all business/ERP API access once the user's
// subscription is locked (free trial ended or paid plan expired).
// The /businesses GET (used to detect the lock) and the auth routes stay open
// so the client can still render the lockout / purchase screen and log out.
const enforceSubscription = async (req, res, next) => {
  try {
    const { Business } = require('../models');
    const businesses = await Business.findAll({
      where: { ownerId: req.user.id, isActive: true },
      attributes: ['id', 'subscription'],
    });

    // No businesses yet (still in trial setup) — allow.
    if (!businesses.length) return next();

    const locked = businesses.some((b) => isSubLocked(b.subscription));
    if (locked) {
      return res.status(403).json({
        success: false,
        code: 'SUBSCRIPTION_LOCKED',
        error: 'Your subscription has ended. Please purchase or renew a plan to continue.',
      });
    }
    next();
  } catch (error) {
    console.error('Subscription enforcement error:', error);
    next();
  }
};

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, name, phone, type } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create new user (no shop association during registration)
    const user = await User.create({
      username,
      email,
      password,
      name,
      phone,
      type: type || 'consumer'
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, type: user.type },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        type: user.type,
        permissions: user.permissions,
        token: token
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', message: error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ 
      where: { username }
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, type: user.type },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        type: user.type,
        permissions: user.permissions,
        token: token
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', message: error.message });
  }
});

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findByPk(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        type: user.type,
        permissions: user.permissions
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findByPk(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Generate new token
    const newToken = jwt.sign(
      { userId: user.id, type: user.type },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token: newToken
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Export middleware for use in other routes
router.authenticateToken = authenticateToken;
router.enforceSubscription = enforceSubscription;

module.exports = router;
