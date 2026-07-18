const express = require('express');
const router = express.Router();
const { Transaction, Business, Product, Customer, sequelize } = require('../models');
const { Op } = require('sequelize');

// Get all sales for a business
router.get('/business/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { page = 1, limit = 50, type, paymentStatus, startDate, endDate } = req.query;
    
    if (!businessId || businessId === 'undefined') {
      return res.status(400).json({ error: 'Invalid business ID' });
    }
    
    const whereClause = { 
      businessId, 
      type: 'sale',
      isDeleted: false 
    };
    
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
        { 
          model: Customer, 
          as: 'customer', 
          attributes: ['name', 'phone', 'email'] 
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      sales: transactions.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: transactions.count,
        pages: Math.ceil(transactions.count / limit)
      }
    });
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ error: 'Failed to get sales', message: error.message });
  }
});

// Get single sale
router.get('/:id', async (req, res) => {
  try {
    const sale = await Transaction.findByPk(req.params.id, {
      include: [
        { 
          model: Customer, 
          as: 'customer', 
          attributes: ['name', 'phone', 'email', 'address', 'gstNumber'] 
        }
      ]
    });
      
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    res.json({ success: true, sale });
  } catch (error) {
    console.error('Get sale error:', error);
    res.status(500).json({ error: 'Failed to get sale', message: error.message });
  }
});

// Create new sale
router.post('/business/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    
    if (!businessId || businessId === 'undefined') {
      return res.status(400).json({ error: 'Invalid business ID' });
    }

    const business = await Business.findByPk(businessId);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Get user from auth token
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const transactionData = {
      ...req.body,
      businessId,
      userId,
      shopId: businessId, // Use businessId as shopId for now (can be updated later)
      type: 'sale',
      invoiceNumber: generateInvoiceNumber(),
      syncVersion: Date.now(),
      lastSyncAt: new Date()
    };

    const sale = await Transaction.create(transactionData);

    // Emit real-time update
    const io = req.app.get('io');
    io.to(businessId).emit('sale-created', {
      saleId: sale.id,
      data: sale
    });

    res.status(201).json({ success: true, sale });
  } catch (error) {
    console.error('Create sale error:', error);
    res.status(500).json({ error: 'Failed to create sale', message: error.message });
  }
});

// Update sale
router.put('/:id', async (req, res) => {
  try {
    const sale = await Transaction.findByPk(req.params.id);
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    const updateData = {
      ...req.body,
      syncVersion: Date.now(),
      lastSyncAt: new Date()
    };

    await sale.update(updateData);

    // Emit real-time update
    const io = req.app.get('io');
    io.to(sale.businessId).emit('sale-updated', {
      saleId: sale.id,
      data: sale
    });

    res.json({ success: true, sale });
  } catch (error) {
    console.error('Update sale error:', error);
    res.status(500).json({ error: 'Failed to update sale', message: error.message });
  }
});

// Delete sale (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const sale = await Transaction.findByPk(req.params.id);
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    await sale.update({ 
      isDeleted: true,
      syncVersion: Date.now(),
      lastSyncAt: new Date()
    });

    // Emit real-time update
    const io = req.app.get('io');
    io.to(sale.businessId).emit('sale-deleted', {
      saleId: sale.id
    });

    res.json({ success: true, message: 'Sale deleted successfully' });
  } catch (error) {
    console.error('Delete sale error:', error);
    res.status(500).json({ error: 'Failed to delete sale', message: error.message });
  }
});

// Get sales summary
router.get('/business/:businessId/summary', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { startDate, endDate } = req.query;
    
    const whereClause = { businessId, type: 'sale', isDeleted: false };
    
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt[Op.lte] = new Date(endDate);
      }
    }

    const sales = await Transaction.findAll({
      where: whereClause,
      attributes: ['total', 'paymentMethod', 'paymentStatus']
    });

    // Calculate summary
    const summary = {
      totalSales: sales.reduce((sum, s) => sum + parseFloat(s.total || 0), 0),
      totalTransactions: sales.length,
      avgSaleValue: sales.length > 0 ? sales.reduce((sum, s) => sum + parseFloat(s.total || 0), 0) / sales.length : 0,
      cashSales: sales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + parseFloat(s.total || 0), 0),
      cardSales: sales.filter(s => s.paymentMethod === 'card').reduce((sum, s) => sum + parseFloat(s.total || 0), 0),
      upiSales: sales.filter(s => s.paymentMethod === 'upi').reduce((sum, s) => sum + parseFloat(s.total || 0), 0),
      creditSales: sales.filter(s => s.paymentMethod === 'credit').reduce((sum, s) => sum + parseFloat(s.total || 0), 0),
      paidSales: sales.filter(s => s.paymentStatus === 'paid').reduce((sum, s) => sum + parseFloat(s.total || 0), 0),
      pendingSales: sales.filter(s => s.paymentStatus === 'pending').reduce((sum, s) => sum + parseFloat(s.total || 0), 0),
      overdueSales: sales.filter(s => s.paymentStatus === 'overdue').reduce((sum, s) => sum + parseFloat(s.total || 0), 0)
    };

    res.json({
      success: true,
      summary
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