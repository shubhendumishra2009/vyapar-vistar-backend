const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM('sale', 'purchase', 'return', 'payment_received', 'payment_made'),
    allowNull: false,
    values: ['sale', 'purchase', 'return', 'payment_received', 'payment_made']
  },
  invoiceNumber: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  supplierId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  shopId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  items: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  tax: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'card', 'upi', 'bank_transfer', 'credit'),
    allowNull: false,
    values: ['cash', 'card', 'upi', 'bank_transfer', 'credit']
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'partial', 'overdue'),
    defaultValue: 'paid',
    values: ['pending', 'paid', 'partial', 'overdue']
  },
  notes: {
    type: DataTypes.TEXT,
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
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'transactions',
  timestamps: true,
  indexes: [],
  hooks: {
    beforeCreate: (transaction) => {
      calculateTotals(transaction);
    },
    beforeUpdate: (transaction) => {
      if (transaction.changed('items')) {
        calculateTotals(transaction);
      }
    }
  }
});

// Helper function to calculate totals
function calculateTotals(transaction) {
  if (transaction.items && Array.isArray(transaction.items)) {
    const subtotal = transaction.items.reduce((sum, item) => {
      return sum + (parseFloat(item.totalPrice) || 0);
    }, 0);
    
    transaction.subtotal = subtotal;
    transaction.total = subtotal + parseFloat(transaction.tax || 0) - parseFloat(transaction.discount || 0);
  }
}

// Instance method to add item to transaction
Transaction.prototype.addItem = function(product, quantity) {
  const items = this.items || [];
  const existingItem = items.find(item => 
    item.productId === product.id
  );
  
  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.totalPrice = existingItem.quantity * existingItem.unitPrice;
  } else {
    items.push({
      productId: product.id,
      quantity: quantity,
      unitPrice: parseFloat(product.sellingPrice),
      totalPrice: quantity * parseFloat(product.sellingPrice),
      tax: (quantity * parseFloat(product.sellingPrice) * parseFloat(product.taxRate || 0)) / 100
    });
  }
  
  this.items = items;
  calculateTotals(this);
  return this.save();
};

module.exports = Transaction;
