const express = require('express');
const router = express.Router();
const { Customer, Business, BusinessCustomer, sequelize } = require('../models');
const { Op } = require('sequelize');
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

// Get all customers for a business (through junction table)
router.get('/business/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { page = 1, limit = 50, search, isCreditCustomer } = req.query;

    if (!businessId || businessId === 'undefined') {
      return res.status(400).json({ error: 'Invalid business ID' });
    }

    // Get customer IDs linked to this business through the junction table
    const businessCustomers = await BusinessCustomer.findAll({
      where: { businessId },
      attributes: ['customerId']
    });

    const customerIds = businessCustomers.map(bc => bc.customerId);

    // Build where clause for customers
    const whereClause = {
      id: { [Op.in]: customerIds },
      isDeleted: false
    };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    if (isCreditCustomer !== undefined) {
      whereClause.isCreditCustomer = isCreditCustomer === 'true';
    }

    const offset = (page - 1) * limit;
    const [total, customers] = await Promise.all([
      Customer.count({ where: whereClause }),
      Customer.findAll({
        where: whereClause,
        order: [['name', 'ASC']],
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
        attributes: [
          'id', 'name', 'phone', 'email', 'address', 'gstNumber',
          'creditLimit', 'currentBalance', 'isCreditCustomer',
          'isActive', 'createdBy', 'lastUpdatedBy'
        ]
      })
    ]);

    res.json({
      success: true,
      customers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Failed to get customers', message: error.message });
  }
});

// Get single customer
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ success: true, customer });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Failed to get customer', message: error.message });
  }
});

// Create new customer for a business
router.post('/business/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;

    if (!businessId || businessId === 'undefined') {
      return res.status(400).json({ error: 'Invalid business ID' });
    }

    const business = await Business.findByPk(businessId, {
      attributes: ['id', 'name']
    });

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Create customer without businessId (junction table handles the relationship)
    const customerData = {
      ...req.body,
      createdBy: req.user?.id || null,
      lastUpdatedBy: req.user?.id || null,
      syncVersion: Date.now(),
      lastSyncAt: new Date()
    };

    const customer = await Customer.create(customerData);

    // Create junction table entry
    await BusinessCustomer.create({
      businessId,
      customerId: customer.id,
      isActive: true
    });

    const io = req.app.get('io');
    io.to(businessId).emit('customer-created', {
      customerId: customer.id,
      data: customer
    });

    res.status(201).json({ success: true, customer });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer', message: error.message });
  }
});

// Update customer
router.put('/:id', async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      syncVersion: Date.now(),
      lastSyncAt: new Date()
    };

    const customer = await Customer.findByPk(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    await customer.update(updateData);

    // Get business IDs from junction table for real-time notifications
    const businessLinks = await BusinessCustomer.findAll({
      where: { customerId: customer.id },
      attributes: ['businessId']
    });

    const io = req.app.get('io');
    for (const link of businessLinks) {
      io.to(link.businessId).emit('customer-updated', {
        customerId: customer.id,
        data: customer
      });
    }

    res.json({ success: true, customer });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Failed to update customer', message: error.message });
  }
});

// Delete customer (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    await customer.update({
      isDeleted: true,
      isActive: false,
      syncVersion: Date.now(),
      lastSyncAt: new Date()
    });

    // Get business IDs from junction table for real-time notifications
    const businessLinks = await BusinessCustomer.findAll({
      where: { customerId: customer.id },
      attributes: ['businessId']
    });

    const io = req.app.get('io');
    for (const link of businessLinks) {
      io.to(link.businessId).emit('customer-deleted', {
        customerId: customer.id
      });
    }

    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Failed to delete customer', message: error.message });
  }
});

// Get credit customers with outstanding balance for a business
router.get('/business/:businessId/credit-outstanding', async (req, res) => {
  try {
    const { businessId } = req.params;

    // Get customer IDs linked to this business
    const businessCustomers = await BusinessCustomer.findAll({
      where: { businessId },
      attributes: ['customerId']
    });

    const customerIds = businessCustomers.map(bc => bc.customerId);

    const customers = await Customer.findAll({
      where: {
        id: { [Op.in]: customerIds },
        isCreditCustomer: true,
        currentBalance: { [Op.gt]: 0 },
        isDeleted: false
      },
      order: [['currentBalance', 'DESC']]
    });

    res.json({ success: true, customers });
  } catch (error) {
    console.error('Get credit customers error:', error);
    res.status(500).json({ error: 'Failed to get credit customers', message: error.message });
  }
});

