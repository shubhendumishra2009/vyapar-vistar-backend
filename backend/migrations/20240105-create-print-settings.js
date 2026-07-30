'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create systems table
    await queryInterface.createTable('systems', {
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
      systemName: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('systems', ['businessId']);

    // Create print_settings table
    await queryInterface.createTable('print_settings', {
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
      systemId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'systems',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      reportType: {
        type: Sequelize.ENUM(
          'sale_invoice',
          'sale_receipt',
          'purchase_order',
          'purchase_receipt',
          'customer_statement',
          'inventory_report'
        ),
        allowNull: false
      },
      printerName: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      paperSize: {
        type: Sequelize.ENUM('58mm', '80mm', 'A4', 'A5'),
        defaultValue: 'A4'
      },
      action: {
        type: Sequelize.ENUM('show_print', 'show_only', 'print_only', 'none'),
        defaultValue: 'show_only'
      },
      copies: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      autoPrint: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('print_settings', ['businessId']);
    await queryInterface.addIndex('print_settings', ['systemId']);
    await queryInterface.addIndex('print_settings', ['businessId', 'systemId', 'reportType']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('print_settings');
    await queryInterface.dropTable('systems');
  }
};