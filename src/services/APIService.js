import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

class APIService {
  constructor() {
    this.baseURL = 'http://172.22.171.239:5000/api'; // PC Wi-Fi IP address
    this.token = null;
    axios.defaults.timeout = 8000; // Reduced to 8 seconds for faster failure detection
  }

  // Initialize API service
  async initialize() {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        this.token = token;
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error initializing API service:', error);
    }
  }

  // Set auth token
  setToken(token) {
    this.token = token;
    AsyncStorage.setItem('authToken', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // Clear auth token
  clearToken() {
    this.token = null;
    AsyncStorage.removeItem('authToken');
    delete axios.defaults.headers.common['Authorization'];
  }

  // Generic request method
  async request(method, url, data = null, config = {}) {
    try {
      const response = await axios({
        method,
        url: `${this.baseURL}${url}`,
        data,
        ...config
      });
      return response.data;
    } catch (error) {
      console.error(`API ${method} error:`, error);
      // Don't throw error for timeout to prevent app crash
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.warn('API timeout - continuing without error');
        return null;
      }
      throw error;
    }
  }

  // Authentication endpoints
  async login(username, password) {
    return this.request('POST', '/auth/login', { username, password });
  }

  async register(userData) {
    return this.request('POST', '/auth/register', userData);
  }

  async verifyToken() {
    return this.request('GET', '/auth/verify');
  }

  async refreshToken() {
    return this.request('POST', '/auth/refresh');
  }

  // Shop endpoints
  async getShop(shopId) {
    return this.request('GET', `/shops/${shopId}`);
  }

  async updateShop(shopId, shopData) {
    return this.request('PUT', `/shops/${shopId}`, shopData);
  }

  async getShopUsers(shopId) {
    return this.request('GET', `/shops/${shopId}/users`);
  }

  // Product endpoints
  async getProducts(shopId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request('GET', `/products/shop/${shopId}?${queryString}`);
  }

  async getProduct(productId) {
    return this.request('GET', `/products/${productId}`);
  }

  async createProduct(productData) {
    return this.request('POST', '/products', productData);
  }

  async updateProduct(productId, productData) {
    return this.request('PUT', `/products/${productId}`, productData);
  }

  async deleteProduct(productId) {
    return this.request('DELETE', `/products/${productId}`);
  }

  async getLowStockProducts(shopId) {
    return this.request('GET', `/products/shop/${shopId}/low-stock`);
  }

  async getCategories(shopId) {
    return this.request('GET', `/products/shop/${shopId}/categories`);
  }

  // Customer endpoints
  async getCustomers(shopId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request('GET', `/customers/shop/${shopId}?${queryString}`);
  }

  async getCustomer(customerId) {
    return this.request('GET', `/customers/${customerId}`);
  }

  async createCustomer(customerData) {
    return this.request('POST', '/customers', customerData);
  }

  async updateCustomer(customerId, customerData) {
    return this.request('PUT', `/customers/${customerId}`, customerData);
  }

  async deleteCustomer(customerId) {
    return this.request('DELETE', `/customers/${customerId}`);
  }

  async getCreditCustomers(shopId) {
    return this.request('GET', `/customers/shop/${shopId}/credit-outstanding`);
  }

  // Sales/Transaction endpoints
  async getTransactions(shopId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request('GET', `/sales/shop/${shopId}?${queryString}`);
  }

  async getTransaction(transactionId) {
    return this.request('GET', `/sales/${transactionId}`);
  }

  async createTransaction(transactionData) {
    return this.request('POST', '/sales', transactionData);
  }

  async updateTransaction(transactionId, transactionData) {
    return this.request('PUT', `/sales/${transactionId}`, transactionData);
  }

  async deleteTransaction(transactionId) {
    return this.request('DELETE', `/sales/${transactionId}`);
  }

  async getSalesSummary(shopId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request('GET', `/sales/shop/${shopId}/summary?${queryString}`);
  }

  // Inventory endpoints
  async getInventoryLogs(shopId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request('GET', `/inventory/shop/${shopId}/logs?${queryString}`);
  }

  async getLowStockProducts(shopId) {
    return this.request('GET', `/inventory/shop/${shopId}/low-stock`);
  }

  async getOutOfStockProducts(shopId) {
    return this.request('GET', `/inventory/shop/${shopId}/out-of-stock`);
  }

  async updateStock(shopId, productId, stockData) {
    return this.request('PUT', `/inventory/shop/${shopId}/product/${productId}/stock`, stockData);
  }

  async getInventoryValue(shopId) {
    return this.request('GET', `/inventory/shop/${shopId}/value`);
  }

  async getInventorySummary(shopId) {
    return this.request('GET', `/inventory/shop/${shopId}/summary`);
  }

  // SMS endpoints
  async getSMSLogs(shopId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request('GET', `/sms/shop/${shopId}/logs?${queryString}`);
  }

  async sendSMS(smsData) {
    return this.request('POST', '/sms/send', smsData);
  }

  async getSMSTemplates(shopId) {
    return this.request('GET', `/sms/shop/${shopId}/templates`);
  }

  async sendBulkSMS(bulkSMSData) {
    return this.request('POST', '/sms/bulk', bulkSMSData);
  }

  // Shop management endpoints
  async getUserShops() {
    try {
      const response = await this.request('GET', '/shops');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async createShop(shopData) {
    try {
      console.log('🔄 APIService: Creating shop with data:', JSON.stringify(shopData, null, 2));
      
      const response = await this.request('POST', '/shops', shopData);
      
      console.log('📥 APIService: Create shop response:', JSON.stringify(response, null, 2));
      
      return response.data;
    } catch (error) {
      console.error('❌ APIService: Create shop error:', error);
      console.error('❌ APIService: Error response:', error.response?.data);
      console.error('❌ APIService: Error status:', error.response?.status);
      throw error;
    }
  }

  async updateShop(shopId, shopData) {
    try {
      const response = await this.request('PUT', `/shops/${shopId}`, shopData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async deleteShop(shopId) {
    try {
      const response = await this.request('DELETE', `/shops/${shopId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getShopDetails(shopId) {
    try {
      const response = await this.request('GET', `/shops/${shopId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Sync endpoints
  async uploadSyncData(syncData) {
    return this.request('POST', '/sync/upload', syncData);
  }

  async downloadSyncData(shopId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request('GET', `/sync/download/${shopId}?${queryString}`);
  }

  async checkConflicts(conflicts) {
    return this.request('POST', '/sync/check-conflicts', { conflicts });
  }

  async getSyncStatus(shopId) {
    return this.request('GET', `/sync/status/${shopId}`);
  }

  // Health check
  async healthCheck() {
    return this.request('GET', '/health');
  }
}

export default new APIService();
