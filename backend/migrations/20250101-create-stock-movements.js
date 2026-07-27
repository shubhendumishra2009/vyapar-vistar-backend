module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('stock_movements', {
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
      shopId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'shops',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      transactionId: {
        type: Sequelize.UUID,
        allowNull: true
      },
      batchNumber: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      type: {
        type: Sequelize.ENUM('OPENING_STOCK', 'PURCHASE', 'SALE', 'PURCHASE_RETURN', 'SALE_RETURN', 'ADJUSTMENT', 'TRANSFER'),
        allowNull: false
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      balanceAfter: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      referenceType: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      referenceId: {
        type: Sequelize.UUID,
        allowNull: true
      },
      purchasePrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      sellingPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      unitPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      expiryDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      purchaseInvoiceNumber: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      saleInvoiceNumber: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdBy: {
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
        {
          fields: ['productId', 'businessId']
        },
        {
          fields: ['transactionId']
        },
        {
          fields: ['type']
        },
        {
          fields: ['createdAt']
        }
      ]
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('stock_movements');
  }
};