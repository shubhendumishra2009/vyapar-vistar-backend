const express = require('express');
const { DataTypes, sequelize } = require('./models');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting - disabled for development (re-enable for production)
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 5000, // limit each IP to 5000 requests per windowMs
//   message: { error: 'Too many requests, please try again later.' }
// });
// app.use('/api/', limiter);

// Socket.IO for real-time updates
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Make io available to routes
app.set('io', io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  socket.on('join-shop', (shopId) => {
    socket.join(shopId);
    console.log(`📱 Client ${socket.id} joined shop ${shopId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// MySQL Connection and Server Startup
async function startServer() {
  try {
    // Authenticate and sync database
    await sequelize.authenticate();
    console.log('✅ Connected to MySQL database');
    
    // Ensure associations are properly initialized
    const { UserShop, Shop } = require('./models');
    if (!UserShop.associations.shop) {
      console.log('🔄 Initializing UserShop associations...');
      UserShop.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop' });
    }
    
    // Sync with caution to avoid foreign key conflicts
    try {
      await sequelize.sync({ alter: false });
      console.log('✅ Database synchronized (no alter)');
      
      // Handle migrations
      try {
        const queryInterface = sequelize.getQueryInterface();
        
        // Migration 1: Remove shopId column from users table if it exists
        const usersTable = await queryInterface.describeTable('users');
        if (usersTable.shopId) {
          console.log('🔄 Migrating: Removing shopId column from users table...');
          await queryInterface.removeColumn('users', 'shopId');
          console.log('✅ Migration completed: shopId column removed from users');
        }
        
        // Migration 2: Add type column to shops table if it doesn't exist
        const shopsTable = await queryInterface.describeTable('shops');
        if (!shopsTable.type) {
          console.log('🔄 Migrating: Adding type column to shops table...');
          // Use raw SQL for ENUM type
          await sequelize.query(`
            ALTER TABLE shops 
            ADD COLUMN type ENUM('retail', 'wholesale', 'medicine', 'hardware', 'grocery', 'restaurant', 'electronics', 'clothing', 'general', 'other') 
            NOT NULL DEFAULT 'retail'
          `);
          console.log('✅ Migration completed: type column added to shops');
        }
        
        // Migration 3: Remove shopId column from customers table if it exists
        try {
          const customersTable = await queryInterface.describeTable('customers');
          console.log('🔍 Customers table columns:', Object.keys(customersTable));
          if (customersTable.shopId) {
            console.log('🔄 Migrating: Removing shopId column from customers table...');
            // First drop foreign key if it exists
            try {
              await sequelize.query('ALTER TABLE customers DROP FOREIGN KEY customers_ibfk_1');
            } catch (fkError) {
              console.log('⚠️ No foreign key to drop or already removed');
            }
            await queryInterface.removeColumn('customers', 'shopId');
            console.log('✅ Migration completed: shopId column removed from customers');
          } else {
            console.log('ℹ️ shopId column not found in customers table');
          }
        } catch (error) {
          console.log('⚠️ Customer migration warning:', error.message);
        }

        // Migration 4: Add businessId column to products table if it doesn't exist
        // (web app is business-scoped, so products are queried by businessId).
        // Also make shopId optional so products are dedicated to a business unit.
        try {
          const productsTable = await queryInterface.describeTable('products');
          if (!productsTable.businessId) {
            console.log('🔄 Migrating: Adding businessId column to products table...');
            await queryInterface.addColumn('products', 'businessId', {
              type: Sequelize.UUID,
              allowNull: true,
            });
            try {
              await sequelize.query(
                'ALTER TABLE products ADD CONSTRAINT products_business_fk FOREIGN KEY (businessId) REFERENCES businesses (id) ON DELETE CASCADE ON UPDATE CASCADE'
              );
            } catch (fkErr) {
              console.log('ℹ️ businessId FK already exists or skipped:', fkErr.message);
            }
            await queryInterface.addIndex('products', ['businessId']);
            console.log('✅ Migration completed: businessId column added to products');
          } else {
            console.log('ℹ️ businessId column already exists in products table');
          }

          // Make shopId nullable if it is currently required.
          const shopIdCol = productsTable.shopId;
          if (shopIdCol && shopIdCol.allowNull === false) {
            console.log('🔄 Migrating: Making products.shopId optional...');
            await queryInterface.changeColumn('products', 'shopId', {
              type: Sequelize.UUID,
              allowNull: true,
            });
            console.log('✅ Migration completed: products.shopId is now optional');
          }
        } catch (error) {
          console.log('⚠️ Products businessId migration warning:', error.message);
        }

        // Migration 4a: Add isActive column to customers table if it doesn't exist
        try {
          console.log('🔍 Checking customers table structure...');
          const customersTable = await queryInterface.describeTable('customers');
          console.log('🔍 Customers table columns:', Object.keys(customersTable));
          
          if (!customersTable.isActive) {
            console.log('🔄 Migrating: Adding isActive column to customers table...');
            await queryInterface.addColumn('customers', 'isActive', {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: true
            });
            console.log('✅ Migration completed: isActive column added to customers');
            
            // Verify the column was added
            const updatedTable = await queryInterface.describeTable('customers');
            console.log('✅ Verified: isActive column exists:', !!updatedTable.isActive);
          } else {
            console.log('ℹ️ isActive column already exists in customers table');
          }
        } catch (error) {
          console.log('⚠️ Customers isActive migration warning:', error.message);
          console.log('⚠️ Error stack:', error.stack);
        }

        // Migration 4a.5: Alter syncVersion column to BIGINT if it's currently INTEGER
        try {
          const customersTable = await queryInterface.describeTable('customers');
          if (customersTable.syncVersion && customersTable.syncVersion.type === 'INTEGER') {
            console.log('🔄 Migrating: Altering syncVersion column from INTEGER to BIGINT...');
            await sequelize.query('ALTER TABLE customers MODIFY COLUMN syncVersion BIGINT DEFAULT 1');
            console.log('✅ Migration completed: syncVersion column altered to BIGINT');
          } else if (customersTable.syncVersion) {
            console.log('ℹ️ syncVersion column is already BIGINT or not INTEGER');
          } else {
            console.log('ℹ️ syncVersion column not found');
          }
        } catch (error) {
          console.log('⚠️ syncVersion migration warning:', error.message);
        }

        // Migration 4b: Create business_customers junction table for many-to-many relationship
        try {
          console.log('🔍 Checking if business_customers table exists...');
          const tableNames = await sequelize.query(
            "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'business_customers'",
            { type: sequelize.QueryTypes.SELECT }
          );

          console.log('🔍 Table check result:', tableNames.length > 0 ? 'exists' : 'does not exist');

          if (tableNames.length === 0) {
            console.log('🔄 Migrating: Creating business_customers junction table...');
            await queryInterface.createTable('business_customers', {
              id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
              },
              businessId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                  model: 'businesses',
                  key: 'id'
                },
                onDelete: 'CASCADE'
              },
              customerId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                  model: 'customers',
                  key: 'id'
                },
                onDelete: 'CASCADE'
              },
              isActive: {
                type: Sequelize.BOOLEAN,
                defaultValue: true
              },
              createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
              },
              updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
              }
            });
            await queryInterface.addIndex('business_customers', ['businessId']);
            await queryInterface.addIndex('business_customers', ['customerId']);
            await queryInterface.addConstraint('business_customers', {
              fields: ['businessId', 'customerId'],
              type: 'unique',
              name: 'unique_business_customer'
            });
            console.log('✅ Migration completed: business_customers table created');
          } else {
            console.log('ℹ️ business_customers table already exists');
          }
        } catch (error) {
          console.log('⚠️ Business customers migration warning:', error.message);
        }

        // Migration 5: Add productType and productAttributes columns to products table
        try {
          const productsTable = await queryInterface.describeTable('products');
          if (!productsTable.productType) {
            console.log('🔄 Migrating: Adding productType column to products table...');
            await sequelize.query(`
              ALTER TABLE products 
              ADD COLUMN productType ENUM('retail', 'wholesale', 'medicine', 'hardware', 'grocery', 'restaurant', 'electronics', 'clothing', 'general', 'other') 
              DEFAULT NULL
            `);
            console.log('✅ Migration completed: productType column added to products');
          } else {
            console.log('ℹ️ productType column already exists in products table');
          }

          if (!productsTable.productCode) {
            console.log('🔄 Migrating: Adding productCode column to products table...');
            await queryInterface.addColumn('products', 'productCode', {
              type: Sequelize.STRING(100),
              allowNull: true,
            });
            console.log('✅ Migration completed: productCode column added to products');
          } else {
            console.log('ℹ️ productCode column already exists in products table');
          }

          if (!productsTable.productAttributes) {
            console.log('🔄 Migrating: Adding productAttributes column to products table...');
            await queryInterface.addColumn('products', 'productAttributes', {
              type: Sequelize.JSON,
              allowNull: true,
            });
            console.log('✅ Migration completed: productAttributes column added to products');
          } else {
            console.log('ℹ️ productAttributes column already exists in products table');
          }
        } catch (error) {
          console.log('⚠️ Product type migration warning:', error.message);
        }

        // Migration 4c: Fix businessId column in transactions table
        try {
          console.log('🔍 Checking transactions table for businessId column...');
          const transactionsTable = await queryInterface.describeTable('transactions');
          console.log('🔍 Transactions table columns:', Object.keys(transactionsTable));
          
          if (!transactionsTable.businessId) {
            console.log('🔄 Migrating: Adding businessId column to transactions table...');
            await queryInterface.addColumn('transactions', 'businessId', {
              type: Sequelize.UUID,
              allowNull: true,
            });
            console.log('✅ businessId column added');
          } else {
            console.log('ℹ️ businessId column already exists');
          }
          
          // Drop ALL foreign keys on businessId column
          console.log('🔄 Dropping all foreign keys on transactions.businessId...');
          try {
            // Get all foreign keys on transactions table
            const foreignKeys = await sequelize.query(
              "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'businessId' AND REFERENCED_TABLE_NAME IS NOT NULL",
              { type: sequelize.QueryTypes.SELECT }
            );
            
            console.log('🔍 Found foreign keys:', foreignKeys);
            
            for (const fk of foreignKeys) {
              try {
                await sequelize.query(`ALTER TABLE transactions DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
                console.log(`✅ Dropped foreign key: ${fk.CONSTRAINT_NAME}`);
              } catch (err) {
                console.log(`⚠️ Could not drop ${fk.CONSTRAINT_NAME}:`, err.message);
              }
            }
          } catch (err) {
            console.log('⚠️ Error dropping foreign keys:', err.message);
          }
          
          // Add foreign key referencing businesses table
          try {
            await sequelize.query(
              'ALTER TABLE transactions ADD CONSTRAINT transactions_business_fk FOREIGN KEY (businessId) REFERENCES businesses (id) ON DELETE SET NULL ON UPDATE CASCADE'
            );
            console.log('✅ Foreign key constraint added (references businesses, SET NULL on delete)');
          } catch (fkErr) {
            console.log('ℹ️ Foreign key constraint skipped:', fkErr.message);
          }
          
          // Add index
          try {
            await queryInterface.addIndex('transactions', ['businessId']);
            console.log('✅ Index added on businessId');
          } catch (idxErr) {
            console.log('ℹ️ Index already exists or skipped:', idxErr.message);
          }
          
          console.log('✅ Migration completed: businessId column configured');
        } catch (error) {
          console.log('⚠️ Transactions businessId migration warning:', error.message);
          console.log('⚠️ Error stack:', error.stack);
        }

        // Migration 4d: Create transaction_details table for line items
        try {
          console.log('🔍 Checking if transaction_details table exists...');
          const tableNames = await sequelize.query(
            "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transaction_details'",
            { type: sequelize.QueryTypes.SELECT }
          );

          if (tableNames.length === 0) {
            console.log('🔄 Migrating: Creating transaction_details table...');
            await queryInterface.createTable('transaction_details', {
              id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
              },
              transactionId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                  model: 'transactions',
                  key: 'id'
                },
                onDelete: 'CASCADE'
              },
              productId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                  model: 'products',
                  key: 'id'
                },
                onDelete: 'RESTRICT'
              },
              productName: {
                type: Sequelize.STRING(255),
                allowNull: false
              },
              quantity: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false
              },
              unitPrice: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false
              },
              discount: {
                type: Sequelize.DECIMAL(10, 2),
                defaultValue: 0
              },
              tax: {
                type: Sequelize.DECIMAL(10, 2),
                defaultValue: 0
              },
              total: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false
              },
              createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
              },
              updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
              }
            });
            await queryInterface.addIndex('transaction_details', ['transactionId']);
            await queryInterface.addIndex('transaction_details', ['productId']);
            console.log('✅ Migration completed: transaction_details table created');
          } else {
            console.log('ℹ️ transaction_details table already exists');
          }
        } catch (error) {
          console.log('⚠️ Transaction details migration warning:', error.message);
        }

        // Migration 7: Create stock table (current stock by batch) if it doesn't exist
        try {
          console.log('🔍 Checking if stock table exists...');
          const tableNames = await sequelize.query(
            "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock'",
            { type: sequelize.QueryTypes.SELECT }
          );

          if (tableNames.length === 0) {
            console.log('🔄 Migrating: Creating stock table...');
            await queryInterface.createTable('stock', {
              id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
              },
              businessId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                  model: 'businesses',
                  key: 'id'
                },
                onDelete: 'CASCADE'
              },
              shopId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                  model: 'shops',
                  key: 'id'
                },
                onDelete: 'CASCADE'
              },
              productId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                  model: 'products',
                  key: 'id'
                },
                onDelete: 'CASCADE'
              },
              batchNumber: {
                type: Sequelize.STRING(100),
                allowNull: false
              },
              quantity: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0
              },
              purchasePrice: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true
              },
              sellingPrice: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true
              },
              expiryDate: {
                type: Sequelize.DATE,
                allowNull: true
              },
              purchaseDate: {
                type: Sequelize.DATE,
                allowNull: true
              },
              supplierName: {
                type: Sequelize.STRING(255),
                allowNull: true
              },
              notes: {
                type: Sequelize.TEXT,
                allowNull: true
              },
              lastSyncAt: {
                type: Sequelize.DATE,
                allowNull: true
              },
              syncVersion: {
                type: Sequelize.BIGINT,
                defaultValue: 1
              },
              createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
              },
              updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
              }
            }, {
              indexes: [
                { fields: ['productId', 'businessId'] },
                { fields: ['batchNumber'] },
                { fields: ['expiryDate'] }
              ]
            });
            console.log('✅ Migration completed: stock table created');
          } else {
            console.log('ℹ️ stock table already exists');
            
            // Migration 7a: Drop foreign key constraint on shopId (web app is business-scoped, not shop-scoped)
            try {
              console.log('🔄 Dropping foreign key constraint on stock.shopId...');
              // Get all foreign keys on stock table
              const foreignKeys = await sequelize.query(
                "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock' AND COLUMN_NAME = 'shopId' AND REFERENCED_TABLE_NAME IS NOT NULL",
                { type: sequelize.QueryTypes.SELECT }
              );
              
              console.log('🔍 Found foreign keys on stock.shopId:', foreignKeys);
              
              if (foreignKeys.length > 0) {
                for (const fk of foreignKeys) {
                  try {
                    await sequelize.query(`ALTER TABLE stock DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
                    console.log(`✅ Dropped foreign key: ${fk.CONSTRAINT_NAME}`);
                  } catch (err) {
                    console.log(`⚠️ Could not drop ${fk.CONSTRAINT_NAME}:`, err.message);
                  }
                }
              } else {
                console.log('ℹ️ No foreign keys found on stock.shopId');
              }
            } catch (migrationError) {
              console.log('⚠️ Stock foreign key migration warning:', migrationError.message);
            }
          }
        } catch (error) {
          console.log('⚠️ Stock table migration warning:', error.message);
        }

        // Migration 8: Create stock_movements table if it doesn't exist
        try {
          console.log('🔍 Checking if stock_movements table exists...');
          const tableNames = await sequelize.query(
            "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_movements'",
            { type: sequelize.QueryTypes.SELECT }
          );

          if (tableNames.length === 0) {
            console.log('🔄 Migrating: Creating stock_movements table...');
            await queryInterface.createTable('stock_movements', {
              id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
              },
              businessId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                  model: 'businesses',
                  key: 'id'
                },
                onDelete: 'CASCADE'
              },
              shopId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                  model: 'shops',
                  key: 'id'
                },
                onDelete: 'CASCADE'
              },
              productId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                  model: 'products',
                  key: 'id'
                },
                onDelete: 'CASCADE'
              },
              transactionId: {
                type: Sequelize.UUID,
                allowNull: true
              },
              batchNumber: {
                type: Sequelize.STRING(100),
                allowNull: true
              },
              type: {
                type: Sequelize.ENUM('OPENING_STOCK', 'PURCHASE', 'SALE', 'PURCHASE_RETURN', 'SALE_RETURN', 'ADJUSTMENT', 'TRANSFER'),
                allowNull: false
              },
              quantity: {
                type: Sequelize.INTEGER,
                allowNull: false
              },
              balanceAfter: {
                type: Sequelize.INTEGER,
                allowNull: false
              },
              referenceType: {
                type: Sequelize.STRING(50),
                allowNull: true
              },
              referenceId: {
                type: Sequelize.UUID,
                allowNull: true
              },
              purchasePrice: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true
              },
              sellingPrice: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true
              },
              unitPrice: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true
              },
              expiryDate: {
                type: Sequelize.DATE,
                allowNull: true
              },
              purchaseInvoiceNumber: {
                type: Sequelize.STRING(100),
                allowNull: true
              },
              saleInvoiceNumber: {
                type: Sequelize.STRING(100),
                allowNull: true
              },
              notes: {
                type: Sequelize.TEXT,
                allowNull: true
              },
              createdBy: {
                type: Sequelize.UUID,
                allowNull: true
              },
              lastSyncAt: {
                type: Sequelize.DATE,
                allowNull: true
              },
              syncVersion: {
                type: Sequelize.BIGINT,
                defaultValue: 1
              },
              createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
              },
              updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
              }
            }, {
              indexes: [
                { fields: ['productId', 'businessId'] },
                { fields: ['transactionId'] },
                { fields: ['type'] },
                { fields: ['createdAt'] }
              ]
            });
            console.log('✅ Migration completed: stock_movements table created');
          } else {
            console.log('ℹ️ stock_movements table already exists');
            
            // Migration 8a: Add batchNumber column if it doesn't exist
            try {
              const stockMovementsTable = await queryInterface.describeTable('stock_movements');
              if (!stockMovementsTable.batchNumber) {
                console.log('🔄 Migrating: Adding batchNumber column to stock_movements...');
                await queryInterface.addColumn('stock_movements', 'batchNumber', {
                  type: Sequelize.STRING(100),
                  allowNull: true
                });
                await queryInterface.addIndex('stock_movements', ['batchNumber']);
                console.log('✅ Migration completed: batchNumber column added to stock_movements');
              } else {
                console.log('ℹ️ batchNumber column already exists in stock_movements');
              }

              // Migration 8b: Add purchaseInvoiceNumber column if it doesn't exist
              if (!stockMovementsTable.purchaseInvoiceNumber) {
                console.log('🔄 Migrating: Adding purchaseInvoiceNumber column...');
                await queryInterface.addColumn('stock_movements', 'purchaseInvoiceNumber', {
                  type: Sequelize.STRING(100),
                  allowNull: true
                });
                console.log('✅ Migration completed: purchaseInvoiceNumber column added');
              }

              // Migration 8c: Add saleInvoiceNumber column if it doesn't exist
              if (!stockMovementsTable.saleInvoiceNumber) {
                console.log('🔄 Migrating: Adding saleInvoiceNumber column...');
                await queryInterface.addColumn('stock_movements', 'saleInvoiceNumber', {
                  type: Sequelize.STRING(100),
                  allowNull: true
                });
                console.log('✅ Migration completed: saleInvoiceNumber column added');
              }

              // Migration 8d: Add purchasePrice and sellingPrice columns if they don't exist
              if (!stockMovementsTable.purchasePrice) {
                console.log('🔄 Migrating: Adding purchasePrice column...');
                await queryInterface.addColumn('stock_movements', 'purchasePrice', {
                  type: Sequelize.DECIMAL(10, 2),
                  allowNull: true
                });
                console.log('✅ Migration completed: purchasePrice column added');
              }

              if (!stockMovementsTable.sellingPrice) {
                console.log('🔄 Migrating: Adding sellingPrice column...');
                await queryInterface.addColumn('stock_movements', 'sellingPrice', {
                  type: Sequelize.DECIMAL(10, 2),
                  allowNull: true
                });
                console.log('✅ Migration completed: sellingPrice column added');
              }

              // Migration 8e: Add unitPrice column if it doesn't exist
              if (!stockMovementsTable.unitPrice) {
                console.log('🔄 Migrating: Adding unitPrice column...');
                await queryInterface.addColumn('stock_movements', 'unitPrice', {
                  type: Sequelize.DECIMAL(10, 2),
                  allowNull: true
                });
                console.log('✅ Migration completed: unitPrice column added');
              }
            } catch (migrationError) {
              console.log('⚠️ Stock movements column migration warning:', migrationError.message);
            }
          }
        } catch (error) {
          console.log('⚠️ Stock movements migration warning:', error.message);
        }

        // Migration 6: Create field_schemas table if it doesn't exist
        try {
          const tableNames = await sequelize.query(
            "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'field_schemas'",
            { type: sequelize.QueryTypes.SELECT }
          );

          if (tableNames.length === 0) {
            console.log('🔄 Migrating: Creating field_schemas table...');
            await queryInterface.createTable('field_schemas', {
              id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
              },
              businessType: {
                type: Sequelize.ENUM('retail', 'wholesale', 'medicine', 'hardware', 'grocery', 'restaurant', 'electronics', 'clothing', 'general', 'other'),
                allowNull: false
              },
              fieldName: {
                type: Sequelize.STRING(100),
                allowNull: false
              },
              fieldLabel: {
                type: Sequelize.STRING(255),
                allowNull: false
              },
              fieldType: {
                type: Sequelize.ENUM('text', 'number', 'date', 'boolean', 'select', 'array', 'textarea'),
                allowNull: false,
                defaultValue: 'text'
              },
              required: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
              },
              options: {
                type: Sequelize.JSON,
                allowNull: true
              },
              placeholder: {
                type: Sequelize.STRING(255),
                allowNull: true
              },
              defaultValue: {
                type: Sequelize.STRING(255),
                allowNull: true
              },
              sortOrder: {
                type: Sequelize.INTEGER,
                defaultValue: 0
              },
              isActive: {
                type: Sequelize.BOOLEAN,
                defaultValue: true
              },
              createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
              },
              updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
              }
            });
            await queryInterface.addIndex('field_schemas', ['businessType']);
            console.log('✅ Migration completed: field_schemas table created');
          } else {
            console.log('ℹ️ field_schemas table already exists');
          }
        } catch (error) {
          console.log('⚠️ Field schemas migration warning:', error.message);
        }
        
      } catch (migrationError) {
        console.log('⚠️ Migration warning:', migrationError.message);
      }
      
    } catch (error) {
      console.log('⚠️ Sync failed, trying force sync (this will recreate tables)...');
      await sequelize.sync({ force: false });
      console.log('✅ Database synchronized');
    }
    
    // Load routes only after database is ready
    const authRoutes = require('./routes/auth');
    const businessRoutes = require('./routes/businesses');
    const shopRoutes = require('./routes/shops');
    const productRoutes = require('./routes/products');
    const productImportExportRoutes = require('./routes/products-import-export');
    const customerRoutes = require('./routes/customers');
    const supplierRoutes = require('./routes/suppliers');
    const saleRoutes = require('./routes/sales');
    const purchaseRoutes = require('./routes/purchases');
    const inventoryRoutes = require('./routes/inventory');
    const smsRoutes = require('./routes/sms');
    const syncRoutes = require('./routes/sync');
    const printSettingsRoutes = require('./routes/print-settings');

    // Register routes
    app.use('/api/auth', authRoutes);
    // ERP data routes are gated by subscription enforcement. The businesses
    // GET endpoint is intentionally excluded so the client can still detect
    // the locked state and render the purchase screen.
    app.use('/api/businesses', businessRoutes);
    app.use('/api/shops', authRoutes.authenticateToken, authRoutes.enforceSubscription, shopRoutes);
    app.use('/api/products', authRoutes.authenticateToken, authRoutes.enforceSubscription, productRoutes);
    app.use('/api/products', authRoutes.authenticateToken, authRoutes.enforceSubscription, productImportExportRoutes);
    app.use('/api/customers', authRoutes.authenticateToken, authRoutes.enforceSubscription, customerRoutes);
    app.use('/api/suppliers', authRoutes.authenticateToken, authRoutes.enforceSubscription, supplierRoutes);
    app.use('/api/sales', authRoutes.authenticateToken, authRoutes.enforceSubscription, saleRoutes);
    app.use('/api/purchases', authRoutes.authenticateToken, authRoutes.enforceSubscription, purchaseRoutes);
    app.use('/api/inventory', authRoutes.authenticateToken, authRoutes.enforceSubscription, inventoryRoutes);
    app.use('/api/sms', authRoutes.authenticateToken, authRoutes.enforceSubscription, smsRoutes);
    app.use('/api/sync', authRoutes.authenticateToken, authRoutes.enforceSubscription, syncRoutes);
    app.use('/api/print-settings', printSettingsRoutes);
    
    // Health check
    app.get('/api/health', async (req, res) => {
      try {
        await sequelize.authenticate();
        res.json({ 
          status: 'OK', 
          timestamp: new Date().toISOString(),
          mysql: 'connected'
        });
      } catch (error) {
        res.json({ 
          status: 'OK', 
          timestamp: new Date().toISOString(),
          mysql: 'disconnected'
        });
      }
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error('� Error:', err.stack);
      res.status(500).json({ 
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    });

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });
    
    // Start HTTP server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
      console.log('📡 Socket.IO server ready for real-time updates');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;
