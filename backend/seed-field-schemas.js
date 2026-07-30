/**
 * Seed script to populate the field_schemas table with
 * type-specific product attribute definitions for each business type.
 *
 * Run: node seed-field-schemas.js
 */
const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('./config/database');
const { FieldSchema } = require('./models');

const fieldSchemas = {
  // ==================== RETAIL ====================
  retail: [
    { fieldName: 'barcode', fieldLabel: 'Barcode', fieldType: 'text', required: false, placeholder: 'Enter barcode', sortOrder: 1 },
    { fieldName: 'brand', fieldLabel: 'Brand', fieldType: 'text', required: false, placeholder: 'Brand name', sortOrder: 2 },
    { fieldName: 'weight', fieldLabel: 'Weight', fieldType: 'text', required: false, placeholder: 'e.g. 500g, 1kg', sortOrder: 3 },
    { fieldName: 'color', fieldLabel: 'Color', fieldType: 'text', required: false, placeholder: 'Product color', sortOrder: 4 },
    { fieldName: 'size', fieldLabel: 'Size', fieldType: 'text', required: false, placeholder: 'e.g. M, L, XL', sortOrder: 5 },
    { fieldName: 'material', fieldLabel: 'Material', fieldType: 'text', required: false, placeholder: 'Material type', sortOrder: 6 },
    { fieldName: 'hsnCode', fieldLabel: 'HSN Code', fieldType: 'text', required: false, placeholder: 'e.g. 39269099', sortOrder: 7 }
  ],

  // ==================== WHOLESALE ====================
  wholesale: [
    { fieldName: 'moq', fieldLabel: 'Minimum Order Quantity', fieldType: 'number', required: true, placeholder: 'e.g. 50', sortOrder: 1 },
    { fieldName: 'bulkUnit', fieldLabel: 'Bulk Unit', fieldType: 'select', required: true, options: [
      { label: 'Carton', value: 'carton' },
      { label: 'Box', value: 'box' },
      { label: 'Pallet', value: 'pallet' },
      { label: 'Bag', value: 'bag' },
      { label: 'Dozen', value: 'dozen' },
      { label: 'Bundle', value: 'bundle' }
    ], placeholder: 'Select bulk unit', sortOrder: 2 },
    { fieldName: 'retailUnit', fieldLabel: 'Retail Unit', fieldType: 'select', required: true, options: [
      { label: 'Pieces', value: 'pieces' },
      { label: 'Kg', value: 'kg' },
      { label: 'Liters', value: 'liters' },
      { label: 'Meters', value: 'meters' }
    ], placeholder: 'Unit when sold at retail', sortOrder: 3 },
    { fieldName: 'unitsPerBulk', fieldLabel: 'Units Per Bulk', fieldType: 'number', required: false, placeholder: 'e.g. 24 pieces per carton', sortOrder: 4 },
    { fieldName: 'tradeDiscount', fieldLabel: 'Trade Discount (%)', fieldType: 'number', required: false, placeholder: 'e.g. 10', sortOrder: 5 },
    { fieldName: 'gstHsnCode', fieldLabel: 'GST HSN Code', fieldType: 'text', required: true, placeholder: 'e.g. 39269099', sortOrder: 6 },
    { fieldName: 'priceTiers', fieldLabel: 'Price Tiers', fieldType: 'array', required: false, placeholder: 'Bulk pricing tiers', sortOrder: 7 },
    { fieldName: 'brand', fieldLabel: 'Brand', fieldType: 'text', required: false, placeholder: 'Brand name', sortOrder: 8 },
    { fieldName: 'barcode', fieldLabel: 'Barcode', fieldType: 'text', required: false, placeholder: 'Enter barcode', sortOrder: 9 }
  ],

  // ==================== MEDICINE ====================
  medicine: [
    { fieldName: 'batchNumber', fieldLabel: 'Batch Number', fieldType: 'text', required: true, placeholder: 'e.g. BATCH-001', sortOrder: 1 },
    { fieldName: 'expiryDate', fieldLabel: 'Expiry Date', fieldType: 'date', required: true, placeholder: 'Select expiry date', sortOrder: 2 },
    { fieldName: 'manufacturer', fieldLabel: 'Manufacturer', fieldType: 'text', required: true, placeholder: 'e.g. Cipla', sortOrder: 3 },
    { fieldName: 'saltComposition', fieldLabel: 'Salt Composition', fieldType: 'text', required: true, placeholder: 'e.g. Paracetamol 500mg', sortOrder: 4 },
    { fieldName: 'schedule', fieldLabel: 'Drug Schedule', fieldType: 'select', required: true, options: [
      { label: 'Schedule H', value: 'H' },
      { label: 'Schedule H1', value: 'H1' },
      { label: 'Schedule X', value: 'X' },
      { label: 'Schedule G', value: 'G' },
      { label: 'OTC (Over the Counter)', value: 'OTC' },
      { label: 'Nil', value: 'nil' }
    ], placeholder: 'Select drug schedule', sortOrder: 5 },
    { fieldName: 'requiresPrescription', fieldLabel: 'Prescription Required', fieldType: 'boolean', required: false, defaultValue: 'false', sortOrder: 6 },
    { fieldName: 'dosageForm', fieldLabel: 'Dosage Form', fieldType: 'select', required: false, options: [
      { label: 'Tablet', value: 'tablet' },
      { label: 'Capsule', value: 'capsule' },
      { label: 'Syrup', value: 'syrup' },
      { label: 'Injection', value: 'injection' },
      { label: 'Cream', value: 'cream' },
      { label: 'Drops', value: 'drops' },
      { label: 'Inhaler', value: 'inhaler' }
    ], placeholder: 'Select dosage form', sortOrder: 7 },
    { fieldName: 'strength', fieldLabel: 'Strength', fieldType: 'text', required: false, placeholder: 'e.g. 500mg, 10mg/5ml', sortOrder: 8 },
    { fieldName: 'storageConditions', fieldLabel: 'Storage Conditions', fieldType: 'text', required: false, placeholder: 'e.g. Store below 30°C', sortOrder: 9 }
  ],

  // ==================== GROCERY ====================
  grocery: [
    { fieldName: 'expiryDate', fieldLabel: 'Expiry Date', fieldType: 'date', required: false, placeholder: 'Select expiry date', sortOrder: 1 },
    { fieldName: 'weight', fieldLabel: 'Weight', fieldType: 'text', required: false, placeholder: 'e.g. 500g, 1kg', sortOrder: 2 },
    { fieldName: 'perishable', fieldLabel: 'Perishable', fieldType: 'boolean', required: false, defaultValue: 'false', sortOrder: 3 },
    { fieldName: 'organic', fieldLabel: 'Organic', fieldType: 'boolean', required: false, defaultValue: 'false', sortOrder: 4 },
    { fieldName: 'packageSize', fieldLabel: 'Package Size', fieldType: 'text', required: false, placeholder: 'e.g. 200g pack, 1L bottle', sortOrder: 5 },
    { fieldName: 'brand', fieldLabel: 'Brand', fieldType: 'text', required: false, placeholder: 'Brand name', sortOrder: 6 },
    { fieldName: 'barcode', fieldLabel: 'Barcode', fieldType: 'text', required: false, placeholder: 'Enter barcode', sortOrder: 7 },
    { fieldName: 'nutritionalInfo', fieldLabel: 'Nutritional Info', fieldType: 'textarea', required: false, placeholder: 'Calories, fat, protein etc.', sortOrder: 8 },
    { fieldName: 'countryOfOrigin', fieldLabel: 'Country of Origin', fieldType: 'text', required: false, placeholder: 'e.g. India', sortOrder: 9 }
  ],

  // ==================== ELECTRONICS ====================
  electronics: [
    { fieldName: 'modelNumber', fieldLabel: 'Model Number', fieldType: 'text', required: true, placeholder: 'e.g. XPS-15-9560', sortOrder: 1 },
    { fieldName: 'brand', fieldLabel: 'Brand', fieldType: 'text', required: true, placeholder: 'Brand name', sortOrder: 2 },
    { fieldName: 'warrantyPeriod', fieldLabel: 'Warranty Period', fieldType: 'number', required: false, placeholder: 'e.g. 24', sortOrder: 3 },
    { fieldName: 'warrantyUnit', fieldLabel: 'Warranty Unit', fieldType: 'select', required: false, options: [
      { label: 'Months', value: 'months' },
      { label: 'Years', value: 'years' }
    ], placeholder: 'Select warranty unit', sortOrder: 4 },
    { fieldName: 'voltage', fieldLabel: 'Voltage', fieldType: 'text', required: false, placeholder: 'e.g. 110-240V', sortOrder: 5 },
    { fieldName: 'color', fieldLabel: 'Color', fieldType: 'text', required: false, placeholder: 'Product color', sortOrder: 6 },
    { fieldName: 'serialNumber', fieldLabel: 'Serial Number', fieldType: 'text', required: false, placeholder: 'Enter serial number', sortOrder: 7 },
    { fieldName: 'barcode', fieldLabel: 'Barcode', fieldType: 'text', required: false, placeholder: 'Enter barcode', sortOrder: 8 },
    { fieldName: 'hsnCode', fieldLabel: 'HSN Code', fieldType: 'text', required: false, placeholder: 'e.g. 84713000', sortOrder: 9 }
  ],

  // ==================== CLOTHING ====================
  clothing: [
    { fieldName: 'size', fieldLabel: 'Size', fieldType: 'select', required: true, options: [
      { label: 'XS', value: 'XS' },
      { label: 'S', value: 'S' },
      { label: 'M', value: 'M' },
      { label: 'L', value: 'L' },
      { label: 'XL', value: 'XL' },
      { label: 'XXL', value: 'XXL' },
      { label: '28', value: '28' },
      { label: '30', value: '30' },
      { label: '32', value: '32' },
      { label: '34', value: '34' },
      { label: '36', value: '36' }
    ], placeholder: 'Select size', sortOrder: 1 },
    { fieldName: 'color', fieldLabel: 'Color', fieldType: 'text', required: true, placeholder: 'e.g. Red, Blue', sortOrder: 2 },
    { fieldName: 'material', fieldLabel: 'Material', fieldType: 'text', required: false, placeholder: 'e.g. Cotton, Polyester', sortOrder: 3 },
    { fieldName: 'gender', fieldLabel: 'Gender', fieldType: 'select', required: false, options: [
      { label: 'Men', value: 'men' },
      { label: 'Women', value: 'women' },
      { label: 'Unisex', value: 'unisex' },
      { label: 'Kids', value: 'kids' }
    ], placeholder: 'Select gender', sortOrder: 4 },
    { fieldName: 'brand', fieldLabel: 'Brand', fieldType: 'text', required: false, placeholder: 'Brand name', sortOrder: 5 },
    { fieldName: 'careInstructions', fieldLabel: 'Care Instructions', fieldType: 'textarea', required: false, placeholder: 'Washing and care instructions', sortOrder: 6 },
    { fieldName: 'barcode', fieldLabel: 'Barcode', fieldType: 'text', required: false, placeholder: 'Enter barcode', sortOrder: 7 }
  ],

  // ==================== HARDWARE ====================
  hardware: [
    { fieldName: 'weight', fieldLabel: 'Weight (kg)', fieldType: 'number', required: false, placeholder: 'e.g. 5.5', sortOrder: 1 },
    { fieldName: 'dimensions', fieldLabel: 'Dimensions', fieldType: 'text', required: false, placeholder: 'e.g. 10x20x30 cm', sortOrder: 2 },
    { fieldName: 'materialType', fieldLabel: 'Material Type', fieldType: 'text', required: false, placeholder: 'e.g. Steel, Wood, Plastic', sortOrder: 3 },
    { fieldName: 'brand', fieldLabel: 'Brand', fieldType: 'text', required: false, placeholder: 'Brand name', sortOrder: 4 },
    { fieldName: 'modelNumber', fieldLabel: 'Model Number', fieldType: 'text', required: false, placeholder: 'Model number', sortOrder: 5 },
    { fieldName: 'barcode', fieldLabel: 'Barcode', fieldType: 'text', required: false, placeholder: 'Enter barcode', sortOrder: 6 },
    { fieldName: 'hsnCode', fieldLabel: 'HSN Code', fieldType: 'text', required: false, placeholder: 'e.g. 73181500', sortOrder: 7 }
  ],

  // ==================== RESTAURANT ====================
  restaurant: [
    { fieldName: 'prepTime', fieldLabel: 'Preparation Time (mins)', fieldType: 'number', required: false, placeholder: 'e.g. 15', sortOrder: 1 },
    { fieldName: 'servingSize', fieldLabel: 'Serving Size', fieldType: 'text', required: false, placeholder: 'e.g. 1 plate, 250g', sortOrder: 2 },
    { fieldName: 'ingredients', fieldLabel: 'Ingredients', fieldType: 'textarea', required: false, placeholder: 'List of ingredients', sortOrder: 3 },
    { fieldName: 'allergens', fieldLabel: 'Allergens', fieldType: 'text', required: false, placeholder: 'e.g. Nuts, Dairy, Gluten', sortOrder: 4 },
    { fieldName: 'calories', fieldLabel: 'Calories', fieldType: 'number', required: false, placeholder: 'e.g. 450', sortOrder: 5 },
    { fieldName: 'spiceLevel', fieldLabel: 'Spice Level', fieldType: 'select', required: false, options: [
      { label: 'Mild', value: 'mild' },
      { label: 'Medium', value: 'medium' },
      { label: 'Hot', value: 'hot' },
      { label: 'Extra Hot', value: 'extra_hot' }
    ], placeholder: 'Select spice level', sortOrder: 6 },
    { fieldName: 'isVegetarian', fieldLabel: 'Vegetarian', fieldType: 'boolean', required: false, defaultValue: 'true', sortOrder: 7 },
    { fieldName: 'isVegan', fieldLabel: 'Vegan', fieldType: 'boolean', required: false, defaultValue: 'false', sortOrder: 8 }
  ],

  // ==================== GENERAL ====================
  general: [
    { fieldName: 'barcode', fieldLabel: 'Barcode', fieldType: 'text', required: false, placeholder: 'Enter barcode', sortOrder: 1 },
    { fieldName: 'brand', fieldLabel: 'Brand', fieldType: 'text', required: false, placeholder: 'Brand name', sortOrder: 2 },
    { fieldName: 'hsnCode', fieldLabel: 'HSN Code', fieldType: 'text', required: false, placeholder: 'e.g. 39269099', sortOrder: 3 }
  ],

  // ==================== OTHER ====================
  other: [
    { fieldName: 'barcode', fieldLabel: 'Barcode', fieldType: 'text', required: false, placeholder: 'Enter barcode', sortOrder: 1 },
    { fieldName: 'brand', fieldLabel: 'Brand', fieldType: 'text', required: false, placeholder: 'Brand name', sortOrder: 2 }
  ]
};

