import { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Users, 
  Package, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Sparkles
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { isTrialActive, isTrialExpired, getTrialDaysLeft, getTrialTimeLeft } from '../utils/subscription';
import PurchasePlanModal from '../components/PurchasePlanModal';

function formatDate(value?: string | null): string {
  if (!value) return '';
  try {
    // Format in the viewer's own LOCAL timezone (the browser's), so the
    // displayed "ends" time matches their wall clock and the live countdown
    // (which is computed from the absolute timestamp). This keeps it global /
    // not restricted to a single region. The database stores the value in UTC
    // (the "Z" suffix). Include the timezone short name for clarity.
    return new Date(value).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return '';
  }
}

export default function Dashboard() {
  const { currentBusiness } = useAuthStore();
  const subscription = currentBusiness?.subscription;
  const trialActive = isTrialActive(subscription);
  const trialExpired = isTrialExpired(subscription);
  const trialDaysLeft = getTrialDaysLeft(subscription);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  // Calculate trial time left once (no live timer to avoid re-renders)
  const timeLeft = getTrialTimeLeft(subscription);

  const [stats, setStats] = useState({
    totalSales: 0,
    totalCustomers: 0,
    totalProducts: 0,
    lowStock: 0,
    revenue: 0
  });

  useEffect(() => {
    setStats({
      totalSales: 156,
      totalCustomers: 89,
      totalProducts: 234,
      lowStock: 12,
      revenue: 45230
    });
  }, []);

  const statCards = [
    {
      name: 'Total Revenue',
      value: `$${stats.revenue.toLocaleString()}`,
      change: '+12.5%',
      changeType: 'increase' as const,
      icon: DollarSign,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
    },
    {
      name: 'Total Sales',
      value: stats.totalSales.toString(),
      change: '+8.2%',
      changeType: 'increase' as const,
      icon: ShoppingCart,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      name: 'Total Customers',
      value: stats.totalCustomers.toString(),
      change: '+5.1%',
      changeType: 'increase' as const,
      icon: Users,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      name: 'Low Stock Items',
      value: stats.lowStock.toString(),
      change: '-2.4%',
      changeType: 'decrease' as const,
      icon: Package,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome back! Here's what's happening with your store today.</p>
      </div>

      {/* Trial period banner */}
      {trialActive && (
        <div
          className={`mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl p-4 shadow-sm ${
            trialDaysLeft <= 1
              ? 'bg-gradient-to-r from-red-500 to-rose-600'
              : 'bg-gradient-to-r from-emerald-500 to-teal-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-white/20">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Free Trial — {trialDaysLeft > 0 ? `${trialDaysLeft} ${trialDaysLeft === 1 ? 'day' : 'days'}` : 'less than a day'} remaining
                <span className="ml-2 font-mono tabular-nums bg-black/20 px-2 py-0.5 rounded">
                  {timeLeft.days}d {timeLeft.hours.toString().padStart(2, '0')}:{timeLeft.minutes.toString().padStart(2, '0')}
                </span>
                {subscription?.trialEndsAt && (
                  <span className="font-normal text-white/80">
                    {' '}(ends {formatDate(subscription.trialEndsAt)})
                  </span>
                )}
              </p>
              <p className="text-xs text-white/80 mt-0.5">
                {trialDaysLeft <= 1
                  ? 'Your free trial is about to end. Purchase a plan now to avoid losing access.'
                  : `You are on the ${subscription?.plan || 'Starter'} plan. Enjoy full access during your trial.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs font-medium">
              <Sparkles className="h-4 w-4" />
              {trialDaysLeft <= 1 ? 'Expiring Soon' : 'Trial Active'}
            </span>
            <button
              onClick={() => setShowPurchaseModal(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-xs font-semibold transition-colors ${
                trialDaysLeft <= 1
                  ? 'text-rose-600 hover:bg-rose-50'
                  : 'text-emerald-600 hover:bg-emerald-50'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              Purchase Plan
            </button>
          </div>
        </div>
      )}

      {trialExpired && (
        <div className="mb-8 flex items-center justify-between gap-4 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-white/20">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Your free trial has ended
              </p>
              <p className="text-xs text-amber-50/80 mt-0.5">
                Please purchase a plan to continue using all features of your business.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPurchaseModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-orange-600 text-xs font-semibold hover:bg-orange-50 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Purchase Plan
          </button>
        </div>
      )}

      <PurchasePlanModal
        open={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        reason={trialExpired ? 'trial_expired' : 'limit_reached'}
      />

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600">{stat.name}</p>
                <p className="text-2xl font-bold text-slate-900 mt-2">{stat.value}</p>
                <div className="flex items-center mt-3">
                  {stat.changeType === 'increase' ? (
                    <ArrowUpRight className={`h-4 w-4 ${stat.textColor} mr-1`} />
                  ) : (
                    <ArrowDownRight className={`h-4 w-4 ${stat.textColor} mr-1`} />
                  )}
                  <span className={`text-sm font-medium ${stat.textColor}`}>
                    {stat.change}
                  </span>
                  <span className="text-sm text-slate-500 ml-1">from last month</span>
                </div>
              </div>
              <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
        </div>
        <div className="divide-y divide-slate-200">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-4">
                  <ShoppingCart className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Sale #{1000 + item}</p>
                  <p className="text-xs text-slate-500">2 hours ago</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-slate-900">${(100 + item * 10).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
