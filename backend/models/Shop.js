const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Shop = sequelize.define('Shop', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('retail', 'wholesale', 'medicine', 'hardware', 'grocery', 'restaurant', 'electronics', 'clothing', 'general', 'other'),
    allowNull: false,
    defaultValue: 'retail',
    values: ['retail', 'wholesale', 'medicine', 'hardware', 'grocery', 'restaurant', 'electronics', 'clothing', 'general', 'other']
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  gstNumber: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  logo: {
    type: DataTypes.STRING(500),
    allowNull: true
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
  businessId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'businesses',
      key: 'id'
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
  indexes: []
});

module.exports = Shop;
