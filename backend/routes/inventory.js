const express = require('express');
const router = express.Router();
const { Product, Stock, StockMovement, sequelize } = require('../models');
const { Op } = require('sequelize');

// Get inventory logs for a shop
router.get('/shop/:shopId/logs', async (req, res) => {
  try {
    const { shopId } = req.params;
    const { page = 1, limit = 50, productId, type } = req.query;
    
    const query = { shopId };
    
    if (productId) {
      query.productId = productId;
    }
    
    if (type) {
      query.type = type;
    }

    // This would need an InventoryLog model, for now return empty
    res.json({
      success: true,
      logs: [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        pages: 0
      }
    });
  } catch (error) {
    console.error('Get inventory logs error:', error);
    res.status(500).json({ error: 'Failed to get inventory logs', message: error.message });
  }
});

// Get low stock products
router.get('/shop/:shopId/low-stock', async (req, res) => {
  try {
    const { shopId } = req.params;
    
    const products = await Product.findAll({
      where: {
        shopId,
        isActive: true,
        isDeleted: false,
        [Op.and]: [
          sequelize.where(sequelize.col('stock'), Op.lte, sequelize.col('minStock'))
        ]
      },
      order: [['stock', 'ASC']]
    });

    res.json({ success: true, products });
  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json({ error: 'Failed to get low stock products', message: error.message });
  }
});

// Get out of stock products
router.get('/shop/:shopId/out-of-stock', async (req, res) => {
  try {
    const { shopId } = req.params;
    
    const products = await Product.findAll({
      where: {
        shopId,
        isActive: true,
        isDeleted: false,
        stock: 0
      },
      order: [['name', 'ASC']]
    });

    res.json({ success: true, products });
  } catch (error) {
    console.error('Get out of stock products error:', error);
    res.status(500).json({ error: 'Failed to get out of stock products', message: error.message });
  }
});

// Update stock
router.put('/shop/:shopId/product/:productId/stock', async (req, res) => {
  try {
    const { shopId, productId } = req.params;
    const { quantity, reason, type } = req.body;
    
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const previousStock = product.stock || 0;
    const newStock = type === 'add' ? previousStock + quantity : previousStock - quantity;
    
    if (newStock < 0) {
      return res.status(400).json({ error: 'Insufficient stock for removal' });
    }

    product.stock = newStock;
    product.syncVersion = Date.now();
    product.lastSyncAt = new Date();
    await product.save();

    // Emit real-time update
    const io = req.app.get('io');
    io.to(shopId).emit('stock-updated', {
      productId: product.id,
      previousStock,
      newStock,
      quantity,
      type,
      reason
    });

    res.json({ 
      success: true, 
      product: {
        id: product.id,
        name: product.name,
        previousStock,
        newStock,
        quantity,
        type
      }
    });
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({ error: 'Failed to update stock', message: error.message });
  }
});

// Get inventory value
router.get('/shop/:shopId/value', async (req, res) => {
  try {
    const { shopId } = req.params;
    
    const result = await Product.findOne({
      where: {
        shopId,
        isActive: true,
        isDeleted: false
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalProducts'],
        [sequelize.fn('SUM', sequelize.col('stock')), 'totalStock'],
        [sequelize.fn('SUM', sequelize.literal('stock * purchasePrice')), 'totalStockValue'],
        [sequelize.fn('SUM', sequelize.literal('stock * sellingPrice')), 'totalSellingValue'],
        [sequelize.fn('SUM', sequelize.literal('stock * (sellingPrice - purchasePrice)')), 'potentialProfit']
      ]
    });

    const inventory = result ? result.get({ plain: true }) : {
      totalProducts: 0,
      totalStock: 0,
      totalStockValue: 0,
      totalSellingValue: 0,
      potentialProfit: 0
    };

    res.json({ success: true, inventory });
  } catch (error) {
    console.error('Get inventory value error:', error);
    res.status(500).json({ error: 'Failed to get inventory value', message: error.message });
  }
});

// Get inventory summary
router.get('/shop/:shopId/summary', async (req, res) => {
  try {
    const { shopId } = req.params;
    
    const [lowStock, outOfStock, totalProducts] = await Promise.all([
      Product.count({
        where: {
          shopId,
          isActive: true,
          isDeleted: false,
          [Op.and]: [
            sequelize.where(sequelize.col('stock'), Op.lte, sequelize.col('minStock'))
          ]
        }
      }),
      
      Product.count({
        where: {
          shopId,
          isActive: true,
          isDeleted: false,
          stock: 0
        }
      }),
      
      Product.count({
        where: {
          shopId,
          isActive: true,
          isDeleted: false
        }
      })
    ]);

    res.json({
      success: true,
      summary: {
        totalProducts,
        lowStock,
        outOfStock,
        inStock: totalProducts - lowStock - outOfStock
      }
    });
  } catch (error) {
    console.error('Get inventory summary error:', error);
    res.status(500).json({ error: 'Failed to get inventory summary', message: error.message });
  }
});

// Get batch-wise stock for a product
router.get('/business/:businessId/product/:productId/batches', async (req, res) => {
  try {
    const { businessId, productId } = req.params;
    
    const batches = await Stock.findAll({
      where: {
        productId,
        businessId,
        quantity: { [Op.gt]: 0 }
      },
      order: [['purchaseDate', 'ASC'], ['createdAt', 'ASC']],
      attributes: [
        'id', 'batchNumber', 'quantity', 'purchasePrice', 'sellingPrice',
        'expiryDate', 'purchaseDate', 'supplierName', 'notes', 'createdAt'
      ]
    });

    const plainBatches = batches.map(b => b.get({ plain: true }));

    res.json({ success: true, batches: plainBatches });
  } catch (error) {
    console.error('Get product batches error:', error);
    res.status(500).json({ error: 'Failed to get product batches', message: error.message });
  }
});

// Get all batches for a business
router.get('/business/:businessId/batches', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { productId } = req.query;
    
    const whereClause = {
      businessId,
      quantity: { [Op.gt]: 0 }
    };

    if (productId) {
      whereClause.productId = productId;
    }

    const batches = await Stock.findAll({
      where: whereClause,
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'sku', 'unit'],
          where: { isActive: true, isDeleted: false }
        }
      ],
      order: [['purchaseDate', 'ASC'], ['createdAt', 'ASC']],
      attributes: [
        'id', 'batchNumber', 'quantity', 'purchasePrice', 'sellingPrice',
        'expiryDate', 'purchaseDate', 'supplierName', 'notes', 'createdAt'
      ]
    });

    const plainBatches = batches.map(b => b.get({ plain: true }));

    res.json({ success: true, batches: plainBatches });
  } catch (error) {
    console.error('Get business batches error:', error);
    res.status(500).json({ error: 'Failed to get batches', message: error.message });
  }
});

module.exports = router;
