const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('admin', 'manager', 'cashier', 'salesperson', 'consumer'),
    allowNull: false,
    defaultValue: 'cashier',
    values: ['admin', 'manager', 'cashier', 'salesperson', 'consumer']
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  deviceInfo: {
    type: DataTypes.JSON,
    allowNull: true
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
  tableName: 'users',
  timestamps: true,
  indexes: [],
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
      user.permissions = getUserPermissions(user.type);
    },
    beforeUpdate: async (user) => {
      if (user.changed('password') && user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
      if (user.changed('type')) {
        user.permissions = getUserPermissions(user.type);
      }
    }
  }
});

// Helper function to get permissions based on user type
function getUserPermissions(type) {
  const permissions = {
    admin: {
      canManageProducts: true,
      canManageCustomers: true,
      canManageSales: true,
      canManageInventory: true,
      canViewReports: true,
      canSendSMS: true
    },
    manager: {
      canManageProducts: true,
      canManageCustomers: true,
      canManageSales: true,
      canManageInventory: true,
      canViewReports: true,
      canSendSMS: true
    },
    cashier: {
      canManageProducts: false,
      canManageCustomers: false,
      canManageSales: true,
      canManageInventory: false,
      canViewReports: false,
      canSendSMS: false
    },
    salesperson: {
      canManageProducts: false,
      canManageCustomers: true,
      canManageSales: true,
      canManageInventory: false,
      canViewReports: false,
      canSendSMS: false
    },
    consumer: {
      canManageProducts: false,
      canManageCustomers: false,
      canManageSales: false,
      canManageInventory: false,
      canViewReports: false,
      canSendSMS: false
    }
  };
  
  return permissions[type] || permissions.cashier;
}

// Instance method to compare password
User.prototype.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;
