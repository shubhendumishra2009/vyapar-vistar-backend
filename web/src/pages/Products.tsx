import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  AlertCircle,
  Filter,
  X,
  Save,
  Loader2,
  Download,
  Upload,
  FileSpreadsheet,
  FileJson,
  FileText
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';

interface Product {
  id: string;
  name: string;
  description?: string | null;
  productCode?: string | null;
  sku?: string | null;
  barcode?: string | null;
  category?: string | null;
  brand?: string | null;
  unit: string;
  purchasePrice: number | string;
  sellingPrice: number | string;
  taxRate: number | string;
  stock: number;
  minStock: number;
  maxStock: number;
  isActive: boolean;
  image?: string | null;
  productType?: string | null;
  productAttributes?: Record<string, any> | null;
}

type ProductForm = Omit<Product, 'id'> & {
  purchasePrice: string | number;
  sellingPrice: string | number;
  taxRate: string | number;
  stock: string | number;
  minStock: string | number;
  maxStock: string | number;
  productAttributes: Record<string, any>;
};

interface FieldSchemaField {
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  required: boolean;
  options?: { label: string; value: string }[] | null;
  placeholder?: string | null;
  defaultValue?: string | null;
}

const UNITS = ['pieces', 'kg', 'liters', 'meters', 'boxes', 'bottles'];

const emptyForm: ProductForm = {
  name: '',
  description: '',
  productCode: '',
  sku: '',
  barcode: '',
  category: '',
  brand: '',
  unit: 'pieces',
  purchasePrice: 0,
  sellingPrice: 0,
  taxRate: 0,
  stock: 0,
  minStock: 0,
  maxStock: 100,
  isActive: true,
  image: '',
  productType: null,
  productAttributes: {}
};

