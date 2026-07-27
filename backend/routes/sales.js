const express = require('express');
const router = express.Router();
const { Transaction, TransactionDetail, Business, Product, Customer, StockMovement, Stock, sequelize } = require('../models');
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

    const { items, ...transactionData } = req.body;
    
    // Include items in the transaction data so the beforeCreate hook can calculate totals
    const sale = await Transaction.create({
      ...transactionData,
      businessId,
      userId,
      shopId: businessId,
      type: 'sale',
      invoiceNumber: generateInvoiceNumber(),
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
          transactionId: sale.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          tax: item.tax || 0,
          total: item.total
        });

        // Deduct stock and create stock movement
        const product = await Product.findByPk(item.productId);
        if (product) {
          // Check stock availability
          if (product.stock < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Required: ${item.quantity}`);
          }

          const previousStock = product.stock;
          const newStock = product.stock - item.quantity;

          // Update product stock
          product.stock = newStock;
          product.syncVersion = Date.now();
          product.lastSyncAt = new Date();
          await product.save();

          // Handle batch selection
          let batchNumber = item.batchNumber;
          let createdStockMovement = false;
          
          if (batchNumber) {
            // User selected specific batch - deduct from that batch
            const stockBatch = await Stock.findOne({
              where: {
                productId: item.productId,
                batchNumber: batchNumber,
                businessId: sale.businessId
              }
            });

            if (stockBatch) {
              const previousBatchQty = stockBatch.quantity;
              const newBatchQty = Math.max(0, previousBatchQty - item.quantity);
              
              // Update stock batch
              stockBatch.quantity = newBatchQty;
              await stockBatch.save();

              // Create stock movement for selected batch
              await StockMovement.create({
                productId: item.productId,
                businessId: sale.businessId,
                shopId: sale.shopId,
                transactionId: sale.id,
                batchNumber: batchNumber,
                type: 'SALE',
                quantity: -item.quantity,
                balanceAfter: newStock,
                referenceType: 'sale',
                referenceId: sale.id,
                purchasePrice: stockBatch.purchasePrice,
                sellingPrice: item.unitPrice,
                saleInvoiceNumber: sale.invoiceNumber,
                unitPrice: item.unitPrice,
                notes: `Sale #${sale.invoiceNumber} | Batch: ${batchNumber}`,
                createdBy: sale.userId
              });
              createdStockMovement = true;

              console.log(`📦 Batch ${batchNumber}: ${previousBatchQty} -> ${newBatchQty}`);
            }
          } else {
            // No batch specified - use FIFO (oldest batch first)
            const stockBatches = await Stock.findAll({
              where: {
                productId: item.productId,
                businessId: sale.businessId,
                quantity: { [Op.gt]: 0 }
              },
              order: [['purchaseDate', 'ASC'], ['createdAt', 'ASC']]
            });

            let remainingQty = item.quantity;
            
            for (const batch of stockBatches) {
              if (remainingQty <= 0) break;

              const deductQty = Math.min(remainingQty, batch.quantity);
              const previousBatchQty = batch.quantity;
              const newBatchQty = batch.quantity - deductQty;

              batch.quantity = newBatchQty;
              await batch.save();

              // Create stock movement for this batch
              await StockMovement.create({
                productId: item.productId,
                businessId: sale.businessId,
                shopId: sale.shopId,
                transactionId: sale.id,
                batchNumber: batch.batchNumber,
                type: 'SALE',
                quantity: -deductQty,
                balanceAfter: newStock,
                referenceType: 'sale',
                referenceId: sale.id,
                purchasePrice: batch.purchasePrice,
                sellingPrice: item.unitPrice,
                saleInvoiceNumber: sale.invoiceNumber,
                unitPrice: item.unitPrice,
                notes: `Sale #${sale.invoiceNumber} | Batch: ${batch.batchNumber}`,
                createdBy: sale.userId
              });
              createdStockMovement = true;

              console.log(`📦 Batch ${batch.batchNumber}: ${previousBatchQty} -> ${newBatchQty}`);
              remainingQty -= deductQty;
            }

            // Use the first batch number for the transaction detail reference
            if (stockBatches.length > 0) {
              batchNumber = stockBatches[0].batchNumber;
            }
          }

          // Create a stock movement record only if none was created in the loops above
          if (!createdStockMovement && batchNumber) {
            await StockMovement.create({
              productId: item.productId,
              businessId: sale.businessId,
              shopId: sale.shopId,
              transactionId: sale.id,
              batchNumber: batchNumber,
              type: 'SALE',
              quantity: -item.quantity,
              balanceAfter: newStock,
              referenceType: 'sale',
              referenceId: sale.id,
              unitPrice: item.unitPrice,
              saleInvoiceNumber: sale.invoiceNumber,
              notes: `Sale #${sale.invoiceNumber} | Batch: ${batchNumber}`,
              createdBy: sale.userId
            });
          }

          console.log(`📦 Stock updated for ${product.name}: ${previousStock} -> ${newStock}`);
        }
      }
      
      await TransactionDetail.bulkCreate(transactionDetails);
    }

    // Update customer balance if customer is a credit customer
    if (transactionData.customerId) {
      const customer = await Customer.findByPk(transactionData.customerId);
      if (customer) {
        // Update balance for all sales to credit customers
        const isCreditCustomer = customer.isCreditCustomer;
        console.log(`🔍 Debug - Customer: ${customer.name}, isCreditCustomer: ${isCreditCustomer}, paymentMethod: ${transactionData.paymentMethod}, paymentStatus: ${transactionData.paymentStatus}`);
        if (isCreditCustomer) {
          const saleTotal = parseFloat(sale.total || 0);
          const oldBalance = parseFloat(customer.currentBalance || 0);
          await customer.updateBalance(saleTotal, 'add');
          const newBalance = parseFloat(customer.currentBalance || 0);
          console.log(`💳 Updated customer ${customer.name} balance: ${oldBalance} -> ${newBalance} (added ${saleTotal})`);
        } else {
          console.log(`ℹ️  Customer is not a credit customer, balance not updated. Customer: ${customer.name}`);
        }
      } else {
        console.log(`⚠️  Customer not found with ID: ${transactionData.customerId}`);
      }
    } else {
      console.log(`ℹ️  No customer ID in transaction data`);
    }

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

    // Reverse customer balance if it was a credit/pending/overdue sale
    if (sale.customerId && (sale.paymentMethod === 'credit' || sale.paymentStatus === 'pending' || sale.paymentStatus === 'overdue')) {
      const customer = await Customer.findByPk(sale.customerId);
      if (customer) {
        const saleTotal = parseFloat(sale.total || 0);
        await customer.updateBalance(saleTotal, 'subtract');
        console.log(`💳 Reversed customer ${customer.name} balance: -${saleTotal}`);
      }
    }

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