'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('suppliers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      contactPerson: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      state: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      pincode: {
        type: Sequelize.STRING(10),
        allowNull: true
      },
      gstNumber: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      panNumber: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      creditLimit: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      currentBalance: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      paymentTerms: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      bankDetails: {
        type: Sequelize.JSON,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      businessId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'businesses',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true
      },
      lastUpdatedBy: {
        type: Sequelize.UUID,
        allowNull: true
      },
      lastSyncAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      syncVersion: {
        type: Sequelize.BIGINT,
        defaultValue: 1
      },
      isDeleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
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
    }, {
      indexes: [
        { fields: ['businessId'] },
        { fields: ['name'] }
      ]
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('suppliers');
  }
};