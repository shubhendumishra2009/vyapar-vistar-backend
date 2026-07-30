import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { 
  User, 
  Building, 
  Bell, 
  Shield, 
  CreditCard,
  Printer,
  Save,
  LogOut,
  ChevronRight,
  Plus,
  Trash2,
  Edit3
} from 'lucide-react';
import { api } from '../services/api';

export default function Settings() {
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<any[]>([]);
  
  // Print Settings state
  const [systems, setSystems] = useState<any[]>([]);
  const [printSettings, setPrintSettings] = useState<any[]>([]);
  const [selectedSystemId, setSelectedSystemId] = useState<string>('');
  const [newSystemName, setNewSystemName] = useState('');
  const [showAddSystem, setShowAddSystem] = useState(false);

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'shop', name: 'Shop Settings', icon: Building },
    { id: 'print', name: 'Print Settings', icon: Printer },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'billing', name: 'Billing', icon: CreditCard },
  ];

  const reportTypes = [
    { id: 'sale_invoice', label: 'Sale Invoice' },
    { id: 'sale_receipt', label: 'Sale Receipt' },
    { id: 'purchase_order', label: 'Purchase Order' },
    { id: 'purchase_receipt', label: 'Purchase Receipt' },
    { id: 'customer_statement', label: 'Customer Statement' },
    { id: 'inventory_report', label: 'Inventory Report' },
  ];

  const paperSizes = ['58mm', '80mm', 'A4', 'A5'];
  const actions = [
    { id: 'show_print', label: 'Show & Print' },
    { id: 'show_only', label: 'Show Only' },
    { id: 'print_only', label: 'Print Only' },
    { id: 'none', label: 'None' },
  ];

  // Load businesses on mount
  useEffect(() => {
    loadBusinesses();
  }, []);

  // Load print settings when business changes
  useEffect(() => {
    if (selectedBusinessId) {
      loadSystems();
      loadPrintSettings();
    }
  }, [selectedBusinessId, selectedSystemId]);

  const loadBusinesses = async () => {
    try {
      const res = await api.getBusinesses() as any;
      if (res.success && res.data?.length > 0) {
        setBusinesses(res.data);
        setSelectedBusinessId(res.data[0].id);
      }
    } catch (error) {
      console.error('Error loading businesses:', error);
    }
  };

  const loadSystems = async () => {
    if (!selectedBusinessId) return;
    try {
      const res = await api.getSystems(selectedBusinessId) as any;
      if (res.success) {
        setSystems(res.data || []);
      }
    } catch (error) {
      console.error('Error loading systems:', error);
    }
  };

  const loadPrintSettings = async () => {
    if (!selectedBusinessId) return;
    try {
      const res = await api.getPrintSettings(selectedBusinessId, selectedSystemId || undefined) as any;
      if (res.success) {
        setPrintSettings(res.data || []);
      }
    } catch (error) {
      console.error('Error loading print settings:', error);
    }
  };

  const addSystem = async () => {
    if (!selectedBusinessId || !newSystemName.trim()) return;
    try {
      const res = await api.createSystem({ businessId: selectedBusinessId, systemName: newSystemName.trim() }) as any;
      if (res.success) {
        setSystems([...systems, res.data]);
        setNewSystemName('');
        setShowAddSystem(false);
      }
    } catch (error) {
      console.error('Error adding system:', error);
    }
  };

  const deleteSystem = async (id: string) => {
    try {
      await api.deleteSystem(id);
      setSystems(systems.filter(s => s.id !== id));
      if (selectedSystemId === id) setSelectedSystemId('');
    } catch (error) {
      console.error('Error deleting system:', error);
    }
  };

  const getSettingValue = (reportType: string, field: string) => {
    const setting = printSettings.find(s => s.reportType === reportType);
    return setting ? setting[field] : undefined;
  };

  const updateSetting = (reportType: string, field: string, value: any) => {
    setPrintSettings(prev => {
      const existing = prev.find(s => s.reportType === reportType);
      if (existing) {
        return prev.map(s => s.reportType === reportType ? { ...s, [field]: value } : s);
      } else {
        return [...prev, { 
          id: null, reportType, 
          systemId: selectedSystemId || null,
          printerName: '', paperSize: 'A4', action: 'show_only', copies: 1, autoPrint: false,
          [field]: value 
        }];
      }
    });
  };

  const savePrintSettings = async () => {
    if (!selectedBusinessId) return;
    setSaving(true);
    try {
      const settingsToSave = printSettings.map(s => ({
        systemId: selectedSystemId || null,
        reportType: s.reportType,
        printerName: s.printerName || '',
        paperSize: s.paperSize || 'A4',
        action: s.action || 'show_only',
        copies: s.copies || 1,
        autoPrint: s.autoPrint || false
      }));
      const res = await api.savePrintSettings(selectedBusinessId, settingsToSave) as any;
      if (res.success) {
        alert('Print settings saved successfully!');
      }
    } catch (error) {
      console.error('Error saving print settings:', error);
      alert('Failed to save print settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
    }, 1000);
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <>
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            <p className="text-slate-500 text-sm mt-1">Manage your account and application preferences</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 bg-white rounded-xl shadow-sm border border-slate-200 p-4 h-fit">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <tab.icon className={`h-5 w-5 mr-3 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                  {tab.name}
                  <ChevronRight className={`h-4 w-4 ml-auto ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                </button>
              ))}
            </nav>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-3" />
                Logout
              </button>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-6">Profile Settings</h2>
                <div className="space-y-6">
                  <div className="flex items-center mb-8">
                    <div className="h-20 w-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="ml-6">
                      <h3 className="text-lg font-medium text-slate-900">{user?.name || 'User'}</h3>
                      <p className="text-sm text-slate-500">{user?.email || 'user@example.com'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        defaultValue={user?.name || ''}
                        className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                      <input
                        type="email"
                        defaultValue={user?.email || ''}
                        className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                      <input
                        type="text"
                        defaultValue={user?.type || 'Admin'}
                        disabled
                        className="w-full px-4 py-2.5 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'shop' && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-6">Shop Settings</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Shop Name</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                    <textarea
                      rows={3}
                      className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">GST Number</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'print' && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-6">Print Settings</h2>
                <p className="text-sm text-slate-500 mb-6">Configure printer and report preferences for each system.</p>

                {/* Business Selector */}
                {businesses.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Business</label>
                    <select
                      value={selectedBusinessId || ''}
                      onChange={(e) => setSelectedBusinessId(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {businesses.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Systems Section */}
                <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900">Systems / Computers</h3>
                    <button
                      onClick={() => setShowAddSystem(!showAddSystem)}
                      className="flex items-center text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add System
                    </button>
                  </div>

                  {showAddSystem && (
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={newSystemName}
                        onChange={(e) => setNewSystemName(e.target.value)}
                        placeholder="e.g., Counter-1, Back-Office"
                        className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        onClick={addSystem}
                        className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        Add
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedSystemId('')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                        selectedSystemId === '' 
                          ? 'bg-indigo-600 text-white border-indigo-600' 
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      Default
                    </button>
                    {systems.map((system) => (
                      <div key={system.id} className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedSystemId(system.id)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                            selectedSystemId === system.id 
                              ? 'bg-indigo-600 text-white border-indigo-600' 
                              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {system.systemName}
                        </button>
                        <button
                          onClick={() => deleteSystem(system.id)}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Print Settings Table */}
                <div className="space-y-4">
                  {reportTypes.map((report) => (
                    <div key={report.id} className="p-4 border border-slate-200 rounded-lg hover:border-indigo-200 transition-colors">
                      <h4 className="text-sm font-semibold text-slate-900 mb-3">{report.label}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Paper Size</label>
                          <select
                            value={getSettingValue(report.id, 'paperSize') || 'A4'}
                            onChange={(e) => updateSetting(report.id, 'paperSize', e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {paperSizes.map(size => (
                              <option key={size} value={size}>{size}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Action</label>
                          <select
                            value={getSettingValue(report.id, 'action') || 'show_only'}
                            onChange={(e) => updateSetting(report.id, 'action', e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {actions.map(action => (
                              <option key={action.id} value={action.id}>{action.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Copies</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={getSettingValue(report.id, 'copies') || 1}
                            onChange={(e) => updateSetting(report.id, 'copies', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="flex items-end pb-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={getSettingValue(report.id, 'autoPrint') || false}
                              onChange={(e) => updateSetting(report.id, 'autoPrint', e.target.checked)}
                              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                            />
                            <span className="text-xs font-medium text-slate-600">Auto Print</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-6 mt-6 border-t border-slate-200">
                  <button
                    onClick={savePrintSettings}
                    disabled={saving}
                    className="flex items-center px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Print Settings'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-6">Notification Settings</h2>
                <div className="space-y-4">
                  {[
                    'Low stock alerts',
                    'New customer notifications',
                    'Sales notifications',
                    'Payment reminders',
                    'System updates',
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-3 border-b border-slate-200 last:border-0">
                      <span className="text-sm font-medium text-slate-900">{item}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked={index < 3} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-6">Security Settings</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Current Password</label>
                    <input
                      type="password"
                      className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
                    <input
                      type="password"
                      className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-6">Billing Information</h2>
                <div className="text-center py-12">
                  <CreditCard className="h-16 w-16 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-500">Billing information will be available soon.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}