export default function Products() {
  const { currentBusiness } = useAuthStore();
  const businessId = currentBusiness?.id;
  const businessType = currentBusiness?.type || 'retail';

  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [productsError, setProductsError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [fieldSchema, setFieldSchema] = useState<FieldSchemaField[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(false);

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
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const loadFieldSchema = useCallback(async () => {
    if (!businessId) return;
    try {
      setSchemaLoading(true);
      const response: any = await api.getBusinessFieldSchema(businessId);
      if (response.success) {
        setFieldSchema(response.fields || []);
        const defaults: Record<string, any> = {};
        for (const field of response.fields || []) {
          if (field.defaultValue) {
            if (field.fieldType === 'boolean') {
              defaults[field.fieldName] = field.defaultValue === 'true';
            } else if (field.fieldType === 'number') {
              defaults[field.fieldName] = Number(field.defaultValue);
            } else {
              defaults[field.fieldName] = field.defaultValue;
            }
          }
        }
        // When editing, don't overwrite existing productAttributes - only set defaults
        // for fields that don't already have a value
        setForm(prev => {
          // If we already have productAttributes (e.g., when editing), merge defaults
          // without overwriting existing values
          if (prev.productAttributes && Object.keys(prev.productAttributes).length > 0) {
            const merged = { ...defaults, ...prev.productAttributes };
            return { ...prev, productAttributes: merged };
          }
          // For new products, just use the defaults
          return { ...prev, productAttributes: defaults };
        });
      }
    } catch (error) {
      console.error('Failed to load field schema:', error);
    } finally {
      setSchemaLoading(false);
    }
  }, [businessId]);

  const loadProducts = useCallback(async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      setProductsError(null);
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (categoryFilter) params.category = categoryFilter;
      const response: any = await api.getBusinessProducts(businessId, params);
      console.log('Products API response:', response);
      if (response.success) {
        const allProducts = Array.isArray(response.products) ? response.products : [];
        
        // Store all products
        setAllProducts(allProducts);
        setTotalProducts(allProducts.length);
        
        // Calculate total pages
        const totalPagesCount = Math.ceil(allProducts.length / itemsPerPage);
        setTotalPages(totalPagesCount);
        
        // If current page is beyond total pages, reset to page 1
        if (currentPage > totalPagesCount && totalPagesCount > 0) {
          setCurrentPage(1);
        }
      } else {
        setAllProducts([]);
        setTotalProducts(0);
        setTotalPages(0);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      setProductsError('Failed to load products');
      setAllProducts([]);
      setTotalProducts(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [businessId, searchTerm, categoryFilter, itemsPerPage, currentPage]);

  const loadCategories = useCallback(async () => {
    if (!businessId) return;
    try {
      const response: any = await api.getBusinessProductCategories(businessId);
      if (response.success) {
        setCategories(response.categories || []);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, [businessId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Frontend-only search and pagination
  useEffect(() => {
    let filteredProducts = allProducts;

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filteredProducts = allProducts.filter(product => 
        product.name?.toLowerCase().includes(searchLower) ||
        product.productCode?.toLowerCase().includes(searchLower) ||
        product.sku?.toLowerCase().includes(searchLower) ||
        product.barcode?.toLowerCase().includes(searchLower)
      );
    }

    if (categoryFilter) {
      filteredProducts = filteredProducts.filter(product => 
        product.category === categoryFilter
      );
    }

    setTotalProducts(filteredProducts.length);
    const totalPagesCount = Math.ceil(filteredProducts.length / itemsPerPage);
    setTotalPages(totalPagesCount);

    if (currentPage > totalPagesCount && totalPagesCount > 0) {
      setCurrentPage(1);
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
    setProducts(paginatedProducts);
  }, [allProducts, searchTerm, categoryFilter, currentPage, itemsPerPage]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadProducts();
    }, 300);
    return () => clearTimeout(t);
  }, [loadProducts]);

  // Generate business prefix for product codes (e.g., "A2Wares" → "A2WARES")
  const getBusinessPrefix = useCallback(() => {
    if (!currentBusiness?.name) return 'PROD';
    return currentBusiness.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  }, [currentBusiness]);

  // Find the next available product code number (stored in productCode field)
  const getNextProductCode = useCallback(() => {
    const prefix = getBusinessPrefix();
    const existingCodes = allProducts
      .map(p => p.productCode)
      .filter(code => code?.startsWith(prefix + '-'))
      .map(code => {
        const num = code?.split('-').pop();
        return num ? parseInt(num, 10) : 0;
      })
      .filter(n => !isNaN(n));
    
    const maxNum = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;
    return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
  }, [allProducts, getBusinessPrefix]);

  // Generate SKU prefix from category (e.g., "Grains & Rice" → "GR")
  const getCategoryPrefix = useCallback((category: string) => {
    if (!category.trim()) return 'GEN';
    const words = category.replace(/[^a-zA-Z\s]/g, '').split(' ').filter(w => w.length > 0);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return words[0].substring(0, 2).toUpperCase();
  }, []);

  // Find the next available SKU number for a category prefix (stored in sku field)
  const getNextSku = useCallback((category: string) => {
    const prefix = getCategoryPrefix(category);
    const existingSkus = allProducts
      .map(p => p.sku)
      .filter(sku => sku?.startsWith(prefix + '-'))
      .map(sku => {
        const num = sku?.split('-').pop();
        return num ? parseInt(num, 10) : 0;
      })
      .filter(n => !isNaN(n));
    
    const maxNum = existingSkus.length > 0 ? Math.max(...existingSkus) : 0;
    return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
  }, [allProducts, getCategoryPrefix]);

  // Update SKU when category changes
  const handleCategoryChange = useCallback((category: string) => {
    const newSku = getNextSku(category);
    setForm((prev: ProductForm) => ({ ...prev, category, sku: newSku }));
  }, [getNextSku]);

  const [duplicateWarning, setDuplicateWarning] = useState('');

  // Smart duplicate detection
  const checkDuplicate = useCallback((name: string) => {
    if (!name.trim() || !allProducts.length) {
      setDuplicateWarning('');
      return;
    }

    const normalizedInput = name.toLowerCase().trim().replace(/\s+/g, ' ');
    const inputWords = normalizedInput.split(' ').filter(w => w.length > 0);
    const inputNumeric: string[] = normalizedInput.match(/\d+[a-z]*/g) || [];
    
    for (const existing of allProducts) {
      const existingName = existing.name?.toLowerCase().trim().replace(/\s+/g, ' ') || '';
      if (existing.id === editingId) continue;
      
      const existingWords = existingName.split(' ').filter(w => w.length > 0);
      const existingNumeric: string[] = existingName.match(/\d+[a-z]*/g) || [];

      if (existingName === normalizedInput) continue;

      let matchCount = 0;
      for (const word of inputWords) {
        if (existingWords.some(w => {
          if (w === word) return true;
          if (word.length > 3 && (w.includes(word) || word.includes(w))) return true;
          if (Math.abs(w.length - word.length) <= 1) {
            let diffs = 0;
            for (let i = 0; i < Math.max(w.length, word.length); i++) {
              if (w[i] !== word[i]) diffs++;
            }
            if (diffs <= 1) return true;
          }
          return false;
        })) {
          matchCount++;
        }
      }

      const totalUniqueWords = new Set([...inputWords, ...existingWords]).size;
      const similarity = totalUniqueWords > 0 ? matchCount / totalUniqueWords : 0;
      
      const numericMatch = inputNumeric.some(n => existingNumeric.includes(n));

      if ((similarity >= 0.5 && numericMatch) || similarity >= 0.7) {
        setDuplicateWarning(`⚠️ Similar product exists: "${existing.name}" (Code: ${existing.productCode || existing.sku || 'N/A'})`);
        return;
      }
    }
    
    setDuplicateWarning('');
  }, [allProducts, editingId]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, productCode: getNextProductCode() });
    setFormError('');
    setDuplicateWarning('');
    setModalOpen(true);
    loadFieldSchema();
  };

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description ?? '',
      productCode: product.productCode ?? '',
      sku: product.sku ?? '',
      barcode: product.barcode ?? '',
      category: product.category ?? '',
      brand: product.brand ?? '',
      unit: product.unit,
      purchasePrice: Number(product.purchasePrice) || 0,
      sellingPrice: Number(product.sellingPrice) || 0,
      taxRate: Number(product.taxRate) || 0,
      stock: Number(product.stock) || 0,
      minStock: Number(product.minStock) || 0,
      maxStock: Number(product.maxStock) || 0,
      isActive: product.isActive,
      image: product.image ?? '',
      productType: product.productType ?? null,
      productAttributes: product.productAttributes ?? {}
    });
    setFormError('');
    setDuplicateWarning('');
    setModalOpen(true);
    loadFieldSchema();
  };

  const handleAttributeChange = (fieldName: string, value: any) => {
    setForm(prev => ({
      ...prev,
      productAttributes: {
        ...prev.productAttributes,
        [fieldName]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!businessId) return;
    if (!form.name.trim()) {
      setFormError('Product name is required');
      return;
    }
    if (Number(form.sellingPrice) < 0 || Number(form.purchasePrice) < 0) {
      setFormError('Prices cannot be negative');
      return;
    }
    try {
      setSaving(true);
      setFormError('');
      const payload: any = {
        ...form,
        purchasePrice: Number(form.purchasePrice),
        sellingPrice: Number(form.sellingPrice),
        taxRate: Number(form.taxRate),
        stock: Number(form.stock),
        minStock: Number(form.minStock),
        maxStock: Number(form.maxStock)
      };

      if (payload.productAttributes) {
        const cleaned: Record<string, any> = {};
        for (const [key, value] of Object.entries(payload.productAttributes)) {
          if (value !== '' && value !== null && value !== undefined) {
            cleaned[key] = value;
          }
        }
        payload.productAttributes = Object.keys(cleaned).length > 0 ? cleaned : null;
      }

      if (editingId) {
        await api.updateProduct(editingId, payload);
        showToast('success', `Product "${payload.name}" updated successfully`);
      } else {
        await api.createBusinessProduct(businessId, payload);
        showToast('success', `Product "${payload.name}" created successfully`);
      }
      setModalOpen(false);
      await loadProducts();
      await loadCategories();
    } catch (error: any) {
      console.error('Failed to save product:', error);
      const details = error?.response?.data?.details;
      if (details && Array.isArray(details)) {
        setFormError(details.join(', '));
      } else {
        setFormError(error?.response?.data?.error || 'Failed to save product');
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await api.deleteProduct(deleteId);
      showToast('success', 'Product deleted successfully');
      setDeleteId(null);
      await loadProducts();
    } catch (error: any) {
      console.error('Failed to delete product:', error);
      const msg = error?.response?.data?.error || 'Failed to delete product';
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
      
      const response: any = await api.importProducts(businessId, formData);
      
      const successMessage = `Successfully imported ${response.imported} out of ${response.total} products`;
      setImportSuccess(successMessage);
      setImportFile(null);
      setImportModalOpen(false);
      await loadProducts();
      await loadCategories();
      
      const fileInput = document.getElementById('import-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error: any) {
      console.error('Failed to import products:', error);
      const details = error?.response?.data?.details;
      if (details && Array.isArray(details)) {
        setImportError(details.join('\n'));
      } else {
        const errorMsg = error?.response?.data?.error || error?.response?.data?.message || 'Failed to import products';
        if (error?.response?.data?.validCount !== undefined && error?.response?.data?.totalCount !== undefined) {
          setImportError(`${errorMsg}\n\nValid: ${error?.response.data.validCount}/${error?.response.data.totalCount} products`);
        } else {
          setImportError(errorMsg);
        }
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
      if (categoryFilter) params.category = categoryFilter;
      
      let blob: Blob;
      let filename: string;
      
      if (format === 'csv') {
        blob = await api.exportProductsCSV(businessId, params);
        filename = `products-${Date.now()}.csv`;
      } else if (format === 'excel') {
        blob = await api.exportProductsExcel(businessId, params);
        filename = `products-${Date.now()}.xlsx`;
      } else {
        const response: any = await api.exportProductsJSON(businessId, params);
        blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
        filename = `products-${Date.now()}.json`;
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
      console.error('Failed to export products:', error);
      alert('Failed to export products. Please try again.');
    }
  };

  const downloadTemplate = async (format: 'csv' | 'excel' | 'json') => {
    try {
      const blob = await api.getImportTemplate(format);
      const filename = format === 'csv' ? 'product-import-template.csv' :
                       format === 'excel' ? 'product-import-template.xlsx' :
                       'product-import-template.json';
      
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

  // Toast notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fmt = (v: number | string) =>
    `₹${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const renderAttributeField = (field: FieldSchemaField) => {
    const value = form.productAttributes?.[field.fieldName];
    const baseClass = "w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";

    switch (field.fieldType) {
      case 'boolean':
        return (
          <div key={field.fieldName} className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`attr-${field.fieldName}`}
              checked={!!value}
              onChange={(e) => handleAttributeChange(field.fieldName, e.target.checked)}
              className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"
            />
            <label htmlFor={`attr-${field.fieldName}`} className="text-sm text-slate-700">
              {field.fieldLabel}
            </label>
          </div>
        );

      case 'select':
        return (
          <div key={field.fieldName}>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {field.fieldLabel}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              value={value ?? ''}
              onChange={(e) => handleAttributeChange(field.fieldName, e.target.value)}
              className={baseClass}
            >
              <option value="">{field.placeholder || `Select ${field.fieldLabel}`}</option>
              {(field.options || []).map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        );

      case 'date':
        return (
          <div key={field.fieldName}>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {field.fieldLabel}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="date"
              value={value ?? ''}
              onChange={(e) => handleAttributeChange(field.fieldName, e.target.value)}
              className={baseClass}
            />
          </div>
        );

      case 'number':
        return (
          <div key={field.fieldName}>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {field.fieldLabel}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="number"
              min={0}
              step="any"
              value={value ?? ''}
              onChange={(e) => handleAttributeChange(field.fieldName, e.target.value)}
              className={baseClass}
              placeholder={field.placeholder || ''}
            />
          </div>
        );

      case 'textarea':
        return (
          <div key={field.fieldName} className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {field.fieldLabel}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              value={value ?? ''}
              onChange={(e) => handleAttributeChange(field.fieldName, e.target.value)}
              rows={3}
              className={baseClass}
              placeholder={field.placeholder || ''}
            />
          </div>
        );

      default: // text
        return (
          <div key={field.fieldName}>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {field.fieldLabel}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={value ?? ''}
              onChange={(e) => handleAttributeChange(field.fieldName, e.target.value)}
              className={baseClass}
              placeholder={field.placeholder || ''}
            />
          </div>
        );
    }
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
                  <h1 className="text-2xl font-bold text-slate-900">Products</h1>
                  <p className="text-slate-500 text-sm mt-1">Manage your product inventory</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={openCreate}
                    className="flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-md"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
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
                    placeholder="Search products by name, product code, SKU or barcode..."
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
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="pl-10 pr-10 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
                  >
                    <option value="">All Categories</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {categoryFilter && (
                    <button
                      onClick={() => setCategoryFilter('')}
                      className="absolute right-8 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      title="Clear category filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Active filters indicator */}
              {(searchTerm || categoryFilter) && (
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
                  {categoryFilter && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded-lg border border-purple-200">
                      Category: {categoryFilter}
                      <button onClick={() => setCategoryFilter('')} className="hover:text-purple-900">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setCategoryFilter('');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-700 underline"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Products table */}
          <div className="p-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Product Code</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">SKU</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Barcode</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                          <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                          Loading...
                        </td>
                      </tr>
                    ) : productsError ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center text-red-500">
                          {productsError}
                        </td>
                      </tr>
                    ) : products.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                          {searchTerm || categoryFilter ? 'No products match your filters' : 'No products found. Add your first product.'}
                        </td>
                      </tr>
                    ) : (
                      products.filter(Boolean).map((product) => (
                        <tr key={product?.id || Math.random()} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
                                <Package className="h-5 w-5 text-indigo-600" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-slate-900">{product?.name || 'Unnamed Product'}</div>
                                {product?.brand && (
                                  <div className="text-xs text-slate-500">{product.brand}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 font-mono">{product?.productCode || '—'}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 font-mono">{product?.sku || '—'}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 font-mono">{product?.barcode || '—'}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900">{fmt(product?.sellingPrice || 0)}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                              (product?.stock || 0) === 0 ? 'bg-red-100 text-red-700' :
                              (product?.stock || 0) <= (product?.minStock || 10) ? 'bg-orange-100 text-orange-700' :
                              'bg-emerald-100 text-emerald-700'
                            }`}>
                              {(product?.stock || 0) === 0 && <AlertCircle className="h-3 w-3 mr-1" />}
                              {product?.stock || 0} {product?.unit || 'pcs'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{product?.category || '—'}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                              !product?.isActive ? 'bg-slate-100 text-slate-600' :
                              (product?.stock || 0) === 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {!product?.isActive ? 'Inactive' : (product?.stock || 0) === 0 ? 'Out of Stock' : 'Active'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEdit(product)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeleteId(product.id)}
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
                      of {totalProducts} products
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
                {editingId ? 'Edit Product' : 'Add Product'}
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
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm({ ...form, name: val });
                    checkDuplicate(val);
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Product name"
                />
                {duplicateWarning && (
                  <div className="mt-2 flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <span className="text-sm text-amber-800">{duplicateWarning}</span>
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={form.description ?? ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Product Code
                  <span className="ml-2 text-xs text-indigo-600 font-normal">(Auto-generated)</span>
                </label>
                <input
                  type="text"
                  value={form.productCode ?? ''}
                  onChange={(e) => setForm({ ...form, productCode: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Auto-generated product code"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  SKU
                  <span className="ml-2 text-xs text-indigo-600 font-normal">(Auto-generated from category)</span>
                </label>
                <input
                  type="text"
                  value={form.sku ?? ''}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Auto-generated SKU"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Barcode</label>
                <input
                  type="text"
                  value={form.barcode ?? ''}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <input
                  type="text"
                  list="product-categories"
                  value={form.category ?? ''}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Electronics"
                />
                <datalist id="product-categories">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
                <input
                  type="text"
                  value={form.brand ?? ''}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                <select
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Price (₹)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.purchasePrice}
                  onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Selling Price (₹) *</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.sellingPrice}
                  onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tax Rate (%)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.taxRate}
                  onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Stock</label>
                <input
                  type="number"
                  min={0}
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Min Stock</label>
                <input
                  type="number"
                  min={0}
                  value={form.minStock}
                  onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Max Stock</label>
                <input
                  type="number"
                  min={0}
                  value={form.maxStock}
                  onChange={(e) => setForm({ ...form, maxStock: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

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

              {fieldSchema.length > 0 && (
                <>
                  <div className="sm:col-span-2 border-t border-slate-200 pt-4 mt-2">
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                      {businessType === 'wholesale' ? 'Wholesale Details' :
                       businessType === 'medicine' ? 'Medicine Details' :
                       businessType === 'grocery' ? 'Grocery Details' :
                       businessType === 'electronics' ? 'Electronics Details' :
                       businessType === 'clothing' ? 'Clothing Details' :
                       businessType === 'hardware' ? 'Hardware Details' :
                       businessType === 'restaurant' ? 'Restaurant Details' :
                       'Additional Details'}
                    </h3>
                  </div>
                  {schemaLoading ? (
                    <div className="sm:col-span-2 flex items-center justify-center py-4 text-slate-400">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading fields...
                    </div>
                  ) : (
                    fieldSchema.map(field => renderAttributeField(field))
                  )}
                </>
              )}

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
                {editingId ? 'Save Changes' : 'Create Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-slate-900">Delete Product</h2>
            <p className="text-sm text-slate-500 mt-2">
              Are you sure you want to delete this product? This action cannot be undone.
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

      {/* Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Import Products</h2>
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
                  Import products from a CSV, Excel, or JSON file. Download the template to see the required format.
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
                      Import Products
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