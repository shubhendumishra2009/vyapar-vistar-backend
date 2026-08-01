import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Package, 
  Users, 
  TrendingUp, 
  BarChart3, 
  MessageSquare, 
  ArrowRight,
  CheckCircle2,
  Shield,
  Globe,
  Cloud,
  HeadphonesIcon,
  Star
} from 'lucide-react';

// Import HTML content
import homeContent from '../content/home.html?raw';

function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={sectionRef}
      className={`transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      } ${className}`}
    >
      {children}
    </div>
  );
}

import LandingLayout from '../components/LandingLayout';

export default function Home() {
  const navigate = useNavigate();

  return (
    <LandingLayout>
      {/* Hero Section */}
      <section id="home" className="relative min-h-screen flex items-center pt-20 bg-deep-950 overflow-hidden">
        {/* Premium Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 via-deep-950 to-teal-950/30"></div>
        
        {/* Animated Gradient Orbs */}
        <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] animate-float"></div>
        <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[100px] animate-float" style={{ animationDelay: '-3s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-400/5 rounded-full blur-[120px]"></div>
        
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-2"></span>
                <span className="text-sm font-medium text-emerald-400">Now available for your business</span>
              </div>

              <div className="hero-content" dangerouslySetInnerHTML={{ __html: homeContent }} />

              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => navigate('/register')}
                  className="group relative inline-flex items-center justify-center px-8 py-4 font-semibold text-white rounded-xl overflow-hidden transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/25"
                >
                  <div className="absolute inset-0 gradient-primary"></div>
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative flex items-center gap-2">
                    Start Free Trial
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
                <button 
                  onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center justify-center px-8 py-4 glass-card-dark text-slate-200 rounded-xl font-semibold border border-white/10 hover:border-emerald-500/30 hover:text-white transition-all duration-300"
                >
                  Explore Features
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-4">
                {[
                  { icon: CheckCircle2, text: 'Free Trial' },
                  { icon: Shield, text: 'No Credit Card' },
                  { icon: HeadphonesIcon, text: '24/7 Support' },
                ].map((item) => (
                  <div key={item.text} className="flex items-center text-slate-400">
                    <item.icon className="h-4 w-4 text-emerald-400 mr-2" />
                    <span className="text-sm font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Stats Card */}
            <div className="relative">
              <div className="relative glass-card-dark rounded-3xl p-8 border border-white/10 shadow-2xl backdrop-blur-xl">
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-3xl blur-xl opacity-50"></div>
                
                <div className="relative">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="glass-card rounded-2xl p-5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-3">
                        <Package className="h-5 w-5 text-emerald-400" />
                      </div>
                      <p className="text-sm text-slate-300 font-medium">Products Managed</p>
                      <p className="text-3xl font-bold text-white mt-1">500+</p>
                    </div>
                    <div className="glass-card rounded-2xl p-5">
                      <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center mb-3">
                        <TrendingUp className="h-5 w-5 text-teal-400" />
                      </div>
                      <p className="text-sm text-slate-300 font-medium">Monthly Sales</p>
                      <p className="text-3xl font-bold text-white mt-1">₹12L+</p>
                    </div>
                    <div className="glass-card rounded-2xl p-5">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mb-3">
                        <Users className="h-5 w-5 text-blue-400" />
                      </div>
                      <p className="text-sm text-slate-300 font-medium">Happy Customers</p>
                      <p className="text-3xl font-bold text-white mt-1">1,200+</p>
                    </div>
                    <div className="glass-card rounded-2xl p-5">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-3">
                        <BarChart3 className="h-5 w-5 text-cyan-400" />
                      </div>
                      <p className="text-sm text-slate-300 font-medium">Growth Rate</p>
                      <p className="text-3xl font-bold text-white mt-1">40%</p>
                    </div>
                  </div>

                  {/* Trusted by badge */}
                  <div className="mt-6 pt-6 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-500">Trusted by <span className="text-white font-semibold">1,000+</span> retailers</p>
                      <div className="flex -space-x-2">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 border-2 border-deep-900 flex items-center justify-center">
                            <span className="text-xs font-medium text-slate-300">U</span>
                          </div>
                        ))}
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 border-2 border-deep-900 flex items-center justify-center">
                          <span className="text-xs font-bold text-emerald-400">+</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="relative py-32 bg-deep-900 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/5 rounded-full blur-[100px]"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="relative">
                <div className="relative z-10 grid grid-cols-2 gap-4">
                  <div className="glass-card-dark rounded-2xl p-8 border border-white/5">
                    <Building2 className="h-10 w-10 text-emerald-400 mb-6" />
                    <h3 className="text-2xl font-bold text-white mb-2">Trusted</h3>
                    <p className="text-slate-400">By 1,000+ retailers nationwide</p>
                  </div>
                  <div className="glass-card-dark rounded-2xl p-8 border border-white/5 mt-8">
                    <BarChart3 className="h-10 w-10 text-teal-400 mb-6" />
                    <h3 className="text-2xl font-bold text-white mb-2">Growth</h3>
                    <p className="text-slate-400">40% average business growth</p>
                  </div>
                  <div className="glass-card-dark rounded-2xl p-8 border border-white/5 -mt-4">
                    <Star className="h-10 w-10 text-amber-400 mb-6" />
                    <h3 className="text-2xl font-bold text-white mb-2">4.9/5</h3>
                    <p className="text-slate-400">Average user rating</p>
                  </div>
                  <div className="glass-card-dark rounded-2xl p-8 border border-white/5 mt-4">
                    <Globe className="h-10 w-10 text-cyan-400 mb-6" />
                    <h3 className="text-2xl font-bold text-white mb-2">Pan India</h3>
                    <p className="text-slate-400">Available across all states</p>
                  </div>
                </div>
                {/* Decorative gradient behind cards */}
                <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-3xl blur-2xl"></div>
              </div>

              <div className="space-y-6">
                <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                  <span className="text-sm font-medium text-slate-300">About Vyapar Vistar</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-white">
                  Empowering Retailers with{' '}
                  <span className="gradient-text">Smart Technology</span>
                </h2>
                <p className="text-lg text-slate-400 leading-relaxed">
                  Vyapar Vistar is a comprehensive ERP solution built specifically for Indian retailers. 
                  We understand the unique challenges of the retail industry and provide tools that make 
                  business management effortless.
                </p>
                
                <div className="grid grid-cols-2 gap-4 pt-4">
                  {[
                    { title: 'Easy to Use', desc: 'Intuitive interface for quick adoption by your team' },
                    { title: 'Enterprise Secure', desc: 'Bank-grade security for your business data' },
                    { title: 'Highly Scalable', desc: 'Grows seamlessly from 1 to 100+ stores' },
                    { title: 'Cost Effective', desc: 'Affordable pricing designed for Indian businesses' },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start space-x-3 p-4 rounded-xl bg-white/5 border border-white/5">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-white text-sm">{item.title}</h4>
                        <p className="text-slate-500 text-xs mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="relative py-32 bg-deep-950 overflow-hidden">
        <div className="absolute top-1/3 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/3 right-0 w-80 h-80 bg-teal-500/5 rounded-full blur-[120px]"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-16">
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                <span className="text-sm font-medium text-emerald-400">What We Offer</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Complete Retail{' '}
                <span className="gradient-text">Management Suite</span>
              </h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                Everything you need to run your retail business efficiently under one roof
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: Package,
                  title: 'Inventory Management',
                  desc: 'Real-time tracking, low stock alerts, and comprehensive inventory reports',
                  color: 'emerald',
                },
                {
                  icon: TrendingUp,
                  title: 'Sales Management',
                  desc: 'Complete sales tracking, invoice generation, and sales analytics',
                  color: 'teal',
                },
                {
                  icon: Users,
                  title: 'Customer Management',
                  desc: 'Customer profiles, purchase history, and credit management',
                  color: 'blue',
                },
                {
                  icon: BarChart3,
                  title: 'Business Reports',
                  desc: 'Detailed insights with customizable reports and real-time dashboards',
                  color: 'cyan',
                },
              ].map((service) => (
                <div
                  key={service.title}
                  className="group relative glass-card-dark rounded-2xl p-8 border border-white/5 hover:border-emerald-500/20 transition-all duration-500 hover:-translate-y-2"
                >
                  <div className={`w-14 h-14 rounded-xl bg-${service.color}-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <service.icon className={`h-7 w-7 text-${service.color}-400`} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors">{service.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{service.desc}</p>
                  
                  {/* Hover effect line */}
                  <div className="absolute bottom-0 left-8 right-8 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left rounded-full"></div>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-32 bg-deep-900 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-16">
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6">
                <span className="text-sm font-medium text-slate-300">Why Choose Us</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Built for{' '}
                <span className="gradient-text">Modern Retail</span>
              </h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                Powerful features that set us apart from traditional retail management systems
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: MessageSquare,
                  title: 'SMS Integration',
                  desc: 'Send invoices, payment reminders, and promotional SMS directly from the platform to keep your customers engaged',
                  gradient: 'from-emerald-600 to-teal-700',
                },
                {
                  icon: Building2,
                  title: 'Multi-Shop Support',
                  desc: 'Manage multiple stores from a single dashboard with unified reporting and centralized inventory control',
                  gradient: 'from-teal-600 to-cyan-700',
                },
                {
                  icon: Cloud,
                  title: 'Real-time Sync',
                  desc: 'Data syncs seamlessly across all devices and locations, keeping your entire business in perfect harmony',
                  gradient: 'from-cyan-600 to-blue-700',
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="group relative text-center p-10 glass-card-dark rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-500"
                >
                  <div className={`w-20 h-20 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/10 group-hover:scale-110 transition-all duration-300`}>
                    <feature.icon className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4">{feature.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-32 bg-deep-900 overflow-hidden">
        <div className="absolute top-1/3 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/3 left-0 w-80 h-80 bg-teal-500/5 rounded-full blur-[120px]"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-16">
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                <span className="text-sm font-medium text-emerald-400">Simple Pricing</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Plans That{' '}
                <span className="gradient-text">Scale With You</span>
              </h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
                Pricing is per business unit per month. Add more business units anytime. Start with a 7-day free trial. No credit card required.
              </p>

              {/* Monthly/Yearly Toggle */}
              <div className="inline-flex items-center bg-white/5 rounded-2xl p-1.5 border border-white/5">
                <button className="px-6 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 font-semibold text-sm transition-all">
                  Monthly
                </button>
                <button className="px-6 py-2.5 rounded-xl text-slate-400 hover:text-white font-medium text-sm transition-all">
                  Yearly
                  <span className="ml-2 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full">Save 17%</span>
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Starter Plan */}
              <div className="glass-card-dark rounded-3xl p-8 border border-white/5 hover:border-emerald-500/20 transition-all duration-500 hover:-translate-y-2">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-2">Starter</h3>
                  <p className="text-slate-400 text-sm">For a single business unit</p>
                </div>
                <div className="mb-8">
                  <span className="text-4xl font-bold text-white">₹999</span>
                  <span className="text-slate-400 text-lg ml-1">/mo</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {[
                    
                    '3 Users Included',
                    'Core ERP Module',
                    '100 SMS Credits/mo',
                    'Basic Reports',
                    'Email Support',
                    
                  ].map((feature) => (
                    <li key={feature} className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5 mr-3" />
                      <span className="text-slate-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => navigate('/register')}
                  className="group relative w-full py-3 font-semibold text-white rounded-xl overflow-hidden transition-all duration-300"
                >
                  <div className="absolute inset-0 gradient-primary"></div>
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative">Start Free Trial</span>
                </button>
              </div>

              {/* Business Plan — Popular */}
              <div className="relative glass-card-dark rounded-3xl p-8 border-2 border-emerald-500/40 hover:border-emerald-500/60 transition-all duration-500 hover:-translate-y-2 scale-105">
                {/* Popular Badge */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="inline-flex items-center px-4 py-1.5 rounded-full gradient-primary text-white text-xs font-bold shadow-lg shadow-emerald-500/30">
                    Most Popular
                  </div>
                </div>
                <div className="mb-6 mt-2">
                  <h3 className="text-xl font-bold text-white mb-2">Business</h3>
                  <p className="text-slate-400 text-sm">For a single business unit — more power</p>
                </div>
                <div className="mb-8">
                  <span className="text-4xl font-bold text-white">₹1,999</span>
                  <span className="text-slate-400 text-lg ml-1">/mo</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {[
                    
                    '5 Users Included',
                    'Core ERP + HR + Finance Modules',
                    '500 SMS Credits/mo',
                    'Advanced Reports & Analytics',
                    'Email + Chat Support',
                    
                    'Extra User: ₹149/mo',
                  ].map((feature) => (
                    <li key={feature} className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5 mr-3" />
                      <span className="text-slate-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => navigate('/register')}
                  className="group relative w-full py-3 font-semibold text-white rounded-xl overflow-hidden transition-all duration-300 shadow-xl shadow-emerald-500/20"
                >
                  <div className="absolute inset-0 gradient-primary"></div>
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative">Start Free Trial</span>
                </button>
              </div>

              {/* Enterprise Plan */}
              <div className="glass-card-dark rounded-3xl p-8 border border-white/5 hover:border-emerald-500/20 transition-all duration-500 hover:-translate-y-2">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-2">Enterprise</h3>
                  <p className="text-slate-400 text-sm">For a single business unit — full suite</p>
                </div>
                <div className="mb-8">
                  <span className="text-4xl font-bold text-white">₹4,999</span>
                  <span className="text-slate-400 text-lg ml-1">/mo</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {[
                    
                    '10 Users Included',
                    'All Modules (Core + HR + Finance + CRM + E-Com + Analytics)',
                    '1000 SMS Credits',
                    'Custom Reports & BI',
                    'Priority Phone + WhatsApp Support',
                    '7-Day Free Trial',
                    'Extra User: ₹99/mo',
                    'API Access',
                    
                  ].map((feature) => (
                    <li key={feature} className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5 mr-3" />
                      <span className="text-slate-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => navigate('/register')}
                  className="group relative w-full py-3 font-semibold text-white rounded-xl overflow-hidden transition-all duration-300"
                >
                  <div className="absolute inset-0 gradient-primary"></div>
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative">Start Free Trial</span>
                </button>
              </div>
            </div>

            {/* Module Badges */}
            <div className="mt-16 text-center">
              <p className="text-sm text-slate-500 mb-6 uppercase tracking-wider font-medium">Available Modules — Add Any Time</p>
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  { name: 'Core ERP', desc: 'Inventory, Sales, Customers' },
                  { name: 'HR Module', desc: 'Employees, Payroll, Attendance' },
                  { name: 'Finance', desc: 'Accounting, GST, P&L' },
                  { name: 'CRM', desc: 'Leads, Campaigns, Follow-ups' },
                  { name: 'E-Commerce', desc: 'Online Store, Orders' },
                  { name: 'Analytics', desc: 'BI, Custom Dashboards' },
                ].map((mod) => (
                  <div key={mod.name} className="group relative px-5 py-3 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/20 transition-all cursor-default">
                    <p className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">{mod.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{mod.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="relative py-32 bg-deep-950 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px]"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-sm font-medium text-emerald-400">Get In Touch</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-white">
                  Let's Talk About{' '}
                  <span className="gradient-text">Your Business</span>
                </h2>
                <p className="text-lg text-slate-400 leading-relaxed">
                  Have questions? We'd love to hear from you. Send us a message and we'll respond 
                  within 24 hours.
                </p>

                <div className="space-y-4 pt-4">
                  {[
                    { label: 'Email', value: 'support@vyapar-vistar.com', icon: MessageSquare },
                    { label: 'Phone', value: '+91 98765 43210', icon: HeadphonesIcon },
                    { label: 'Office', value: 'Mumbai, Maharashtra, India', icon: Building2 },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center space-x-4 p-4 rounded-xl bg-white/5 border border-white/5">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <item.icon className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{item.label}</p>
                        <p className="text-sm font-medium text-white">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card-dark rounded-3xl p-8 border border-white/10">
                <h3 className="text-2xl font-bold text-white mb-6">Send us a Message</h3>
                <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                      <input 
                        type="email" 
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Subject</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                      placeholder="How can we help?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Message</label>
                    <textarea 
                      rows={4}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition resize-none"
                      placeholder="Tell us more about your requirements..."
                    />
                  </div>
                  <button 
                    type="button"
                    className="group relative w-full py-3.5 font-semibold text-white rounded-xl overflow-hidden transition-all duration-300"
                  >
                    <div className="absolute inset-0 gradient-primary"></div>
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <span className="relative flex items-center justify-center gap-2">
                      Send Message
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </button>
                </form>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/80 via-teal-900/80 to-deep-900"></div>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }}></div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your{' '}
            <span className="text-emerald-300">Retail Business?</span>
          </h2>
          <p className="text-xl text-emerald-100/70 mb-10 max-w-2xl mx-auto">
            Join thousands of successful retailers who trust Vyapar Vistar for their
            day-to-day business management needs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => navigate('/register')}
              className="group inline-flex items-center px-8 py-4 bg-white text-deep-900 rounded-xl font-bold text-lg hover:bg-emerald-50 transition-all shadow-2xl hover:shadow-emerald-500/25"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="inline-flex items-center px-8 py-4 glass-card-dark text-white rounded-xl font-semibold text-lg border border-white/10 hover:border-white/20 transition-all"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Additional CSS for content sections */}
      <style>{`
        .hero-content h1 {
          font-size: 3.5rem;
          font-weight: 800;
          line-height: 1.1;
          background: linear-gradient(135deg, #f8fafc 0%, #94a3b8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 1.5rem;
        }
        .hero-content p {
          font-size: 1.25rem;
          color: #94a3b8;
          line-height: 1.8;
        }
        .about-content h2,
        .services-content h2,
        .contact-content h2 {
          font-size: 2.5rem;
          font-weight: 700;
          color: #f8fafc;
          margin-bottom: 1rem;
        }
        .about-content p,
        .services-content p,
        .contact-content p {
          font-size: 1.125rem;
          color: #94a3b8;
          line-height: 1.8;
          margin-bottom: 1rem;
        }
        .service-item {
          margin-bottom: 1.5rem;
        }
        .service-item h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #f8fafc;
          margin-bottom: 0.5rem;
        }
        .service-item p {
          color: #94a3b8;
        }
        .contact-info {
          display: grid;
          gap: 1.5rem;
          margin-top: 2rem;
        }
        .contact-item h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #f8fafc;
          margin-bottom: 0.25rem;
        }
        .contact-item p {
          color: #94a3b8;
        }
        @media (max-width: 768px) {
          .hero-content h1 {
            font-size: 2.5rem;
          }
          .about-content h2,
          .services-content h2,
          .contact-content h2 {
            font-size: 2rem;
          }
        }
      `}</style>
    </LandingLayout>
  );
}
