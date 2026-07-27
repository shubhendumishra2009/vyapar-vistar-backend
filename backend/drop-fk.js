const { sequelize } = require('./models');

async function dropForeignKey() {
  try {
    console.log('🔍 Dropping foreign key transactions_ibfk_17...');
    await sequelize.query('ALTER TABLE transactions DROP FOREIGN KEY transactions_ibfk_17');
    console.log('✅ Foreign key dropped successfully');
  } catch (error) {
    console.log('⚠️ Error dropping foreign key:', error.message);
  }
  
  try {
    console.log('🔍 Adding correct foreign key...');
    await sequelize.query(
      'ALTER TABLE transactions ADD CONSTRAINT transactions_business_fk FOREIGN KEY (businessId) REFERENCES businesses (id) ON DELETE SET NULL ON UPDATE CASCADE'
    );
    console.log('✅ Correct foreign key added');
  } catch (error) {
    console.log('⚠️ Error adding foreign key:', error.message);
  }
  
  await sequelize.close();
  console.log('✅ Done');
}

dropForeignKey();