const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const System = sequelize.define('System', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  businessId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  systemName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'systems',
  timestamps: true,
  indexes: [
    { fields: ['businessId'] }
  ]
});

module.exports = System;