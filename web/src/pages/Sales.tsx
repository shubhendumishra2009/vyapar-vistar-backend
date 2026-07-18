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
  Trash2
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface Sale {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerGstNumber?: string;
  items: SaleItem[];
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

interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
}

export default function Sales() {
  const { currentBusiness } = useAuthStore();
  const businessId = currentBusiness?.id;

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Invoice modal state
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [printing, setPrinting] = useState(false);
  
  // New Sale form state
  const [newSaleModalOpen, setNewSaleModalOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (businessId) {
      loadSales();
    }
  }, [businessId]);

  const loadSales = async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      const response = await api.getSales(businessId);
      const data = response as any;
      if (data && data.success) {
        // Transform API data to match our interface
        const transformedSales = (data.sales || []).map((sale: any) => ({
          id: sale.id,
          invoiceNumber: sale.invoiceNumber,
          customerId: sale.customer?.id || '',
          customerName: sale.customer?.name || 'Walk-in Customer',
          customerPhone: sale.customer?.phone,
          customerEmail: sale.customer?.email,
          customerAddress: sale.customer?.address,
          customerGstNumber: sale.customer?.gstNumber,
          items: typeof sale.items === 'string' ? JSON.parse(sale.items) : (sale.items || []),
          subtotal: parseFloat(sale.subtotal || 0),
          taxAmount: parseFloat(sale.tax || 0),
          discountAmount: parseFloat(sale.discount || 0),
          grandTotal: parseFloat(sale.total || 0),
          paymentMethod: sale.paymentMethod,
          paymentStatus: sale.paymentStatus,
          status: sale.paymentStatus === 'paid' ? 'completed' : 'pending',
          date: new Date(sale.createdAt).toISOString().split('T')[0],
          dueDate: sale.dueDate,
          notes: sale.notes,
          businessId: sale.businessId
        }));
        setSales(transformedSales);
      }
    } catch (error) {
      console.error('Failed to load sales:', error);
      toast.error('Failed to load sales');
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sale.status === statusFilter;
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

  const openInvoice = (sale: Sale) => {
    setSelectedSale(sale);
    setInvoiceModalOpen(true);
  };

  const openNewSaleModal = async () => {
    if (!businessId) return;
    try {
      // Load customers and products for the form
      const [customersRes, productsRes] = await Promise.all([
        api.getBusinessCustomers(businessId),
        api.getBusinessProducts(businessId)
      ]);
      const customersData = customersRes as any;
      const productsData = productsRes as any;
      if (customersData && customersData.success) setCustomers(customersData.customers || []);
      if (productsData && productsData.success) setProducts(productsData.products || []);
      setNewSaleModalOpen(true);
    } catch (error) {
      console.error('Failed to load form data:', error);
      toast.error('Failed to load form data');
    }
  };

  const addProductToSale = (product: any) => {
    const existing = selectedProducts.find(p => p.productId === product.id);
    if (existing) {
      setSelectedProducts(selectedProducts.map(p => 
        p.productId === product.id 
          ? { ...p, quantity: p.quantity + 1, total: (p.quantity + 1) * p.unitPrice }
          : p
      ));
    } else {
      setSelectedProducts([...selectedProducts, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: parseFloat(product.sellingPrice || 0),
        discount: 0,
        tax: parseFloat(product.taxRate || 0),
        total: parseFloat(product.sellingPrice || 0)
      }]);
    }
  };

  const removeProductFromSale = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.productId !== productId));
  };

  const updateProductQuantity = (productId: string, quantity: number) => {
    setSelectedProducts(selectedProducts.map(p => {
      if (p.productId === productId) {
        return {
          ...p,
          quantity,
          total: quantity * p.unitPrice
        };
      }
      return p;
    }));
  };

  const calculateTotals = () => {
    const subtotal = selectedProducts.reduce((sum, p) => sum + p.total, 0);
    const discount = selectedProducts.reduce((sum, p) => sum + p.discount, 0);
    const tax = selectedProducts.reduce((sum, p) => sum + (p.total * p.tax / 100), 0);
    const grandTotal = subtotal - discount + tax;
    return { subtotal, discount, tax, grandTotal };
  };

  const handleCreateSale = async () => {
    if (!businessId || !selectedCustomer || selectedProducts.length === 0) {
      toast.error('Please select a customer and at least one product');
      return;
    }

    try {
      setSubmitting(true);
      const { subtotal, discount, tax, grandTotal } = calculateTotals();
      
      const saleData = {
        customerId: selectedCustomer,
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

      const response = await api.createSale(businessId, saleData);
      const data = response as any;
      if (data && data.success) {
        toast.success('Sale created successfully!');
        setNewSaleModalOpen(false);
        resetNewSaleForm();
        loadSales();
      } else {
        toast.error(data?.message || 'Failed to create sale');
      }
    } catch (error) {
      console.error('Failed to create sale:', error);
      toast.error('Failed to create sale');
    } finally {
      setSubmitting(false);
    }
  };

  const resetNewSaleForm = () => {
    setSelectedCustomer('');
    setSelectedProducts([]);
    setPaymentMethod('cash');
    setPaymentStatus('paid');
    setNotes('');
  };

  const handlePrint = () => {
    setPrinting(true);
    window.print();
    setTimeout(() => setPrinting(false), 1000);
  };

  const handleDownloadPDF = () => {
    // Use browser's print functionality to save as PDF
    window.print();
  };

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-modal, #invoice-modal * {
            visibility: visible;
          }
          #invoice-modal {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Sales</h1>
              <p className="text-slate-500 text-sm mt-1">Track your sales and transactions</p>
            </div>
            <button 
              onClick={openNewSaleModal}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-md"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Sale
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by invoice # or customer..."
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

      {/* Sales table */}
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Customer</th>
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
                ) : filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">No sales found</td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        #{sale.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">{sale.customerName}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm font-semibold text-slate-900">
                          <DollarSign className="h-4 w-4 mr-1 text-slate-400" />
                          {sale.grandTotal.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-slate-600">
                          <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                          {sale.date}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${getStatusColor(sale.status)}`}>
                          {getStatusIcon(sale.status)}
                          <span className="ml-1 capitalize">{sale.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${getPaymentStatusColor(sale.paymentStatus)}`}>
                          {sale.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openInvoice(sale)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View Invoice"
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

      {/* New Sale Modal */}
      {newSaleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">New Sale</h2>
              <button
                onClick={() => setNewSaleModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {/* Customer Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Customer *</label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Customer</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.phone ? `(${customer.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Add Products</label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      const product = products.find(p => p.id === e.target.value);
                      if (product) {
                        addProductToSale(product);
                        e.target.value = '';
                      }
                    }
                  }}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Product to Add</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - ₹{product.sellingPrice}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Products Table */}
              {selectedProducts.length > 0 && (
                <div className="mb-6">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Product</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Qty</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Price</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Total</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedProducts.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-slate-900">{item.productName}</td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateProductQuantity(item.productId, parseInt(e.target.value) || 1)}
                              className="w-20 px-2 py-1 text-sm text-center border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 text-right">₹{item.unitPrice.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900 text-right">₹{item.total.toFixed(2)}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => removeProductFromSale(item.productId)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totals */}
              {selectedProducts.length > 0 && (
                <div className="flex justify-end mb-6">
                  <div className="w-64">
                    <div className="flex justify-between py-2 border-b border-slate-200">
                      <span className="text-sm text-slate-600">Subtotal:</span>
                      <span className="text-sm font-medium text-slate-900">₹{calculateTotals().subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-200">
                      <span className="text-sm text-slate-600">Tax:</span>
                      <span className="text-sm font-medium text-slate-900">₹{calculateTotals().tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-3 bg-indigo-50 rounded-lg px-3 mt-2">
                      <span className="text-base font-bold text-slate-900">Grand Total:</span>
                      <span className="text-base font-bold text-indigo-600">₹{calculateTotals().grandTotal.toFixed(2)}</span>
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
                    <option value="credit">Credit</option>
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
                  onClick={() => setNewSaleModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSale}
                  disabled={submitting || !selectedCustomer || selectedProducts.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating...' : 'Create Sale'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 no-print">
              <h2 className="text-lg font-bold text-slate-900">Invoice</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  <Printer className="h-4 w-4 mr-1" />
                  Print
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  <Download className="h-4 w-4 mr-1" />
                  PDF
                </button>
                <button
                  onClick={() => setInvoiceModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Invoice Content */}
            <div id="invoice-modal" className="p-8">
              {/* Company Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-indigo-600 mb-2">VyaparVistar</h1>
                  <p className="text-sm text-slate-600">Your Business Name</p>
                  <p className="text-sm text-slate-600">Address Line 1</p>
                  <p className="text-sm text-slate-600">City, State - PIN</p>
                  <p className="text-sm text-slate-600">GST: XXAAAAA0000A1Z5</p>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">INVOICE</h2>
                  <p className="text-sm text-slate-600">Invoice #: {selectedSale.invoiceNumber}</p>
                  <p className="text-sm text-slate-600">Date: {selectedSale.date}</p>
                  {selectedSale.dueDate && (
                    <p className="text-sm text-slate-600">Due Date: {selectedSale.dueDate}</p>
                  )}
                </div>
              </div>

              {/* Bill To */}
              <div className="mb-8 p-4 bg-slate-50 rounded-lg">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Bill To:</h3>
                <p className="text-sm font-medium text-slate-900">{selectedSale.customerName}</p>
                {selectedSale.customerPhone && (
                  <p className="text-sm text-slate-600">Phone: {selectedSale.customerPhone}</p>
                )}
                {selectedSale.customerEmail && (
                  <p className="text-sm text-slate-600">Email: {selectedSale.customerEmail}</p>
                )}
                {selectedSale.customerAddress && (
                  <p className="text-sm text-slate-600">Address: {selectedSale.customerAddress}</p>
                )}
                {selectedSale.customerGstNumber && (
                  <p className="text-sm text-slate-600">GST: {selectedSale.customerGstNumber}</p>
                )}
              </div>

              {/* Items Table */}
              <div className="mb-8">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Item</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Price</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Discount</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Tax</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedSale.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-slate-900">{item.productName}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 text-center">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 text-right">₹{item.unitPrice.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 text-right">₹{item.discount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 text-right">₹{item.tax.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900 text-right">₹{item.total.toFixed(2)}</td>
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
                    <span className="text-sm font-medium text-slate-900">₹{selectedSale.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-sm text-slate-600">Discount:</span>
                    <span className="text-sm font-medium text-slate-900">-₹{selectedSale.discountAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-sm text-slate-600">Tax:</span>
                    <span className="text-sm font-medium text-slate-900">₹{selectedSale.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-3 bg-indigo-50 rounded-lg px-3 mt-2">
                    <span className="text-base font-bold text-slate-900">Grand Total:</span>
                    <span className="text-base font-bold text-indigo-600">₹{selectedSale.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Status */}
              <div className="mb-8 p-4 bg-slate-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-slate-600">Payment Method:</p>
                    <p className="text-sm font-medium text-slate-900 capitalize">{selectedSale.paymentMethod}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">Payment Status:</p>
                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${getPaymentStatusColor(selectedSale.paymentStatus)}`}>
                      {selectedSale.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedSale.notes && (
                <div className="mb-8 p-4 bg-slate-50 rounded-lg">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Notes:</h3>
                  <p className="text-sm text-slate-600">{selectedSale.notes}</p>
                </div>
              )}

              {/* Footer */}
              <div className="text-center text-sm text-slate-500 pt-8 border-t border-slate-200">
                <p>Thank you for your business!</p>
                <p className="mt-2">For any queries, contact us at support@vyaparvistar.com</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}