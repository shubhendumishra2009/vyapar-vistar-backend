const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CustomerShop = sequelize.define('CustomerShop', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'customers',
      key: 'id'
    }
  },
  shopId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'shops',
      key: 'id'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'customer_shops',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['customerId', 'shopId']
    },
    {
      fields: ['customerId']
    },
    {
      fields: ['shopId']
    }
  ]
});

module.exports = CustomerShop;
