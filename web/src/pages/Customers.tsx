import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Filter,
  X,
  Save,
  Loader2,
  Download,
  Upload,
  FileSpreadsheet,
  FileJson,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  gstNumber?: string | null;
  creditLimit?: number | string;
  currentBalance?: number | string;
  isCreditCustomer: boolean;
  isActive: boolean;
  businessId?: string | null;
}

type CustomerForm = Omit<Customer, 'id'> & {
  creditLimit: string | number;
  currentBalance: string | number;
};

const emptyForm: CustomerForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  gstNumber: '',
  creditLimit: 0,
  currentBalance: 0,
  isCreditCustomer: false,
  isActive: true
};

export default function Customers() {
  const { currentBusiness } = useAuthStore();
  const businessId = currentBusiness?.id;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [creditFilter, setCreditFilter] = useState('');
  const [customersError, setCustomersError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Toast notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadCustomers = useCallback(async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      setCustomersError(null);
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (creditFilter) params.isCreditCustomer = creditFilter;
      const response: any = await api.getBusinessCustomers(businessId, params);
      if (response.success) {
        const allCustomers = Array.isArray(response.customers) ? response.customers : [];
        setAllCustomers(allCustomers);
        setTotalCustomers(allCustomers.length);
        const totalPagesCount = Math.ceil(allCustomers.length / itemsPerPage);
        setTotalPages(totalPagesCount);
        if (currentPage > totalPagesCount && totalPagesCount > 0) {
          setCurrentPage(1);
        }
      } else {
        setAllCustomers([]);
        setTotalCustomers(0);
        setTotalPages(0);
      }
    } catch (error: any) {
      console.error('Failed to load customers:', error);
      const errorMsg = error?.response?.data?.error || error?.response?.data?.message || 'Failed to load customers';
      setCustomersError(errorMsg);
      setAllCustomers([]);
      setTotalCustomers(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [businessId, searchTerm, creditFilter, itemsPerPage, currentPage]);

  // Frontend-only search and pagination
  useEffect(() => {
    let filteredCustomers = allCustomers;

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filteredCustomers = allCustomers.filter(customer =>
        customer.name?.toLowerCase().includes(searchLower) ||
        customer.phone?.toLowerCase().includes(searchLower) ||
        customer.email?.toLowerCase().includes(searchLower) ||
        customer.gstNumber?.toLowerCase().includes(searchLower)
      );
    }

    if (creditFilter) {
      filteredCustomers = filteredCustomers.filter(customer =>
        customer.isCreditCustomer === (creditFilter === 'true')
      );
    }

    setTotalCustomers(filteredCustomers.length);
    const totalPagesCount = Math.ceil(filteredCustomers.length / itemsPerPage);
    setTotalPages(totalPagesCount);

    if (currentPage > totalPagesCount && totalPagesCount > 0) {
      setCurrentPage(1);
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);
    setCustomers(paginatedCustomers);
  }, [allCustomers, searchTerm, creditFilter, currentPage, itemsPerPage]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadCustomers();
    }, 300);
    return () => clearTimeout(t);
  }, [loadCustomers]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setForm({
      name: customer.name,
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      address: customer.address ?? '',
      gstNumber: customer.gstNumber ?? '',
      creditLimit: Number(customer.creditLimit) || 0,
      currentBalance: Number(customer.currentBalance) || 0,
      isCreditCustomer: customer.isCreditCustomer,
      isActive: customer.isActive
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!businessId) return;
    if (!form.name.trim()) {
      setFormError('Customer name is required');
      return;
    }
    try {
      setSaving(true);
      setFormError('');
      const payload: any = {
        ...form,
        creditLimit: Number(form.creditLimit),
        currentBalance: Number(form.currentBalance)
      };

      if (editingId) {
        await api.updateCustomer(editingId, payload);
        showToast('success', `Customer "${payload.name}" updated successfully`);
      } else {
        await api.createBusinessCustomer(businessId, payload);
        showToast('success', `Customer "${payload.name}" created successfully`);
      }
      setModalOpen(false);
      await loadCustomers();
    } catch (error: any) {
      console.error('Failed to save customer:', error);
      setFormError(error?.response?.data?.error || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await api.deleteCustomer(deleteId);
      showToast('success', 'Customer deleted successfully');
      setDeleteId(null);
      await loadCustomers();
    } catch (error: any) {
      console.error('Failed to delete customer:', error);
      const msg = error?.response?.data?.error || 'Failed to delete customer';
      showToast('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  const handleImport = async () => {
    if (!businessId || !importFile) return;

    try {
      setImporting(true);
      setImportError('');
      setImportSuccess('');

      const formData = new FormData();
      formData.append('file', importFile);

      const response: any = await api.importCustomers(businessId, formData);

      const successMessage = `Successfully imported ${response.imported} out of ${response.total} customers`;
      setImportSuccess(successMessage);
      setImportFile(null);
      setImportModalOpen(false);
      await loadCustomers();

      const fileInput = document.getElementById('import-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error: any) {
      console.error('Failed to import customers:', error);
      const details = error?.response?.data?.details;
      if (details && Array.isArray(details)) {
        setImportError(details.join('\n'));
      } else {
        const errorMsg = error?.response?.data?.error || error?.response?.data?.message || 'Failed to import customers';
        setImportError(errorMsg);
      }
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async (format: 'csv' | 'excel' | 'json') => {
    if (!businessId) return;

    try {
      setExportDropdownOpen(false);

      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (creditFilter) params.isCreditCustomer = creditFilter;

      let blob: Blob;
      let filename: string;

      if (format === 'csv') {
        blob = await api.exportCustomersCSV(businessId, params);
        filename = `customers-${Date.now()}.csv`;
      } else if (format === 'excel') {
        blob = await api.exportCustomersExcel(businessId, params);
        filename = `customers-${Date.now()}.xlsx`;
      } else {
        const response: any = await api.exportCustomersJSON(businessId, params);
        blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
        filename = `customers-${Date.now()}.json`;
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Failed to export customers:', error);
      alert('Failed to export customers. Please try again.');
    }
  };

  const downloadTemplate = async (format: 'csv' | 'excel' | 'json') => {
    try {
      const blob = await api.getCustomerImportTemplate(format);
      const filename = format === 'csv' ? 'customer-import-template.csv' :
                       format === 'excel' ? 'customer-import-template.xlsx' :
                       'customer-import-template.json';

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download template:', error);
      alert('Failed to download template. Please try again.');
    }
  };

  const fmtBalance = (v: number | string) =>
    `₹${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
            <div className={`h-2 w-2 rounded-full ${
              toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
            }`} />
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className={`ml-2 p-1 rounded-lg transition-colors ${
                toast.type === 'success'
                  ? 'hover:bg-emerald-100 text-emerald-600'
                  : 'hover:bg-red-100 text-red-600'
              }`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {!businessId ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-slate-600">Loading business data...</p>
            <p className="text-xs text-slate-500 mt-2">Please wait while we load your business information</p>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="bg-white border-b border-slate-200">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
                  <p className="text-slate-500 text-sm mt-1">Manage your customer database</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={openCreate}
                    className="flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-md"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Customer
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setImportModalOpen(true)}
                      className="flex items-center px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Import
                    </button>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                      className="flex items-center px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </button>

                    {exportDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setExportDropdownOpen(false)}
                        />
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-20">
                          <button
                            onClick={() => handleExport('csv')}
                            className="w-full flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-t-lg"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Export as CSV
                          </button>
                          <button
                            onClick={() => handleExport('excel')}
                            className="w-full flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                            Export as Excel
                          </button>
                          <button
                            onClick={() => handleExport('json')}
                            className="w-full flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-b-lg"
                          >
                            <FileJson className="h-4 w-4 mr-2" />
                            Export as JSON
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search customers by name, phone, email, GST..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      title="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <select
                    value={creditFilter}
                    onChange={(e) => setCreditFilter(e.target.value)}
                    className="pl-10 pr-10 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
                  >
                    <option value="">All Customers</option>
                    <option value="true">Credit Customers</option>
                    <option value="false">Regular Customers</option>
                  </select>
                  {creditFilter && (
                    <button
                      onClick={() => setCreditFilter('')}
                      className="absolute right-8 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      title="Clear filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Active filters indicator */}
              {(searchTerm || creditFilter) && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-slate-500">Active filters:</span>
                  {searchTerm && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
                      Search: "{searchTerm}"
                      <button onClick={() => setSearchTerm('')} className="hover:text-indigo-900">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {creditFilter && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded-lg border border-purple-200">
                      {creditFilter === 'true' ? 'Credit Customers' : 'Regular Customers'}
                      <button onClick={() => setCreditFilter('')} className="hover:text-purple-900">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setCreditFilter('');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-700 underline"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Customers table */}
          <div className="p-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">GST Number</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Credit Limit</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Balance</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                          <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                          Loading...
                        </td>
                      </tr>
                    ) : customersError ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-red-500">
                          {customersError}
                        </td>
                      </tr>
                    ) : customers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                          {searchTerm || creditFilter ? 'No customers match your filters' : 'No customers found. Add your first customer.'}
                        </td>
                      </tr>
                    ) : (
                      customers.filter(Boolean).map((customer) => (
                        <tr key={customer?.id || Math.random()} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
                                <User className="h-5 w-5 text-indigo-600" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-slate-900">{customer?.name || 'Unnamed Customer'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              {customer?.phone && (
                                <div className="flex items-center text-sm text-slate-600">
                                  <Phone className="h-3 w-3 mr-2 text-slate-400" />
                                  {customer.phone}
                                </div>
                              )}
                              {customer?.email && (
                                <div className="flex items-center text-sm text-slate-600">
                                  <Mail className="h-3 w-3 mr-2 text-slate-400" />
                                  {customer.email}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                            {customer?.gstNumber || '—'}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                            {fmtBalance(customer?.creditLimit || 0)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-sm font-semibold ${
                              Number(customer?.currentBalance || 0) > 0 ? 'text-orange-600' : 'text-slate-600'
                            }`}>
                              {fmtBalance(customer?.currentBalance || 0)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {customer?.isCreditCustomer ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-700">
                                <CreditCard className="h-3 w-3 mr-1" />
                                Credit
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600">
                                Regular
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEdit(customer)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeleteId(customer.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 0 && (
                <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">Show</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                    <span className="text-sm text-slate-600">
                      of {totalCustomers} customers
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="First page"
                    >
                      First
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Previous page"
                    >
                      Previous
                    </button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
                            currentPage === pageNum
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Next page"
                    >
                      Next
                    </button>

                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Last page"
                    >
                      Last
                    </button>

                    <div className="flex items-center gap-1 ml-2 border-l border-slate-300 pl-2">
                      <span className="text-sm text-slate-600">Go to:</span>
                      <input
                        type="number"
                        min="1"
                        max={totalPages}
                        value={currentPage}
                        onChange={(e) => {
                          const page = parseInt(e.target.value);
                          if (page >= 1 && page <= totalPages) {
                            setCurrentPage(page);
                          }
                        }}
                        className="w-16 px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                        title="Enter page number"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">
                {editingId ? 'Edit Customer' : 'Add Customer'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Customer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone ?? ''}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email ?? ''}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="customer@example.com"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <textarea
                  value={form.address ?? ''}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Full address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">GST Number</label>
                <input
                  type="text"
                  value={form.gstNumber ?? ''}
                  onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="22AAAAA0000A1Z5"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isCreditCustomer"
                  checked={form.isCreditCustomer}
                  onChange={(e) => setForm({ ...form, isCreditCustomer: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <label htmlFor="isCreditCustomer" className="text-sm text-slate-700">Credit Customer</label>
              </div>

              {form.isCreditCustomer && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Credit Limit (₹)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.creditLimit}
                      onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Current Balance (₹)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.currentBalance}
                      onChange={(e) => setForm({ ...form, currentBalance: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              )}

              <div className="sm:col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <label htmlFor="isActive" className="text-sm text-slate-700">Active</label>
              </div>

              {formError && (
                <div className="sm:col-span-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {formError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {editingId ? 'Save Changes' : 'Create Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-slate-900">Delete Customer</h2>
            <p className="text-sm text-slate-500 mt-2">
              Are you sure you want to delete this customer? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Import Customers</h2>
              <button
                onClick={() => {
                  setImportModalOpen(false);
                  setImportFile(null);
                  setImportError('');
                  setImportSuccess('');
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-4">
              <div className="mb-4">
                <p className="text-sm text-slate-600 mb-2">
                  Import customers from a CSV, Excel, or JSON file. Download the template to see the required format.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadTemplate('csv')}
                    className="flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    CSV Template
                  </button>
                  <button
                    onClick={() => downloadTemplate('excel')}
                    className="flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    <FileSpreadsheet className="h-3 w-3 mr-1" />
                    Excel Template
                  </button>
                  <button
                    onClick={() => downloadTemplate('json')}
                    className="flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    <FileJson className="h-3 w-3 mr-1" />
                    JSON Template
                  </button>
                </div>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                  <label htmlFor="import-file" className="cursor-pointer">
                    <span className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                      Click to upload
                    </span>
                    <span className="text-sm text-slate-500"> or drag and drop</span>
                    <input
                      id="import-file"
                      type="file"
                      accept=".csv,.xlsx,.xls,.json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setImportFile(file);
                          setImportError('');
                          setImportSuccess('');
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-slate-500 mt-1">
                    CSV, Excel, or JSON up to 10MB
                  </p>

                  {importFile && (
                    <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                      <p className="text-sm text-indigo-700 font-medium">
                        Selected: {importFile.name}
                      </p>
                      <p className="text-xs text-indigo-600 mt-1">
                        Size: {(importFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {importError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 font-medium mb-1">Import Errors:</p>
                  <pre className="text-xs text-red-600 whitespace-pre-wrap font-mono">
                    {importError}
                  </pre>
                </div>
              )}

              {importSuccess && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700 font-medium">✓ Import Successful</p>
                  <p className="text-sm text-green-700 mt-1">{importSuccess}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setImportModalOpen(false);
                    setImportFile(null);
                    setImportError('');
                    setImportSuccess('');
                  }}
                  disabled={importing}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importFile || importing}
                  className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-60"
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import Customers
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}