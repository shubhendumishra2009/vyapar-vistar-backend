const { sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Business = require('./Business');
const Shop = require('./Shop');
const UserShop = require('./UserShop');
const Customer = require('./Customer');
const CustomerShop = require('./CustomerShop');
const BusinessCustomer = require('./BusinessCustomer');
const Product = require('./Product');
const Transaction = require('./Transaction');
const TransactionDetail = require('./TransactionDetail');
const FieldSchema = require('./FieldSchema');
const StockMovement = require('./StockMovement');
const Stock = require('./Stock');
const Supplier = require('./Supplier');
const System = require('./System');
const PrintSetting = require('./PrintSetting');

// Define associations - clean and conflict-free
// User-Shop many-to-many relationship
User.belongsToMany(Shop, { 
  through: UserShop, 
  foreignKey: 'userId', 
  otherKey: 'shopId',
  as: 'shops'
});

Shop.belongsToMany(User, { 
  through: UserShop, 
  foreignKey: 'shopId', 
  otherKey: 'userId',
  as: 'users'
});

// Direct UserShop-Shop association for eager loading
UserShop.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop' });
Shop.hasMany(UserShop, { foreignKey: 'shopId', as: 'userShops' });

// Customer-Shop many-to-many relationship through CustomerShop junction table
Customer.belongsToMany(Shop, { 
  through: CustomerShop, 
  foreignKey: 'customerId', 
  otherKey: 'shopId',
  as: 'shops'
});

Shop.belongsToMany(Customer, { 
  through: CustomerShop, 
  foreignKey: 'shopId', 
  otherKey: 'customerId',
  as: 'customers'
});

// Business relationships
Business.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
User.hasMany(Business, { foreignKey: 'ownerId', as: 'businesses' });

Business.hasMany(Shop, { foreignKey: 'businessId', as: 'shops' });
Shop.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

// Shop relationships
Shop.hasMany(Product, { foreignKey: 'shopId', as: 'products' });
Shop.hasMany(Transaction, { foreignKey: 'shopId', as: 'transactions' });

// User-Customer/Product/Transaction relationships (for audit trail)
Customer.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Product.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Transaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Transaction.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

// Product and Transaction relationships to Shop
Product.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop' });
Transaction.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop' });

// Product relationship to Business (web app is business-scoped)
Business.hasMany(Product, { foreignKey: 'businessId', as: 'products' });
Product.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

// Transaction and TransactionDetail relationship
Transaction.hasMany(TransactionDetail, { foreignKey: 'transactionId', as: 'details' });
TransactionDetail.belongsTo(Transaction, { foreignKey: 'transactionId', as: 'transaction' });
TransactionDetail.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// StockMovement relationships
Product.hasMany(StockMovement, { foreignKey: 'productId', as: 'stockMovements' });
StockMovement.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Business.hasMany(StockMovement, { foreignKey: 'businessId', as: 'stockMovements' });
Shop.hasMany(StockMovement, { foreignKey: 'shopId', as: 'stockMovements' });

// Stock relationships (current stock by batch)
Product.hasMany(Stock, { foreignKey: 'productId', as: 'stockBatches' });
Stock.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Business.hasMany(Stock, { foreignKey: 'businessId', as: 'stockBatches' });
Shop.hasMany(Stock, { foreignKey: 'shopId', as: 'stockBatches' });

// Customer-Business many-to-many relationship through BusinessCustomer junction table
Customer.belongsToMany(Business, {
  through: BusinessCustomer,
  foreignKey: 'customerId',
  otherKey: 'businessId',
  as: 'businesses'
});

Business.belongsToMany(Customer, {
  through: BusinessCustomer,
  foreignKey: 'businessId',
  otherKey: 'customerId',
  as: 'customers'
});

// Supplier relationships
Business.hasMany(Supplier, { foreignKey: 'businessId', as: 'suppliers' });
Supplier.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

// System and PrintSetting relationships
Business.hasMany(System, { foreignKey: 'businessId', as: 'systems' });
System.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

System.hasMany(PrintSetting, { foreignKey: 'systemId', as: 'printSettings' });
PrintSetting.belongsTo(System, { foreignKey: 'systemId', as: 'system' });

Business.hasMany(PrintSetting, { foreignKey: 'businessId', as: 'printSettings' });
PrintSetting.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

// FieldSchema - stand-alone configuration table, no direct FK associations needed
// It is queried by businessType to get the schema for a specific business type.

// Export models and sequelize instance
module.exports = {
  sequelize,
  Business,
  Shop,
  User,
  UserShop,
  Customer,
  CustomerShop,
  BusinessCustomer,
  Product,
  Transaction,
  TransactionDetail,
  FieldSchema,
  StockMovement,
  Stock,
  Supplier,
  System,
  PrintSetting
};