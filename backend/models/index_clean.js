const { sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Shop = require('./Shop');
const UserShop = require('./UserShop');
const Customer = require('./Customer');
const CustomerShop = require('./CustomerShop');
const Product = require('./Product');
const Transaction = require('./Transaction');

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

// Export models and sequelize instance
module.exports = {
  sequelize,
  Shop,
  User,
  UserShop,
  Customer,
  CustomerShop,
  Product,
  Transaction
};
