const express = require('express');
const router = express.Router();
const { Product, Shop, Business, FieldSchema, sequelize } = require('../models');
const { Op } = require('sequelize');

// Get all products for a shop
router.get('/shop/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    const { page = 1, limit = 50, search, category } = req.query;
    
    // Validate shopId
    if (!shopId || shopId === 'undefined') {
      return res.status(400).json({ error: 'Invalid shop ID' });
    }
    
    const whereClause = { shopId, isActive: true, isDeleted: false };
    
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } },
        { barcode: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (category) {
      whereClause.category = category;
    }

    const offset = (page - 1) * limit;
    
    // Run count and data queries separately to avoid Sequelize raw mode bug
    const [total, products] = await Promise.all([
      Product.count({ where: whereClause }),
      Product.findAll({
        where: whereClause,
        order: [['name', 'ASC']],
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
        attributes: [
          'id', 'name', 'productCode', 'description', 'sku', 'barcode', 'category', 'brand',
          'unit', 'purchasePrice', 'sellingPrice', 'taxRate', 'stock',
          'minStock', 'maxStock', 'isActive', 'image', 'productType',
          'productAttributes', 'businessId', 'shopId', 'createdBy', 'lastUpdatedBy'
        ]
      })
    ]);

    // Use dataValues directly because Product model has custom get method that breaks toJSON()
    const plainProducts = products.map(p => p.dataValues);
    
    res.json({
      success: true,
      products: plainProducts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to get products', message: error.message });
  }
});

// Get all products for a business (web app is business-scoped)
router.get('/business/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { page = 1, limit = 50, search, category } = req.query;

    if (!businessId || businessId === 'undefined') {
      return res.status(400).json({ error: 'Invalid business ID' });
    }

    const whereClause = { businessId, isActive: true, isDeleted: false };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } },
        { barcode: { [Op.like]: `%${search}%` } }
      ];
    }

    if (category) {
      whereClause.category = category;
    }

    const offset = (page - 1) * limit;
    
    const [total, products] = await Promise.all([
      Product.count({ where: whereClause }),
      Product.findAll({
        where: whereClause,
        order: [['name', 'ASC']],
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
        attributes: [
          'id', 'name', 'productCode', 'description', 'sku', 'barcode', 'category', 'brand',
          'unit', 'purchasePrice', 'sellingPrice', 'taxRate', 'stock',
          'minStock', 'maxStock', 'isActive', 'image', 'productType',
          'productAttributes', 'businessId', 'shopId', 'createdBy', 'lastUpdatedBy'
        ]
      })
    ]);

    const plainProducts = products.map(p => p.dataValues);
    
    res.json({
      success: true,
      products: plainProducts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get business products error:', error);
    res.status(500).json({ error: 'Failed to get products', message: error.message });
  }
});

// Get product categories for a business
router.get('/business/:businessId/categories', async (req, res) => {
  try {
    const { businessId } = req.params;

    const categories = await Product.findAll({
      where: {
        businessId,
        isActive: true,
        isDeleted: false,
        category: { [Op.ne]: null, [Op.ne]: '' }
      },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('category')), 'category']]
    });

    const categoryList = categories.map(item => item.category);

    res.json({ success: true, categories: categoryList });
  } catch (error) {
    console.error('Get business categories error:', error);
    res.status(500).json({ error: 'Failed to get categories', message: error.message });
  }
});

// Get field schema for a business type
router.get('/field-schema/:businessType', async (req, res) => {
  try {
    const { businessType } = req.params;

    const fields = await FieldSchema.findAll({
      where: { businessType, isActive: true },
      order: [['sortOrder', 'ASC']],
      attributes: ['fieldName', 'fieldLabel', 'fieldType', 'required', 'options', 'placeholder', 'defaultValue']
    });

    res.json({ success: true, fields });
  } catch (error) {
    console.error('Get field schema error:', error);
    res.status(500).json({ error: 'Failed to get field schema', message: error.message });
  }
});

// Get field schema for the current business (convenience endpoint)
router.get('/business/:businessId/field-schema', async (req, res) => {
  try {
    const { businessId } = req.params;

    // Get the business to determine its type
    const business = await Business.findByPk(businessId, {
      attributes: ['id', 'type']
    });

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const fields = await FieldSchema.findAll({
      where: { businessType: business.type, isActive: true },
      order: [['sortOrder', 'ASC']],
      attributes: ['fieldName', 'fieldLabel', 'fieldType', 'required', 'options', 'placeholder', 'defaultValue']
    });

    res.json({ success: true, businessType: business.type, fields });
  } catch (error) {
    console.error('Get business field schema error:', error);
    res.status(500).json({ error: 'Failed to get field schema', message: error.message });
  }
});

