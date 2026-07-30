import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Filter,
  MoreVertical,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';

interface Batch {
  id: string;
  batchNumber: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  expiryDate?: string;
  purchaseDate?: string;
  supplierName?: string;
  notes?: string;
  createdAt: string;
}

interface InventoryItem {
  id: string;
  product: string;
  sku: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  status: string;
  batches?: Batch[];
  expanded?: boolean;
}

export default function Inventory() {
  const { currentBusiness } = useAuthStore();
  const businessId = currentBusiness?.id;

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [loadingBatches, setLoadingBatches] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (businessId) {
      loadInventory();
    }
  }, [businessId]);

  const loadInventory = async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      const response = await api.getBusinessProducts(businessId);
      const data = response as any;
      
      if (data && data.success && data.products) {
        // Transform products to inventory format
        const inventoryData: InventoryItem[] = data.products.map((product: any) => {
          const stock = product.stock || 0;
          const minStock = product.minStock || 0;
          let status: string = 'normal';
          
          if (stock === 0) {
            status = 'out';
          } else if (stock <= minStock) {
            status = 'low';
          }
          
          return {
            id: product.id,
            product: product.name,
            sku: product.sku || 'N/A',
            category: product.category || 'N/A',
            currentStock: stock,
            minStock: minStock,
            maxStock: product.maxStock || 0,
            unit: product.unit || 'pcs',
            status: status
          };
        });
        
        setInventory(inventoryData);
      }
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRowExpansion = async (productId: string) => {
    const newExpanded = new Set(expandedRows);
    
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
      setExpandedRows(newExpanded);
    } else {
      // Load batches for this product
      newExpanded.add(productId);
      setExpandedRows(newExpanded);
      
      // Fetch batches if not already loaded
      const item = inventory.find(i => i.id === productId);
      if (item && !item.batches) {
        setLoadingBatches(prev => new Set(prev).add(productId));
        
        try {
          console.log(`Loading batches for product: ${productId}`);
          const response = await api.getProductBatches(businessId!, productId);
          const data = response as any;
          
          console.log('Batch response:', data);
          
          if (data && data.success && data.batches) {
            setInventory(prev => prev.map(i => 
              i.id === productId ? { ...i, batches: data.batches } : i
            ));
          } else {
            // Set empty batches array if no batches found
            setInventory(prev => prev.map(i => 
              i.id === productId ? { ...i, batches: [] } : i
            ));
          }
        } catch (error) {
          console.error('Failed to load batches:', error);
          // Set empty batches array on error
          setInventory(prev => prev.map(i => 
            i.id === productId ? { ...i, batches: [] } : i
          ));
        } finally {
          setLoadingBatches(prev => {
            const newSet = new Set(prev);
            newSet.delete(productId);
            return newSet;
          });
        }
      }
    }
  };

  const filteredInventory = inventory.filter(item =>
    item.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'normal':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-700">Normal</span>;
      case 'low':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-100 text-amber-700">Low Stock</span>;
      case 'out':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-700">Out of Stock</span>;
      default:
        return null;
    }
  };

  const stats = [
    { name: 'Total Products', value: inventory.length, icon: Package, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50' },
    { name: 'Low Stock', value: inventory.filter(i => i.status === 'low').length, icon: AlertTriangle, color: 'from-amber-500 to-amber-600', bgColor: 'bg-amber-50' },
    { name: 'Out of Stock', value: inventory.filter(i => i.status === 'out').length, icon: TrendingDown, color: 'from-red-500 to-red-600', bgColor: 'bg-red-50' },
    { name: 'Normal Stock', value: inventory.filter(i => i.status === 'normal').length, icon: TrendingUp, color: 'from-emerald-500 to-emerald-600', bgColor: 'bg-emerald-50' },
  ];

  return (
    <>
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
              <p className="text-slate-500 text-sm mt-1">Monitor and manage your stock levels</p>
            </div>
            <button 
              onClick={loadInventory}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-md"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button className="flex items-center px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {stats.map((stat) => (
            <div key={stat.name} className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-2">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Inventory table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="w-12"></th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Current Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Min/Max</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">Loading...</td>
                  </tr>
                ) : filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">No inventory found</td>
                  </tr>
                ) : (
                  filteredInventory.map((item) => {
                    const isExpanded = expandedRows.has(item.id);
                    
                    return (
                      <React.Fragment key={item.id}>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="w-12">
                            <button
                              onClick={() => toggleRowExpansion(item.id)}
                              className="p-1 hover:bg-slate-200 rounded transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-slate-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-slate-600" />
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
                                <Package className="h-5 w-5 text-indigo-600" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-slate-900">{item.product}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{item.sku}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{item.category}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900">{item.currentStock} {item.unit}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {item.minStock} / {item.maxStock}
                          </td>
                          <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                <RefreshCw className="h-4 w-4" />
                              </button>
                              <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-50">
                            <td colSpan={8} className="px-6 py-4">
                              <div className="ml-12">
                                <h4 className="text-sm font-semibold text-slate-700 mb-3">Batch Details</h4>
                                {loadingBatches.has(item.id) ? (
                                  <div className="flex items-center justify-center py-8">
                                    <div className="text-sm text-slate-500">Loading batches...</div>
                                  </div>
                                ) : item.batches ? (
                                  item.batches.length > 0 ? (
                                    <table className="w-full max-w-4xl">
                                      <thead className="bg-slate-100 border-b border-slate-200">
                                        <tr>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Batch Number</th>
                                          <th className="px-4 py-2 text-center text-xs font-semibold text-slate-600 uppercase">Qty</th>
                                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Purchase Price</th>
                                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Selling Price</th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Supplier</th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Purchase Date</th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Expiry Date</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-200">
                                        {item.batches.map((batch) => (
                                          <tr key={batch.id} className="hover:bg-white transition-colors">
                                            <td className="px-4 py-3 text-sm font-medium text-slate-900">{batch.batchNumber}</td>
                                            <td className="px-4 py-3 text-sm text-slate-900 text-center font-semibold">{batch.quantity}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600 text-right">₹{batch.purchasePrice != null ? Number(batch.purchasePrice).toFixed(2) : '0.00'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600 text-right">₹{batch.sellingPrice != null ? Number(batch.sellingPrice).toFixed(2) : '0.00'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{batch.supplierName || 'N/A'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">
                                              {batch.purchaseDate ? new Date(batch.purchaseDate).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600">
                                              {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : 'N/A'}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  ) : (
                                    <p className="text-sm text-slate-500 ml-4">No batches available for this product</p>
                                  )
                                ) : (
                                  <p className="text-sm text-slate-500 ml-4">Click to load batches</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
