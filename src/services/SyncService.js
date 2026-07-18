import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseService from './DatabaseService';

class SyncService {
  constructor() {
    this.isOnline = false;
    this.isSyncing = false;
    this.syncInterval = null;
    this.lastSyncTime = null;
    this.serverUrl = 'http://172.22.171.239:5000/api'; // PC Wi-Fi IP address
    this.listeners = [];
  }

  // Initialize sync service
  async initialize() {
    try {
      // Load last sync time
      const stored = await AsyncStorage.getItem('lastSyncTime');
      if (stored) {
        this.lastSyncTime = new Date(stored);
      }

      // Monitor network connectivity
      NetInfo.addEventListener(state => {
        this.isOnline = state.isConnected;
        if (this.isOnline && !this.isSyncing) {
          this.syncData().catch(err => console.log('Init sync failed:', err));
        }
      });

      // Start periodic sync
      this.startPeriodicSync();
      console.log('SyncService initialized (auto-sync enabled)');
    } catch (error) {
      console.error('SyncService init error:', error);
    }
  }

  // Start periodic sync
  startPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.syncData();
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  // Stop periodic sync
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Add sync event listener
  addListener(callback) {
    this.listeners.push(callback);
  }

  // Remove sync event listener
  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  // Notify listeners
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Sync listener error:', error);
      }
    });
  }

  // Get unsynced data from SQLite
  async getUnsyncedData(shopId) {
    try {
      if (!shopId) {
        console.log('ℹ️ No shop available for sync - skipping');
        return { products: [], customers: [], transactions: [] };
      }

      const [products, customers, transactions] = await Promise.all([
        DatabaseService.executeQuery(`
          SELECT * FROM products 
          WHERE shopId = ? AND (lastSyncAt IS NULL OR updatedAt > lastSyncAt OR isDeleted = 1)
        `, [shopId]),
        
        DatabaseService.executeQuery(`
          SELECT * FROM customers 
          WHERE shopId = ? AND (lastSyncAt IS NULL OR updatedAt > lastSyncAt OR isDeleted = 1)
        `, [shopId]),
        
        DatabaseService.executeQuery(`
          SELECT * FROM transactions 
          WHERE shopId = ? AND (lastSyncAt IS NULL OR updatedAt > lastSyncAt OR isDeleted = 1)
        `, [shopId])
      ]);

      const formatData = (result) => {
        const data = [];
        for (let i = 0; i < result.rows.length; i++) {
          const item = result.rows.item(i);
          data.push({
            id: item.id,
            ...item,
            isDeleted: item.isDeleted === 1,
            syncVersion: item.syncVersion || 1
          });
        }
        return data;
      };

      const result = {
        shopId,
        products: formatData(products),
        customers: formatData(customers),
        transactions: formatData(transactions)
      };

      // Log deleted customers found for sync
      const deletedCustomers = result.customers.filter(c => c.isDeleted);
      if (deletedCustomers.length > 0) {
        console.log('🔍 Found deleted customers for sync:', deletedCustomers.map(c => ({
          id: c.id,
          name: c.name,
          isDeleted: c.isDeleted,
          syncVersion: c.syncVersion
        })));
      }

      return result;

    } catch (error) {
      console.error('Error getting unsynced data:', error);
      throw error;
    }
  }

  // Upload data to server
  async uploadData(data) {
    try {
      this.isSyncing = true;
      this.notifyListeners('sync-start', { direction: 'upload' });

      console.log('📤 Uploading data to server:', {
        shopId: data.shopId,
        customersCount: data.customers?.length || 0,
        productsCount: data.products?.length || 0,
        transactionsCount: data.transactions?.length || 0
      });

      // Log deleted customers specifically
      if (data.customers) {
        const deletedCustomers = data.customers.filter(c => c.isDeleted);
        if (deletedCustomers.length > 0) {
          console.log('🗑️ Deleted customers being uploaded:', deletedCustomers.map(c => ({
            id: c.id,
            name: c.name,
            isDeleted: c.isDeleted,
            syncVersion: c.syncVersion
          })));
        }
      }

      const response = await fetch(`${this.serverUrl}/sync/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({
          shopId: data.shopId,
          data: data,
          lastSyncVersion: Date.now()
        })
      });

      const result = await response.json();

      if (result.success) {
        // Update last sync time for uploaded items
        await this.markItemsAsSynced(data);
        this.lastSyncTime = new Date();
        await AsyncStorage.setItem('lastSyncTime', this.lastSyncTime.toISOString());
        
        this.notifyListeners('sync-complete', { 
          direction: 'upload', 
          results: result.results 
        });
      } else {
        throw new Error(result.error || 'Upload failed');
      }

      return result;

    } catch (error) {
      console.error('Upload error:', error);
      this.notifyListeners('sync-error', { 
        direction: 'upload', 
        error: error.message 
      });
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  // Download data from server
  async downloadData(shopId) {
    try {
      this.isSyncing = true;
      this.notifyListeners('sync-start', { direction: 'download' });

      const lastSyncTime = this.lastSyncTime ? this.lastSyncTime.toISOString() : null;
      
      const response = await fetch(`${this.serverUrl}/sync/download/${shopId}?lastSyncTime=${lastSyncTime}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`
        }
      });

      const result = await response.json();

      if (result.success) {
        await this.mergeServerData(result.data);
        this.lastSyncTime = new Date(result.serverTime);
        await AsyncStorage.setItem('lastSyncTime', this.lastSyncTime.toISOString());
        
        this.notifyListeners('sync-complete', { 
          direction: 'download', 
          data: result.data 
        });
      } else {
        throw new Error(result.error || 'Download failed');
      }

      return result;

    } catch (error) {
      console.error('Download error:', error);
      this.notifyListeners('sync-error', { 
        direction: 'download', 
        error: error.message 
      });
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  // Merge server data with local SQLite
  async mergeServerData(data) {
    try {
      const shopId = data.shop?.id;

      if (!shopId) {
        throw new Error('No shop ID in server data');
      }

      // Merge products
      if (data.products && data.products.length > 0) {
        for (const product of data.products) {
          await this.mergeProduct(product, shopId);
        }
      }

      // Merge customers
      if (data.customers && data.customers.length > 0) {
        for (const customer of data.customers) {
          await this.mergeCustomer(customer, shopId);
        }
      }

      // Merge transactions
      if (data.transactions && data.transactions.length > 0) {
        for (const transaction of data.transactions) {
          await this.mergeTransaction(transaction, shopId);
        }
      }

      // Update shop data
      if (data.shop) {
        await this.mergeShop(data.shop);
      }

    } catch (error) {
      console.error('Error merging server data:', error);
      throw error;
    }
  }

  // Merge product data
  async mergeProduct(product, shopId) {
    const existing = await DatabaseService.executeQuery(
      'SELECT * FROM products WHERE id = ?',
      [product.id]
    );

    if (existing.rows.length > 0) {
      const existingProduct = existing.rows.item(0);
      
      // Update if server version is newer
      if (!existingProduct.syncVersion || product.syncVersion > existingProduct.syncVersion) {
        await DatabaseService.executeQuery(`
          UPDATE products SET 
            name = ?, description = ?, sku = ?, barcode = ?, category = ?, brand = ?,
            unit = ?, purchasePrice = ?, sellingPrice = ?, taxRate = ?, stock = ?,
            minStock = ?, maxStock = ?, isActive = ?, image = ?, 
            lastSyncAt = ?, syncVersion = ?, updatedAt = ?
          WHERE id = ?
        `, [
          product.name, product.description, product.sku, product.barcode,
          product.category, product.brand, product.unit, product.purchasePrice,
          product.sellingPrice, product.taxRate, product.stock, product.minStock,
          product.maxStock, product.isActive ? 1 : 0, product.image,
          new Date().toISOString(), product.syncVersion, product.updatedAt,
          product.id
        ]);
      }
    } else {
      // Insert new product
      await DatabaseService.executeQuery(`
        INSERT INTO products (
          id, name, description, sku, barcode, category, brand, unit,
          purchasePrice, sellingPrice, taxRate, stock, minStock, maxStock,
          isActive, image, shopId, lastSyncAt, syncVersion, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        product.id, product.name, product.description, product.sku, product.barcode,
        product.category, product.brand, product.unit, product.purchasePrice,
        product.sellingPrice, product.taxRate, product.stock, product.minStock,
        product.maxStock, product.isActive ? 1 : 0, product.image, shopId,
        new Date().toISOString(), product.syncVersion, product.createdAt, product.updatedAt
      ]);
    }
  }

  // Merge customer data
  async mergeCustomer(customer, shopId) {
    const existing = await DatabaseService.executeQuery(
      'SELECT * FROM customers WHERE id = ?',
      [customer.id]
    );

    if (existing.rows.length > 0) {
      const existingCustomer = existing.rows.item(0);
      
      // Update if server version is newer
      if (!existingCustomer.syncVersion || customer.syncVersion > existingCustomer.syncVersion) {
        await DatabaseService.executeQuery(`
          UPDATE customers SET 
            name = ?, phone = ?, email = ?, address = ?, gstNumber = ?,
            creditLimit = ?, currentBalance = ?, isCreditCustomer = ?,
            lastSyncAt = ?, syncVersion = ?, updatedAt = ?
          WHERE id = ?
        `, [
          customer.name, customer.phone, customer.email, customer.address,
          customer.gstNumber, customer.creditLimit, customer.currentBalance,
          customer.isCreditCustomer ? 1 : 0, new Date().toISOString(),
          customer.syncVersion, customer.updatedAt, customer.id
        ]);
      }
    } else {
      // Insert new customer
      await DatabaseService.executeQuery(`
        INSERT INTO customers (
          id, name, phone, email, address, gstNumber, creditLimit,
          currentBalance, isCreditCustomer, shopId, lastSyncAt, syncVersion, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        customer.id, customer.name, customer.phone, customer.email,
        customer.address, customer.gstNumber, customer.creditLimit,
        customer.currentBalance, customer.isCreditCustomer ? 1 : 0, shopId,
        new Date().toISOString(), customer.syncVersion, customer.createdAt, customer.updatedAt
      ]);
    }
  }

  // Merge transaction data
  async mergeTransaction(transaction, shopId) {
    const existing = await DatabaseService.executeQuery(
      'SELECT * FROM transactions WHERE id = ?',
      [transaction.id]
    );

    if (existing.rows.length === 0) {
      // Insert new transaction (transactions are usually not updated)
      await DatabaseService.executeQuery(`
        INSERT INTO transactions (
          id, type, invoiceNumber, customerId, supplierId, userId, shopId,
          items, subtotal, tax, discount, total, paymentMethod, paymentStatus,
          notes, lastSyncAt, syncVersion, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        transaction.id, transaction.type, transaction.invoiceNumber,
        transaction.customerId, transaction.supplierId, transaction.userId,
        shopId, JSON.stringify(transaction.items), transaction.subtotal,
        transaction.tax, transaction.discount, transaction.total,
        transaction.paymentMethod, transaction.paymentStatus, transaction.notes,
        new Date().toISOString(), transaction.syncVersion,
        transaction.createdAt, transaction.updatedAt
      ]);
    }
  }

  // Merge shop data
  async mergeShop(shop) {
    await DatabaseService.executeQuery(`
      UPDATE shops SET 
        name = ?, address = ?, phone = ?, email = ?, gstNumber = ?,
        logo = ?, settings = ?, updatedAt = ?
      WHERE id = ?
    `, [
      shop.name, shop.address, shop.phone, shop.email, shop.gstNumber,
      shop.logo, JSON.stringify(shop.settings), shop.updatedAt, shop.id
    ]);
  }

  // Mark items as synced
  async markItemsAsSynced(data) {
    const shopId = data.shopId;
    const now = new Date().toISOString();

    // Mark products as synced
    if (data.products && data.products.length > 0) {
      for (const product of data.products) {
        await DatabaseService.executeQuery(
          'UPDATE products SET lastSyncAt = ?, syncVersion = ? WHERE id = ?',
          [now, product.syncVersion || 1, product.id]
        );
      }
    }

    // Mark customers as synced
    if (data.customers && data.customers.length > 0) {
      for (const customer of data.customers) {
        if (customer.isDeleted) {
          // Remove deleted customers from SQLite after successful sync
          await DatabaseService.executeQuery(
            'DELETE FROM customers WHERE id = ?',
            [customer.id]
          );
        } else {
          // Update sync timestamp for active customers
          await DatabaseService.executeQuery(
            'UPDATE customers SET lastSyncAt = ?, syncVersion = ? WHERE id = ?',
            [now, customer.syncVersion || 1, customer.id]
          );
        }
      }
    }

    // Mark transactions as synced
    if (data.transactions && data.transactions.length > 0) {
      for (const transaction of data.transactions) {
        await DatabaseService.executeQuery(
          'UPDATE transactions SET lastSyncAt = ?, syncVersion = ? WHERE id = ?',
          [now, transaction.syncVersion || 1, transaction.id]
        );
      }
    }
  }

  // Get auth token
  async getAuthToken() {
    try {
      const user = await AsyncStorage.getItem('user');
      if (user) {
        const userData = JSON.parse(user);
        return userData.token;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return null;
  }

  // Main sync function
  async syncData() {
    if (!this.isOnline || this.isSyncing) {
      return;
    }

    try {
      // Check if we have a user and if they are a staff member
      const userStr = await AsyncStorage.getItem('user');
      if (!userStr) return;

      const user = JSON.parse(userStr);
      
      if (!this.isOnline) {
        console.log('⚠️ Device offline, skipping sync');
        return;
      }

      if (this.isSyncing) {
        console.log('⚠️ Sync already in progress, skipping');
        return;
      }

      console.log('🔄 Starting sync process...');
      
      const shop = await this.getCurrentUserShop();
      if (!shop) {
        console.log('ℹ️ No shop available for sync - skipping sync process');
        return { success: true, message: 'No shop to sync' };
      }

      const data = await this.getUnsyncedData(shop.id);
      
      console.log('📊 Data to sync:', {
        customers: data.customers.length,
        products: data.products.length,
        transactions: data.transactions.length
      });
      
      if (data.customers.length === 0 && data.products.length === 0 && data.transactions.length === 0) {
        console.log('✅ No data to sync');
        return;
      }

      // Upload changes to server
      const uploadResult = await this.uploadData(data);
      
      // Download changes from server
      const downloadResult = await this.downloadData(shop.id);
      
      return { upload: uploadResult, download: downloadResult };
    } catch (error) {
      console.error('❌ Sync error:', error);
      throw error;
    }
  }

  // Force sync
  async forceSync() {
    if (this.isOnline) {
      await this.syncData();
      return true;
    }
    return false;
  }

  // Get current user's shop
  async getCurrentUserShop() {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (!userStr) return null;

      const user = JSON.parse(userStr);
      if (!user || !user.shopId) return null;

      return {
        id: user.shopId,
        _id: user.shopId
      };
    } catch (error) {
      console.error('Error getting current user shop:', error);
      return null;
    }
  }

  // Get sync status
  async getSyncStatus() {
    try {
      const unsyncedData = await this.getUnsyncedData();
      
      return {
        isOnline: this.isOnline,
        isSyncing: this.isSyncing,
        lastSyncTime: this.lastSyncTime,
        pendingUploads: {
          products: unsyncedData.products.length,
          customers: unsyncedData.customers.length,
          transactions: unsyncedData.transactions.length
        }
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return {
        isOnline: this.isOnline,
        isSyncing: this.isSyncing,
        lastSyncTime: this.lastSyncTime,
        pendingUploads: { products: 0, customers: 0, transactions: 0 },
        error: error.message
      };
    }
  }

  // Delete customer (soft delete for sync)
  async deleteCustomer(customerId) {
    try {
      const now = new Date().toISOString();
      
      console.log('🗑️ Deleting customer:', customerId);
      
      // Mark customer as deleted in SQLite
      await DatabaseService.executeQuery(`
        UPDATE customers 
        SET isDeleted = 1, updatedAt = ?, syncVersion = syncVersion + 1 
        WHERE id = ?
      `, [now, customerId]);
      
      console.log('✅ Customer marked as deleted in SQLite');
      
      // Trigger sync to upload the deletion
      if (this.isOnline) {
        console.log('📤 Triggering sync to upload deletion...');
        await this.syncData();
        console.log('✅ Sync completed');
      } else {
        console.log('⚠️ Device offline, deletion will sync when online');
      }
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting customer:', error);
      throw error;
    }
  }

  // Get deleted customers from server
  async getDeletedCustomers() {
    try {
      const shop = await this.getCurrentUserShop();
      if (!shop) {
        console.log('ℹ️ No shop available for deleted customers sync - skipping');
        return [];
      }

      const response = await fetch(`${this.serverUrl}/sync/deleted-customers/${shop.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`
        }
      });

      const result = await response.json();

      if (result.success) {
        return result.customers;
      } else {
        throw new Error(result.error || 'Failed to fetch deleted customers');
      }

    } catch (error) {
      console.error('Error getting deleted customers:', error);
      throw error;
    }
  }

  // Restore deleted customer
  async restoreCustomer(customerId) {
    try {
      const shop = await this.getCurrentUserShop();
      if (!shop) {
        console.log('ℹ️ No shop available for customer restore - skipping');
        return { success: false, message: 'No shop available' };
      }

      console.log('🔄 Restoring customer:', customerId);

      const response = await fetch(`${this.serverUrl}/sync/restore-customer/${shop.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({
          customerId: customerId
        })
      });

      const result = await response.json();

      if (result.success) {
        // Insert restored customer back to SQLite
        await this.insertRestoredCustomer(result.customer, shop.id);
        
        console.log('✅ Customer restored successfully:', customerId);
        return result;
      } else {
        throw new Error(result.error || 'Failed to restore customer');
      }

    } catch (error) {
      console.error('Error restoring customer:', error);
      throw error;
    }
  }

  // Insert restored customer back to SQLite
  async insertRestoredCustomer(customer, shopId) {
    try {
      await DatabaseService.executeQuery(`
        INSERT INTO customers (
          id, name, phone, email, address, gstNumber, creditLimit,
          currentBalance, isCreditCustomer, shopId, lastSyncAt, syncVersion, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        customer.id,
        customer.name,
        customer.phone,
        customer.email,
        customer.address || '',
        customer.gstNumber || '',
        customer.creditLimit || 0,
        customer.currentBalance || 0,
        customer.isCreditCustomer ? 1 : 0,
        shopId,
        new Date().toISOString(),
        1,
        new Date().toISOString(),
        new Date().toISOString()
      ]);

      console.log('✅ Restored customer inserted to SQLite:', customer.id);
    } catch (error) {
      console.error('Error inserting restored customer:', error);
      throw error;
    }
  }

  // Cleanup
  cleanup() {
    this.stopPeriodicSync();
    this.listeners = [];
  }
}

export default new SyncService();
