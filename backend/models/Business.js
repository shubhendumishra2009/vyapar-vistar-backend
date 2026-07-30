const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Business = sequelize.define('Business', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('retail', 'wholesale', 'medicine', 'hardware', 'grocery', 'restaurant', 'electronics', 'clothing', 'general', 'other'),
    allowNull: false,
    defaultValue: 'retail'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  subscription: {
    type: DataTypes.JSON,
    defaultValue: {
      plan: 'starter',
      status: 'trial',
      trialEndsAt: null,
      expiresAt: null,
      modules: ['core'],
      usersLimit: 3,
      smsCredits: 100
    }
  }
}, {
  tableName: 'businesses',
  timestamps: true,
  indexes: [
    {
      fields: ['ownerId']
    },
    {
      fields: ['isActive']
    }
  ]
});

module.exports = Business;