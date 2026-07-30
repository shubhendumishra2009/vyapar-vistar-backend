const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    trim: true,
    lowercase: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    minlength: 6
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    trim: true
  },
  phone: {
    type: DataTypes.STRING(20),
    trim: true
  },
  type: {
    type: DataTypes.ENUM('admin', 'manager', 'cashier', 'salesperson', 'consumer'),
    defaultValue: 'cashier'
  },
  shopId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'shops',
      key: 'id'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastLogin: {
    type: DataTypes.DATE
  },
  deviceInfo: {
    type: DataTypes.JSON,
    defaultValue: {}
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
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeSave: (user) => {
      // Set permissions based on user type
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
      
      if (user.changed('type')) {
        user.permissions = permissions[user.type];
      }
    }
  },
  indexes: [
    {
      fields: ['username']
    },
    {
      fields: ['email']
    },
    {
      fields: ['shopId']
    },
    {
      fields: ['isActive']
    }
  ]
});

// Instance method to compare password
User.prototype.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;
