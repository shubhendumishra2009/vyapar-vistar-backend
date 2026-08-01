import { Lock, Sparkles, Building2 } from 'lucide-react';
import PurchasePlanModal from './PurchasePlanModal';

interface SubscriptionLockoutProps {
  reason?: 'trial_expired' | 'subscription_expired';
  onPurchase: () => void;
}

export default function SubscriptionLockout({ reason = 'trial_expired', onPurchase }: SubscriptionLockoutProps) {
  const title = reason === 'subscription_expired' ? 'Subscription Expired' : 'Free Trial Ended';
  const message =
    reason === 'subscription_expired'
      ? 'Your subscription has expired. Please renew your plan to continue using Vyapar Vistar.'
      : 'Your free trial has ended. Please purchase a plan to continue using Vyapar Vistar.';

  return (
    <div className="min-h-screen bg-deep-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[100px]"></div>
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }}></div>

      <div className="max-w-md w-full relative">
        <div className="glass-card-dark rounded-2xl p-8 border border-white/10 shadow-2xl backdrop-blur-xl text-center">
          <div className="inline-flex items-center justify-center relative mb-6">
            <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/20">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <div className="absolute -inset-1 gradient-primary rounded-2xl opacity-20 blur-md"></div>
          </div>

          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="text-slate-400 mt-3 text-sm leading-relaxed">{message}</p>

          <div className="mt-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-300 text-left">
                All your data is safe and will be available again as soon as you purchase or renew a plan.
              </p>
            </div>
          </div>

          <button
            onClick={onPurchase}
            className="group relative w-full mt-6 py-3 font-semibold text-white rounded-xl overflow-hidden transition-all duration-300"
          >
            <div className="absolute inset-0 gradient-primary"></div>
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="relative flex items-center justify-center gap-2">
              <Building2 className="h-4 w-4" />
              Purchase / Renew Plan
            </span>
          </button>
        </div>

        <div className="text-center mt-8 text-sm text-slate-600">
          <p>© 2024 Vyapar Vistar. All rights reserved.</p>
        </div>
      </div>

      <PurchasePlanModal open={true} onClose={onPurchase} reason={reason} />
    </div>
  );
}