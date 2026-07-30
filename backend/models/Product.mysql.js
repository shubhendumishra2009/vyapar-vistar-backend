const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
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
  description: {
    type: DataTypes.TEXT,
    trim: true
  },
  sku: {
    type: DataTypes.STRING(100),
    trim: true,
    unique: true
  },
  barcode: {
    type: DataTypes.STRING(100),
    trim: true,
    unique: true
  },
  category: {
    type: DataTypes.STRING(100),
    trim: true
  },
  brand: {
    type: DataTypes.STRING(100),
    trim: true
  },
  unit: {
    type: DataTypes.ENUM('pieces', 'kg', 'liters', 'meters', 'boxes', 'bottles'),
    defaultValue: 'pieces'
  },
  purchasePrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  sellingPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  taxRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  stock: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  minStock: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  maxStock: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 100
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  image: {
    type: DataTypes.STRING(500)
  },
  shopId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'shops',
      key: 'id'
    }
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
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
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
  tableName: 'products',
  timestamps: true,
  indexes: [
    {
      fields: ['name']
    },
    {
      fields: ['sku']
    },
    {
      fields: ['barcode']
    },
    {
      fields: ['shopId']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['isDeleted']
    },
    {
      fields: ['stock']
    },
    {
      fields: ['category']
    },
    {
      fields: ['shopId', 'isActive', 'isDeleted']
    },
    {
      fields: ['shopId', 'stock', 'minStock']
    }
  ]
});

// Virtual getters
Product.prototype.getProfit = function() {
  return parseFloat(this.sellingPrice) - parseFloat(this.purchasePrice);
};

Product.prototype.getProfitMargin = function() {
  if (this.sellingPrice === 0) return 0;
  return ((parseFloat(this.sellingPrice) - parseFloat(this.purchasePrice)) / parseFloat(this.sellingPrice)) * 100;
};

module.exports = Product;
