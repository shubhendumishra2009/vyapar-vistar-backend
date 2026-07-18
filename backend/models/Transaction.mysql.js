const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM('sale', 'purchase', 'return', 'payment_received', 'payment_made'),
    allowNull: false
  },
  invoiceNumber: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'customers',
      key: 'id'
    }
  },
  supplierId: {
    type: DataTypes.UUID,
    allowNull: true
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
  items: {
    type: DataTypes.JSON,
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
    allowNull: false
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'partial', 'overdue'),
    defaultValue: 'paid'
  },
  notes: {
    type: DataTypes.TEXT,
    trim: true
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
  tableName: 'transactions',
  timestamps: true,
  hooks: {
    beforeSave: (transaction) => {
      if (transaction.changed('items')) {
        const items = transaction.items || [];
        transaction.subtotal = items.reduce((sum, item) => sum + parseFloat(item.totalPrice || 0), 0);
        transaction.total = parseFloat(transaction.subtotal) + parseFloat(transaction.tax || 0) - parseFloat(transaction.discount || 0);
      }
    }
  },
  indexes: [
    {
      fields: ['invoiceNumber']
    },
    {
      fields: ['shopId']
    },
    {
      fields: ['customerId']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['type']
    },
    {
      fields: ['paymentStatus']
    },
    {
      fields: ['createdAt']
    },
    {
      fields: ['isDeleted']
    },
    {
      fields: ['shopId', 'type', 'createdAt']
    },
    {
      fields: ['shopId', 'customerId', 'paymentStatus']
    }
  ]
});

// Instance method to add item to transaction
Transaction.prototype.addItem = function(product, quantity) {
  const items = this.items || [];
  const existingItem = items.find(item => 
    item.productId === product.id
  );
  
  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.totalPrice = existingItem.quantity * parseFloat(existingItem.unitPrice);
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
  this.subtotal = items.reduce((sum, item) => sum + parseFloat(item.totalPrice || 0), 0);
  this.total = parseFloat(this.subtotal) + parseFloat(this.tax || 0) - parseFloat(this.discount || 0);
  
  return this.save();
};

module.exports = Transaction;
