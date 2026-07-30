import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { isTrialActive, isTrialExpired, isSubscriptionLocked } from '../utils/subscription';
import PurchasePlanModal from './PurchasePlanModal';
import SubscriptionLockout from './SubscriptionLockout';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Truck,
  TrendingUp,
  LogOut,
  Menu,
  X,
  Building2,
  Bell,
  Search,
  Warehouse,
  Settings,
  ChevronDown,
  Plus,
  Lock,
  Download
} from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, currentBusiness, setCurrentBusiness } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseReason, setPurchaseReason] = useState<'trial_expired' | 'limit_reached'>('trial_expired');

  const selectedBusinessIdRef = useRef<string | null>(null);
  selectedBusinessIdRef.current = currentBusiness?.id ?? null;

  // Always use fresh data from API, not cached data
  const canAddBusiness = businesses.length === 0 || businesses.some((b) => !isTrialActive(b.subscription) && !isTrialExpired(b.subscription));
  const trialExpired = businesses.some((b) => isTrialExpired(b.subscription));
  const locked = businesses.length > 0 && businesses.some((b) => isSubscriptionLocked(b.subscription));
  const lockReason: 'trial_expired' | 'subscription_expired' = businesses.some((b) => {
    const sub = b.subscription;
    return sub?.status === 'trial' || (sub?.status === 'expired' && !sub?.expiresAt);
  })
    ? 'trial_expired'
    : 'subscription_expired';

  const handleAddBusinessClick = () => {
    setShowBusinessDropdown(false);
    if (trialExpired) {
      setPurchaseReason('trial_expired');
      setShowPurchaseModal(true);
      return;
    }
    if (!canAddBusiness) {
      setPurchaseReason('limit_reached');
      setShowPurchaseModal(true);
      return;
    }
    navigate('/create-business');
  };

  const loadBusinesses = useCallback(async () => {
    try {
      const response: any = await api.getBusinesses();
      if (response.success && response.data.length > 0) {
        setBusinesses(response.data);
        const selectedId = selectedBusinessIdRef.current;
        const updated =
          (selectedId && response.data.find((b: any) => b.id === selectedId)) ||
          response.data[0];
        setCurrentBusiness(updated);
      }
    } catch (error) {
      console.error('Failed to load businesses:', error);
    }
  }, [setCurrentBusiness, selectedBusinessIdRef]);

  // Load businesses only once on mount - no intervals or event listeners
  // Add a small delay to ensure we get fresh data from the API
  useEffect(() => {
    const timer = setTimeout(() => {
      loadBusinesses();
    }, 100);
    return () => clearTimeout(timer);
  }, [loadBusinesses]);

  // Ensure currentBusiness is always set
  useEffect(() => {
    if (!currentBusiness && businesses.length > 0) {
      setCurrentBusiness(businesses[0]);
    }
  }, [currentBusiness, businesses, setCurrentBusiness]);

  const handleBusinessChange = (business: any) => {
    setCurrentBusiness(business);
    setShowBusinessDropdown(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Suppliers', href: '/suppliers', icon: Building2 },
    { name: 'Sales', href: '/sales', icon: ShoppingCart },
    { name: 'Purchases', href: '/purchases', icon: Truck },
    { name: 'Inventory', href: '/inventory', icon: Warehouse },
    { name: 'Reports', href: '/reports', icon: TrendingUp },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  if (locked) {
    return (
      <SubscriptionLockout
        reason={lockReason}
        onPurchase={() => {
          loadBusinesses();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-deep-950 flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-deep-900/95 backdrop-blur-xl shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex-shrink-0 border-r border-white/5 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 gradient-primary rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div className="absolute -inset-0.5 gradient-primary rounded-lg opacity-20 blur-sm"></div>
              </div>
              <div>
                <span className="text-base font-bold text-white tracking-tight">VyaparVistar</span>
                <span className="block text-[9px] uppercase tracking-[0.15em] text-emerald-400/60 font-medium">Dashboard</span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-500 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isCurrent = location.pathname === item.href;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.href);
                    setSidebarOpen(false);
                  }}
                  className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group ${
                    isCurrent
                      ? 'gradient-primary text-white shadow-lg shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon className={`h-5 w-5 mr-3 transition-colors ${
                    isCurrent ? 'text-white' : 'text-slate-500 group-hover:text-white'
                  }`} />
                  {item.name}
                </a>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/5 space-y-3">
            <div className="flex items-center px-2">
              <div className="w-10 h-10 gradient-primary rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="ml-3">
                <p className="text-sm font-semibold text-white">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-500">{user?.type || 'Administrator'}</p>
              </div>
            </div>
            
            <div className="px-2">
              <p className="text-xs font-medium text-slate-400 mb-2">Download our desktop app for more flexibility</p>
              <a
                href="https://github.com/shubhendumishra2009/vyapar-vistar-backend/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20"
              >
                <Download className="h-4 w-4 mr-2" />
                Desktop App
              </a>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-red-400 rounded-xl hover:bg-red-500/10 transition-all duration-200 group"
            >
              <LogOut className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-screen">
        <div className="bg-deep-900/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 w-64 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              {currentBusiness && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10">
                  <Building2 className="h-4 w-4 text-emerald-400" />
                  <span className="hidden sm:block text-sm font-medium text-white max-w-[150px] truncate">
                    {currentBusiness.name}
                  </span>
                </div>
              )}

              <button className="relative p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-deep-900"></span>
              </button>
              <div className="h-6 w-px bg-white/5"></div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/5 transition-all cursor-pointer">
                <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-emerald-500/20">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-white leading-tight">{user?.name || 'User'}</p>
                  <p className="text-xs text-slate-500">{user?.type || 'Admin'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </div>

      <PurchasePlanModal
        open={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        reason={purchaseReason}
      />
    </div>
  );
}