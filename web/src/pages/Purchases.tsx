import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter,
  ShoppingCart,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  MoreVertical,
  FileText,
  Printer,
  Download,
  X,
  Eye,
  Trash2,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';

interface Purchase {
  id: string;
  invoiceNumber: string;
  supplierId?: string;
  supplierName?: string;
  items: PurchaseItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  date: string;
  dueDate?: string;
  notes?: string;
  businessId: string;
}

interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  sellingPrice?: number;
  discount: number;
  tax: number;
  total: number;
}

export default function Purchases() {
  const { currentBusiness } = useAuthStore();
  const businessId = currentBusiness?.id;

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Purchase modal state
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [printing, setPrinting] = useState(false);
  
  // New Purchase form state
  const [newPurchaseModalOpen, setNewPurchaseModalOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [purchaseInvoiceNumber, setPurchaseInvoiceNumber] = useState('');
  const [productQuantities, setProductQuantities] = useState<{ [key: string]: number | string }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const productsPerPage = 10;

  // Toast notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (businessId) {
      loadPurchases();
    }
  }, [businessId]);

  const loadPurchases = async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      const response = await api.getPurchases(businessId);
      const data = response as any;
      if (data && data.success) {
        // Transform API data to match our interface
        const transformedPurchases = (data.purchases || []).map((purchase: any) => ({
          id: purchase.id,
          invoiceNumber: purchase.invoiceNumber,
          supplierId: purchase.supplierId,
          supplierName: purchase.supplierName,
          items: typeof purchase.items === 'string' ? JSON.parse(purchase.items) : (purchase.items || []),
          subtotal: parseFloat(purchase.subtotal || 0),
          taxAmount: parseFloat(purchase.tax || 0),
          discountAmount: parseFloat(purchase.discount || 0),
          grandTotal: parseFloat(purchase.total || 0),
          paymentMethod: purchase.paymentMethod,
          paymentStatus: purchase.paymentStatus,
          status: purchase.paymentStatus === 'paid' ? 'completed' : 'pending',
          date: new Date(purchase.createdAt).toISOString().split('T')[0],
          dueDate: purchase.dueDate,
          notes: purchase.notes,
          businessId: purchase.businessId
        }));
        setPurchases(transformedPurchases);
      }
    } catch (error) {
      console.error('Failed to load purchases:', error);
      showToast('error', 'Failed to load purchases');
    } finally {
      setLoading(false);
    }
  };

  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = (purchase.supplierName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         purchase.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || purchase.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-700';
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      case 'overdue':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const openPurchaseDetails = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setPurchaseModalOpen(true);
  };

  const openNewPurchaseModal = async () => {
    if (!businessId) return;
    try {
      // Load products and suppliers for the form
      const [productsRes, suppliersRes] = await Promise.all([
        api.getBusinessProducts(businessId),
        api.getSuppliers(businessId)
      ]);
      const productsData = productsRes as any;
      const suppliersData = suppliersRes as any;
      if (productsData && productsData.success) {
        setProducts(productsData.products || []);
        setTotalPages(Math.ceil((productsData.products || []).length / productsPerPage));
      }
      if (suppliersData && suppliersData.success) {
        setSuppliers(suppliersData.suppliers || []);
      }
      setNewPurchaseModalOpen(true);
    } catch (error) {
      console.error('Failed to load form data:', error);
      showToast('error', 'Failed to load form data');
    }
  };

  // Get selected products (quantity > 0)
  const getSelectedProducts = () => {
    return Object.entries(productQuantities)
      .filter(([key, value]) => {
        // Skip price fields
        if (key.includes('_purchasePrice') || key.includes('_sellingPrice')) {
          return false;
        }
        // Parse quantity
        const qty = typeof value === 'string' ? parseInt(value) : (value as number);
        return qty > 0;
      })
      .map(([productId, value]) => {
        const product = products.find(p => p.id === productId);
        if (!product) return null;
        
        const qty = typeof value === 'string' ? parseInt(value) : (value as number);
        
        // Get custom prices if provided, otherwise use product defaults
        const purchasePriceVal = productQuantities[`${productId}_purchasePrice`];
        const sellingPriceVal = productQuantities[`${productId}_sellingPrice`];
        const purchasePrice = typeof purchasePriceVal === 'string' ? parseFloat(purchasePriceVal) : (purchasePriceVal || product.purchasePrice || 0);
        const sellingPrice = typeof sellingPriceVal === 'string' ? parseFloat(sellingPriceVal) : (sellingPriceVal || product.sellingPrice || 0);
        
        return {
          productId: product.id,
          productName: product.name,
          quantity: qty,
          unitPrice: purchasePrice,
          sellingPrice: sellingPrice,
          discount: 0,
          tax: parseFloat(product.taxRate || 0),
          total: qty * purchasePrice
        };
      })
      .filter(Boolean);
  };

  // Calculate totals
  const calculateTotals = () => {
    const selected = getSelectedProducts() || [];
    const subtotal = selected.reduce((sum: number, p: any) => sum + p.total, 0);
    const discount = selected.reduce((sum: number, p: any) => sum + p.discount, 0);
    const tax = selected.reduce((sum: number, p: any) => sum + (p.total * p.tax / 100), 0);
    const grandTotal = subtotal - discount + tax;
    return { subtotal, discount, tax, grandTotal };
  };

  const handleCreatePurchase = async () => {
    if (!businessId) {
      showToast('error', 'Please select a business');
      return;
    }

    const selectedProducts = getSelectedProducts();
    if (selectedProducts.length === 0) {
      showToast('error', 'Please add at least one product');
      return;
    }

    try {
      setSubmitting(true);
      const { subtotal, discount, tax, grandTotal } = calculateTotals();
      
      if (!purchaseInvoiceNumber.trim()) {
        showToast('error', 'Please enter an invoice number');
        setSubmitting(false);
        return;
      }

      const purchaseData = {
        invoiceNumber: purchaseInvoiceNumber.trim(),
        supplierId: selectedSupplier || null,
        supplierName: supplierName || 'Direct Purchase',
        items: selectedProducts,
        subtotal,
        discount,
        tax,
        total: grandTotal,
        paymentMethod,
        paymentStatus,
        notes,
        date: new Date().toISOString()
      };

      console.log('Creating purchase with supplier:', purchaseData);

      const response = await api.createPurchase(businessId, purchaseData);
      const data = response as any;
      if (data && data.success) {
        showToast('success', 'Purchase created successfully!');
        setNewPurchaseModalOpen(false);
        resetNewPurchaseForm();
        loadPurchases();
      } else {
        showToast('error', data?.message || 'Failed to create purchase');
      }
    } catch (error) {
      console.error('Failed to create purchase:', error);
      showToast('error', 'Failed to create purchase');
    } finally {
      setSubmitting(false);
    }
  };

  const resetNewPurchaseForm = () => {
    setSelectedSupplier('');
    setSupplierName('');
    setSupplierSearch('');
    setShowSupplierDropdown(false);
    setPurchaseInvoiceNumber('');
    setProductQuantities({});
    setCurrentPage(1);
    setPaymentMethod('cash');
    setPaymentStatus('paid');
    setNotes('');
  };

  const handlePrint = () => {
    setPrinting(true);
    window.print();
    setTimeout(() => setPrinting(false), 1000);
  };

  return (
    <>
      {/* Toast animation styles */}
      <style>{`
        @keyframes toast-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-toast-slide { animation: toast-slide-in 0.3s ease-out; }
      `}</style>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-[100] animate-toast-slide">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className={`ml-2 p-1 rounded-lg transition-colors ${
                toast.type === 'success'
                  ? 'hover:bg-emerald-100 text-emerald-600'
                  : 'hover:bg-red-100 text-red-600'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Purchases</h1>
              <p className="text-slate-500 text-sm mt-1">Manage your purchase orders and supplier returns</p>
            </div>
            <button 
              onClick={openNewPurchaseModal}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-md"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Purchase
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by invoice # or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Purchases table */}
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">Loading...</td>
                  </tr>
                ) : filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">No purchases found</td>
                  </tr>
                ) : (
                  filteredPurchases.map((purchase) => (
                    <tr key={purchase.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        #{purchase.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">{purchase.supplierName || 'N/A'}</td>
              <td className="px-6 py-4">
                        <div className="flex items-center text-sm font-semibold text-slate-900">
                          <DollarSign className="h-4 w-4 mr-1 text-slate-400" />
                          {Number(purchase.grandTotal).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-slate-600">
                          <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                          {purchase.date}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${getStatusColor(purchase.status)}`}>
                          {getStatusIcon(purchase.status)}
                          <span className="ml-1 capitalize">{purchase.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${getPaymentStatusColor(purchase.paymentStatus)}`}>
                          {purchase.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openPurchaseDetails(purchase)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New Purchase Modal */}
      {newPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">New Purchase</h2>
              <button
                onClick={() => setNewPurchaseModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {/* Invoice Number */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Invoice Number *</label>
                <input
                  type="text"
                  placeholder="Enter invoice number..."
                  value={purchaseInvoiceNumber}
                  onChange={(e) => setPurchaseInvoiceNumber(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Supplier Selection with search */}
              <div className="mb-6 relative">
                <label className="block text-sm font-medium text-slate-700 mb-2">Supplier</label>
                <input
                  type="text"
                  placeholder="Search supplier by name, phone, email..."
                  value={supplierSearch}
                  onChange={(e) => {
                    setSupplierSearch(e.target.value);
                    setShowSupplierDropdown(true);
                  }}
                  onFocus={() => setShowSupplierDropdown(true)}
                  onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 200)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {showSupplierDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {suppliers
                      .filter(s => {
                        if (!supplierSearch.trim()) return false;
                        const q = supplierSearch.toLowerCase();
                        return (
                          s.name?.toLowerCase().includes(q) ||
                          s.phone?.toLowerCase().includes(q) ||
                          s.email?.toLowerCase().includes(q) ||
                          s.contactPerson?.toLowerCase().includes(q)
                        );
                      })
                      .map(s => (
                        <div
                          key={s.id}
                          onMouseDown={() => {
                            setSelectedSupplier(s.id);
                            setSupplierName(s.name);
                            setSupplierSearch(s.name);
                            setShowSupplierDropdown(false);
                          }}
                          className="px-4 py-2 hover:bg-indigo-50 cursor-pointer border-b border-slate-100"
                        >
                          <p className="text-sm font-medium text-slate-900">{s.name}</p>
                          <p className="text-xs text-slate-500">
                            {s.phone ? `${s.phone}` : ''}
                            {s.email ? ` • ${s.email}` : ''}
                            {s.contactPerson ? ` • ${s.contactPerson}` : ''}
                          </p>
                        </div>
                      ))}
                    {suppliers.filter(s => {
                      if (!supplierSearch.trim()) return false;
                      const q = supplierSearch.toLowerCase();
                      return (
                        s.name?.toLowerCase().includes(q) ||
                        s.phone?.toLowerCase().includes(q) ||
                        s.email?.toLowerCase().includes(q) ||
                        s.contactPerson?.toLowerCase().includes(q)
                      );
                    }).length === 0 && (
                      <div className="px-4 py-3 text-sm text-slate-500">No suppliers found</div>
                    )}
                  </div>
                )}
                {selectedSupplier && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSupplier('');
                      setSupplierName('');
                      setSupplierSearch('');
                    }}
                    className="mt-1 text-xs text-red-600 hover:text-red-700"
                  >
                    Clear selection
                  </button>
                )}
              </div>

              {/* Product Table with Pagination */}
              {products.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-slate-700">Products</label>
                    <span className="text-xs text-slate-500">
                      Showing {(currentPage - 1) * productsPerPage + 1} to {Math.min(currentPage * productsPerPage, products.length)} of {products.length} products
                    </span>
                  </div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Product</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">UOM</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Purchase Price</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Selling Price</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Quantity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {products.slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage).map((product) => {
                          const qtyVal = productQuantities[product.id];
                          const qty = typeof qtyVal === 'string' ? parseInt(qtyVal) : (qtyVal || 0);
                          const purchasePriceVal = productQuantities[`${product.id}_purchasePrice`];
                          const sellingPriceVal = productQuantities[`${product.id}_sellingPrice`];
                          const purchasePrice = typeof purchasePriceVal === 'string' ? parseFloat(purchasePriceVal) : (purchasePriceVal || product.purchasePrice || 0);
                          const sellingPrice = typeof sellingPriceVal === 'string' ? parseFloat(sellingPriceVal) : (sellingPriceVal || product.sellingPrice || 0);
                          
                          return (
                            <tr key={product.id} className={qty > 0 ? 'bg-indigo-50' : ''}>
                              <td className="px-4 py-3 text-sm text-slate-900">{product.name}</td>
                              <td className="px-4 py-3 text-sm text-slate-600 text-center capitalize">{product.unit || 'pcs'}</td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={purchasePrice}
                                  onChange={(e) => {
                                    const newPrice = parseFloat(e.target.value) || 0;
                                    setProductQuantities({ 
                                      ...productQuantities, 
                                      [`${product.id}_purchasePrice`]: newPrice 
                                    });
                                  }}
                                  className={`w-24 px-2 py-1 text-sm text-right border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                    qty > 0 ? 'border-indigo-300 bg-white' : 'border-slate-200'
                                  }`}
                                  placeholder="0.00"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={sellingPrice}
                                  onChange={(e) => {
                                    const newPrice = parseFloat(e.target.value) || 0;
                                    setProductQuantities({ 
                                      ...productQuantities, 
                                      [`${product.id}_sellingPrice`]: newPrice 
                                    });
                                  }}
                                  className={`w-24 px-2 py-1 text-sm text-right border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                    qty > 0 ? 'border-indigo-300 bg-white' : 'border-slate-200'
                                  }`}
                                  placeholder="0.00"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  value={qty}
                                  onChange={(e) => {
                                    const newQty = parseInt(e.target.value) || 0;
                                    setProductQuantities({ ...productQuantities, [product.id]: newQty });
                                  }}
                                  className={`w-20 px-2 py-1 text-sm text-center border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                    qty > 0 ? 'border-indigo-300 bg-white' : 'border-slate-200'
                                  }`}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-slate-600">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Selected Products Summary */}
              {getSelectedProducts().length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Selected Items</h3>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Product</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Qty</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Purchase Price</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Selling Price</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {getSelectedProducts().map((item: any, index: number) => (
                          <tr key={index}>
                            <td className="px-4 py-3 text-sm text-slate-900">{item.productName}</td>
                            <td className="px-4 py-3 text-sm text-slate-600 text-center">{item.quantity}</td>
              <td className="px-4 py-3 text-sm text-slate-600 text-right">₹{Number(item.unitPrice).toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm text-slate-600 text-right">₹{item.sellingPrice != null ? Number(item.sellingPrice).toFixed(2) : '0.00'}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-900 text-right">₹{Number(item.total).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Totals */}
              {getSelectedProducts().length > 0 && (
                <div className="flex justify-end mb-6">
                  <div className="w-64">
                    <div className="flex justify-between py-2 border-b border-slate-200">
                      <span className="text-sm text-slate-600">Subtotal:</span>
              <span className="text-sm font-medium text-slate-900">₹{Number(calculateTotals().subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-200">
                      <span className="text-sm text-slate-600">Tax:</span>
              <span className="text-sm font-medium text-slate-900">₹{Number(calculateTotals().tax).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-3 bg-indigo-50 rounded-lg px-3 mt-2">
                      <span className="text-base font-bold text-slate-900">Grand Total:</span>
              <span className="text-base font-bold text-indigo-600">₹{Number(calculateTotals().grandTotal).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Details */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Payment Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Add any notes..."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setNewPurchaseModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePurchase}
                  disabled={submitting || getSelectedProducts().length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating...' : 'Create Purchase'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Details Modal */}
      {purchaseModalOpen && selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 no-print">
              <h2 className="text-lg font-bold text-slate-900">Purchase Details</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  <Printer className="h-4 w-4 mr-1" />
                  Print
                </button>
                <button
                  onClick={() => setPurchaseModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-8">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-indigo-600 mb-2">Vyapar Vistar</h1>
                  <p className="text-sm text-slate-600">Purchase Order</p>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">PURCHASE</h2>
                  <p className="text-sm text-slate-600">Invoice #: {selectedPurchase.invoiceNumber}</p>
                  <p className="text-sm text-slate-600">Date: {selectedPurchase.date}</p>
                </div>
              </div>

              <div className="mb-8 p-4 bg-slate-50 rounded-lg">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Supplier:</h3>
                <p className="text-sm font-medium text-slate-900">{selectedPurchase.supplierName || 'N/A'}</p>
              </div>

              {/* Items Table */}
              <div className="mb-8">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Item</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Price</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedPurchase.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-slate-900">{item.productName}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 text-center">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 text-right">₹{Number(item.unitPrice).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900 text-right">₹{Number(item.total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end mb-8">
                <div className="w-64">
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-sm text-slate-600">Subtotal:</span>
                    <span className="text-sm font-medium text-slate-900">₹{Number(selectedPurchase.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-sm text-slate-600">Tax:</span>
                    <span className="text-sm font-medium text-slate-900">₹{Number(selectedPurchase.taxAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-sm text-slate-600">Discount:</span>
                    <span className="text-sm font-medium text-slate-900">-₹{Number(selectedPurchase.discountAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-3 bg-indigo-50 rounded-lg px-3 mt-2">
                    <span className="text-base font-bold text-slate-900">Grand Total:</span>
                    <span className="text-base font-bold text-indigo-600">₹{Number(selectedPurchase.grandTotal).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Status */}
              <div className="mb-8 p-4 bg-slate-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-slate-600">Payment Method:</p>
                    <p className="text-sm font-medium text-slate-900 capitalize">{selectedPurchase.paymentMethod}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">Payment Status:</p>
                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${getPaymentStatusColor(selectedPurchase.paymentStatus)}`}>
                      {selectedPurchase.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedPurchase.notes && (
                <div className="mb-8 p-4 bg-slate-50 rounded-lg">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Notes:</h3>
                  <p className="text-sm text-slate-600">{selectedPurchase.notes}</p>
                </div>
              )}

              {/* Footer */}
              <div className="text-center text-sm text-slate-500 pt-8 border-t border-slate-200">
                <p>Thank you for your business!</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}