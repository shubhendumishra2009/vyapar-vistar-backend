const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');

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
    
    const products = await Product.find({
      shopId,
      isActive: true,
      isDeleted: false,
      $expr: { $lte: ['$stock', '$minStock'] }
    }).sort({ stock: 1 });

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
    
    const products = await Product.find({
      shopId,
      isActive: true,
      isDeleted: false,
      stock: 0
    }).sort({ name: 1 });

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
    
    const product = await Product.findOne({ _id: productId, shopId });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const previousStock = product.stock;
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
      productId: product._id,
      previousStock,
      newStock,
      quantity,
      type,
      reason
    });

    res.json({ 
      success: true, 
      product: {
        id: product._id,
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
    
    const result = await Product.aggregate([
      { $match: { shopId, isActive: true, isDeleted: false } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalStockValue: { $sum: { $multiply: ['$stock', '$purchasePrice'] } },
          totalSellingValue: { $sum: { $multiply: ['$stock', '$sellingPrice'] } },
          potentialProfit: { 
            $sum: { $multiply: ['$stock', { $subtract: ['$sellingPrice', '$purchasePrice'] }] } 
          }
        }
      }
    ]);

    const inventory = result[0] || {
      totalProducts: 0,
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
      Product.countDocuments({
        shopId,
        isActive: true,
        isDeleted: false,
        $expr: { $lte: ['$stock', '$minStock'] }
      }),
      
      Product.countDocuments({
        shopId,
        isActive: true,
        isDeleted: false,
        stock: 0
      }),
      
      Product.countDocuments({
        shopId,
        isActive: true,
        isDeleted: false
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

module.exports = router;
