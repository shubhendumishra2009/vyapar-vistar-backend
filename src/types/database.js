export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  name: string;
  phone: string;
  type: string;
  shopId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Shop {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  gstNumber: string;
  logo: string;
  settings: ShopSettings;
  createdAt: string;
  updatedAt: string;
}

export interface ShopSettings {
  currency: string;
  taxEnabled: boolean;
  taxRate: number;
  smsEnabled: boolean;
  printEnabled: boolean;
  barcodeEnabled: boolean;
  lowStockAlert: boolean;
  lowStockThreshold: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  barcode: string;
  category: string;
  brand: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  taxRate: number;
  stock: number;
  minStock: number;
  maxStock: number;
  isActive: boolean;
  image: string;
  shopId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
  creditLimit: number;
  currentBalance: number;
  isCreditCustomer: boolean;
  shopId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
  currentBalance: number;
  shopId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  type: string;
  invoiceNumber: string;
  customerId: string;
  supplierId: string;
  userId: string;
  shopId: string;
  items: TransactionItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount: number;
  tax: number;
}

export interface Payment {
  id: string;
  transactionId: string;
  customerId: string;
  supplierId: string;
  amount: number;
  method: string;
  reference: string;
  notes: string;
  createdAt: string;
}

export interface SMSLog {
  id: string;
  customerId: string;
  phone: string;
  message: string;
  template: string;
  status: string;
  sentAt: string;
  shopId: string;
}

export interface InventoryLog {
  id: string;
  productId: string;
  transactionId: string;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  createdAt: string;
  shopId: string;
}
