module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('stock', {
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
        allowNull: true,
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
      batchNumber: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      purchasePrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      sellingPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      expiryDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      purchaseDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      supplierName: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
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
          fields: ['batchNumber']
        },
        {
          fields: ['expiryDate']
        }
      ]
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('stock');
  }
};