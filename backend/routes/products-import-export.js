const express = require('express');
const router = express.Router();
const { Product, Business, Stock, StockMovement, sequelize } = require('../models');
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `import-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls', '.json'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV, Excel, and JSON files are allowed.'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Helper function to parse CSV file
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

// Helper function to parse Excel file
const parseExcel = (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(worksheet);
};

// Helper function to validate product data
const validateProduct = (product, businessId, rowIndex) => {
  const errors = [];
  
  if (!product.name || product.name.trim() === '') {
    errors.push(`Row ${rowIndex}: Product name is required`);
  }
  
  if (product.sellingPrice === undefined || product.sellingPrice === '') {
    errors.push(`Row ${rowIndex}: Selling price is required`);
  } else if (isNaN(Number(product.sellingPrice)) || Number(product.sellingPrice) < 0) {
    errors.push(`Row ${rowIndex}: Selling price must be a valid non-negative number`);
  }
  
  if (product.purchasePrice === undefined || product.purchasePrice === '') {
    errors.push(`Row ${rowIndex}: Purchase price is required`);
  } else if (isNaN(Number(product.purchasePrice)) || Number(product.purchasePrice) < 0) {
    errors.push(`Row ${rowIndex}: Purchase price must be a valid non-negative number`);
  }
  
  if (product.stock !== undefined && product.stock !== '' && (isNaN(Number(product.stock)) || Number(product.stock) < 0)) {
    errors.push(`Row ${rowIndex}: Stock must be a valid non-negative number`);
  }
  
  if (product.taxRate !== undefined && product.taxRate !== '' && (isNaN(Number(product.taxRate)) || Number(product.taxRate) < 0)) {
    errors.push(`Row ${rowIndex}: Tax rate must be a valid non-negative number`);
  }
  
  return errors;
};

// Helper function to normalize product data
const normalizeProduct = (product, businessId) => {
  return {
    name: product.name?.trim() || '',
    description: product.description?.trim() || null,
    sku: product.sku?.trim() || null,
    barcode: product.barcode?.trim() || null,
    category: product.category?.trim() || null,
    brand: product.brand?.trim() || null,
    unit: product.unit?.trim() || 'pieces',
    purchasePrice: Number(product.purchasePrice) || 0,
    sellingPrice: Number(product.sellingPrice) || 0,
    taxRate: product.taxRate !== undefined ? Number(product.taxRate) : 0,
    stock: product.stock !== undefined ? Number(product.stock) : 0,
    minStock: product.minStock !== undefined ? Number(product.minStock) : 0,
    maxStock: product.maxStock !== undefined ? Number(product.maxStock) : 100,
    isActive: product.isActive !== undefined ? Boolean(product.isActive) : true,
    image: product.image?.trim() || null,
    businessId: businessId,
    productType: product.productType?.trim() || 'general',
    productAttributes: product.productAttributes || null,
    syncVersion: Date.now(),
    lastSyncAt: new Date()
  };
};

// Bulk import products
router.post('/business/:businessId/import', upload.single('file'), async (req, res) => {
  try {
    const { businessId } = req.params;
    
    if (!businessId || businessId === 'undefined') {
      return res.status(400).json({ error: 'Invalid business ID' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Verify business exists
    const business = await Business.findByPk(businessId);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    
    let productsData = [];
    
    // Parse file based on extension
    try {
      if (fileExt === '.csv') {
        productsData = await parseCSV(filePath);
      } else if (fileExt === '.xlsx' || fileExt === '.xls') {
        productsData = await parseExcel(filePath);
      } else if (fileExt === '.json') {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const parsedData = JSON.parse(fileContent);
        // Handle both formats: array directly or { products: [...] }
        if (Array.isArray(parsedData)) {
          productsData = parsedData;
        } else if (parsedData.products && Array.isArray(parsedData.products)) {
          productsData = parsedData.products;
        } else {
          throw new Error('Invalid JSON format. Expected array or { products: [...] }');
        }
      }
    } catch (parseError) {
      return res.status(400).json({ 
        error: 'Failed to parse file', 
        message: parseError.message 
      });
    }
    
    if (!Array.isArray(productsData) || productsData.length === 0) {
      return res.status(400).json({ 
        error: 'No valid product data found in file',
        message: 'The file must contain an array of products or an object with a "products" array'
      });
    }
    
    // Validate all products
    const validationErrors = [];
    const validProducts = [];
    
    productsData.forEach((product, index) => {
      const rowIndex = index + 2; // +2 because row 1 is header, and arrays are 0-indexed
      const errors = validateProduct(product, businessId, rowIndex);
      
      if (errors.length > 0) {
        validationErrors.push(...errors);
      } else {
        validProducts.push(normalizeProduct(product, businessId));
      }
    });
    
    // If there are validation errors, return them
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors,
        validCount: validProducts.length,
        totalCount: productsData.length
      });
    }
    
    // Bulk insert valid products (ignore duplicates)
    const results = await Product.bulkCreate(validProducts, {
      validate: true,
      ignoreDuplicates: true
    });

    // Create stock and stock movement records for each product with opening stock
    for (const product of results) {
      if (product.stock > 0) {
        const batchNumber = `BATCH-${Date.now().toString().slice(-6)}-${product.id.slice(0, 6)}`;
        
        // Use businessId as shopId if shopId is not set (web app is business-scoped)
        const stockShopId = product.shopId || product.businessId;
        
        // Create stock record
        await Stock.create({
          productId: product.id,
          businessId: product.businessId,
          shopId: stockShopId,
          batchNumber: batchNumber,
          quantity: product.stock,
          purchasePrice: product.purchasePrice || 0,
          sellingPrice: product.sellingPrice || 0,
          purchaseDate: new Date(),
          notes: 'Opening stock from import',
          createdBy: product.createdBy
        });

        // Create stock movement record
        await StockMovement.create({
          productId: product.id,
          businessId: product.businessId,
          shopId: stockShopId,
          batchNumber: batchNumber,
          type: 'OPENING_STOCK',
          quantity: product.stock,
          balanceAfter: product.stock,
          referenceType: 'product_creation',
          referenceId: product.id,
          purchasePrice: product.purchasePrice || 0,
          sellingPrice: product.sellingPrice || 0,
          notes: `Opening stock from import - Batch: ${batchNumber}`,
          createdBy: product.createdBy
        });

        console.log(`📦 Imported stock for ${product.name}: ${product.stock} units (Batch: ${batchNumber})`);
      }
    }
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
    res.status(201).json({
      success: true,
      message: `Successfully imported ${results.length} out of ${productsData.length} products`,
      imported: results.length,
      total: productsData.length,
      failed: productsData.length - results.length,
      products: results
    });
    
  } catch (error) {
    console.error('Bulk import error:', error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Failed to import products', 
      message: error.message 
    });
  }
});

// Export products to CSV
router.get('/business/:businessId/export/csv', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { search, category } = req.query;
    
    if (!businessId || businessId === 'undefined') {
      return res.status(400).json({ error: 'Invalid business ID' });
    }
    
    const whereClause = { businessId, isActive: true, isDeleted: false };
    
    if (search) {
      const { Op } = require('sequelize');
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } },
        { barcode: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (category) {
      whereClause.category = category;
    }
    
    const products = await Product.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });
    
    // Convert to CSV format
    const headers = [
      'Name', 'Description', 'SKU', 'Barcode', 'Category', 'Brand', 'Unit',
      'Purchase Price', 'Selling Price', 'Tax Rate', 'Stock', 'Min Stock',
      'Max Stock', 'Is Active', 'Product Type'
    ];
    
    const csvRows = [headers.join(',')];
    
    products.forEach(product => {
      const row = [
        `"${product.name}"`,
        `"${product.description || ''}"`,
        `"${product.sku || ''}"`,
        `"${product.barcode || ''}"`,
        `"${product.category || ''}"`,
        `"${product.brand || ''}"`,
        product.unit,
        product.purchasePrice,
        product.sellingPrice,
        product.taxRate,
        product.stock,
        product.minStock,
        product.maxStock,
        product.isActive ? 'Yes' : 'No',
        product.productType || 'general'
      ];
      csvRows.push(row.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=products-${Date.now()}.csv`);
    res.send(csvContent);
    
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Failed to export products', message: error.message });
  }
});

