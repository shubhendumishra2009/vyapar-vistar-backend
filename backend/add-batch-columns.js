const { sequelize } = require('./models');

async function addBatchColumns() {
  try {
    console.log('🔍 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    const queryInterface = sequelize.getQueryInterface();

    // Check if stock_movements table exists
    const tableNames = await sequelize.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_movements'",
      { type: sequelize.QueryTypes.SELECT }
    );

    if (tableNames.length === 0) {
      console.log('❌ stock_movements table does not exist. Please start the server first to create it.');
      process.exit(1);
    }

    console.log('✅ stock_movements table found\n');

    // Check current columns
    const tableDescription = await queryInterface.describeTable('stock_movements');
    console.log('📋 Current columns:', Object.keys(tableDescription).join(', '));
    console.log('');

    // Add batchNumber column if missing
    if (!tableDescription.batchNumber) {
      console.log('🔄 Adding batchNumber column...');
      await queryInterface.addColumn('stock_movements', 'batchNumber', {
        type: 'VARCHAR(100)',
        allowNull: true
      });
      await queryInterface.addIndex('stock_movements', ['batchNumber']);
      console.log('✅ batchNumber column added\n');
    } else {
      console.log('ℹ️ batchNumber column already exists\n');
    }

    // Add purchaseInvoiceNumber column if missing
    if (!tableDescription.purchaseInvoiceNumber) {
      console.log('🔄 Adding purchaseInvoiceNumber column...');
      await queryInterface.addColumn('stock_movements', 'purchaseInvoiceNumber', {
        type: 'VARCHAR(100)',
        allowNull: true
      });
      console.log('✅ purchaseInvoiceNumber column added\n');
    } else {
      console.log('ℹ️ purchaseInvoiceNumber column already exists\n');
    }

    // Add saleInvoiceNumber column if missing
    if (!tableDescription.saleInvoiceNumber) {
      console.log('🔄 Adding saleInvoiceNumber column...');
      await queryInterface.addColumn('stock_movements', 'saleInvoiceNumber', {
        type: 'VARCHAR(100)',
        allowNull: true
      });
      console.log('✅ saleInvoiceNumber column added\n');
    } else {
      console.log('ℹ️ saleInvoiceNumber column already exists\n');
    }

    // Verify final structure
    const updatedTable = await queryInterface.describeTable('stock_movements');
    console.log('✅ Final columns:', Object.keys(updatedTable).join(', '));
    console.log('\n🎉 Migration completed successfully!');
    console.log('\nYou can now:');
    console.log('1. Import products - they will have batch numbers');
    console.log('2. Create sales - batch numbers will be recorded');
    console.log('3. Create purchases - batch numbers will be recorded');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

addBatchColumns();