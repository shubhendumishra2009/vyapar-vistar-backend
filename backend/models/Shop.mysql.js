const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Shop = sequelize.define('Shop', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    trim: true
  },
  address: {
    type: DataTypes.TEXT,
    trim: true
  },
  phone: {
    type: DataTypes.STRING(20),
    trim: true
  },
  email: {
    type: DataTypes.STRING(255),
    trim: true,
    lowercase: true
  },
  gstNumber: {
    type: DataTypes.STRING(50),
    trim: true
  },
  logo: {
    type: DataTypes.STRING(500)
  },
  settings: {
    type: DataTypes.JSON,
    defaultValue: {
      currency: 'INR',
      taxEnabled: true,
      taxRate: 18,
      smsEnabled: true,
      printEnabled: true,
      barcodeEnabled: true,
      lowStockAlert: true,
      lowStockThreshold: 10
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  subscription: {
    type: DataTypes.JSON,
    defaultValue: {
      plan: 'free',
      expiresAt: null
    }
  }
}, {
  tableName: 'shops',
  timestamps: true,
  indexes: [
    {
      fields: ['name']
    },
    {
      fields: ['isActive']
    }
  ]
});

module.exports = Shop;
