'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add businessId to products so the web app (which is business-scoped)
    // can list/manage products without going through a specific shop.
    await queryInterface.addColumn('products', 'businessId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'businesses',
        key: 'id'
      },
      onDelete: 'CASCADE'
    });

    await queryInterface.addIndex('products', ['businessId']);

    // Make shopId optional so products are dedicated to a business unit and
    // no longer require a shop to exist.
    await queryInterface.changeColumn('products', 'shopId', {
      type: Sequelize.UUID,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('products', 'businessId');
  }
};