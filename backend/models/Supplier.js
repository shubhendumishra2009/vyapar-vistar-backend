const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Supplier = sequelize.define('Supplier', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  contactPerson: {
    type: DataTypes.STRING(255),
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
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  state: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  pincode: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  gstNumber: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  panNumber: {
    type: DataTypes.STRING(20),
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
  paymentTerms: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  bankDetails: {
    type: DataTypes.JSON,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  businessId: {
    type: DataTypes.UUID,
    allowNull: true
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
  tableName: 'suppliers',
  timestamps: true,
  indexes: [
    { fields: ['businessId'] },
    { fields: ['name'] }
  ]
});

// Instance methods
Supplier.prototype.updateBalance = function(amount, type = 'add') {
  if (type === 'add') {
    this.currentBalance = parseFloat(this.currentBalance) + parseFloat(amount);
  } else {
    this.currentBalance = Math.max(0, parseFloat(this.currentBalance) - parseFloat(amount));
  }
  return this.save();
};

Supplier.prototype.getAvailableCredit = function() {
  return Math.max(0, parseFloat(this.creditLimit) - parseFloat(this.currentBalance));
};

module.exports = Supplier;