// Export products to Excel
router.get('/business/:businessId/export/excel', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { search, category } = req.query;
    
    if (!businessId || businessId === 'undefined') {
      return res.status(400).json({ error: 'Invalid business ID' });
    }
    
    const whereClause = { businessId, isActive: true, isDeleted: false };
    
    if (search) {
      const { Op } = require('sequelize');
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } },
        { barcode: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (category) {
      whereClause.category = category;
    }
    
    const products = await Product.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });
    
    // Convert to worksheet format
    const worksheetData = products.map(product => ({
      'Name': product.name,
      'Description': product.description || '',
      'SKU': product.sku || '',
      'Barcode': product.barcode || '',
      'Category': product.category || '',
      'Brand': product.brand || '',
      'Unit': product.unit,
      'Purchase Price': product.purchasePrice,
      'Selling Price': product.sellingPrice,
      'Tax Rate': product.taxRate,
      'Stock': product.stock,
      'Min Stock': product.minStock,
      'Max Stock': product.maxStock,
      'Is Active': product.isActive ? 'Yes' : 'No',
      'Product Type': product.productType || 'general'
    }));
    
    const worksheet = xlsx.utils.json_to_sheet(worksheetData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Products');
    
    const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=products-${Date.now()}.xlsx`);
    res.send(excelBuffer);
    
  } catch (error) {
    console.error('Export Excel error:', error);
    res.status(500).json({ error: 'Failed to export products', message: error.message });
  }
});

// Export products to JSON
router.get('/business/:businessId/export/json', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { search, category } = req.query;
    
    if (!businessId || businessId === 'undefined') {
      return res.status(400).json({ error: 'Invalid business ID' });
    }
    
    const whereClause = { businessId, isActive: true, isDeleted: false };
    
    if (search) {
      const { Op } = require('sequelize');
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } },
        { barcode: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (category) {
      whereClause.category = category;
    }
    
    const products = await Product.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });
    
    const exportData = products.map(product => ({
      name: product.name,
      description: product.description,
      sku: product.sku,
      barcode: product.barcode,
      category: product.category,
      brand: product.brand,
      unit: product.unit,
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      taxRate: product.taxRate,
      stock: product.stock,
      minStock: product.minStock,
      maxStock: product.maxStock,
      isActive: product.isActive,
      productType: product.productType || 'general'
    }));
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=products-${Date.now()}.json`);
    res.json({
      success: true,
      exportedAt: new Date().toISOString(),
      count: exportData.length,
      products: exportData
    });
    
  } catch (error) {
    console.error('Export JSON error:', error);
    res.status(500).json({ error: 'Failed to export products', message: error.message });
  }
});

