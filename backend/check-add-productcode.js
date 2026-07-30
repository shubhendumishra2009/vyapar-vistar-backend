const { sequelize } = require('./config/database');
const { DataTypes } = require('sequelize');

async function checkAndAddProductCode() {
  try {
    await sequelize.authenticate();
    console.log('✅ DB connected');
    
    // Check products table columns
    const [cols] = await sequelize.query('SHOW COLUMNS FROM products');
    const colNames = cols.map(c => c.Field);
    console.log('Current columns:', colNames.join(', '));
    
    if (colNames.includes('productCode')) {
      console.log('✅ productCode column already exists');
    } else {
      console.log('❌ productCode column MISSING - adding it now...');
      const queryInterface = sequelize.getQueryInterface();
      await queryInterface.addColumn('products', 'productCode', {
        type: DataTypes.STRING(100),
        allowNull: true,
      });
      console.log('✅ productCode column added successfully!');
    }
    
    // Also check sku column
    if (colNames.includes('sku')) {
      console.log('✅ sku column exists');
    } else {
      console.log('❌ sku column MISSING - adding it now...');
      const queryInterface = sequelize.getQueryInterface();
      await queryInterface.addColumn('products', 'sku', {
        type: DataTypes.STRING(100),
        allowNull: true,
      });
      console.log('✅ sku column added successfully!');
    }
    
    // Show final columns
    const [updatedCols] = await sequelize.query('SHOW COLUMNS FROM products');
    console.log('\nUpdated columns:');
    updatedCols.forEach(c => {
      console.log(`  - ${c.Field} [${c.Type}] ${c.Null === 'YES' ? 'nullable' : 'NOT NULL'} ${c.Default !== null ? `default: ${c.Default}` : ''}`);
    });
    
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

checkAndAddProductCode();