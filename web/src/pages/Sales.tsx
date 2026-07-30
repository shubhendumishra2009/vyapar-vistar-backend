import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, Filter, DollarSign, Calendar,
  CheckCircle, Clock, XCircle,
  Printer, X, Eye, Trash2, CheckCircle2, AlertCircle,
  Layers, ChevronDown, ChevronRight
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import '../styles/print.css';

interface Sale {
  id: string; invoiceNumber: string; customerName: string;
  customerPhone?: string; items: SaleItem[];
  subtotal: number; taxAmount: number; discountAmount: number;
  grandTotal: number; paymentMethod: string; paymentStatus: string;
  status: string; date: string; notes?: string;
}

interface SaleItem {
  productId: string; productName: string; quantity: number;
  unitPrice: number; discount: number; tax: number; total: number;
  batchNumber?: string;
}

interface BatchInfo {
  id: string; batchNumber: string; quantity: number;
  sellingPrice: number; expiryDate?: string;
}

interface SaleProduct {
  id: string; name: string; sku: string; unit: string;
  sellingPrice: number; stock: number; batches: BatchInfo[];
}

interface SelectedBatchItem {
  productId: string; productName: string; batchNumber: string;
  quantity: number; unitPrice: number; total: number;
}

export default function Sales() {
  const { currentBusiness } = useAuthStore();
  const businessId = currentBusiness?.id;

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // New Sale form
  const [newSaleModalOpen, setNewSaleModalOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Products
  const [saleProducts, setSaleProducts] = useState<SaleProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const productsPerPage = 10;
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [productSearch, setProductSearch] = useState('');

  // Selected items
  const [selectedItems, setSelectedItems] = useState<SelectedBatchItem[]>([]);

  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [printSettings, setPrintSettings] = useState<any[]>([]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => { if (businessId) loadSales(); }, [businessId]);
  
  // Load print settings
  useEffect(() => {
    if (businessId) {
      api.getPrintSettings(businessId).then((res: any) => {
        if (res.success) setPrintSettings(res.data || []);
      }).catch(err => console.error('Error loading print settings:', err));
    }
  }, [businessId]);

  const loadSales = async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      const response = (await api.getSales(businessId)) as any;
      if (response?.success) {
        setSales((response.sales || []).map((s: any) => ({
          id: s.id, invoiceNumber: s.invoiceNumber,
          customerName: s.customer?.name || 'Walk-in Customer',
          customerPhone: s.customer?.phone,
          items: typeof s.items === 'string' ? JSON.parse(s.items) : (s.items || []),
          subtotal: parseFloat(s.subtotal || 0),
          taxAmount: parseFloat(s.tax || 0),
          discountAmount: parseFloat(s.discount || 0),
          grandTotal: parseFloat(s.total || 0),
          paymentMethod: s.paymentMethod,
          paymentStatus: s.paymentStatus,
          status: s.paymentStatus === 'paid' ? 'completed' : 'pending',
          date: new Date(s.createdAt).toISOString().split('T')[0],
          notes: s.notes,
        })));
      }
    } catch (error) {
      showToast('error', 'Failed to load sales');
    } finally { setLoading(false); }
  };

  const filteredSales = sales.filter(s => {
    const q = searchTerm.toLowerCase();
    return (s.customerName.toLowerCase().includes(q) || s.invoiceNumber.toLowerCase().includes(q)) &&
      (statusFilter === 'all' || s.status === statusFilter);
  });

  const getStatusColor = (s: string) => s === 'completed' ? 'bg-emerald-100 text-emerald-700' : s === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  const getPaymentStatusColor = (s: string) => s === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700';

  const openNewSaleModal = async () => {
    if (!businessId) return;
    try {
      setProductsLoading(true);
      const [cRes, pRes] = await Promise.all([
        api.getBusinessCustomers(businessId),
        api.getSaleSearchProducts(businessId, '')
      ]);
      const cData = cRes as any; const pData = pRes as any;
      if (cData?.success) setCustomers(cData.customers || []);
      if (pData?.success) {
        setSaleProducts(pData.products || []);
        setTotalPages(Math.ceil((pData.products || []).length / productsPerPage));
      }
      setCurrentPage(1); setProductSearch('');
      setNewSaleModalOpen(true);
    } catch (error) { showToast('error', 'Failed to load form data'); }
    finally { setProductsLoading(false); }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  // Filter products by search (just filters the table)
  const filteredSaleProducts = saleProducts.filter(p => {
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) ||
           (p.sku && p.sku.toLowerCase().includes(q));
  });

  // Auto-expand all filtered products when search changes
  useEffect(() => {
    const expanded = new Set<string>();
    filteredSaleProducts.forEach(p => expanded.add(p.id));
    setExpandedRows(expanded);
  }, [productSearch, saleProducts]);

  // Recalculate total pages whenever filtered products change
  const filteredTotalPages = Math.max(1, Math.ceil(filteredSaleProducts.length / productsPerPage));
  
  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [productSearch]);

  const currentProducts = filteredSaleProducts.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  );

  const toggleRowExpansion = (pid: string) => {
    setExpandedRows(prev => { const n = new Set(prev); if (n.has(pid)) n.delete(pid); else n.add(pid); return n; });
  };

  // Auto-add to sale when qty is entered
  const handleBatchQtyChange = (productId: string, batchId: string, rawVal: string, maxQty: number) => {
    const qty = Math.min(maxQty, Math.max(0, parseInt(rawVal) || 0));

    const product = saleProducts.find(p => p.id === productId);
    if (!product) return;

    const batch = product.batches.find(b => b.id === batchId);
    if (!batch) return;

    // If qty is 0, remove this batch from selected items
    if (qty <= 0) {
      setSelectedItems(prev => prev.filter(i => !(i.productId === productId && i.batchNumber === batch.batchNumber)));
      return;
    }

    if (qty > batch.quantity) {
      showToast('error', `Batch ${batch.batchNumber} only has ${batch.quantity} available`);
      return;
    }

    // Remove any existing entry for this product+batch and add new one
    setSelectedItems(prev => {
      let filtered = prev.filter(i => !(i.productId === productId && i.batchNumber === batch.batchNumber));
      filtered.push({
        productId: product.id,
        productName: product.name,
        batchNumber: batch.batchNumber,
        quantity: qty,
        unitPrice: Number(batch.sellingPrice) || Number(product.sellingPrice) || 0,
        total: qty * (Number(batch.sellingPrice) || Number(product.sellingPrice) || 0)
      });
      return filtered;
    });
    // Clear search after adding to sale
    setProductSearch('');
  };

  const calculateTotals = () => {
    const subtotal = selectedItems.reduce((s, i) => s + i.total, 0);
    return { subtotal, grandTotal: subtotal };
  };

  const handleCreateSale = async () => {
    if (!businessId || !selectedCustomer) { showToast('error', 'Please select a customer'); return; }
    if (selectedItems.length === 0) { showToast('error', 'Please add at least one product'); return; }

    try {
      setSubmitting(true);
      const { subtotal, grandTotal } = calculateTotals();
      const res = (await api.createSale(businessId, {
        customerId: selectedCustomer,
        items: selectedItems.map(i => ({
          productId: i.productId, productName: i.productName,
          quantity: i.quantity, unitPrice: i.unitPrice,
          batchNumber: i.batchNumber, discount: 0, tax: 0, total: i.total
        })),
        subtotal, discount: 0, tax: 0, total: grandTotal,
        paymentMethod, paymentStatus, notes, date: new Date().toISOString()
      })) as any;

      if (res?.success) {
        showToast('success', 'Sale created successfully!');
        setNewSaleModalOpen(false);
        setSelectedCustomer(''); setCustomerSearch('');
        setProductSearch(''); setSelectedItems([]);
        setExpandedRows(new Set());
        setPaymentMethod('cash'); setPaymentStatus('paid'); setNotes('');
        loadSales();
        window.dispatchEvent(new CustomEvent('reload-customers'));
      } else showToast('error', res?.message || 'Failed to create sale');
    } catch (error: any) { showToast('error', error?.response?.data?.message || 'Failed to create sale'); }
    finally { setSubmitting(false); }
  };

  const handlePrint = () => {
    // Get paper size from settings (default to A4)
    const saleSetting = printSettings.find(s => s.reportType === 'sale_invoice');
    const paperSize = saleSetting?.paperSize || 'A4';
    
    // Set paper size in localStorage for CSS to use
    localStorage.setItem('printPaperSize', paperSize);
    
    // Trigger print
    window.print();
    
    // Clean up after print
    setTimeout(() => localStorage.removeItem('printPaperSize'), 1000);
  };

  // ========== LIST VIEW ==========
  if (!newSaleModalOpen && !invoiceModalOpen) {
    return (
      <>
        <style>{`@keyframes ti { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } .animate-ti { animation: ti 0.3s ease-out; }`}</style>
        {toast && (
          <div className="fixed top-4 right-4 z-[100] animate-ti">
            <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <AlertCircle className="h-5 w-5 text-red-500" />}
              <span className="text-sm font-medium">{toast.message}</span>
              <button onClick={() => setToast(null)} className={`ml-2 p-1 rounded-lg ${toast.type === 'success' ? 'hover:bg-emerald-100' : 'hover:bg-red-100'}`}><X className="h-4 w-4" /></button>
            </div>
          </div>
        )}
        <div className="bg-white border-b border-slate-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div><h1 className="text-2xl font-bold text-slate-900">Sales</h1><p className="text-slate-500 text-sm mt-1">Track your sales and transactions</p></div>
              <button onClick={openNewSaleModal} className="flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 shadow-md"><Plus className="h-4 w-4 mr-2" /> New Sale</button>
            </div>
            <div className="flex gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input type="text" placeholder="Search by invoice # or customer..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                  <option value="all">All Status</option><option value="completed">Completed</option><option value="pending">Pending</option><option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr><th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Invoice #</th><th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Customer</th><th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Amount</th><th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th><th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th><th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Payment</th><th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">Loading...</td></tr>
                  : filteredSales.length === 0 ? <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">No sales found</td></tr>
                  : filteredSales.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">#{s.invoiceNumber}</td>
                      <td className="px-6 py-4 text-sm text-slate-900">{s.customerName}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">₹{Number(s.grandTotal).toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{s.date}</td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${getStatusColor(s.status)}`}>{s.status === 'completed' ? <CheckCircle className="h-4 w-4 mr-1" /> : s.status === 'pending' ? <Clock className="h-4 w-4 mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}{s.status}</span></td>
                      <td className="px-6 py-4"><span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${getPaymentStatusColor(s.paymentStatus)}`}>{s.paymentStatus}</span></td>
                      <td className="px-6 py-4 text-right"><button onClick={() => { setSelectedSale(s); setInvoiceModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Eye className="h-4 w-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Get paper size for invoice
  const getInvoicePaperSize = () => {
    const saleSetting = printSettings.find(s => s.reportType === 'sale_invoice');
    return saleSetting?.paperSize || 'A4';
  };

  // ========== INVOICE VIEW ==========
  if (invoiceModalOpen && selectedSale) {
    const paperSize = getInvoicePaperSize();
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className={`bg-white rounded-2xl shadow-xl ${paperSize === '58mm' || paperSize === '80mm' ? 'w-full' : 'w-full max-w-4xl'} max-h-[90vh] overflow-y-auto`}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 no-print">
            <h2 className="text-lg font-bold text-slate-900">Invoice</h2>
            <div className="flex items-center gap-2">
              <button onClick={handlePrint} className="flex items-center px-3 py-1.5 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"><Printer className="h-4 w-4 mr-1" /> Print</button>
              <button onClick={() => setInvoiceModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X className="h-5 w-5" /></button>
            </div>
          </div>
          <div id="invoice-modal" className={`p-8 ${paperSize === '58mm' ? 'thermal-58mm' : paperSize === '80mm' ? 'thermal-80mm' : ''}`}>
            <div className="flex justify-between items-start mb-8">
              <div><h1 className="text-3xl font-bold text-indigo-600 mb-2">VyaparVistar</h1><p className="text-sm text-slate-600">Your Business Name</p></div>
              <div className="text-right"><h2 className="text-2xl font-bold text-slate-900 mb-2">INVOICE</h2><p className="text-sm text-slate-600">Invoice #: {selectedSale.invoiceNumber}</p><p className="text-sm text-slate-600">Date: {selectedSale.date}</p></div>
            </div>
            <div className="mb-8 p-4 bg-slate-50 rounded-lg"><h3 className="text-sm font-semibold text-slate-700 mb-2">Bill To:</h3><p className="text-sm font-medium text-slate-900">{selectedSale.customerName}</p>{selectedSale.customerPhone && <p className="text-sm text-slate-600">Phone: {selectedSale.customerPhone}</p>}</div>
            <table className="w-full mb-8">
              <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Item</th><th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Qty</th><th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Price</th><th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Total</th></tr></thead>
              <tbody className="divide-y divide-slate-200">{selectedSale.items.map((item, i) => (<tr key={i}><td className="px-4 py-3 text-sm text-slate-900">{item.productName}</td><td className="px-4 py-3 text-sm text-slate-600 text-center">{item.quantity}</td><td className="px-4 py-3 text-sm text-slate-600 text-right">₹{Number(item.unitPrice).toFixed(2)}</td><td className="px-4 py-3 text-sm font-semibold text-slate-900 text-right">₹{Number(item.total).toFixed(2)}</td></tr>))}</tbody>
            </table>
            <div className="flex justify-end mb-8"><div className="w-64"><div className="flex justify-between py-2 border-b border-slate-200"><span className="text-sm text-slate-600">Subtotal:</span><span className="text-sm font-medium text-slate-900">₹{Number(selectedSale.subtotal).toFixed(2)}</span></div><div className="flex justify-between py-3 bg-indigo-50 rounded-lg px-3 mt-2"><span className="text-base font-bold text-slate-900">Grand Total:</span><span className="text-base font-bold text-indigo-600">₹{Number(selectedSale.grandTotal).toFixed(2)}</span></div></div></div>
            <div className="text-center text-sm text-slate-500 pt-8 border-t border-slate-200"><p>Thank you for your business!</p></div>
          </div>
        </div>
      </div>
    );
  }

  // ========== NEW SALE MODAL ==========
  return (
    <>
      <style>{`@keyframes ti { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } .animate-ti { animation: ti 0.3s ease-out; }`}</style>
      {toast && (
        <div className="fixed top-4 right-4 z-[100] animate-ti">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <AlertCircle className="h-5 w-5 text-red-500" />}
            <span className="text-sm font-medium">{toast.message}</span>
            <button onClick={() => setToast(null)} className={`ml-2 p-1 rounded-lg ${toast.type === 'success' ? 'hover:bg-emerald-100' : 'hover:bg-red-100'}`}><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {newSaleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">New Sale</h2>
              <button onClick={() => setNewSaleModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X className="h-5 w-5" /></button>
            </div>

            <div className="p-6">
              {/* Customer Selection */}
              <div className="mb-6 relative">
                <label className="block text-sm font-medium text-slate-700 mb-2">Customer *</label>
                <input type="text" placeholder="Search customer by name or phone..." value={customerSearch}
                  onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                  onFocus={() => setShowCustomerDropdown(true)} onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCustomers.map(c => (
                      <div key={c.id} onMouseDown={() => { setSelectedCustomer(c.id); setCustomerSearch(c.name); setShowCustomerDropdown(false); }}
                        className="px-4 py-2 hover:bg-indigo-50 cursor-pointer border-b border-slate-100">
                        <p className="text-sm font-medium text-slate-900">{c.name}</p>
                        <p className="text-xs text-slate-500">{c.phone} {c.email ? `• ${c.email}` : ''}</p>
                      </div>
                    ))}
                  </div>
                )}
                {selectedCustomer && <button type="button" onClick={() => { setSelectedCustomer(''); setCustomerSearch(''); }} className="mt-1 text-xs text-red-600 hover:text-red-700">Clear selection</button>}
              </div>

              {/* Search Box - just filters the table */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Search Products</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <input type="text" placeholder="Type to filter products by name, SKU..." value={productSearch}
                    onChange={e => { setProductSearch(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              {/* Product Table with inline quantity */}
              {productsLoading ? (
                <div className="text-center py-8 text-sm text-slate-500">Loading products...</div>
              ) : (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-slate-700">Products — Enter qty in any batch to auto-add</label>
                    <span className="text-xs text-slate-500">
                      Showing {(currentPage - 1) * productsPerPage + 1} to {Math.min(currentPage * productsPerPage, filteredSaleProducts.length)} of {filteredSaleProducts.length}
                    </span>
                  </div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="w-10"></th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Product</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">UOM</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Price</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Stock</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Enter Qty to Sell</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {currentProducts.map(product => {
                          const isExpanded = expandedRows.has(product.id);
                          const hasBatches = product.batches.length > 0;
                          return (
                            <React.Fragment key={product.id}>
                              <tr className="hover:bg-slate-50">
                                <td className="w-10">
                                  {hasBatches && (
                                    <button onClick={() => toggleRowExpansion(product.id)} className="p-1 hover:bg-slate-200 rounded">
                                      {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-600" /> : <ChevronRight className="h-4 w-4 text-slate-600" />}
                                    </button>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-900">{product.name}</td>
                                <td className="px-4 py-3 text-sm text-slate-600 text-center capitalize">{product.unit || 'pcs'}</td>
                                <td className="px-4 py-3 text-sm text-slate-600 text-right">₹{Number(product.sellingPrice).toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-slate-600 text-center">{product.stock}</td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    {hasBatches ? (
                                      product.batches.slice(0, 2).map(b => (
                                        <input key={b.id} type="number" min="0" max={b.quantity} placeholder={b.batchNumber.substring(0, 8)}
                                          onBlur={e => handleBatchQtyChange(product.id, b.id, e.target.value, b.quantity)}
                                          onKeyDown={e => { if (e.key === 'Enter') handleBatchQtyChange(product.id, b.id, (e.target as HTMLInputElement).value, b.quantity); }}
                                          className="w-14 px-1 py-1 text-xs text-center border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" title={b.batchNumber} />
                                      ))
                                    ) : (
                                      <span className="text-xs text-slate-400">No stock</span>
                                    )}
                                    {product.batches.length > 2 && (
                                      <span className="text-xs text-slate-400">+{product.batches.length - 2}</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              {/* Expanded batch details with inline qty inputs */}
                              {isExpanded && hasBatches && (
                                <tr className="bg-slate-50">
                                  <td colSpan={6} className="px-6 py-3">
                                    <div className="ml-6">
                                      <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">Batch-wise — Enter qty & press Enter or click away to auto-add</h4>
                                      <table className="w-full max-w-4xl">
                                        <thead className="bg-slate-100 border-b border-slate-200">
                                          <tr>
                                            <th className="px-3 py-1.5 text-left text-xs font-semibold text-slate-600 uppercase">Batch #</th>
                                            <th className="px-3 py-1.5 text-center text-xs font-semibold text-slate-600 uppercase">Available</th>
                                            <th className="px-3 py-1.5 text-right text-xs font-semibold text-slate-600 uppercase">Selling Price</th>
                                            <th className="px-3 py-1.5 text-left text-xs font-semibold text-slate-600 uppercase">Expiry</th>
                                            <th className="px-3 py-1.5 text-center text-xs font-semibold text-slate-600 uppercase">Qty</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                          {product.batches.map(batch => (
                                            <tr key={batch.id} className="hover:bg-white">
                                              <td className="px-3 py-2 text-sm font-medium text-slate-900">{batch.batchNumber}</td>
                                              <td className="px-3 py-2 text-sm text-slate-900 text-center font-semibold">{batch.quantity}</td>
                                              <td className="px-3 py-2 text-sm text-slate-600 text-right">₹{Number(batch.sellingPrice).toFixed(2)}</td>
                                              <td className="px-3 py-2 text-sm text-slate-600">{batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : 'N/A'}</td>
                                              <td className="px-3 py-2 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                  <input type="number" min="0" max={batch.quantity}
                                                    onBlur={e => handleBatchQtyChange(product.id, batch.id, e.target.value, batch.quantity)}
                                                    onKeyDown={e => { if (e.key === 'Enter') handleBatchQtyChange(product.id, batch.id, (e.target as HTMLInputElement).value, batch.quantity); }}
                                                    className="w-20 px-2 py-1 text-sm text-center border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                                                </div>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {filteredTotalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
                        className="px-3 py-1 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                      <span className="text-sm text-slate-600">Page {currentPage} of {filteredTotalPages}</span>
                      <button onClick={() => setCurrentPage(Math.min(filteredTotalPages, currentPage + 1))} disabled={currentPage === filteredTotalPages}
                        className="px-3 py-1 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                    </div>
                  )}
                </div>
              )}

              {/* Selected Items */}
              {selectedItems.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Selected Items ({selectedItems.reduce((s, i) => s + i.quantity, 0)} total)</h3>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr><th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Product</th><th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Batch</th><th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Qty</th><th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Price</th><th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Total</th><th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Action</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {selectedItems.map((item, i) => (
                          <tr key={i}>
                            <td className="px-4 py-3 text-sm text-slate-900">{item.productName}</td>
                            <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-indigo-100 text-indigo-700 font-medium"><Layers className="h-3 w-3 mr-1" />{item.batchNumber}</span></td>
                            <td className="px-4 py-3 text-sm text-slate-600 text-center">{item.quantity}</td>
                            <td className="px-4 py-3 text-sm text-slate-600 text-right">₹{Number(item.unitPrice).toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-900 text-right">₹{Number(item.total).toFixed(2)}</td>
                            <td className="px-4 py-3 text-center"><button onClick={() => setSelectedItems(prev => prev.filter((_, j) => j !== i))} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Totals */}
              {selectedItems.length > 0 && (
                <div className="flex justify-end mb-6">
                  <div className="w-64"><div className="flex justify-between py-3 bg-indigo-50 rounded-lg px-3"><span className="text-base font-bold text-slate-900">Grand Total:</span><span className="text-base font-bold text-indigo-600">₹{Number(calculateTotals().grandTotal).toFixed(2)}</span></div></div>
                </div>
              )}

              {/* Payment & Notes */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div><label className="block text-sm font-medium text-slate-700 mb-2">Payment Method</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="cash">Cash</option><option value="card">Card</option><option value="upi">UPI</option><option value="credit">Credit</option></select></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-2">Payment Status</label>
                  <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="paid">Paid</option><option value="pending">Pending</option></select></div>
              </div>
              <div className="mb-6">
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Add any notes..." />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setNewSaleModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                <button onClick={handleCreateSale} disabled={submitting || !selectedCustomer || selectedItems.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed">{submitting ? 'Creating...' : 'Create Sale'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}