// Import customers from CSV/Excel/JSON
router.post('/business/:businessId/import', upload.single('file'), async (req, res) => {
  try {
    const { businessId } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    let customersToImport = [];

    if (ext === '.csv') {
      // Parse CSV
      const csvData = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (row) => csvData.push(row))
          .on('end', resolve)
          .on('error', reject);
      });
      customersToImport = csvData;
    } else if (ext === '.xlsx' || ext === '.xls') {
      // Parse Excel
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      customersToImport = xlsx.utils.sheet_to_json(worksheet);
    } else if (ext === '.json') {
      // Parse JSON
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      customersToImport = JSON.parse(fileContent);
    }

    // Validate and import
    let imported = 0;
    let failed = 0;
    const errors = [];

    for (const row of customersToImport) {
      try {
        // Create customer without businessId (junction table handles the relationship)
        const customerData = {
          name: row.name || row.Name || row.CustomerName,
          phone: row.phone || row.Phone || row.Mobile || null,
          email: row.email || row.Email || null,
          address: row.address || row.Address || null,
          gstNumber: row.gstNumber || row.GST || row.GSTNumber || null,
          creditLimit: parseFloat(row.creditLimit || row.CreditLimit || 0),
          currentBalance: parseFloat(row.currentBalance || row.CurrentBalance || 0),
          isCreditCustomer: (row.isCreditCustomer || row.CreditCustomer || 'false').toString().toLowerCase() === 'true',
          isActive: (row.isActive || row.Status || 'true').toString().toLowerCase() !== 'false',
          createdBy: req.user?.id || null,
          lastUpdatedBy: req.user?.id || null,
          syncVersion: Date.now(),
          lastSyncAt: new Date()
        };

        if (!customerData.name) {
          failed++;
          errors.push(`Skipped row: missing name`);
          continue;
        }

        const customer = await Customer.create(customerData);
        console.log(`✅ Created customer: ${customerData.name} with ID: ${customer.id}`);

        // Create junction table entry
        try {
          console.log(`🔗 Linking customer ${customer.id} to business ${businessId}...`);
          const link = await BusinessCustomer.create({
            businessId,
            customerId: customer.id,
            isActive: true
          });
          console.log(`✅ Created junction link: ${link.id}`);
          imported++;
        } catch (junctionError) {
          console.error('❌ Failed to create business-customer link:', junctionError);
          console.error('BusinessId:', businessId);
          console.error('CustomerId:', customer.id);
          failed++;
          errors.push(`Failed to link customer "${customerData.name}" to business: ${junctionError.message}`);
        }
      } catch (error) {
        console.error('❌ Failed to import customer:', error);
        failed++;
        errors.push(`Failed to import ${row.name || row.Name || 'row'}: ${error.message}`);
      }
    }

    // Cleanup uploaded file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      imported,
      failed,
      total: customersToImport.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Import customers error:', error);
    res.status(500).json({ error: 'Failed to import customers', message: error.message });
  }
});

// Export customers as CSV
router.get('/business/:businessId/export/csv', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { search, isCreditCustomer } = req.query;

    // Get customer IDs linked to this business
    const businessCustomers = await BusinessCustomer.findAll({
      where: { businessId },
      attributes: ['customerId']
    });
    const customerIds = businessCustomers.map(bc => bc.customerId);

    const whereClause = {
      id: { [Op.in]: customerIds },
      isDeleted: false
    };
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    if (isCreditCustomer !== undefined) {
      whereClause.isCreditCustomer = isCreditCustomer === 'true';
    }

    const customers = await Customer.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });

    const csvHeader = 'Name,Phone,Email,Address,GST Number,Credit Limit,Current Balance,Credit Customer,Active\n';
    const csvRows = customers.map(c => {
      const escape = (val) => `"${(val || '').replace(/"/g, '""')}"`;
      return [
        escape(c.name),
        escape(c.phone || ''),
        escape(c.email || ''),
        escape(c.address || ''),
        escape(c.gstNumber || ''),
        c.creditLimit || 0,
        c.currentBalance || 0,
        c.isCreditCustomer ? 'Yes' : 'No',
        c.isActive ? 'Yes' : 'No'
      ].join(',');
    }).join('\n');

    const csvContent = csvHeader + csvRows;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=customers-${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Failed to export customers', message: error.message });
  }
});

