const express = require('express');
const router = express.Router();
const { Supplier, Business, sequelize } = require('../models');
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

// Get all suppliers for a business
router.get('/business/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { page = 1, limit = 50, search } = req.query;

    if (!businessId || businessId === 'undefined') {
      return res.status(400).json({ error: 'Invalid business ID' });
    }

    const whereClause = {
      businessId,
      isDeleted: false
    };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { contactPerson: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;
    const [total, suppliers] = await Promise.all([
      Supplier.count({ where: whereClause }),
      Supplier.findAll({
        where: whereClause,
        order: [['name', 'ASC']],
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
        attributes: [
          'id', 'name', 'contactPerson', 'phone', 'email', 'address',
          'city', 'state', 'pincode', 'gstNumber', 'panNumber',
          'creditLimit', 'currentBalance', 'paymentTerms', 'bankDetails',
          'notes', 'isActive', 'businessId', 'createdBy', 'lastUpdatedBy'
        ]
      })
    ]);

    res.json({
      success: true,
      suppliers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ error: 'Failed to get suppliers', message: error.message });
  }
});

// Get single supplier
router.get('/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    res.json({ success: true, supplier });
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({ error: 'Failed to get supplier', message: error.message });
  }
});

// Create new supplier for a business
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

    const supplierData = {
      ...req.body,
      businessId,
      createdBy: req.user?.id || null,
      lastUpdatedBy: req.user?.id || null,
      syncVersion: Date.now(),
      lastSyncAt: new Date()
    };

    const supplier = await Supplier.create(supplierData);

    const io = req.app.get('io');
    io.to(businessId).emit('supplier-created', {
      supplierId: supplier.id,
      data: supplier
    });

    res.status(201).json({ success: true, supplier });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ error: 'Failed to create supplier', message: error.message });
  }
});

// Update supplier
router.put('/:id', async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      syncVersion: Date.now(),
      lastSyncAt: new Date()
    };

    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    await supplier.update(updateData);

    const io = req.app.get('io');
    io.to(supplier.businessId).emit('supplier-updated', {
      supplierId: supplier.id,
      data: supplier
    });

    res.json({ success: true, supplier });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ error: 'Failed to update supplier', message: error.message });
  }
});

// Delete supplier (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    await supplier.update({
      isDeleted: true,
      isActive: false,
      syncVersion: Date.now(),
      lastSyncAt: new Date()
    });

    const io = req.app.get('io');
    io.to(supplier.businessId).emit('supplier-deleted', {
      supplierId: supplier.id
    });

    res.json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ error: 'Failed to delete supplier', message: error.message });
  }
});

// Import suppliers from CSV/Excel/JSON
router.post('/business/:businessId/import', upload.single('file'), async (req, res) => {
  try {
    const { businessId } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    let suppliersToImport = [];

    if (ext === '.csv') {
      const csvData = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (row) => csvData.push(row))
          .on('end', resolve)
          .on('error', reject);
      });
      suppliersToImport = csvData;
    } else if (ext === '.xlsx' || ext === '.xls') {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      suppliersToImport = xlsx.utils.sheet_to_json(worksheet);
    } else if (ext === '.json') {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      suppliersToImport = JSON.parse(fileContent);
    }

    let imported = 0;
    let failed = 0;
    const errors = [];

    for (const row of suppliersToImport) {
      try {
        const supplierData = {
          name: row.name || row.Name || row.SupplierName,
          contactPerson: row.contactPerson || row.ContactPerson || null,
          phone: row.phone || row.Phone || row.Mobile || null,
          email: row.email || row.Email || null,
          address: row.address || row.Address || null,
          city: row.city || row.City || null,
          state: row.state || row.State || null,
          pincode: row.pincode || row.Pincode || row.PIN || null,
          gstNumber: row.gstNumber || row.GST || row.GSTNumber || null,
          panNumber: row.panNumber || row.PAN || row.PANNumber || null,
          creditLimit: parseFloat(row.creditLimit || row.CreditLimit || 0),
          currentBalance: parseFloat(row.currentBalance || row.CurrentBalance || 0),
          paymentTerms: row.paymentTerms || row.PaymentTerms || null,
          notes: row.notes || row.Notes || null,
          isActive: (row.isActive || row.Status || 'true').toString().toLowerCase() !== 'false',
          businessId,
          createdBy: req.user?.id || null,
          lastUpdatedBy: req.user?.id || null,
          syncVersion: Date.now(),
          lastSyncAt: new Date()
        };

        if (!supplierData.name) {
          failed++;
          errors.push(`Skipped row: missing name`);
          continue;
        }

        const supplier = await Supplier.create(supplierData);
        console.log(`✅ Created supplier: ${supplierData.name} with ID: ${supplier.id}`);
        imported++;
      } catch (error) {
        console.error('❌ Failed to import supplier:', error);
        failed++;
        errors.push(`Failed to import ${row.name || row.Name || 'row'}: ${error.message}`);
      }
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      imported,
      failed,
      total: suppliersToImport.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Import suppliers error:', error);
    res.status(500).json({ error: 'Failed to import suppliers', message: error.message });
  }
});

