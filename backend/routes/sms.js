const express = require('express');
const router = express.Router();

// Get SMS logs for a shop
router.get('/shop/:shopId/logs', async (req, res) => {
  try {
    const { shopId } = req.params;
    const { page = 1, limit = 50, status } = req.query;
    
    // This would need an SMSLog model, for now return empty
    res.json({
      success: true,
      logs: [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        pages: 0
      }
    });
  } catch (error) {
    console.error('Get SMS logs error:', error);
    res.status(500).json({ error: 'Failed to get SMS logs', message: error.message });
  }
});

// Send SMS
router.post('/send', async (req, res) => {
  try {
    const { customerId, message, template } = req.body;
    
    // This would integrate with actual SMS gateway
    // For now, just return success
    res.json({
      success: true,
      message: 'SMS queued for delivery',
      smsId: 'sms_' + Date.now()
    });
  } catch (error) {
    console.error('Send SMS error:', error);
    res.status(500).json({ error: 'Failed to send SMS', message: error.message });
  }
});

// Get SMS templates
router.get('/shop/:shopId/templates', async (req, res) => {
  try {
    // This would need an SMSTemplate model, for now return default templates
    const templates = [
      {
        id: 'payment_reminder',
        name: 'Payment Reminder',
        subject: 'Payment Reminder',
        content: 'Dear {customerName}, this is a reminder that you have an outstanding balance of {amount} with {shopName}. Please make your payment at your earliest convenience. Thank you.'
      },
      {
        id: 'payment_received',
        name: 'Payment Received',
        subject: 'Payment Received',
        content: 'Dear {customerName}, thank you for your payment of {amount}. Your current balance is now {balance}. We appreciate your business!'
      },
      {
        id: 'new_order',
        name: 'New Order',
        subject: 'Order Confirmation',
        content: 'Dear {customerName}, your order has been received. Total amount: {amount}. We will notify you when it\'s ready.'
      }
    ];

    res.json({ success: true, templates });
  } catch (error) {
    console.error('Get SMS templates error:', error);
    res.status(500).json({ error: 'Failed to get SMS templates', message: error.message });
  }
});

// Bulk SMS
router.post('/bulk', async (req, res) => {
  try {
    const { customerIds, message, template } = req.body;
    
    // This would send SMS to multiple customers
    // For now, just return success
    res.json({
      success: true,
      message: `SMS queued for ${customerIds.length} customers`,
      smsIds: customerIds.map(id => 'sms_' + Date.now() + '_' + id)
    });
  } catch (error) {
    console.error('Send bulk SMS error:', error);
    res.status(500).json({ error: 'Failed to send bulk SMS', message: error.message });
  }
});

module.exports = router;
