const express = require('express');
const router = express.Router();
const { Product, Customer, Transaction, User, Shop, CustomerShop } = require('../models');
const { Op } = require('sequelize');

// Sync data from mobile app to MySQL
router.post('/upload', async (req, res) => {
  try {
    console.log('=== SYNC UPLOAD START ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { shopId, data, lastSyncVersion } = req.body;
    const io = req.app.get('io');

    if (!shopId || !data) {
      console.log('ERROR: Missing shopId or data');
      return res.status(400).json({ error: 'Shop ID and data are required' });
    }

    console.log('ShopId:', shopId);
    console.log('Data received:', JSON.stringify(data, null, 2));

    const results = {
      products: { created: 0, updated: 0, deleted: 0, errors: [] },
      customers: { created: 0, updated: 0, deleted: 0, errors: [] },
      transactions: { created: 0, updated: 0, deleted: 0, errors: [] }
    };

    try {

    // Sync Products
    if (data.products && data.products.length > 0) {
      for (const productData of data.products) {
        try {
          const existingProduct = await Product.findOne({
            where: {
              id: productData.id,
              shopId: shopId
            }
          });

          if (existingProduct) {
            // Update existing product if newer version
            if (productData.syncVersion && productData.syncVersion > existingProduct.syncVersion) {
              await Product.update({
                ...productData,
                shopId,
                lastSyncAt: new Date(),
                syncVersion: productData.syncVersion || existingProduct.syncVersion + 1
              }, {
                where: { id: existingProduct.id }
              });
              results.products.updated++;
              
              // Emit real-time update
              io.to(shopId).emit('product-updated', {
                productId: existingProduct.id,
                data: productData
              });
            }
          } else {
            // Create new product
            const newProduct = await Product.create({
              ...productData,
              id: productData.id,
              shopId,
              lastSyncAt: new Date(),
              syncVersion: productData.syncVersion || 1
            });
            results.products.created++;
            
            // Emit real-time update
            io.to(shopId).emit('product-created', {
              productId: newProduct.id,
              data: productData
            });
          }
        } catch (error) {
          results.products.errors.push({
            id: productData.id,
            error: error.message
          });
        }
      }
    }

    // Sync Customers
    if (data.customers && data.customers.length > 0) {
      console.log(`📝 Processing ${data.customers.length} customers for sync`);
      for (const customerData of data.customers) {
        console.log('🔍 Customer data received:', {
          id: customerData.id,
          name: customerData.name,
          isDeleted: customerData.isDeleted,
          isDeletedType: typeof customerData.isDeleted,
          isDeletedValue: customerData.isDeleted === true ? 'true' : 
                         customerData.isDeleted === false ? 'false' : 
                         customerData.isDeleted === 1 ? '1' : 
                         customerData.isDeleted === 0 ? '0' : 'other',
          syncVersion: customerData.syncVersion,
          updatedAt: customerData.updatedAt
        });
        try {
          const existingCustomer = await Customer.findOne({
            where: {
              id: customerData.id
            },
            include: [{
              model: CustomerShop,
              where: { shopId, isActive: true },
              required: true
            }]
          });

          if (existingCustomer) {
            // Handle deleted customer
            console.log('🔍 Checking if customer should be deleted:', {
              customerId: existingCustomer.id,
              isDeleted: customerData.isDeleted,
              isDeletedCondition: customerData.isDeleted === true,
              isDeletedCondition1: customerData.isDeleted === 1,
              isDeletedCondition2: customerData.isDeleted === 'true'
            });
            
            if (customerData.isDeleted === true || customerData.isDeleted === 1 || customerData.isDeleted === 'true') {
              console.log('🗑️ Processing customer deletion:', {
                customerId: existingCustomer.id,
                customerName: existingCustomer.name,
                syncVersion: customerData.syncVersion
              });
              
              await Customer.update({
                isDeleted: true,
                lastSyncAt: new Date(),
                syncVersion: customerData.syncVersion || existingCustomer.syncVersion + 1
              }, {
                where: { id: existingCustomer.id }
              });
              results.customers.deleted++;
              
              console.log('✅ Customer marked as deleted in MySQL:', existingCustomer.id);
              
              // Emit real-time update
              io.to(shopId).emit('customer-deleted', {
                customerId: existingCustomer.id
              });
            }
            // Update existing customer if newer version
            else if (customerData.syncVersion > (existingCustomer.syncVersion || 0)) {
              const { shopId: customerShopId, ...customerFields } = customerData;
              await Customer.update({
                ...customerFields,
                lastSyncAt: new Date(),
                syncVersion: customerData.syncVersion || existingCustomer.syncVersion + 1
              }, {
                where: { id: existingCustomer.id }
              });
              results.customers.updated++;
              
              // Emit real-time update
              io.to(shopId).emit('customer-updated', {
                customerId: existingCustomer.id,
                data: customerData
              });
            }
          } else {
            // Create new customer
            console.log('Creating new customer in MySQL:', {
              customerData,
              shopId,
              id: customerData.id
            });
            try {
              const { shopId: customerShopId, ...customerFields } = customerData;
              const newCustomer = await Customer.create({
                ...customerFields,
                id: customerData.id,
                lastSyncAt: new Date(),
                syncVersion: customerData.syncVersion || 1
              });

              // Create CustomerShop relationship
              await CustomerShop.create({
                customerId: newCustomer.id,
                shopId: shopId,
                isActive: true
              });

              console.log('✅ Customer saved to MySQL:', {
                id: newCustomer.id,
                name: newCustomer.name,
                shopId: shopId
              });
              results.customers.created++;
              
              // Emit real-time update
              io.to(shopId).emit('customer-created', {
                customerId: newCustomer.id,
                data: customerData
              });
            } catch (error) {
              console.error('❌ MySQL SAVE ERROR:', error);
              console.error('❌ Error details:', {
                customerData,
                shopId,
                error: error.message,
                stack: error.stack
              });
              results.customers.errors.push({
                id: customerData.id,
                error: error.message
              });
              
              // Send error response to mobile app
              return res.status(500).json({ 
                error: error.message,
                results: results
              });
            }
          }
        } catch (error) {
          console.error('❌ Error processing customer:', {
            customerId: customerData.id,
            customerName: customerData.name,
            error: error.message,
            errorDetails: error.errors || error.stack,
            customerData: customerData
          });
          results.customers.errors.push({
            id: customerData.id,
            error: error.message
          });
        }
      }
    }

    // Sync Transactions
    if (data.transactions && data.transactions.length > 0) {
      for (const transactionData of data.transactions) {
        try {
          const existingTransaction = await Transaction.findOne({
            where: {
              id: transactionData.id,
              shopId: shopId
            }
          });

          if (existingTransaction) {
            // Update existing transaction if newer version
            if (!transactionData.syncVersion || transactionData.syncVersion > existingTransaction.syncVersion) {
              await Transaction.update({
                ...transactionData,
                shopId,
                lastSyncAt: new Date(),
                syncVersion: transactionData.syncVersion || existingTransaction.syncVersion + 1
              }, {
                where: { id: existingTransaction.id }
              });
              results.transactions.updated++;
              
              // Emit real-time update
              io.to(shopId).emit('transaction-updated', {
                transactionId: existingTransaction.id,
                data: transactionData
              });
            }
          } else {
            // Create new transaction
            const newTransaction = await Transaction.create({
              ...transactionData,
              id: transactionData.id,
              shopId,
              lastSyncAt: new Date(),
              syncVersion: transactionData.syncVersion || 1
            });
            results.transactions.created++;
            
            // Emit real-time update
            io.to(shopId).emit('transaction-created', {
              transactionId: newTransaction.id,
              data: transactionData
            });
          }
        } catch (error) {
          results.transactions.errors.push({
            id: transactionData.id,
            error: error.message
          });
        }
      }
    }

    res.json({
      success: true,
      results: {
        products: results.products,
        customers: results.customers, 
        transactions: results.transactions
      },
      serverTime: new Date().toISOString()
    });

  } catch (error) {
    console.error('Sync error:', error);
    console.error('Sync error details:', {
      message: error.message,
      stack: error.stack
    });
}

// Sync Transactions
if (data.transactions && data.transactions.length > 0) {
  for (const transactionData of data.transactions) {
    try {
      const existingTransaction = await Transaction.findOne({
        where: {
          id: transactionData.id,
          shopId: shopId
        }
      });

      if (existingTransaction) {
        // Update existing transaction if newer version
        if (!transactionData.syncVersion || transactionData.syncVersion > existingTransaction.syncVersion) {
          await Transaction.update({
            ...transactionData,
            shopId,
            lastSyncAt: new Date(),
            syncVersion: transactionData.syncVersion || existingTransaction.syncVersion + 1
          }, {
            where: { id: existingTransaction.id }
          });
          results.transactions.updated++;
          
          // Emit real-time update
          io.to(shopId).emit('transaction-updated', {
            transactionId: existingTransaction.id,
            data: transactionData
          });
        }
      } else {
        // Create new transaction
        const newTransaction = await Transaction.create({
          ...transactionData,
          id: transactionData.id,
          shopId,
          lastSyncAt: new Date(),
          syncVersion: transactionData.syncVersion || 1
        });
        results.transactions.created++;
        
        // Emit real-time update
        io.to(shopId).emit('transaction-created', {
          transactionId: newTransaction.id,
          data: transactionData
        });
      }
    } catch (error) {
      results.transactions.errors.push({
        id: transactionData.id,
        error: error.message
      });
    }
  }
}

// Check if there are any errors before sending success response
const hasErrors = results.products.errors.length > 0 || 
                  results.customers.errors.length > 0 || 
                  results.transactions.errors.length > 0;

// Only send response if headers haven't been sent yet
if (!res.headersSent) {
  if (hasErrors) {
    res.status(400).json({
      success: false,
      message: 'Some items failed to sync',
      results: {
        products: results.products,
        customers: results.customers, 
        transactions: results.transactions
      },
      serverTime: new Date().toISOString()
    });
  } else {
    res.json({
      success: true,
      results: {
        products: results.products,
        customers: results.customers, 
        transactions: results.transactions
      },
      serverTime: new Date().toISOString()
    });
  }
}
    } catch (error) {
      console.error('Sync upload error:', error);
      // Only send error response if headers haven't been sent yet
      if (!res.headersSent) {
        res.status(500).json({ error: 'Upload failed', message: error.message });
      }
    }
});

// Download data from MongoDB to mobile app
router.get('/download/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    const { lastSyncTime, lastSyncVersion } = req.query;

    if (!shopId) {
      return res.status(400).json({ error: 'Shop ID is required' });
    }

    let syncFilter = {};
    if (lastSyncTime) {
      try {
        const syncDate = new Date(lastSyncTime);
        if (!isNaN(syncDate.getTime()) && syncDate instanceof Date && !isNaN(syncDate.getTime())) {
          syncFilter = {
            updatedAt: { 
              [Op.gt]: syncDate,
              [Op.ne]: null
            }
          };
        }
      } catch (error) {
        console.error('Invalid lastSyncTime format:', lastSyncTime, error);
        syncFilter = {};
      }
    }

    // Validate shopId format (UUID validation)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(shopId)) {
      return res.status(400).json({ error: 'Invalid shop ID format' });
    }

    // Clean up invalid dates and shopId values first (optional - commented out for now)
    // await Product.update(
    //   { where: { shopId, updatedAt: { [Op.is]: null } },
    //   { updatedAt: new Date() }
    // );

    // Remove products with invalid shopId (non-UUID format) - commented out for now
    // await Product.destroy({
    //   where: {
    //     shopId: {
    //       [Op.notLike]: '%'
    //     }
    //   }
    // });
    
    // Get updated data
    const [products, customers, transactions, users, shop] = await Promise.all([
      Product.findAll({ where: { shopId, isDeleted: false, ...syncFilter } }),
      Customer.findAll({ 
        include: [{
          model: CustomerShop,
          where: { shopId, isActive: true },
          required: true
        }],
        where: { isDeleted: false, ...syncFilter }
      }),
      Transaction.findAll({ where: { shopId, isDeleted: false, ...syncFilter } }),
      User.findAll({ where: { shopId, isActive: true } }),
      Shop.findByPk(shopId)
    ]);

    res.json({
      success: true,
      data: {
        products: products.map(p => ({
          id: p.id,
          ...p.toJSON(),
          _id: undefined
        })),
        customers: customers.map(c => ({
          id: c.id,
          ...c.toJSON(),
          _id: undefined
        })),
        transactions: transactions.map(t => ({
          id: t.id,
          ...t.toJSON(),
          _id: undefined
        })),
        users: users.map(u => ({
          id: u.id,
          username: u.username,
          name: u.name,
          type: u.type,
          permissions: u.permissions,
          _id: undefined
        })),
        shop: shop ? {
          id: shop.id,
          ...shop.toJSON(),
          _id: undefined
        } : null
      },
      serverTime: new Date().toISOString(),
      lastSyncVersion: Date.now()
    });

  } catch (error) {
    console.error('Sync download error:', error);
    res.status(500).json({ error: 'Download failed', message: error.message });
  }
});

