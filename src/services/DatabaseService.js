import SQLite from 'react-native-sqlite-storage';
import {USER_TYPES, TRANSACTION_TYPES, PAYMENT_METHODS, SMS_TEMPLATES} from '../types';

SQLite.DEBUG(true);
SQLite.enablePromise(true);

class DatabaseService {
  constructor() {
    this.database = null;
  }

  async initDatabase() {
    try {
      this.database = await SQLite.openDatabase({
        name: 'RetailERP.db',
        location: 'default',
      });

      await this.createTables();
      console.log('Database initialized successfully');
      return true;
    } catch (error) {
      console.error('Database initialization failed:', error);
      return false;
    }
  }

  async createTables() {
    const queries = [
      `CREATE TABLE IF NOT EXISTS shops (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'retail',
        address TEXT,
        phone TEXT,
        email TEXT,
        gstNumber TEXT,
        logo TEXT,
        settings TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        lastSyncAt TEXT,
        syncVersion INTEGER DEFAULT 1
      )`,

      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        type TEXT NOT NULL,
        isActive BOOLEAN DEFAULT 1,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        lastSyncAt TEXT,
        syncVersion INTEGER DEFAULT 1
      )`,

      `CREATE TABLE IF NOT EXISTS user_shops (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        shopId TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'cashier',
        isActive BOOLEAN DEFAULT 1,
        isLocked BOOLEAN DEFAULT 0,
        joinedAt TEXT NOT NULL,
        permissions TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        lastSyncAt TEXT,
        syncVersion INTEGER DEFAULT 1,
        UNIQUE(userId, shopId),
        FOREIGN KEY (userId) REFERENCES users(id),
        FOREIGN KEY (shopId) REFERENCES shops(id)
      )`,

      `CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        shopId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        lastSyncAt TEXT,
        syncVersion INTEGER DEFAULT 1,
        FOREIGN KEY (shopId) REFERENCES shops(id)
      )`,

      `CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        sku TEXT UNIQUE,
        barcode TEXT UNIQUE,
        category TEXT,
        brand TEXT,
        unit TEXT NOT NULL,
        purchasePrice REAL NOT NULL,
        sellingPrice REAL NOT NULL,
        taxRate REAL DEFAULT 0,
        stock INTEGER DEFAULT 0,
        minStock INTEGER DEFAULT 0,
        maxStock INTEGER DEFAULT 0,
        isActive BOOLEAN DEFAULT 1,
        image TEXT,
        shopId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        lastSyncAt TEXT,
        syncVersion INTEGER DEFAULT 1,
        FOREIGN KEY (shopId) REFERENCES shops(id)
      )`,

      `CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT UNIQUE,
        email TEXT,
        address TEXT,
        gstNumber TEXT,
        creditLimit REAL DEFAULT 0,
        currentBalance REAL DEFAULT 0,
        isCreditCustomer BOOLEAN DEFAULT 0,
        shopId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        lastSyncAt TEXT,
        syncVersion INTEGER DEFAULT 1,
        FOREIGN KEY (shopId) REFERENCES shops(id)
      )`,

      `CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT UNIQUE,
        email TEXT,
        address TEXT,
        gstNumber TEXT,
        currentBalance REAL DEFAULT 0,
        shopId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (shopId) REFERENCES shops(id)
      )`,

      `CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        invoiceNumber TEXT UNIQUE NOT NULL,
        customerId TEXT,
        supplierId TEXT,
        userId TEXT NOT NULL,
        shopId TEXT NOT NULL,
        items TEXT NOT NULL,
        subtotal REAL NOT NULL,
        tax REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        total REAL NOT NULL,
        paymentMethod TEXT NOT NULL,
        paymentStatus TEXT DEFAULT 'pending',
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        lastSyncAt TEXT,
        syncVersion INTEGER DEFAULT 1,
        FOREIGN KEY (customerId) REFERENCES customers(id),
        FOREIGN KEY (supplierId) REFERENCES suppliers(id),
        FOREIGN KEY (userId) REFERENCES users(id),
        FOREIGN KEY (shopId) REFERENCES shops(id)
      )`,

      `CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        invoiceNumber TEXT UNIQUE NOT NULL,
        customerId TEXT,
        supplierId TEXT,
        userId TEXT NOT NULL,
        shopId TEXT NOT NULL,
        items TEXT NOT NULL,
        subtotal REAL NOT NULL,
        tax REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        total REAL NOT NULL,
        paymentMethod TEXT NOT NULL,
        paymentStatus TEXT DEFAULT 'pending',
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        lastSyncAt TEXT,
        syncVersion INTEGER DEFAULT 1,
        FOREIGN KEY (customerId) REFERENCES customers(id),
        FOREIGN KEY (supplierId) REFERENCES suppliers(id),
        FOREIGN KEY (userId) REFERENCES users(id),
        FOREIGN KEY (shopId) REFERENCES shops(id)
      )`,

      `CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        transactionId TEXT,
        customerId TEXT,
        supplierId TEXT,
        amount REAL NOT NULL,
        method TEXT NOT NULL,
        reference TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (transactionId) REFERENCES transactions(id),
        FOREIGN KEY (customerId) REFERENCES customers(id),
        FOREIGN KEY (supplierId) REFERENCES suppliers(id)
      )`,

      `CREATE TABLE IF NOT EXISTS inventory_logs (
        id TEXT PRIMARY KEY,
        productId TEXT NOT NULL,
        transactionId TEXT,
        type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        previousStock INTEGER NOT NULL,
        newStock INTEGER NOT NULL,
        reason TEXT,
        createdAt TEXT NOT NULL,
        shopId TEXT NOT NULL,
        FOREIGN KEY (productId) REFERENCES products(id),
        FOREIGN KEY (transactionId) REFERENCES transactions(id),
        FOREIGN KEY (shopId) REFERENCES shops(id)
      )`,

      `CREATE TABLE IF NOT EXISTS sms_logs (
        id TEXT PRIMARY KEY,
        customerId TEXT,
        phone TEXT NOT NULL,
        message TEXT NOT NULL,
        template TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        sentAt TEXT,
        shopId TEXT NOT NULL,
        FOREIGN KEY (customerId) REFERENCES customers(id),
        FOREIGN KEY (shopId) REFERENCES shops(id)
      )`,

      `CREATE TABLE IF NOT EXISTS sms_templates (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        subject TEXT,
        content TEXT NOT NULL,
        variables TEXT,
        isActive BOOLEAN DEFAULT 1,
        shopId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (shopId) REFERENCES shops(id)
      )`
    ];

    for (const query of queries) {
      await this.database.executeSql(query);
    }
    
    // Add migrations for new columns
    await this.addMigrations();
      
    console.log('Tables created successfully');
  }

  async addMigrations() {
    try {
      // Migration 1: Remove shopId column from users table (if it exists)
      try {
        await this.database.executeSql('ALTER TABLE users DROP COLUMN shopId');
        console.log('✅ Migration: Removed shopId column from users table');
      } catch (error) {
        // Column doesn't exist or already removed
        console.log('ℹ️ shopId column not found in users table or already removed');
      }

      // Migration 2: Add type column to shops table (if it doesn't exist)
      try {
        await this.database.executeSql('ALTER TABLE shops ADD COLUMN type TEXT NOT NULL DEFAULT "retail"');
        console.log('✅ Migration: Added type column to shops table');
      } catch (error) {
        // Column already exists
        console.log('ℹ️ type column already exists in shops table');
      }

      // Migration 3: Remove shopId column from customers table (if it exists)
      try {
        await this.database.executeSql('ALTER TABLE customers DROP COLUMN shopId');
        console.log('✅ Migration: Removed shopId column from customers table');
      } catch (error) {
        // Column doesn't exist or already removed
        console.log('ℹ️ shopId column not found in customers table or already removed');
      }

      // Tables that need isDeleted column
      const tables = ['products', 'customers', 'transactions', 'users'];
      
      for (const table of tables) {
        try {
          // Check if isDeleted column already exists
          const [result] = await this.database.executeSql(`PRAGMA table_info(${table})`);
          const columns = result.rows.raw();
          const hasIsDeleted = columns.some(col => col.name === 'isDeleted');
          
          if (!hasIsDeleted) {
            await this.database.executeSql(`
              ALTER TABLE ${table} ADD COLUMN isDeleted BOOLEAN DEFAULT 0
            `);
            console.log(`Added isDeleted column to ${table}`);
          }
        } catch (error) {
          console.log(`Error adding isDeleted to ${table}:`, error.message);
        }
      }
      
      console.log('Migrations completed');
    } catch (error) {
      console.error('Migration error:', error);
    }
  }

  async insertDefaultData() {
    try {
      const shopQuery = `SELECT COUNT(*) as count FROM shops`;
      const [shopResult] = await this.database.executeSql(shopQuery);
      
      if (shopResult.rows.item(0).count === 0) {
        const shopId = this.generateId();
        const defaultShop = {
          id: shopId,
          name: 'My Retail Shop',
          address: '123 Main Street, City',
          phone: '+919876543210',
          email: 'shop@example.com',
          gstNumber: '',
          logo: '',
          settings: JSON.stringify({
            currency: 'INR',
            taxEnabled: true,
            taxRate: 18,
            smsEnabled: true,
            printEnabled: true,
            barcodeEnabled: true,
            lowStockAlert: true,
            lowStockThreshold: 10
          }),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await this.database.executeSql(
          `INSERT INTO shops (id, name, address, phone, email, gstNumber, logo, settings, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [defaultShop.id, defaultShop.name, defaultShop.address, defaultShop.phone, 
           defaultShop.email, defaultShop.gstNumber, defaultShop.logo, defaultShop.settings,
           defaultShop.createdAt, defaultShop.updatedAt]
        );

        const adminId = this.generateId();
        const adminUser = {
          id: adminId,
          username: 'admin',
          email: 'admin@shop.com',
          password: this.hashPassword('admin123'),
          name: 'Administrator',
          phone: '+919876543210',
          type: USER_TYPES.ADMIN,
          shopId: shopId,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await this.database.executeSql(
          `INSERT INTO users (id, username, email, password, name, phone, type, shopId, isActive, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [adminUser.id, adminUser.username, adminUser.email, adminUser.password,
           adminUser.name, adminUser.phone, adminUser.type, adminUser.shopId,
           adminUser.isActive, adminUser.createdAt, adminUser.updatedAt]
        );

        const defaultTemplates = [
          {
            id: this.generateId(),
            name: SMS_TEMPLATES.PAYMENT_REMINDER,
            subject: 'Payment Reminder',
            content: 'Dear {customerName}, your outstanding balance of {amount} is due. Please pay at your earliest convenience. Thank you, {shopName}',
            variables: JSON.stringify(['customerName', 'amount', 'shopName']),
            isActive: true,
            shopId: shopId,
            createdAt: new Date().toISOString()
          },
          {
            id: this.generateId(),
            name: SMS_TEMPLATES.PAYMENT_RECEIVED,
            subject: 'Payment Received',
            content: 'Dear {customerName}, we have received your payment of {amount}. Thank you for your business! {shopName}',
            variables: JSON.stringify(['customerName', 'amount', 'shopName']),
            isActive: true,
            shopId: shopId,
            createdAt: new Date().toISOString()
          }
        ];

        for (const template of defaultTemplates) {
          await this.database.executeSql(
            `INSERT INTO sms_templates (id, name, subject, content, variables, isActive, shopId, createdAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [template.id, template.name, template.subject, template.content,
             template.variables, template.isActive, template.shopId, template.createdAt]
          );
        }
      }
    } catch (error) {
      console.error('Error inserting default data:', error);
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  hashPassword(password) {
    return password;
  }

  async executeQuery(query, params = []) {
    try {
      const [results] = await this.database.executeSql(query, params);
      return results;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async closeDatabase() {
    if (this.database) {
      await this.database.close();
      this.database = null;
    }
  }
}

export default new DatabaseService();
