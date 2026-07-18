import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

class APIService {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('authToken');
    this.setupInterceptors();
  }

  private setupInterceptors() {
    axios.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.clearToken();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response = await axios({
        method,
        url: `${this.baseURL}${endpoint}`,
        data,
        timeout: 10000,
        ...config
      });
      return response.data as T;
    } catch (error) {
      console.error(`API Error (${method} ${endpoint}):`, error);
      throw error;
    }
  }

  // Auth endpoints
  async login(username: string, password: string) {
    return this.request('POST', '/auth/login', { username, password });
  }

  async register(userData: any) {
    return this.request('POST', '/auth/register', userData);
  }

  async verifyToken() {
    return this.request('GET', '/auth/verify');
  }

  // Business endpoints
  async getBusinesses() {
    return this.request('GET', '/businesses');
  }

  async getBusiness(businessId: string) {
    return this.request('GET', `/businesses/${businessId}`);
  }

  async createBusiness(businessData: any) {
    return this.request('POST', '/businesses', businessData);
  }

  async updateBusiness(businessId: string, businessData: any) {
    return this.request('PUT', `/businesses/${businessId}`, businessData);
  }

  async deleteBusiness(businessId: string) {
    return this.request('DELETE', `/businesses/${businessId}`);
  }

  // Shop endpoints
  async getShop(shopId: string) {
    return this.request('GET', `/shops/${shopId}`);
  }

  async createShop(shopData: any) {
    return this.request('POST', '/shops/', shopData);
  }

  async updateShop(shopId: string, shopData: any) {
    return this.request('PUT', `/shops/${shopId}`, shopData);
  }

  async getShopUsers(shopId: string) {
    return this.request('GET', `/shops/${shopId}/users`);
  }

  // Product endpoints
  async getProducts(shopId: string, params?: any) {
    return this.request('GET', `/products/shop/${shopId}`, params);
  }

  // Business-scoped product endpoints (web app operates at the business level).
  async getBusinessProducts(businessId: string, params?: any) {
    return this.request('GET', `/products/business/${businessId}`, params);
  }

  async getBusinessProductCategories(businessId: string) {
    return this.request('GET', `/products/business/${businessId}/categories`);
  }

  // Import/Export endpoints
  async importProducts(businessId: string, file: FormData) {
    return this.request<any>('POST', `/products/business/${businessId}/import`, file);
  }

  async exportProductsCSV(businessId: string, params?: any): Promise<Blob> {
    return this.request<Blob>('GET', `/products/business/${businessId}/export/csv`, params, { responseType: 'blob' });
  }

  async exportProductsExcel(businessId: string, params?: any): Promise<Blob> {
    return this.request<Blob>('GET', `/products/business/${businessId}/export/excel`, params, { responseType: 'blob' });
  }

  async exportProductsJSON(businessId: string, params?: any) {
    return this.request<any>('GET', `/products/business/${businessId}/export/json`, params);
  }

  async getImportTemplate(format: string): Promise<Blob> {
    return this.request<Blob>('GET', `/products/business/import-template/${format}`, {}, { responseType: 'blob' });
  }

  // Field schema endpoints (for dynamic product attributes per business type)
  async getFieldSchema(businessType: string) {
    return this.request('GET', `/products/field-schema/${businessType}`);
  }

  async getBusinessFieldSchema(businessId: string) {
    return this.request('GET', `/products/business/${businessId}/field-schema`);
  }

  async createBusinessProduct(businessId: string, productData: any) {
    return this.request('POST', `/products/business/${businessId}`, productData);
  }

  async getProduct(productId: string) {
    return this.request('GET', `/products/${productId}`);
  }

  async createProduct(productData: any) {
    return this.request('POST', '/products/', productData);
  }

  async updateProduct(productId: string, productData: any) {
    return this.request('PUT', `/products/${productId}`, productData);
  }

  async deleteProduct(productId: string) {
    return this.request('DELETE', `/products/${productId}`);
  }

  async getLowStockProducts(shopId: string) {
    return this.request('GET', `/products/shop/${shopId}/low-stock`);
  }

  async getCategories(shopId: string) {
    return this.request('GET', `/products/shop/${shopId}/categories`);
  }

  // Customer endpoints (business-scoped)
  async getBusinessCustomers(businessId: string, params?: any) {
    return this.request('GET', `/customers/business/${businessId}`, params);
  }

  async getCustomer(customerId: string) {
    return this.request('GET', `/customers/${customerId}`);
  }

  async createBusinessCustomer(businessId: string, customerData: any) {
    return this.request('POST', `/customers/business/${businessId}`, customerData);
  }

  async updateCustomer(customerId: string, customerData: any) {
    return this.request('PUT', `/customers/${customerId}`, customerData);
  }

  async deleteCustomer(customerId: string) {
    return this.request('DELETE', `/customers/${customerId}`);
  }

  async getBusinessCreditCustomers(businessId: string) {
    return this.request('GET', `/customers/business/${businessId}/credit-outstanding`);
  }

  // Customer import/export endpoints
  async importCustomers(businessId: string, file: FormData) {
    return this.request<any>('POST', `/customers/business/${businessId}/import`, file);
  }

  async exportCustomersCSV(businessId: string, params?: any): Promise<Blob> {
    return this.request<Blob>('GET', `/customers/business/${businessId}/export/csv`, params, { responseType: 'blob' });
  }

  async exportCustomersExcel(businessId: string, params?: any): Promise<Blob> {
    return this.request<Blob>('GET', `/customers/business/${businessId}/export/excel`, params, { responseType: 'blob' });
  }

  async exportCustomersJSON(businessId: string, params?: any) {
    return this.request<any>('GET', `/customers/business/${businessId}/export/json`, params);
  }

  async getCustomerImportTemplate(format: string): Promise<Blob> {
    return this.request<Blob>('GET', `/customers/business/import-template/${format}`, {}, { responseType: 'blob' });
  }

  // Sales/Transaction endpoints (business-scoped)
  async getSales(businessId: string, params?: any) {
    return this.request('GET', `/sales/business/${businessId}`, params);
  }

  async getSale(transactionId: string) {
    return this.request('GET', `/sales/${transactionId}`);
  }

  async createSale(businessId: string, saleData: any) {
    return this.request('POST', `/sales/business/${businessId}`, saleData);
  }

  async updateSale(transactionId: string, transactionData: any) {
    return this.request('PUT', `/sales/${transactionId}`, transactionData);
  }

  async deleteSale(transactionId: string) {
    return this.request('DELETE', `/sales/${transactionId}`);
  }

  async getSalesSummary(businessId: string) {
    return this.request('GET', `/sales/business/${businessId}/summary`);
  }

  // Inventory endpoints
  async getInventoryLogs(shopId: string) {
    return this.request('GET', `/inventory/shop/${shopId}/logs`);
  }

  async getLowStock(shopId: string) {
    return this.request('GET', `/inventory/shop/${shopId}/low-stock`);
  }

  async getOutOfStock(shopId: string) {
    return this.request('GET', `/inventory/shop/${shopId}/out-of-stock`);
  }

  async updateStock(shopId: string, productId: string, stockData: any) {
    return this.request('PUT', `/inventory/shop/${shopId}/product/${productId}/stock`, stockData);
  }

  async getInventoryValue(shopId: string) {
    return this.request('GET', `/inventory/shop/${shopId}/value`);
  }

  async getInventorySummary(shopId: string) {
    return this.request('GET', `/inventory/shop/${shopId}/summary`);
  }

  // SMS endpoints
  async getSMSLogs(shopId: string) {
    return this.request('GET', `/sms/shop/${shopId}/logs`);
  }

  async sendSMS(smsData: any) {
    return this.request('POST', '/sms/send', smsData);
  }

  async getSMSTemplates(shopId: string) {
    return this.request('GET', `/sms/shop/${shopId}/templates`);
  }

  async sendBulkSMS(smsData: any) {
    return this.request('POST', '/sms/bulk', smsData);
  }

  // Sync endpoints
  async uploadSyncData(shopId: string, data: any) {
    return this.request('POST', '/sync/upload', { shopId, data });
  }

  async downloadSyncData(shopId: string, params?: any) {
    return this.request('GET', `/sync/download/${shopId}`, params);
  }

  async checkConflicts(shopId: string, conflicts: any) {
    return this.request('POST', '/sync/check-conflicts', { shopId, conflicts });
  }

  async getSyncStatus(shopId: string) {
    return this.request('GET', `/sync/status/${shopId}`);
  }
}

export const api = new APIService();