// Check for conflicts
router.post('/check-conflicts', async (req, res) => {
  try {
    const { shopId, conflicts } = req.body;

    if (!shopId || !conflicts) {
      return res.status(400).json({ error: 'Shop ID and conflicts are required' });
    }

    const conflictResults = [];

    for (const conflict of conflicts) {
      const { type, id, clientVersion } = conflict;
      
      let Model;
      switch (type) {
        case 'product':
          Model = Product;
          break;
        case 'customer':
          Model = Customer;
          break;
        case 'transaction':
          Model = Transaction;
          break;
        default:
          continue;
      }

      let serverRecord;
      if (type === 'customer') {
        serverRecord = await Customer.findOne({
          where: { id },
          include: [{
            model: CustomerShop,
            where: { shopId, isActive: true },
            required: true
          }]
        });
      } else {
        serverRecord = await Model.findOne({
          where: { id, shopId }
        });
      }
      
      if (serverRecord && serverRecord.syncVersion > clientVersion) {
        conflictResults.push({
          type,
          id,
          serverVersion: serverRecord.syncVersion,
          serverData: serverRecord.toObject(),
          conflict: true
        });
      }
    }

    res.json({
      success: true,
      conflicts: conflictResults
    });

  } catch (error) {
    console.error('Conflict check error:', error);
    res.status(500).json({ error: 'Conflict check failed', message: error.message });
  }
});

