const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  productCode: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  sku: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  barcode: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  brand: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  unit: {
    type: DataTypes.ENUM('pieces', 'kg', 'liters', 'meters', 'boxes', 'bottles'),
    allowNull: false,
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
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  minStock: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  maxStock: {
    type: DataTypes.INTEGER,
    defaultValue: 100
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  image: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  // productType mirrors the business type (e.g., 'medicine', 'grocery', 'wholesale')
  // It determines which field_schema applies to this product's productAttributes.
  productType: {
    type: DataTypes.ENUM('retail', 'wholesale', 'medicine', 'hardware', 'grocery', 'restaurant', 'electronics', 'clothing', 'general', 'other'),
    allowNull: true
  },
  // productAttributes stores type-specific fields as a flexible JSON object.
  // e.g. for 'medicine': { batchNumber: 'B001', expiryDate: '2027-06', manufacturer: 'Cipla' }
  //      for 'wholesale': { moq: 50, bulkUnit: 'carton', priceTiers: [...] }
  productAttributes: {
    type: DataTypes.JSON,
    allowNull: true
  },
  shopId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  businessId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'businesses',
      key: 'id'
    },
    onDelete: 'CASCADE'
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
  tableName: 'products',
  timestamps: true,
  indexes: []
});

// Instance methods
Product.prototype.getProfit = function() {
  return parseFloat(this.sellingPrice) - parseFloat(this.purchasePrice);
};

Product.prototype.getProfitMargin = function() {
  if (parseFloat(this.sellingPrice) === 0) return 0;
  return ((parseFloat(this.sellingPrice) - parseFloat(this.purchasePrice)) / parseFloat(this.sellingPrice)) * 100;
};

// Virtual getters (using getters)
Product.prototype.get = function(key) {
  if (key === 'profit') {
    return this.getProfit();
  }
  if (key === 'profitMargin') {
    return this.getProfitMargin();
  }
  return this.dataValues[key];
};

module.exports = Product;