// Export suppliers as CSV
router.get('/business/:businessId/export/csv', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { search } = req.query;

    const whereClause = {
      businessId,
      isDeleted: false
    };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const suppliers = await Supplier.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });

    const csvHeader = 'Name,Contact Person,Phone,Email,Address,City,State,Pincode,GST Number,PAN Number,Credit Limit,Current Balance,Payment Terms,Active\n';
    const csvRows = suppliers.map(s => {
      const escape = (val) => `"${(val || '').replace(/"/g, '""')}"`;
      return [
        escape(s.name),
        escape(s.contactPerson || ''),
        escape(s.phone || ''),
        escape(s.email || ''),
        escape(s.address || ''),
        escape(s.city || ''),
        escape(s.state || ''),
        escape(s.pincode || ''),
        escape(s.gstNumber || ''),
        escape(s.panNumber || ''),
        s.creditLimit || 0,
        s.currentBalance || 0,
        escape(s.paymentTerms || ''),
        s.isActive ? 'Yes' : 'No'
      ].join(',');
    }).join('\n');

    const csvContent = csvHeader + csvRows;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=suppliers-${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Failed to export suppliers', message: error.message });
  }
});

// Export suppliers as Excel
router.get('/business/:businessId/export/excel', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { search } = req.query;

    const whereClause = {
      businessId,
      isDeleted: false
    };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const suppliers = await Supplier.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });

    const data = suppliers.map(s => ({
      Name: s.name,
      'Contact Person': s.contactPerson || '',
      Phone: s.phone || '',
      Email: s.email || '',
      Address: s.address || '',
      City: s.city || '',
      State: s.state || '',
      Pincode: s.pincode || '',
      'GST Number': s.gstNumber || '',
      'PAN Number': s.panNumber || '',
      'Credit Limit': s.creditLimit || 0,
      'Current Balance': s.currentBalance || 0,
      'Payment Terms': s.paymentTerms || '',
      Active: s.isActive ? 'Yes' : 'No'
    }));

    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Suppliers');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=suppliers-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error('Export Excel error:', error);
    res.status(500).json({ error: 'Failed to export suppliers', message: error.message });
  }
});

// Export suppliers as JSON
router.get('/business/:businessId/export/json', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { search } = req.query;

    const whereClause = {
      businessId,
      isDeleted: false
    };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const suppliers = await Supplier.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      suppliers,
      exportedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Export JSON error:', error);
    res.status(500).json({ error: 'Failed to export suppliers', message: error.message });
  }
});

// Download import template
router.get('/business/import-template/:format', async (req, res) => {
  try {
    const { format } = req.params;
    const templateData = [
      {
        Name: 'ABC Suppliers Pvt Ltd',
        ContactPerson: 'John Doe',
        Phone: '+91 98765 43210',
        Email: 'contact@abcsuppliers.com',
        Address: '123 Industrial Area, City',
        City: 'Mumbai',
        State: 'Maharashtra',
        Pincode: '400001',
        'GST Number': '27AAAAA0000A1Z5',
        'PAN Number': 'AAAAA0000A',
        'Credit Limit': 50000,
        'Current Balance': 0,
        'Payment Terms': 'Net 30',
        Active: 'Yes'
      }
    ];

    if (format === 'csv') {
      const csvHeader = 'Name,Contact Person,Phone,Email,Address,City,State,Pincode,GST Number,PAN Number,Credit Limit,Current Balance,Payment Terms,Active\n';
      const csvRows = templateData.map((row) => [
        `"${row.Name}"`,
        `"${row.ContactPerson}"`,
        `"${row.Phone}"`,
        `"${row.Email}"`,
        `"${row.Address}"`,
        `"${row.City}"`,
        `"${row.State}"`,
        `"${row.Pincode}"`,
        `"${row['GST Number']}"`,
        `"${row['PAN Number']}"`,
        row['Credit Limit'],
        row['Current Balance'],
        `"${row['Payment Terms']}"`,
        row.Active
      ].join(',')).join('\n');
      const csvContent = csvHeader + csvRows;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=supplier-import-template.csv');
      res.send(csvContent);
    } else if (format === 'excel') {
      const worksheet = xlsx.utils.json_to_sheet(templateData);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Suppliers');
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=supplier-import-template.xlsx');
      res.send(buffer);
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=supplier-import-template.json');
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