// Migration to add productCode field to products table
module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.addColumn('products', 'productCode', {
        type: Sequelize.STRING(100),
        allowNull: true,
        after: 'name'
      });
      console.log('Added productCode column to products table');
    } catch (error) {
      console.error('Migration error:', error.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeColumn('products', 'productCode');
      console.log('Removed productCode column from products table');
    } catch (error) {
      console.error('Migration rollback error:', error.message);
    }
  }
};