import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://vyapar-vistar-backend.onrender.com/api';

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

    // Track if we're currently refreshing to avoid multiple refresh calls
    let isRefreshing = false;
    let failedQueue: Array<{resolve: (value?: any) => void; reject: (error?: any) => void; config: any}> = [];

    const processQueue = (error: any, token: string | null = null) => {
      failedQueue.forEach((prom) => {
        if (error) {
          prom.reject(error);
        } else if (token) {
          prom.resolve(token);
        }
      });
      failedQueue = [];
    };

    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't tried to refresh yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (isRefreshing) {
            // If already refreshing, queue this request
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject, config: originalRequest });
            }).then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return axios(originalRequest);
            }).catch((err) => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            // Try to refresh the token
            const response = await axios.post(`${this.baseURL}/auth/refresh`, {}, {
              headers: {
                'Authorization': `Bearer ${this.token}`
              }
            });

            if (response.data?.success && response.data?.token) {
              const newToken = response.data.token;
              this.setToken(newToken);
              processQueue(null, newToken);
              
              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return axios(originalRequest);
            } else {
              throw new Error('Token refresh failed');
            }
          } catch (refreshError) {
            processQueue(refreshError, null);
            this.clearToken();
            // Only redirect if we're not already on login page
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
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
        timeout: 30000,
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

  // Search products with batch info for sale
  async getSaleSearchProducts(businessId: string, search?: string) {
    return this.request('GET', `/products/business/${businessId}/sale-search`, { search });
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

  // Supplier endpoints
  async getSuppliers(businessId: string, params?: any) {
    return this.request('GET', `/suppliers/business/${businessId}`, params);
  }

  async getSupplier(supplierId: string) {
    return this.request('GET', `/suppliers/${supplierId}`);
  }

  async createSupplier(businessId: string, supplierData: any) {
    return this.request('POST', `/suppliers/business/${businessId}`, supplierData);
  }

  async updateSupplier(supplierId: string, supplierData: any) {
    return this.request('PUT', `/suppliers/${supplierId}`, supplierData);
  }

  async deleteSupplier(supplierId: string) {
    return this.request('DELETE', `/suppliers/${supplierId}`);
  }

  async importSuppliers(businessId: string, file: FormData) {
    return this.request<any>('POST', `/suppliers/business/${businessId}/import`, file);
  }

  async exportSuppliersCSV(businessId: string, params?: any): Promise<Blob> {
    return this.request<Blob>('GET', `/suppliers/business/${businessId}/export/csv`, params, { responseType: 'blob' });
  }

  async exportSuppliersExcel(businessId: string, params?: any): Promise<Blob> {
    return this.request<Blob>('GET', `/suppliers/business/${businessId}/export/excel`, params, { responseType: 'blob' });
  }

  async exportSuppliersJSON(businessId: string, params?: any) {
    return this.request<any>('GET', `/suppliers/business/${businessId}/export/json`, params);
  }

  async getSupplierImportTemplate(format: string): Promise<Blob> {
    return this.request<Blob>('GET', `/suppliers/business/import-template/${format}`, {}, { responseType: 'blob' });
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

  async getBusinessStats(businessId: string) {
    return this.request('GET', `/businesses/${businessId}/stats`);
  }

  // Purchase endpoints
  async getPurchases(businessId: string, params?: any) {
    return this.request('GET', `/purchases/business/${businessId}`, params);
  }

  async getPurchase(purchaseId: string) {
    return this.request('GET', `/purchases/${purchaseId}`);
  }

  async createPurchase(businessId: string, purchaseData: any) {
    return this.request('POST', `/purchases/business/${businessId}`, purchaseData);
  }

  async createPurchaseReturn(purchaseId: string, returnData: any) {
    return this.request('POST', `/purchases/${purchaseId}/return`, returnData);
  }

  async deletePurchase(purchaseId: string) {
    return this.request('DELETE', `/purchases/${purchaseId}`);
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

  // Batch-wise stock endpoints
  async getProductBatches(businessId: string, productId: string) {
    return this.request('GET', `/inventory/business/${businessId}/product/${productId}/batches`);
  }

  async getBusinessBatches(businessId: string, productId?: string) {
    return this.request('GET', `/inventory/business/${businessId}/batches`, { productId });
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

  // Print Settings endpoints
  async getSystems(businessId: string) {
    return this.request('GET', `/print-settings/systems/business/${businessId}`);
  }

  async createSystem(data: { businessId: string; systemName: string }) {
    return this.request('POST', '/print-settings/systems', data);
  }

  async updateSystem(id: string, data: { systemName?: string; isActive?: boolean }) {
    return this.request('PUT', `/print-settings/systems/${id}`, data);
  }

  async deleteSystem(id: string) {
    return this.request('DELETE', `/print-settings/systems/${id}`);
  }

  async getPrintSettings(businessId: string, systemId?: string) {
    const params = systemId ? { systemId } : undefined;
    return this.request('GET', `/print-settings/business/${businessId}`, params);
  }

  async getPrintSettingsByReport(businessId: string, reportType: string, systemId?: string) {
    const params = systemId ? { systemId } : undefined;
    return this.request('GET', `/print-settings/business/${businessId}/report/${reportType}`, params);
  }

  async savePrintSettings(businessId: string, settings: any[]) {
    return this.request('POST', `/print-settings/business/${businessId}`, { settings });
  }

  async updatePrintSetting(id: string, data: any) {
    return this.request('PUT', `/print-settings/${id}`, data);
  }

  async deletePrintSetting(id: string) {
    return this.request('DELETE', `/print-settings/${id}`);
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
