const { sequelize } = require('./models');

async function runMigrations() {
  try {
    console.log('🔍 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    const queryInterface = sequelize.getQueryInterface();

    // Migration 1: Drop foreign key on stock.shopId
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Migration 1: Dropping foreign key on stock.shopId');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    try {
      const foreignKeys = await sequelize.query(
        "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock' AND COLUMN_NAME = 'shopId' AND REFERENCED_TABLE_NAME IS NOT NULL",
        { type: sequelize.QueryTypes.SELECT }
      );
      
      console.log('Found foreign keys:', foreignKeys);
      
      if (foreignKeys.length > 0) {
        for (const fk of foreignKeys) {
          try {
            await sequelize.query(`ALTER TABLE stock DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
            console.log(`✅ Dropped foreign key: ${fk.CONSTRAINT_NAME}\n`);
          } catch (err) {
            console.log(`⚠️ Could not drop ${fk.CONSTRAINT_NAME}: ${err.message}\n`);
          }
        }
      } else {
        console.log('ℹ️ No foreign keys found on stock.shopId\n');
      }
    } catch (error) {
      console.log('⚠️ Migration 1 error:', error.message, '\n');
    }

    // Migration 1b: Drop foreign key on stock_movements.shopId
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Migration 1b: Dropping foreign key on stock_movements.shopId');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    try {
      const foreignKeys = await sequelize.query(
        "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_movements' AND COLUMN_NAME = 'shopId' AND REFERENCED_TABLE_NAME IS NOT NULL",
        { type: sequelize.QueryTypes.SELECT }
      );
      
      console.log('Found foreign keys:', foreignKeys);
      
      if (foreignKeys.length > 0) {
        for (const fk of foreignKeys) {
          try {
            await sequelize.query(`ALTER TABLE stock_movements DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
            console.log(`✅ Dropped foreign key: ${fk.CONSTRAINT_NAME}\n`);
          } catch (err) {
            console.log(`⚠️ Could not drop ${fk.CONSTRAINT_NAME}: ${err.message}\n`);
          }
        }
      } else {
        console.log('ℹ️ No foreign keys found on stock_movements.shopId\n');
      }
    } catch (error) {
      console.log('⚠️ Migration 1b error:', error.message, '\n');
    }

    // Migration 2: Add batchNumber to stock_movements
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Migration 2: Adding batchNumber to stock_movements');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    try {
      const stockMovementsTable = await queryInterface.describeTable('stock_movements');
      console.log('Current columns:', Object.keys(stockMovementsTable).join(', '));
      
      if (!stockMovementsTable.batchNumber) {
        await queryInterface.addColumn('stock_movements', 'batchNumber', {
          type: 'VARCHAR(100)',
          allowNull: true
        });
        await queryInterface.addIndex('stock_movements', ['batchNumber']);
        console.log('✅ Added batchNumber column\n');
      } else {
        console.log('ℹ️ batchNumber already exists\n');
      }
    } catch (error) {
      console.log('⚠️ Migration 2 error:', error.message, '\n');
    }

    // Migration 3: Add purchaseInvoiceNumber to stock_movements
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Migration 3: Adding purchaseInvoiceNumber to stock_movements');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    try {
      const stockMovementsTable = await queryInterface.describeTable('stock_movements');
      
      if (!stockMovementsTable.purchaseInvoiceNumber) {
        await queryInterface.addColumn('stock_movements', 'purchaseInvoiceNumber', {
          type: 'VARCHAR(100)',
          allowNull: true
        });
        console.log('✅ Added purchaseInvoiceNumber column\n');
      } else {
        console.log('ℹ️ purchaseInvoiceNumber already exists\n');
      }
    } catch (error) {
      console.log('⚠️ Migration 3 error:', error.message, '\n');
    }

    // Migration 4: Add saleInvoiceNumber to stock_movements
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Migration 4: Adding saleInvoiceNumber to stock_movements');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    try {
      const stockMovementsTable = await queryInterface.describeTable('stock_movements');
      
      if (!stockMovementsTable.saleInvoiceNumber) {
        await queryInterface.addColumn('stock_movements', 'saleInvoiceNumber', {
          type: 'VARCHAR(100)',
          allowNull: true
        });
        console.log('✅ Added saleInvoiceNumber column\n');
      } else {
        console.log('ℹ️ saleInvoiceNumber already exists\n');
      }
    } catch (error) {
      console.log('⚠️ Migration 4 error:', error.message, '\n');
    }

    // Migration 5: Add purchasePrice to stock_movements
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Migration 5: Adding purchasePrice to stock_movements');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    try {
      const stockMovementsTable = await queryInterface.describeTable('stock_movements');
      
      if (!stockMovementsTable.purchasePrice) {
        await queryInterface.addColumn('stock_movements', 'purchasePrice', {
          type: 'DECIMAL(10,2)',
          allowNull: true
        });
        console.log('✅ Added purchasePrice column\n');
      } else {
        console.log('ℹ️ purchasePrice already exists\n');
      }
    } catch (error) {
      console.log('⚠️ Migration 5 error:', error.message, '\n');
    }

    // Migration 6: Add sellingPrice to stock_movements
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Migration 6: Adding sellingPrice to stock_movements');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    try {
      const stockMovementsTable = await queryInterface.describeTable('stock_movements');
      
      if (!stockMovementsTable.sellingPrice) {
        await queryInterface.addColumn('stock_movements', 'sellingPrice', {
          type: 'DECIMAL(10,2)',
          allowNull: true
        });
        console.log('✅ Added sellingPrice column\n');
      } else {
        console.log('ℹ️ sellingPrice already exists\n');
      }
    } catch (error) {
      console.log('⚠️ Migration 6 error:', error.message, '\n');
    }

    // Migration 7: Add unitPrice to stock_movements
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Migration 7: Adding unitPrice to stock_movements');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    try {
      const stockMovementsTable = await queryInterface.describeTable('stock_movements');
      
      if (!stockMovementsTable.unitPrice) {
        await queryInterface.addColumn('stock_movements', 'unitPrice', {
          type: 'DECIMAL(10,2)',
          allowNull: true
        });
        console.log('✅ Added unitPrice column\n');
      } else {
        console.log('ℹ️ unitPrice already exists\n');
      }
    } catch (error) {
      console.log('⚠️ Migration 7 error:', error.message, '\n');
    }

    // Verify final structure
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Verification: Final stock_movements structure');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const finalTable = await queryInterface.describeTable('stock_movements');
    console.log('Columns:', Object.keys(finalTable).join(', '));
    console.log('\n🎉 All migrations completed!');
    console.log('\nYou can now:');
    console.log('1. Start the server: npm start');
    console.log('2. Import products - they will have batch numbers');
    console.log('3. Create sales - batch numbers will be recorded');
    console.log('4. Create purchases - batch numbers will be recorded');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

runMigrations();