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
  Eye
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';

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

  useEffect(() => {
    if (businessId) {
      loadSales();
    }
  }, [businessId]);

  const loadSales = async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await api.getSales(businessId);
      // setSales(response.sales);
      
      // Dummy data for now
      setSales([
        {
          id: '1',
          invoiceNumber: 'INV-001',
          customerId: 'cust-1',
          customerName: 'Rajesh Kumar Sharma',
          customerPhone: '+91 98765 43210',
          customerEmail: 'rajesh@email.com',
          customerAddress: '123 Main Street, New Delhi',
          customerGstNumber: '07AABCS1234R1Z5',
          items: [
            { productId: '1', productName: 'Product A', quantity: 2, unitPrice: 500, discount: 0, tax: 90, total: 1090 }
          ],
          subtotal: 1000,
          taxAmount: 90,
          discountAmount: 0,
          grandTotal: 1090,
          paymentMethod: 'cash',
          paymentStatus: 'paid',
          status: 'completed',
          date: '2024-01-15',
          dueDate: '2024-01-30',
          businessId: businessId
        },
        {
          id: '2',
          invoiceNumber: 'INV-002',
          customerId: 'cust-2',
          customerName: 'Priya Patel',
          customerPhone: '+91 87654 32109',
          items: [
            { productId: '2', productName: 'Product B', quantity: 1, unitPrice: 750, discount: 50, tax: 126, total: 826 }
          ],
          subtotal: 750,
          taxAmount: 126,
          discountAmount: 50,
          grandTotal: 826,
          paymentMethod: 'upi',
          paymentStatus: 'pending',
          status: 'pending',
          date: '2024-01-14',
          dueDate: '2024-01-29',
          businessId: businessId
        }
      ]);
    } catch (error) {
      console.error('Failed to load sales:', error);
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
            <button className="flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-md">
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