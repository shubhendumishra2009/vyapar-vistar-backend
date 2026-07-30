require('dotenv').config();
const { sequelize } = require('./config/database');

async function run() {
  try {
    // Check if column exists
    const [results] = await sequelize.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'productCode'"
    );
    
    if (results.length === 0) {
      await sequelize.query("ALTER TABLE products ADD COLUMN productCode VARCHAR(100) AFTER name");
      console.log('productCode column added successfully');
    } else {
      console.log('productCode column already exists');
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}
run();
