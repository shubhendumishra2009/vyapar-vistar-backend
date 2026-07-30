const express = require('express');
const router = express.Router();
const { System, PrintSetting, Business } = require('../models');
const { authenticateToken } = require('./auth');

// All routes require authentication
router.use(authenticateToken);

// ============================================
// Systems CRUD
// ============================================

// Get all systems for a business
router.get('/systems/business/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const systems = await System.findAll({
      where: { businessId },
      order: [['systemName', 'ASC']]
    });
    res.json({ success: true, data: systems });
  } catch (error) {
    console.error('Error fetching systems:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch systems' });
  }
});

// Create a new system
router.post('/systems', async (req, res) => {
  try {
    const { businessId, systemName } = req.body;
    
    if (!businessId || !systemName) {
      return res.status(400).json({ success: false, message: 'Business ID and system name are required' });
    }
    
    const system = await System.create({
      businessId,
      systemName,
      isActive: true
    });
    
    res.status(201).json({ success: true, data: system });
  } catch (error) {
    console.error('Error creating system:', error);
    res.status(500).json({ success: false, message: 'Failed to create system' });
  }
});

// Update a system
router.put('/systems/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { systemName, isActive } = req.body;
    
    const system = await System.findByPk(id);
    if (!system) {
      return res.status(404).json({ success: false, message: 'System not found' });
    }
    
    if (systemName) system.systemName = systemName;
    if (isActive !== undefined) system.isActive = isActive;
    await system.save();
    
    res.json({ success: true, data: system });
  } catch (error) {
    console.error('Error updating system:', error);
    res.status(500).json({ success: false, message: 'Failed to update system' });
  }
});

// Delete a system
router.delete('/systems/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const system = await System.findByPk(id);
    if (!system) {
      return res.status(404).json({ success: false, message: 'System not found' });
    }
    
    // Delete associated print settings first
    await PrintSetting.destroy({ where: { systemId: id } });
    await system.destroy();
    
    res.json({ success: true, message: 'System deleted successfully' });
  } catch (error) {
    console.error('Error deleting system:', error);
    res.status(500).json({ success: false, message: 'Failed to delete system' });
  }
});

// ============================================
// Print Settings CRUD
// ============================================

// Get all print settings for a business
router.get('/business/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { systemId } = req.query;
    
    const whereClause = { businessId };
    if (systemId) {
      whereClause.systemId = systemId;
    }
    
    const settings = await PrintSetting.findAll({
      where: whereClause,
      include: [{ model: System, as: 'system', attributes: ['systemName'] }],
      order: [['reportType', 'ASC']]
    });
    
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching print settings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch print settings' });
  }
});

// Get print settings for a specific report type
router.get('/business/:businessId/report/:reportType', async (req, res) => {
  try {
    const { businessId, reportType } = req.params;
    const { systemId } = req.query;
    
    const whereClause = { businessId, reportType };
    if (systemId) {
      whereClause.systemId = systemId;
    }
    
    const settings = await PrintSetting.findAll({
      where: whereClause,
      include: [{ model: System, as: 'system', attributes: ['systemName'] }]
    });
    
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching print settings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch print settings' });
  }
});

// Create or update print settings (bulk upsert)
router.post('/business/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { settings } = req.body; // Array of setting objects
    
    if (!settings || !Array.isArray(settings)) {
      return res.status(400).json({ success: false, message: 'Settings array is required' });
    }
    
    // Delete existing settings for this business/system
    const systemIds = [...new Set(settings.filter(s => s.systemId).map(s => s.systemId))];
    if (systemIds.length > 0) {
      await PrintSetting.destroy({ 
        where: { businessId, systemId: systemIds } 
      });
    } else {
      await PrintSetting.destroy({ 
        where: { businessId, systemId: null } 
      });
    }
    
    // Create new settings
    const createdSettings = [];
    for (const setting of settings) {
      const newSetting = await PrintSetting.create({
        businessId,
        systemId: setting.systemId || null,
        reportType: setting.reportType,
        printerName: setting.printerName || null,
        paperSize: setting.paperSize || 'A4',
        action: setting.action || 'show_only',
        copies: setting.copies || 1,
        autoPrint: setting.autoPrint || false
      });
      createdSettings.push(newSetting);
    }
    
    res.status(201).json({ success: true, data: createdSettings });
  } catch (error) {
    console.error('Error saving print settings:', error);
    res.status(500).json({ success: false, message: 'Failed to save print settings' });
  }
});

// Update a single print setting
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { printerName, paperSize, action, copies, autoPrint } = req.body;
    
    const setting = await PrintSetting.findByPk(id);
    if (!setting) {
      return res.status(404).json({ success: false, message: 'Print setting not found' });
    }
    
    if (printerName !== undefined) setting.printerName = printerName;
    if (paperSize !== undefined) setting.paperSize = paperSize;
    if (action !== undefined) setting.action = action;
    if (copies !== undefined) setting.copies = copies;
    if (autoPrint !== undefined) setting.autoPrint = autoPrint;
    await setting.save();
    
    res.json({ success: true, data: setting });
  } catch (error) {
    console.error('Error updating print setting:', error);
    res.status(500).json({ success: false, message: 'Failed to update print setting' });
  }
});

// Delete a print setting
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const setting = await PrintSetting.findByPk(id);
    if (!setting) {
      return res.status(404).json({ success: false, message: 'Print setting not found' });
    }
    
    await setting.destroy();
    res.json({ success: true, message: 'Print setting deleted successfully' });
  } catch (error) {
    console.error('Error deleting print setting:', error);
    res.status(500).json({ success: false, message: 'Failed to delete print setting' });
  }
});

module.exports = router;