async function ensureTableExists() {
  try {
    const queryInterface = sequelize.getQueryInterface();
    const tableNames = await sequelize.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'field_schemas'",
      { type: sequelize.QueryTypes.SELECT }
    );

    if (tableNames.length === 0) {
      console.log('Creating field_schemas table...');
      await queryInterface.createTable('field_schemas', {
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
          allowNull: true
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
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });
      console.log('field_schemas table created.');
    } else {
      console.log('field_schemas table already exists.');
    }
  } catch (error) {
    console.error('Error ensuring table exists:', error.message);
    throw error;
  }
}

async function seed() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected successfully.');

    // Ensure the table exists before seeding
    await ensureTableExists();

    // Clear existing field schemas
    await FieldSchema.destroy({ where: {} });
    console.log('Cleared existing field schemas.');

    // Insert all field schemas
    const entries = [];
    for (const [businessType, fields] of Object.entries(fieldSchemas)) {
      for (const field of fields) {
        entries.push({
          businessType,
          ...field
        });
      }
    }

    await FieldSchema.bulkCreate(entries);
    console.log(`Seeded ${entries.length} field schema entries for ${Object.keys(fieldSchemas).length} business types.`);

    // Print summary
    for (const [businessType, fields] of Object.entries(fieldSchemas)) {
      console.log(`  ${businessType}: ${fields.length} fields`);
    }

    await sequelize.close();
    console.log('Done.');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();