const express = require('express');
const router = express.Router();
const { Transaction } = require('../models');
const { Op } = require('sequelize');

// Get all transactions for a shop
router.get('/shop/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    const { page = 1, limit = 50, type, paymentStatus, startDate, endDate } = req.query;
    
    // Validate shopId
    if (!shopId || shopId === 'undefined') {
      return res.status(400).json({ error: 'Invalid shop ID' });
    }
    
    const whereClause = { shopId, isDeleted: false };
    
    if (type) {
      whereClause.type = type;
    }
    
    if (paymentStatus) {
      whereClause.paymentStatus = paymentStatus;
    }
    
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt[Op.lte] = new Date(endDate);
      }
    }

    const offset = (page - 1) * limit;
    const transactions = await Transaction.findAndCountAll({
      where: whereClause,
      include: [
        { model: require('../models').Customer, as: 'customer', attributes: ['name', 'phone', 'email'] },
        { model: require('../models').User, as: 'user', attributes: ['name'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const total = transactions.count;

    res.json({
      success: true,
      transactions: transactions.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions', message: error.message });
  }
});

// Get single transaction
router.get('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id, {
      include: [
        { model: require('../models').Customer, as: 'customer', attributes: ['name', 'phone', 'email', 'address'] },
        { model: require('../models').User, as: 'user', attributes: ['name'] }
      ]
    });
      
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ success: true, transaction });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Failed to get transaction', message: error.message });
  }
});

// Create new transaction
router.post('/', async (req, res) => {
  try {
    const transactionData = {
      ...req.body,
      invoiceNumber: generateInvoiceNumber(),
      syncVersion: Date.now(),
      lastSyncAt: new Date()
    };

    const transaction = await Transaction.create(transactionData);

    // Emit real-time update
    const io = req.app.get('io');
    io.to(transaction.shopId).emit('transaction-created', {
      transactionId: transaction.id,
      data: transaction
    });

    res.status(201).json({ success: true, transaction });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Failed to create transaction', message: error.message });
  }
});

// Update transaction
router.put('/:id', async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      syncVersion: Date.now(),
      lastSyncAt: new Date()
    };

    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    await transaction.update(updateData);

    // Emit real-time update
    const io = req.app.get('io');
    io.to(transaction.shopId).emit('transaction-updated', {
      transactionId: transaction.id,
      data: transaction
    });

    res.json({ success: true, transaction });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'Failed to update transaction', message: error.message });
  }
});

// Delete transaction (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    await transaction.update({ 
      isDeleted: true,
      syncVersion: Date.now(),
      lastSyncAt: new Date()
    });

    // Emit real-time update
    const io = req.app.get('io');
    io.to(transaction.shopId).emit('transaction-deleted', {
      transactionId: transaction.id
    });

    res.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Failed to delete transaction', message: error.message });
  }
});

// Get sales summary
router.get('/shop/:shopId/summary', async (req, res) => {
  try {
    const { shopId } = req.params;
    const { startDate, endDate } = req.query;
    
    const whereClause = { shopId, isDeleted: false };
    
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt[Op.lte] = new Date(endDate);
      }
    }

    const transactions = await Transaction.findAll({
      where: whereClause,
      attributes: ['total', 'paymentMethod']
    });

    // Calculate summary manually
    const summary = {
      totalSales: transactions.reduce((sum, t) => sum + parseFloat(t.total || 0), 0),
      totalTransactions: transactions.length,
      avgSaleValue: transactions.length > 0 ? transactions.reduce((sum, t) => sum + parseFloat(t.total || 0), 0) / transactions.length : 0,
      cashSales: transactions.filter(t => t.paymentMethod === 'cash').reduce((sum, t) => sum + parseFloat(t.total || 0), 0),
      cardSales: transactions.filter(t => t.paymentMethod === 'card').reduce((sum, t) => sum + parseFloat(t.total || 0), 0),
      creditSales: transactions.filter(t => t.paymentMethod === 'credit').reduce((sum, t) => sum + parseFloat(t.total || 0), 0)
    };

    res.json({
      success: true,
      summary: summary
    });
  } catch (error) {
    console.error('Get sales summary error:', error);
    res.status(500).json({ error: 'Failed to get sales summary', message: error.message });
  }
});

// Helper function to generate invoice number
function generateInvoiceNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `INV${year}${month}${day}${random}`;
}

module.exports = router;
