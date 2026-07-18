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
    const saleRoutes = require('./routes/sales');
    const inventoryRoutes = require('./routes/inventory');
    const smsRoutes = require('./routes/sms');
    const syncRoutes = require('./routes/sync');

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
    app.use('/api/sales', authRoutes.authenticateToken, authRoutes.enforceSubscription, saleRoutes);
    app.use('/api/inventory', authRoutes.authenticateToken, authRoutes.enforceSubscription, inventoryRoutes);
    app.use('/api/sms', authRoutes.authenticateToken, authRoutes.enforceSubscription, smsRoutes);
    app.use('/api/sync', authRoutes.authenticateToken, authRoutes.enforceSubscription, syncRoutes);
    
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
