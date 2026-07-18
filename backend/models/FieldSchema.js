const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * FieldSchema defines which extra fields a product should have
 * based on the business type (retail, wholesale, medicine, etc.).
 *
 * The UI uses this to dynamically render the correct input fields
 * when creating/editing a product.
 *
 * productAttributes on the Product model stores the actual values
 * as a JSON object conforming to this schema.
 */
const FieldSchema = sequelize.define('FieldSchema', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  businessType: {
    type: DataTypes.ENUM('retail', 'wholesale', 'medicine', 'hardware', 'grocery', 'restaurant', 'electronics', 'clothing', 'general', 'other'),
    allowNull: false
  },
  fieldName: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  fieldLabel: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  fieldType: {
    type: DataTypes.ENUM('text', 'number', 'date', 'boolean', 'select', 'array', 'textarea'),
    allowNull: false,
    defaultValue: 'text'
  },
  required: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  options: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'For select type, an array of { label, value } options'
  },
  placeholder: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  defaultValue: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'field_schemas',
  timestamps: true,
  indexes: [
    {
      fields: ['businessType']
    },
    {
      unique: true,
      fields: ['businessType', 'fieldName']
    }
  ]
});

module.exports = FieldSchema;