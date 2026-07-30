const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PrintSetting = sequelize.define('PrintSetting', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  businessId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  systemId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  reportType: {
    type: DataTypes.ENUM(
      'sale_invoice',
      'sale_receipt',
      'purchase_order',
      'purchase_receipt',
      'customer_statement',
      'inventory_report'
    ),
    allowNull: false
  },
  printerName: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  paperSize: {
    type: DataTypes.ENUM('58mm', '80mm', 'A4', 'A5'),
    defaultValue: 'A4'
  },
  action: {
    type: DataTypes.ENUM('show_print', 'show_only', 'print_only', 'none'),
    defaultValue: 'show_only'
  },
  copies: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  autoPrint: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'print_settings',
  timestamps: true,
  indexes: [
    { fields: ['businessId'] },
    { fields: ['systemId'] },
    { fields: ['businessId', 'systemId', 'reportType'] }
  ]
});

module.exports = PrintSetting;