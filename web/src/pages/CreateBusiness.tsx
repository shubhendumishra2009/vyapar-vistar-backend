import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Store, Tag, FileText, Sparkles, LogOut } from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function CreateBusiness() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    api.clearToken();
    navigate('/login');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    const description = formData.get('description') as string;

    try {
      const response: any = await api.createBusiness({ name, type, description });
      if (response.success) {
        navigate('/dashboard');
      } else {
        setError(response.error || 'Failed to create business');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create business');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-deep-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[100px]"></div>
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }}></div>

      <div className="max-w-md w-full relative">
        {/* Top bar with logout */}
        <div className="flex justify-between items-center mb-8">
          <button 
            onClick={() => navigate('/login')}
            className="inline-flex items-center text-slate-400 hover:text-emerald-400 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center text-slate-400 hover:text-red-400 transition-colors group"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </button>
        </div>

        <div className="glass-card-dark rounded-2xl p-8 border border-white/10 shadow-2xl backdrop-blur-xl">
          {/* Logo and Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center relative mb-4">
              <img
                src="/logo.png"
                alt="Vyapar Vistar"
                className="w-16 h-16 object-contain rounded-2xl"
              />
            </div>
            <h1 className="text-2xl font-bold text-white">Create Your Business</h1>
            <p className="text-slate-400 mt-1 text-sm">Start your 7-day free trial with Starter plan</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Business Name *
              </label>
              <div className="relative">
                <Store className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4" />
                <input
                  type="text"
                  name="name"
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm"
                  placeholder="e.g., ABC Grocery"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Business Type *
              </label>
              <div className="relative">
                <Tag className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4" />
                <select
                  name="type"
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm appearance-none"
                  required
                >
                  <option value="" className="bg-deep-900">Select business type</option>
                  <option value="grocery" className="bg-deep-900">Grocery Store</option>
                  <option value="electronics" className="bg-deep-900">Electronics</option>
                  <option value="clothing" className="bg-deep-900">Clothing</option>
                  <option value="restaurant" className="bg-deep-900">Restaurant</option>
                  <option value="medicine" className="bg-deep-900">Pharmacy/Medicine</option>
                  <option value="hardware" className="bg-deep-900">Hardware</option>
                  <option value="wholesale" className="bg-deep-900">Wholesale</option>
                  <option value="retail" className="bg-deep-900">General Retail</option>
                  <option value="other" className="bg-deep-900">Other</option>
                </select>
                <div className="absolute right-3.5 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Description (Optional)
              </label>
              <div className="relative">
                <FileText className="absolute left-3.5 top-3 text-slate-500 h-4 w-4" />
                <textarea
                  name="description"
                  rows={3}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm resize-none"
                  placeholder="Brief description of your business"
                />
              </div>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-emerald-400">7-Day Free Trial — Starter Plan</p>
                  <p className="text-xs text-slate-400 mt-1">
                    You're starting with the Starter plan. You can upgrade anytime during or after the trial.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full py-3 font-semibold text-white rounded-xl overflow-hidden transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 gradient-primary"></div>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating Business...
                    </>
                  ) : (
                    <>
                      Create Business
                      <Sparkles className="h-4 w-4" />
                    </>
                  )}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-slate-600">
          <p>© 2024 Vyapar Vistar. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}