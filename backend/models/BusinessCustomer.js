const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BusinessCustomer = sequelize.define('BusinessCustomer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  businessId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'businesses',
      key: 'id'
    }
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'customers',
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
  tableName: 'business_customers',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['businessId', 'customerId']
    },
    {
      fields: ['businessId']
    },
    {
      fields: ['customerId']
    }
  ]
});

module.exports = BusinessCustomer;