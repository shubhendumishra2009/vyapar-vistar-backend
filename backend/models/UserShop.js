const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserShop = sequelize.define('UserShop', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
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
  role: {
    type: DataTypes.ENUM('admin', 'manager', 'cashier', 'salesperson'),
    allowNull: false,
    defaultValue: 'cashier',
    values: ['admin', 'manager', 'cashier', 'salesperson']
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isLocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Currently selected shop for this user'
  },
  joinedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  permissions: {
    type: DataTypes.JSON,
    defaultValue: {
      canManageProducts: false,
      canManageCustomers: false,
      canManageSales: true,
      canManageInventory: false,
      canViewReports: false,
      canSendSMS: false
    }
  }
}, {
  tableName: 'user_shops',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'shopId']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['shopId']
    },
    {
      fields: ['isLocked']
    }
  ]
});

module.exports = UserShop;
