const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StockMovement = sequelize.define('StockMovement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  businessId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  shopId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  transactionId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  batchNumber: {
    type: DataTypes.STRING(100),
    allowNull: true
    // Auto-generated batch number for tracking purchase batches
  },
  type: {
    type: DataTypes.ENUM('OPENING_STOCK', 'PURCHASE', 'SALE', 'PURCHASE_RETURN', 'SALE_RETURN', 'ADJUSTMENT', 'TRANSFER'),
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
    // Positive for IN, Negative for OUT
  },
  balanceAfter: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  referenceType: {
    type: DataTypes.STRING(50),
    allowNull: true
    // 'product_creation', 'purchase', 'sale', 'return', 'adjustment', 'transfer'
  },
  referenceId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  purchasePrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
    // Price at which this batch was purchased
  },
  sellingPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
    // Selling price for this batch
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true
    // For perishable goods
  },
  purchaseInvoiceNumber: {
    type: DataTypes.STRING(100),
    allowNull: true
    // Purchase invoice number for purchase transactions
  },
  saleInvoiceNumber: {
    type: DataTypes.STRING(100),
    allowNull: true
    // Sale invoice number for sale transactions
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true
  },
  lastSyncAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  syncVersion: {
    type: DataTypes.BIGINT,
    defaultValue: 1
  }
}, {
  tableName: 'stock_movements',
  timestamps: true,
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

module.exports = StockMovement;