const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  gstNumber: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  creditLimit: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  currentBalance: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  isCreditCustomer: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true
  },
  lastUpdatedBy: {
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
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'customers',
  timestamps: true,
  indexes: []
});

// Instance methods
Customer.prototype.canMakeCreditPurchase = function(amount) {
  if (!this.isCreditCustomer) return false;
  return parseFloat(this.currentBalance) + parseFloat(amount) <= parseFloat(this.creditLimit);
};

Customer.prototype.updateBalance = function(amount, type = 'add') {
  if (type === 'add') {
    this.currentBalance = parseFloat(this.currentBalance) + parseFloat(amount);
  } else {
    this.currentBalance = Math.max(0, parseFloat(this.currentBalance) - parseFloat(amount));
  }
  return this.save();
};

// Virtual getter for available credit
Customer.prototype.getAvailableCredit = function() {
  if (!this.isCreditCustomer) return 0;
  return Math.max(0, parseFloat(this.creditLimit) - parseFloat(this.currentBalance));
};

module.exports = Customer;