// Get sync status
router.get('/status/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;

    const [productCount, customerCount, transactionCount] = await Promise.all([
      Product.count({ where: { shopId, isDeleted: false } }),
      Customer.count({ 
        include: [{
          model: CustomerShop,
          where: { shopId, isActive: true },
          required: true
        }],
        where: { isDeleted: false }
      }),
      Transaction.count({ where: { shopId, isDeleted: false } })
    ]);

    res.json({
      success: true,
      status: {
        products: productCount,
        customers: customerCount,
        transactions: transactionCount,
        lastSyncTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Sync status error:', error);
    res.status(500).json({ error: 'Status check failed', message: error.message });
  }
});

// Get deleted customers for restoration
router.get('/deleted-customers/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;

    if (!shopId) {
      return res.status(400).json({ error: 'Shop ID is required' });
    }

    const deletedCustomers = await Customer.findAll({
      include: [{
        model: CustomerShop,
        where: { shopId, isActive: true },
        required: true
      }],
      where: { 
        isDeleted: true 
      },
      order: [['updatedAt', 'DESC']]
    });

    res.json({
      success: true,
      customers: deletedCustomers.map(customer => ({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        gstNumber: customer.gstNumber,
        creditLimit: customer.creditLimit,
        currentBalance: customer.currentBalance,
        isCreditCustomer: customer.isCreditCustomer,
        deletedAt: customer.updatedAt,
        syncVersion: customer.syncVersion
      }))
    });

  } catch (error) {
    console.error('Get deleted customers error:', error);
    res.status(500).json({ error: 'Failed to fetch deleted customers', message: error.message });
  }
});

// Restore deleted customer
router.post('/restore-customer/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    const { customerId } = req.body;

    if (!shopId || !customerId) {
      return res.status(400).json({ error: 'Shop ID and Customer ID are required' });
    }

    const customer = await Customer.findOne({
      include: [{
        model: CustomerShop,
        where: { shopId, isActive: true },
        required: true
      }],
      where: { id: customerId, isDeleted: true }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Deleted customer not found' });
    }

    await Customer.update({
      isDeleted: false,
      updatedAt: new Date(),
      syncVersion: customer.syncVersion + 1
    }, {
      where: { id: customerId }
    });

    console.log('🔍 MySQL restoration data being sent:', {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      isCreditCustomer: customer.isCreditCustomer,
      creditLimit: customer.creditLimit,
      currentBalance: customer.currentBalance,
      address: customer.address,
      gstNumber: customer.gstNumber
    });

    res.json({
      success: true,
      message: 'Customer restored successfully',
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email
      }
    });

  } catch (error) {
    console.error('Restore customer error:', error);
    res.status(500).json({ error: 'Failed to restore customer', message: error.message });
  }
});

module.exports = router;