// Export customers as Excel
router.get('/business/:businessId/export/excel', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { search, isCreditCustomer } = req.query;

    // Get customer IDs linked to this business
    const businessCustomers = await BusinessCustomer.findAll({
      where: { businessId },
      attributes: ['customerId']
    });
    const customerIds = businessCustomers.map(bc => bc.customerId);

    const whereClause = {
      id: { [Op.in]: customerIds },
      isDeleted: false
    };
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    if (isCreditCustomer !== undefined) {
      whereClause.isCreditCustomer = isCreditCustomer === 'true';
    }

    const customers = await Customer.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });

    const data = customers.map(c => ({
      Name: c.name,
      Phone: c.phone || '',
      Email: c.email || '',
      Address: c.address || '',
      'GST Number': c.gstNumber || '',
      'Credit Limit': c.creditLimit || 0,
      'Current Balance': c.currentBalance || 0,
      'Credit Customer': c.isCreditCustomer ? 'Yes' : 'No',
      Active: c.isActive ? 'Yes' : 'No'
    }));

    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Customers');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=customers-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error('Export Excel error:', error);
    res.status(500).json({ error: 'Failed to export customers', message: error.message });
  }
});

// Export customers as JSON
router.get('/business/:businessId/export/json', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { search, isCreditCustomer } = req.query;

    // Get customer IDs linked to this business
    const businessCustomers = await BusinessCustomer.findAll({
      where: { businessId },
      attributes: ['customerId']
    });
    const customerIds = businessCustomers.map(bc => bc.customerId);

    const whereClause = {
      id: { [Op.in]: customerIds },
      isDeleted: false
    };
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    if (isCreditCustomer !== undefined) {
      whereClause.isCreditCustomer = isCreditCustomer === 'true';
    }

    const customers = await Customer.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      customers,
      exportedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Export JSON error:', error);
    res.status(500).json({ error: 'Failed to export customers', message: error.message });
  }
});

// Migration for business_customers table
router.post('/migrate', async (req, res) => {
  try {
    const queryInterface = sequelize.getQueryInterface();
    
    // Create business_customers table
    await queryInterface.createTable('business_customers', {
      id: {
        type: require('sequelize').DataTypes.UUID,
        defaultValue: require('sequelize').DataTypes.UUIDV4,
        primaryKey: true
      },
      businessId: {
        type: require('sequelize').DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'businesses',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      customerId: {
        type: require('sequelize').DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'customers',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      isActive: {
        type: require('sequelize').DataTypes.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        type: require('sequelize').DataTypes.DATE,
        allowNull: false,
        defaultValue: require('sequelize').DataTypes.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: require('sequelize').DataTypes.DATE,
        allowNull: false,
        defaultValue: require('sequelize').DataTypes.literal('CURRENT_TIMESTAMP')
      }
    }, {
      indexes: [
        {
          unique: true,
          fields: ['businessId', 'customerId']
        },
        {
          fields: ['businessId']
        },
        {
          fields: ['customerId']
        }
      ]
    });

    res.json({ success: true, message: 'Migration completed: business_customers table created' });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: 'Migration failed', message: error.message });
  }
});

// Download import template
router.get('/business/import-template/:format', async (req, res) => {
  try {
    const { format } = req.params;
    const templateData = [
      {
        Name: 'John Doe',
        Phone: '+91 98765 43210',
        Email: 'john@example.com',
        Address: '123 Main Street, City',
        'GST Number': '22AAAAA0000A1Z5',
        'Credit Limit': 10000,
        'Current Balance': 0,
        'Credit Customer': 'No',
        Active: 'Yes'
      }
    ];

    if (format === 'csv') {
      const csvHeader = 'Name,Phone,Email,Address,GST Number,Credit Limit,Current Balance,Credit Customer,Active\n';
      const csvRows = templateData.map((row) => [
        `"${row.Name}"`,
        `"${row.Phone}"`,
        `"${row.Email}"`,
        `"${row.Address}"`,
        `"${row['GST Number']}"`,
        row['Credit Limit'],
        row['Current Balance'],
        row['Credit Customer'],
        row.Active
      ].join(',')).join('\n');
      const csvContent = csvHeader + csvRows;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=customer-import-template.csv');
      res.send(csvContent);
    } else if (format === 'excel') {
      const worksheet = xlsx.utils.json_to_sheet(templateData);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Customers');
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=customer-import-template.xlsx');
      res.send(buffer);
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=customer-import-template.json');
      res.json(templateData);
    } else {
      res.status(400).json({ error: 'Invalid format. Use csv, excel, or json' });
    }
  } catch (error) {
    console.error('Template download error:', error);
    res.status(500).json({ error: 'Failed to generate template', message: error.message });
  }
});

module.exports = router;