// Create a product for a business
router.post('/business/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;

    if (!businessId || businessId === 'undefined') {
      return res.status(400).json({ error: 'Invalid business ID' });
    }

    const business = await Business.findByPk(businessId, {
      attributes: ['id', 'type']
    });

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const productData = {
      ...req.body,
      businessId,
      productType: business.type,
      createdBy: req.user?.id || null,
      lastUpdatedBy: req.user?.id || null,
      syncVersion: Date.now(),
      lastSyncAt: new Date()
    };

    // Validate productAttributes against the field schema if provided
    if (productData.productAttributes) {
      const schemaFields = await FieldSchema.findAll({
        where: { businessType: business.type, isActive: true, required: true },
        attributes: ['fieldName', 'fieldLabel']
      });

      const errors = [];
      for (const field of schemaFields) {
        if (!productData.productAttributes[field.fieldName] &&
            productData.productAttributes[field.fieldName] !== false) {
          errors.push(`${field.fieldLabel} is required`);
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
      }
    }

    const product = await Product.create(productData);

    const io = req.app.get('io');
    if (product.shopId) {
      io.to(product.shopId).emit('product-created', {
        productId: product.id,
        data: product
      });
    }

    res.status(201).json({ success: true, product });
  } catch (error) {
    console.error('Create business product error:', error);
    res.status(500).json({ error: 'Failed to create product', message: error.message });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to get product', message: error.message });
  }
});

// Create new product
router.post('/', async (req, res) => {
  try {
    const productData = {
      ...req.body,
      syncVersion: Date.now(),
      lastSyncAt: new Date()
    };

    const product = await Product.create(productData);

    // Emit real-time update
    const io = req.app.get('io');
    io.to(product.shopId).emit('product-created', {
      productId: product.id,
      data: product
    });

    res.status(201).json({ success: true, product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product', message: error.message });
  }
});

// Update product
router.put('/:id', async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      syncVersion: Date.now(),
      lastSyncAt: new Date()
    };

    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // If productAttributes are being updated, validate against the business type schema
    if (updateData.productAttributes && product.businessId) {
      const business = await Business.findByPk(product.businessId, {
        attributes: ['id', 'type']
      });

      if (business) {
        const schemaFields = await FieldSchema.findAll({
          where: { businessType: business.type, isActive: true, required: true },
          attributes: ['fieldName', 'fieldLabel']
        });

        const errors = [];
        for (const field of schemaFields) {
          if (!updateData.productAttributes[field.fieldName] &&
              updateData.productAttributes[field.fieldName] !== false) {
            errors.push(`${field.fieldLabel} is required`);
          }
        }

        if (errors.length > 0) {
          return res.status(400).json({ error: 'Validation failed', details: errors });
        }
      }
    }
    
    await product.update(updateData);

    // Emit real-time update
    const io = req.app.get('io');
    io.to(product.shopId).emit('product-updated', {
      productId: product.id,
      data: product
    });

    res.json({ success: true, product });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product', message: error.message });
  }
});

// Delete product (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    await product.update({ 
      isDeleted: true,
      isActive: false,
      syncVersion: Date.now(),
      lastSyncAt: new Date()
    });

    const io = req.app.get('io');
    io.to(product.shopId).emit('product-deleted', {
      productId: product.id
    });

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product', message: error.message });
  }
});

// Get low stock products
router.get('/shop/:shopId/low-stock', async (req, res) => {
  try {
    const { shopId } = req.params;
    
    const products = await Product.findAll({
      where: {
        shopId,
        isActive: true,
        isDeleted: false,
        [Op.and]: [
          sequelize.where(sequelize.col('stock'), Op.lte, sequelize.col('minStock'))
        ]
      },
      order: [['stock', 'ASC']]
    });

    res.json({ success: true, products });
  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json({ error: 'Failed to get low stock products', message: error.message });
  }
});

// Get categories
router.get('/shop/:shopId/categories', async (req, res) => {
  try {
    const categories = await Product.findAll({
      where: {
        shopId: req.params.shopId,
        isActive: true,
        isDeleted: false,
        category: { [Op.ne]: null, [Op.ne]: '' }
      },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('category')), 'category']]
    });
    
    const categoryList = categories.map(item => item.category);

    res.json({ success: true, categories: categoryList });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories', message: error.message });
  }
});

// Global product search (for consumers)
router.get('/', async (req, res) => {
  try {
    const { search, limit = 20 } = req.query;
    const whereClause = { isActive: true, isDeleted: false };

    if (search) {
      whereClause.name = { [Op.like]: `%${search}%` };
    }

    const products = await Product.findAll({
      where: whereClause,
      include: [{ model: Shop, as: 'shop', attributes: ['name', 'address', 'phone'] }],
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, products });
  } catch (error) {
    console.error('Global products search error:', error);
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

module.exports = router;