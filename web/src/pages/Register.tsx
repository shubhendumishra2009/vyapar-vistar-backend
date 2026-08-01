import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Eye, EyeOff, User, Mail, Phone, Lock } from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function Register() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;

    try {
      // Validate password confirmation
      const confirmPassword = formData.get('confirmPassword') as string;
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      const response: any = await api.register({ username, email, password, name, phone, type: 'admin' });
      if (response.success) {
        setAuth(response.user, response.token);
        api.setToken(response.token);
        console.log('Registration successful, navigating to /create-business');
        // Use window.location for hard navigation to ensure route change
        window.location.href = '/create-business';
      } else {
        setError(response.error || 'Registration failed');
      }
    } catch (err: any) {
      // Extract the actual error message from the backend response
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError(err.message || 'Registration failed');
      }
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
        {/* Back Button */}
        <Link 
          to="/"
          className="inline-flex items-center text-slate-400 hover:text-emerald-400 mb-8 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        <div className="glass-card-dark rounded-2xl p-8 border border-white/10 shadow-2xl backdrop-blur-xl">
          {/* Logo and Branding */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center justify-center relative">
              <img
                src="/logo.png"
                alt="Vyapar Vistar"
                className="w-16 h-16 object-contain rounded-2xl mb-4"
              />
            </Link>
            <h1 className="text-2xl font-bold text-white">Create Account</h1>
            <p className="text-slate-400 mt-1 text-sm">Join Vyapar Vistar today</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4" />
                  <input
                    type="text"
                    name="name"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm"
                    placeholder="Full name"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4" />
                  <input
                    type="tel"
                    name="phone"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm"
                    placeholder="+91 98765 43210"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4" />
                <input
                  type="email"
                  name="email"
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4" />
                <input
                  type="text"
                  name="username"
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm"
                  placeholder="Choose a username"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm"
                    placeholder="Create password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm"
                    placeholder="Confirm password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
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
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <Sparkles className="h-4 w-4" />
                    </>
                  )}
                </span>
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
              Already have an account?{' '}
              <Link 
                to="/login"
                className="text-emerald-400 font-semibold hover:text-emerald-300 transition-colors"
              >
                Login here
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-slate-600">
          <p>© 2024 Vyapar Vistar. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}