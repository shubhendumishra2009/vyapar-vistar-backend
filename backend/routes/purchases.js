const express = require('express');
const router = express.Router();
const { Transaction, TransactionDetail, Business, Product, Customer, StockMovement, Stock, sequelize } = require('../models');
const { Op } = require('sequelize');

// Helper function to generate batch number
function generateBatchNumber(businessId, productId) {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const productShort = productId.substring(0, 6);
  
  return `BATCH-${year}${month}${day}-${productShort}-${random}`;
}

// Create new purchase
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

    const { items, supplierId, supplierName, ...transactionData } = req.body;
    
    // Create purchase transaction
    const purchase = await Transaction.create({
      ...transactionData,
      businessId,
      userId,
      shopId: businessId,
      type: 'purchase',
      supplierId: supplierId || null,
      supplierName: supplierName || null,
      items: items || [],
      syncVersion: Date.now(),
      lastSyncAt: new Date()
    });

    // Create transaction details and update stock for each item
    if (items && Array.isArray(items)) {
      const transactionDetails = [];
      
      for (const item of items) {
        // Create transaction detail
        transactionDetails.push({
          transactionId: purchase.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          tax: item.tax || 0,
          total: item.total
        });

        // Check if product exists, if not create it
        let product = await Product.findByPk(item.productId);
        if (!product && item.isNewProduct) {
          // Create new product on the fly
          product = await Product.create({
            name: item.productName,
            businessId: purchase.businessId,
            shopId: purchase.shopId,
            unit: item.unit || 'pcs',
            purchasePrice: item.unitPrice,
            sellingPrice: item.sellingPrice || item.unitPrice * 1.25,
            stock: item.quantity,
            isActive: true,
            createdBy: purchase.userId,
            syncVersion: Date.now(),
            lastSyncAt: new Date()
          });
          console.log(`✅ New product created: ${product.name}`);
        }

        if (product) {
          const previousStock = product.stock || 0;
          const newStock = previousStock + item.quantity;

          // Update product stock
          product.stock = newStock;
          product.syncVersion = Date.now();
          product.lastSyncAt = new Date();
          await product.save();

          // Generate batch number for this purchase
          const batchNumber = generateBatchNumber(purchase.businessId, product.id);

          // Create stock record (current stock by batch)
          await Stock.create({
            productId: product.id,
            businessId: purchase.businessId,
            shopId: purchase.shopId,
            batchNumber: batchNumber,
            quantity: item.quantity,
            purchasePrice: item.unitPrice,
            sellingPrice: item.sellingPrice || item.unitPrice * 1.25,
            purchaseDate: new Date(),
            supplierName: purchase.supplierName,
            notes: `Purchase #${purchase.invoiceNumber}`,
            createdBy: purchase.userId
          });

          // Create stock movement record (audit trail)
          await StockMovement.create({
            productId: product.id,
            businessId: purchase.businessId,
            shopId: purchase.shopId,
            transactionId: purchase.id,
            batchNumber: batchNumber,
            type: 'PURCHASE',
            quantity: item.quantity, // Positive for IN
            balanceAfter: newStock,
            referenceType: 'purchase',
            referenceId: purchase.id,
            purchasePrice: item.unitPrice,
            sellingPrice: item.sellingPrice || item.unitPrice * 1.25,
            purchaseInvoiceNumber: purchase.invoiceNumber,
            unitPrice: item.unitPrice,
            notes: `Purchase #${purchase.invoiceNumber} | Batch: ${batchNumber}`,
            createdBy: purchase.userId
          });

          console.log(`📦 Stock updated for ${product.name}: ${previousStock} -> ${newStock} (Batch: ${batchNumber})`);
        }
      }
      
      await TransactionDetail.bulkCreate(transactionDetails);
    }

    // Emit real-time update
    const io = req.app.get('io');
    io.to(businessId).emit('purchase-created', {
      purchaseId: purchase.id,
      data: purchase
    });

    res.status(201).json({ success: true, purchase });
  } catch (error) {
    console.error('Create purchase error:', error);
    res.status(500).json({ error: 'Failed to create purchase', message: error.message });
  }
});

// Get all purchases for a business
router.get('/business/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { page = 1, limit = 50, startDate, endDate } = req.query;
    
    if (!businessId || businessId === 'undefined') {
      return res.status(400).json({ error: 'Invalid business ID' });
    }
    
    const whereClause = { 
      businessId, 
      type: 'purchase',
      isDeleted: false 
    };
    
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
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      purchases: transactions.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: transactions.count,
        pages: Math.ceil(transactions.count / limit)
      }
    });
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({ error: 'Failed to get purchases', message: error.message });
  }
});

