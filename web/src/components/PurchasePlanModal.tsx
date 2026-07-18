import { X, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

interface PurchasePlanModalProps {
  open: boolean;
  onClose: () => void;
  reason?: 'trial_expired' | 'limit_reached' | 'subscription_expired';
}

const PLANS = [
  {
    name: 'Starter',
    price: '₹999',
    period: '/mo',
    features: ['3 Users', 'Core ERP Module', '100 SMS Credits/mo', 'Basic Reports', 'Email Support'],
    popular: false,
  },
  {
    name: 'Business',
    price: '₹1,999',
    period: '/mo',
    features: ['5 Users', 'Core + HR + Finance', '500 SMS Credits/mo', 'Advanced Reports', 'Email + Chat Support'],
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '₹4,999',
    period: '/mo',
    features: ['10 Users', 'All Modules', '1000 SMS Credits', 'Custom Reports & BI', 'Priority Support'],
    popular: false,
  },
];

export default function PurchasePlanModal({ open, onClose, reason = 'trial_expired' }: PurchasePlanModalProps) {
  if (!open) return null;

  const heading =
    reason === 'trial_expired'
      ? 'Your Free Trial Has Ended'
      : 'Upgrade to Add More Businesses';

  const subtext =
    reason === 'trial_expired'
      ? 'Thank you for trying VyaparVistar. To continue managing your business and unlock more features, please purchase a plan.'
      : 'Your current plan allows only one business. Purchase a plan to add more business units.';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto glass-card-dark rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="relative p-8 border-b border-white/5">
          <div className="absolute -inset-1 gradient-primary rounded-2xl opacity-10 blur-xl"></div>
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative flex items-center gap-3">
            <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{heading}</h2>
              <p className="text-sm text-slate-400 mt-1">{subtext}</p>
            </div>
          </div>
        </div>

        {/* Plans */}
        <div className="p-8">
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative glass-card-dark rounded-2xl p-6 border transition-all duration-300 ${
                  plan.popular
                    ? 'border-2 border-emerald-500/40 scale-105'
                    : 'border-white/5 hover:border-emerald-500/20'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full gradient-primary text-white text-[10px] font-bold shadow-lg shadow-emerald-500/30">
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <div className="mt-3 mb-5">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-slate-400 text-sm ml-1">{plan.period}</span>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5 mr-2" />
                      <span className="text-slate-300 text-xs">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onClose}
                  className="group relative w-full py-2.5 font-semibold text-white rounded-xl overflow-hidden transition-all duration-300"
                >
                  <div className="absolute inset-0 gradient-primary"></div>
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative flex items-center justify-center gap-1.5 text-sm">
                    Choose {plan.name}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </button>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-slate-500 mt-6">
            Need a custom plan? Contact us at{' '}
            <span className="text-emerald-400">support@vyaparvistar.com</span>
          </p>
        </div>
      </div>
    </div>
  );
}