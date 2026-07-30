const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Customer = sequelize.define('Customer', {
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
  phone: {
    type: DataTypes.STRING(20),
    trim: true,
    unique: true
  },
  email: {
    type: DataTypes.STRING(255),
    trim: true,
    lowercase: true,
    unique: true
  },
  address: {
    type: DataTypes.TEXT,
    trim: true
  },
  gstNumber: {
    type: DataTypes.STRING(50),
    trim: true
  },
  creditLimit: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  currentBalance: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    get() {
      const value = this.getDataValue('currentBalance');
      return value === null || value === undefined ? 0 : parseFloat(value);
    }
  },
  isCreditCustomer: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  lastUpdatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  lastSyncAt: {
    type: DataTypes.DATE
  },
  syncVersion: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'customers',
  timestamps: true,
  indexes: [
    {
      fields: ['name']
    },
    {
      fields: ['phone']
    },
    {
      fields: ['email']
    },
    {
      fields: ['isCreditCustomer']
    },
    {
      fields: ['currentBalance']
    },
    {
      fields: ['isDeleted']
    }
  ]
});

// Instance methods
Customer.prototype.canMakeCreditPurchase = function(amount) {
  if (!this.isCreditCustomer) return false;
  return this.currentBalance + amount <= this.creditLimit;
};

Customer.prototype.updateBalance = async function(amount, type = 'add') {
  if (type === 'add') {
    this.currentBalance += amount;
  } else {
    this.currentBalance = Math.max(0, this.currentBalance - amount);
  }
  return this.save();
};

// Virtual getter for available credit
Customer.prototype.getAvailableCredit = function() {
  if (!this.isCreditCustomer) return 0;
  return Math.max(0, this.creditLimit - this.currentBalance);
};

module.exports = Customer;