// Get import template
router.get('/business/:businessId/import-template/:format', async (req, res) => {
  try {
    const { format } = req.params;
    
    if (format === 'csv') {
      const headers = [
        'name', 'description', 'sku', 'barcode', 'category', 'brand', 'unit',
        'purchasePrice', 'sellingPrice', 'taxRate', 'stock', 'minStock',
        'maxStock', 'isActive', 'productType'
      ].join(',');
      
      const sampleRow = [
        '"Sample Product"',
        '"Product description"',
        '"SKU001"',
        '"1234567890"',
        '"Electronics"',
        '"BrandName"',
        'pieces',
        '100.00',
        '150.00',
        '5',
        '50',
        '10',
        '100',
        'true',
        'general'
      ].join(',');
      
      const csvContent = `${headers}\n${sampleRow}`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=product-import-template.csv');
      res.send(csvContent);
      
    } else if (format === 'json') {
      const template = {
        products: [
          {
            name: "Sample Product",
            description: "Product description",
            sku: "SKU001",
            barcode: "1234567890",
            category: "Electronics",
            brand: "BrandName",
            unit: "pieces",
            purchasePrice: 100.00,
            sellingPrice: 150.00,
            taxRate: 5,
            stock: 50,
            minStock: 10,
            maxStock: 100,
            isActive: true,
            productType: "general"
          }
        ]
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=product-import-template.json');
      res.json(template);
      
    } else if (format === 'excel') {
      const worksheetData = [{
        'Name': 'Sample Product',
        'Description': 'Product description',
        'SKU': 'SKU001',
        'Barcode': '1234567890',
        'Category': 'Electronics',
        'Brand': 'BrandName',
        'Unit': 'pieces',
        'Purchase Price': 100.00,
        'Selling Price': 150.00,
        'Tax Rate': 5,
        'Stock': 50,
        'Min Stock': 10,
        'Max Stock': 100,
        'Is Active': 'Yes',
        'Product Type': 'general'
      }];
      
      const worksheet = xlsx.utils.json_to_sheet(worksheetData);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Products');
      
      const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=product-import-template.xlsx');
      res.send(excelBuffer);
      
    } else {
      return res.status(400).json({ error: 'Invalid format. Use csv, json, or excel' });
    }
    
  } catch (error) {
    console.error('Template download error:', error);
    res.status(500).json({ error: 'Failed to generate template', message: error.message });
  }
});

module.exports = router;