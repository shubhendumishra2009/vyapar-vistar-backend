import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Menu, X, Sparkles, Download } from 'lucide-react';

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-deep-950">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-deep-950/90 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.3)] border-b border-white/5' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="w-11 h-11 gradient-primary rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all duration-300">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -inset-1 gradient-primary rounded-xl opacity-20 blur-sm group-hover:opacity-30 transition-opacity"></div>
              </div>
              <div>
                <span className="text-xl font-bold text-white tracking-tight">VyaparVistar</span>
                <span className="block text-[10px] uppercase tracking-[0.2em] text-emerald-400/70 font-medium">Business ERP</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {[
                { label: 'Home', id: 'home' },
                { label: 'About', id: 'about' },
                { label: 'Services', id: 'services' },
                { label: 'Pricing', id: 'pricing' },
                { label: 'Contact', id: 'contact' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-200"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center space-x-3">
              <button 
                onClick={() => navigate('/login')}
                className="px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-200"
              >
                Login
              </button>
              <button 
                onClick={() => navigate('/register')}
                className="group relative px-6 py-2.5 text-sm font-semibold text-white rounded-lg overflow-hidden transition-all duration-300"
              >
                <div className="absolute inset-0 gradient-primary transition-opacity group-hover:opacity-90"></div>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative flex items-center gap-2">
                  Get Started
                  <Sparkles className="h-4 w-4" />
                </span>
              </button>
              <a
                href="https://vyaparvistar.a2wares.com/download/windows"
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all duration-200 shadow-lg shadow-emerald-500/20"
              >
                <Download className="h-4 w-4" />
                Desktop App
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              {isMenuOpen ? <X className="h-5 w-5 text-white" /> : <Menu className="h-5 w-5 text-white" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-deep-900/95 backdrop-blur-xl border-t border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-2">
              {[
                { label: 'Home', id: 'home' },
                { label: 'About', id: 'about' },
                { label: 'Services', id: 'services' },
                { label: 'Pricing', id: 'pricing' },
                { label: 'Contact', id: 'contact' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="block w-full text-left px-4 py-3 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-all"
                >
                  {item.label}
                </button>
              ))}
              <div className="pt-4 border-t border-white/5 space-y-3">
                <button 
                  onClick={() => navigate('/login')}
                  className="block w-full text-center px-4 py-3 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-all"
                >
                  Login
                </button>
                <button 
                  onClick={() => navigate('/register')}
                  className="block w-full text-center gradient-primary text-white px-4 py-3 rounded-lg font-semibold"
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main>
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-deep-900 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-5">
                <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="text-lg font-bold text-white">VyaparVistar</span>
                  <span className="block text-[10px] uppercase tracking-[0.2em] text-emerald-400/70 font-medium">Business ERP</span>
                </div>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-md">
                Empowering retailers with a modern, all-in-one ERP platform. Streamline operations, 
                manage inventory, and grow your business with real-time insights.
              </p>
              <div className="flex items-center space-x-4 mt-6">
                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center hover:bg-emerald-500/20 transition-colors cursor-pointer">
                  <svg className="h-4 w-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </div>
                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center hover:bg-emerald-500/20 transition-colors cursor-pointer">
                  <svg className="h-4 w-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </div>
                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center hover:bg-emerald-500/20 transition-colors cursor-pointer">
                  <svg className="h-4 w-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z"/></svg>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-5">Quick Links</h3>
              <ul className="space-y-3">
                {[
                  { label: 'Home', id: 'home' },
                  { label: 'About Us', id: 'about' },
                  { label: 'Services', id: 'services' },
                  { label: 'Pricing', id: 'pricing' },
                  { label: 'Contact', id: 'contact' },
                ].map((item) => (
                  <li key={item.id}>
                    <button onClick={() => scrollToSection(item.id)} className="text-slate-400 hover:text-emerald-400 text-sm transition-colors">
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-5">Legal</h3>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-slate-400 hover:text-emerald-400 text-sm transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-400 hover:text-emerald-400 text-sm transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-400 hover:text-emerald-400 text-sm transition-colors">
                    Refund Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 mt-12 pt-8 text-center">
            <p className="text-slate-500 text-sm">
              © 2024 VyaparVistar. All rights reserved. Crafted with precision for modern retail.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}