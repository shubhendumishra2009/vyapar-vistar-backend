'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add productType column to products table
    await queryInterface.addColumn('products', 'productType', {
      type: Sequelize.ENUM('retail', 'wholesale', 'medicine', 'hardware', 'grocery', 'restaurant', 'electronics', 'clothing', 'general', 'other'),
      allowNull: true,
      defaultValue: null
    });

    // Add productAttributes JSON column to products table
    await queryInterface.addColumn('products', 'productAttributes', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: null
    });

    // Create field_schemas table
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

    // Add indexes
    await queryInterface.addIndex('field_schemas', ['businessType']);
    await queryInterface.addIndex('field_schemas', ['businessType', 'fieldName'], { unique: true });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove columns from products
    await queryInterface.removeColumn('products', 'productType');
    await queryInterface.removeColumn('products', 'productAttributes');

    // Drop field_schemas table
    await queryInterface.dropTable('field_schemas');
  }
};