// Get single purchase
router.get('/:id', async (req, res) => {
  try {
    const purchase = await Transaction.findByPk(req.params.id, {
      include: [
        { 
          model: require('../models').TransactionDetail, 
          as: 'details',
          include: [
            {
              model: require('../models').Product,
              as: 'product',
              attributes: ['id', 'name', 'sku']
            }
          ]
        }
      ]
    });
      
    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }
    res.json({ success: true, purchase });
  } catch (error) {
    console.error('Get purchase error:', error);
    res.status(500).json({ error: 'Failed to get purchase', message: error.message });
  }
});

// Create purchase return
router.post('/:id/return', async (req, res) => {
  try {
    const purchase = await Transaction.findByPk(req.params.id);
    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    const { items, reason, notes } = req.body;
    const userId = req.user?.id;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Return items are required' });
    }

    // Create return transaction
    const returnTransaction = await Transaction.create({
      businessId: purchase.businessId,
      userId: userId,
      shopId: purchase.shopId,
      type: 'purchase_return',
      supplierId: purchase.supplierId,
      supplierName: purchase.supplierName,
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      notes: `Return for Purchase #${purchase.invoiceNumber}. Reason: ${reason || 'Not specified'}`,
      items: items || [],
      syncVersion: Date.now(),
      lastSyncAt: new Date()
    });

    // Process return items
    const transactionDetails = [];
    let totalReturnAmount = 0;

    for (const item of items) {
      const returnQty = item.quantity;
      const unitPrice = item.unitPrice || 0;
      const returnTotal = returnQty * unitPrice;
      totalReturnAmount += returnTotal;

      transactionDetails.push({
        transactionId: returnTransaction.id,
        productId: item.productId,
        productName: item.productName,
        quantity: returnQty,
        unitPrice: unitPrice,
        discount: 0,
        tax: 0,
        total: returnTotal
      });

      // Deduct stock (returning to supplier)
      const product = await Product.findByPk(item.productId);
      if (product) {
        const previousStock = product.stock || 0;
        const newStock = Math.max(0, previousStock - returnQty);

        // Update product stock
        product.stock = newStock;
        product.syncVersion = Date.now();
        product.lastSyncAt = new Date();
        await product.save();

        // Create stock movement
        await StockMovement.create({
          productId: item.productId,
          businessId: purchase.businessId,
          shopId: purchase.shopId,
          transactionId: returnTransaction.id,
          type: 'PURCHASE_RETURN',
          quantity: -returnQty, // Negative for OUT
          balanceAfter: newStock,
          referenceType: 'purchase_return',
          referenceId: returnTransaction.id,
          unitPrice: unitPrice,
          notes: `Return for Purchase #${purchase.invoiceNumber}. ${notes || ''}`,
          createdBy: userId
        });

        console.log(`📦 Purchase return - Stock updated for ${product.name}: ${previousStock} -> ${newStock}`);
      }
    }

    // Update return transaction total
    returnTransaction.total = totalReturnAmount;
    returnTransaction.subtotal = totalReturnAmount;
    await returnTransaction.save();

    await TransactionDetail.bulkCreate(transactionDetails);

    // Emit real-time update
    const io = req.app.get('io');
    io.to(purchase.businessId).emit('purchase-returned', {
      returnId: returnTransaction.id,
      purchaseId: purchase.id
    });

    res.status(201).json({ success: true, purchaseReturn: returnTransaction });
  } catch (error) {
    console.error('Create purchase return error:', error);
    res.status(500).json({ error: 'Failed to create purchase return', message: error.message });
  }
});

// Delete purchase (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const purchase = await Transaction.findByPk(req.params.id);
    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }
    
    await purchase.update({ 
      isDeleted: true,
      isActive: false,
      syncVersion: Date.now(),
      lastSyncAt: new Date()
    });

    const io = req.app.get('io');
    io.to(purchase.businessId).emit('purchase-deleted', {
      purchaseId: purchase.id
    });

    res.json({ success: true, message: 'Purchase deleted successfully' });
  } catch (error) {
    console.error('Delete purchase error:', error);
    res.status(500).json({ error: 'Failed to delete purchase', message: error.message });
  }
});

module.exports = router;