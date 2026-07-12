import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import {
  Monitor,
  ChefHat,
  Package,
  CreditCard,
  BarChart3,
  Calendar,
  Scan,
  Link as LinkIcon,
  Bell,
  Zap,
  Users,
  FileText,
  ArrowRight,
  PlayCircle,
  Activity,
  TrendingUp,
  Layout,
  Star,
  ChevronDown,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  CheckCheck,
  Sparkles,
  Shield,
  Cpu,
  Database,
  Network
} from 'lucide-react';

const TwitterIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

const LinkedinIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const InstagramIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

export default function LandingPage() {
  const [faqOpen, setFaqOpen] = useState({});
  const { theme, selectTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [activeTab, setActiveTab] = useState('cockpit');
  const themeRef = useRef(null);

  const toggleFaq = (index) => {
    setFaqOpen((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const handleOutsideClick = (e) => {
      if (themeRef.current && !themeRef.current.contains(e.target)) {
        setShowThemeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      observer.disconnect();
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    const reveal = () => {
      const reveals = document.querySelectorAll('.reveal');
      reveals.forEach((element) => {
        const windowHeight = window.innerHeight;
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;
        if (elementTop < windowHeight - elementVisible) {
          element.classList.add('active');
        }
      });
    };

    window.addEventListener('scroll', reveal);
    window.addEventListener('load', reveal);
    reveal(); // Initial run

    return () => {
      window.removeEventListener('scroll', reveal);
      window.removeEventListener('load', reveal);
    };
  }, []);

  const images = {
    hero: isDark ? '/images/landingpage/hero_dark.jpg' : '/images/landingpage/hero.jpg',
    integrations: isDark ? '/images/landingpage/integrations_dark.png' : '/images/landingpage/integrations.png',
    cockpit: isDark ? '/images/landingpage/cockpit_dark.png' : '/images/landingpage/cockpit.png',
    analytics: isDark ? '/images/landingpage/analytics_dark.png' : '/images/landingpage/analytics.png',
    orders: isDark ? '/images/landingpage/orders_dark.png' : '/images/landingpage/orders.png',
    staff: isDark ? '/images/landingpage/staff_dark.png' : '/images/landingpage/staff.png',
  };

  const teamMembers = [
    { name: 'Md Yusuf', role: 'Full Stack Developer', image: '/images/landingpage/yusuf.png' },
    { name: 'Samir Kumar Singh', role: 'AI Engineer', image: '/images/landingpage/samir.jpg' },
    { name: 'Nitish Kumar', role: 'Full Stack Developer', image: '/images/landingpage/nitish.jpg' },
    { name: 'Ajay Rathore', role: 'Full Stack Developer', image: '/images/landingpage/ajay.jpg' }
  ];

  return (
    <div className="landing-page bg-background text-on-surface font-body-lg overflow-x-hidden selection:bg-secondary-container selection:text-on-secondary-container">
      
      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg border-b border-[#6311f4]/10 dark:border-[#6311f4]/20 shadow-xs transition-all duration-500">
        <div className="flex justify-between items-center h-20 px-margin-desktop max-w-container-max mx-auto">
          <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2 select-none cursor-pointer">
            <img src="/omniserve_logo.png" alt="OmniServe Logo" className="h-10 w-auto object-contain" />
            <span className="font-headline-lg text-headline-lg font-bold text-on-surface dark:text-zinc-100 tracking-tight">OmniServe</span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-8">
            <a href="#product" className="text-on-surface/85 dark:text-zinc-300 hover:text-[#6311f4] dark:hover:text-[#a07cff] transition-colors duration-300 font-bold text-sm tracking-tight">Product</a>
            <a href="#features" className="text-on-surface/85 dark:text-zinc-300 hover:text-[#6311f4] dark:hover:text-[#a07cff] transition-colors duration-300 font-bold text-sm tracking-tight">Features</a>
            <a href="#solutions" className="text-on-surface/85 dark:text-zinc-300 hover:text-[#6311f4] dark:hover:text-[#a07cff] transition-colors duration-300 font-bold text-sm tracking-tight">Solutions</a>
            <a href="#tech" className="text-on-surface/85 dark:text-zinc-300 hover:text-[#6311f4] dark:hover:text-[#a07cff] transition-colors duration-300 font-bold text-sm tracking-tight">Technology</a>
            <a href="#contact" className="text-on-surface/85 dark:text-zinc-300 hover:text-[#6311f4] dark:hover:text-[#a07cff] transition-colors duration-300 font-bold text-sm tracking-tight">Contact</a>
          </div>

          <div className="flex items-center space-x-4">
            {/* Theme Selector */}
            <div className="relative" ref={themeRef}>
              <button
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 dark:border-zinc-800 text-on-surface dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all cursor-pointer bg-transparent"
                aria-label="Toggle Theme"
              >
                <span className="material-symbols-outlined text-[20px] leading-none">
                  {theme === 'light' ? 'light_mode' : theme === 'dark' ? 'dark_mode' : 'desktop_windows'}
                </span>
              </button>
              {showThemeMenu && (
                <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-xl p-1.5 z-[200] animate-scale-in">
                  {['light', 'dark', 'system'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        selectTheme(mode);
                        setShowThemeMenu(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer capitalize ${
                        theme === mode
                          ? 'bg-[#6311f4]/10 text-[#6311f4] dark:text-zinc-200'
                          : 'text-on-surface-variant dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-850 hover:text-on-surface dark:hover:text-zinc-200'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px] leading-none">
                        {mode === 'light' ? 'light_mode' : mode === 'dark' ? 'dark_mode' : 'desktop_windows'}
                      </span>
                      <span>{mode}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Link to="/login" className="px-6 py-2.5 bg-[#6311f4] hover:bg-[#510cc4] text-white rounded-full text-sm font-bold transition-all duration-300 hover:scale-[1.03] active:scale-95 shadow-md">Sign In</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-36 pb-20 overflow-hidden bg-gradient-glow bg-gradient-to-br from-[#ffffff] via-[#FAF8FF] to-[#f4f0ff] dark:from-[#141316] dark:via-[#161224] dark:to-[#120f1f]">
        {/* Glow Spheres */}
        <div className="absolute top-1/4 left-1/10 w-96 h-96 rounded-full bg-[#6311f4]/5 dark:bg-[#6311f4]/10 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/10 right-1/10 w-96 h-96 rounded-full bg-[#61f6ea]/5 dark:bg-[#61f6ea]/10 blur-[120px] pointer-events-none"></div>

        <div className="max-w-container-max mx-auto px-margin-desktop grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-6 reveal">
            <div className="inline-flex items-center space-x-2 bg-[#6311f4]/10 dark:bg-[#6311f4]/25 px-4 py-1.5 rounded-full mb-8 border border-[#6311f4]/20">
              <Sparkles className="w-4 h-4 text-[#6311f4] dark:text-[#a07cff]" />
              <span className="text-[#6311f4] dark:text-[#a07cff] font-bold text-xs uppercase tracking-widest">Version 2.0 AI Copilot Ready</span>
            </div>
            
            <h1 className="font-display-lg text-display-lg leading-[1.08] mb-6 text-on-surface dark:text-white">
              One Unified Platform.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6311f4] to-[#fc8a63] dark:from-[#a07cff] dark:to-[#fc8a63]">Every Restaurant</span><br />
              Operation.
            </h1>
            
            <p className="text-on-surface/80 dark:text-zinc-300 text-body-lg mb-8 max-w-xl">
              Integrate your billing, smart kitchen displays, automatic stock sheets, and delivery aggregators into a single, real-time sync network.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/login" className="px-8 py-4 bg-gradient-to-r from-[#6311f4] to-[#510cc4] text-white rounded-2xl font-bold flex items-center justify-center space-x-2 hover:scale-[1.02] transition-all shadow-lg">
                <span>Let's Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#contact" className="px-8 py-4 bg-white dark:bg-zinc-900 text-on-surface dark:text-zinc-200 border border-gray-200 dark:border-zinc-800 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-gray-50 dark:hover:bg-zinc-850 hover:scale-[1.02] transition-all shadow-sm">
                <PlayCircle className="w-4 h-4 text-[#6311f4] dark:text-[#a07cff]" />
                <span>Book Demo</span>
              </a>
            </div>
          </div>
          
          <div className="lg:col-span-6 relative reveal delay-200">
            <div className="relative p-2 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/30 dark:border-zinc-800/30 shadow-2xl animate-float">
              <img src={images.hero} className="w-full h-auto object-cover rounded-[2rem] shadow-lg" alt="OmniServe Dashboard Preview" />
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Metric Bar */}
      <section className="py-10 bg-surface-container-low dark:bg-zinc-950 border-y border-outline-variant dark:border-zinc-900 transition-colors duration-300">
        <div className="max-w-container-max mx-auto px-margin-desktop grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <h3 className="text-3xl font-extrabold text-[#6311f4] dark:text-[#a07cff] mb-1">1,200+</h3>
            <p className="text-xs uppercase tracking-wider text-on-surface/60 dark:text-zinc-400 font-bold">Active Outlets</p>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-[#6311f4] dark:text-[#a07cff] mb-1">&lt;50ms</h3>
            <p className="text-xs uppercase tracking-wider text-on-surface/60 dark:text-zinc-400 font-bold">Network Latency</p>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-[#6311f4] dark:text-[#a07cff] mb-1">99.99%</h3>
            <p className="text-xs uppercase tracking-wider text-on-surface/60 dark:text-zinc-400 font-bold">System Uptime</p>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-[#6311f4] dark:text-[#a07cff] mb-1">20M+</h3>
            <p className="text-xs uppercase tracking-wider text-on-surface/60 dark:text-zinc-400 font-bold">Orders Synced</p>
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="py-section-gap" id="product">
        <div className="max-w-container-max mx-auto px-margin-desktop mb-16 text-center reveal">
          <h2 className="font-headline-xl text-headline-xl mb-4">Core Operating Ecosystem</h2>
          <p className="text-on-surface/75 dark:text-zinc-300 max-w-2xl mx-auto">
            Experience complete synergy. Every module is linked to a single data highway for zero-leakage management.
          </p>
        </div>

        <div className="max-w-container-max mx-auto px-margin-desktop grid grid-cols-1 md:grid-cols-3 gap-6 reveal">
          {/* Asymmetrical Card 1: Double Column */}
          <div className="glass-card p-10 rounded-[2rem] md:col-span-2 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-6">
                <Monitor className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold mb-3 dark:text-zinc-100">Super Operations Cockpit</h3>
              <p className="text-on-surface/75 dark:text-zinc-300 max-w-xl">
                Observe live orders, active dining room sessions, waiter statuses, and sync integrations across all restaurant locations in real time.
              </p>
            </div>
            <div className="mt-8 flex gap-4 text-xs font-bold text-blue-500 dark:text-blue-400">
              <span>● Real-time Sockets</span>
              <span>● Integrated Maps</span>
              <span>● SLA Alerts</span>
            </div>
          </div>

          {/* Card 2: Single Column */}
          <div className="glass-card p-10 rounded-[2rem] flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-6">
                <ChefHat className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold mb-3 dark:text-zinc-100">Smart KDS Routing</h3>
              <p className="text-on-surface/75 dark:text-zinc-300">
                Route order components to preparation stations instantly, tracking dish preparation timers.
              </p>
            </div>
            <div className="mt-8 text-xs font-bold text-purple-500 dark:text-purple-400">
              <span>● Kitchen Station Display</span>
            </div>
          </div>

          {/* Card 3: Single Column */}
          <div className="glass-card p-10 rounded-[2rem] flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-6">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold mb-3 dark:text-zinc-100">Auto Inventory Sheets</h3>
              <p className="text-on-surface/75 dark:text-zinc-300">
                Track ingredients, waste audits, and item availability seamlessly as orders flow.
              </p>
            </div>
            <div className="mt-8 text-xs font-bold text-emerald-500 dark:text-emerald-400">
              <span>● Automatic Reordering</span>
            </div>
          </div>

          {/* Asymmetrical Card 4: Double Column */}
          <div className="glass-card p-10 rounded-[2rem] md:col-span-2 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-6">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold mb-3 dark:text-zinc-100">AI Copilot Engine</h3>
              <p className="text-on-surface/75 dark:text-zinc-300 max-w-xl">
                Suggest menu optimizations, track revenue forecasts, and manage customer loyalty data using our embedded semantic model search.
              </p>
            </div>
            <div className="mt-8 flex gap-4 text-xs font-bold text-orange-500 dark:text-orange-400">
              <span>● VectorDB Search</span>
              <span>● Revenue Models</span>
              <span>● Staff Recommendations</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tabbed Interactive Feature Showcase */}
      <section className="py-section-gap bg-surface-container-low dark:bg-zinc-900/30 transition-colors duration-300" id="features">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <div className="text-center mb-12 reveal">
            <h2 className="font-headline-xl text-headline-xl mb-4">Deep Interface Control</h2>
            <p className="text-on-surface/75 dark:text-zinc-300 max-w-2xl mx-auto">
              Click through our live modules to preview the user interfaces built for light and dark layouts.
            </p>
          </div>

          {/* Tabs switch */}
          <div className="flex justify-center space-x-2 mb-10 reveal">
            {[
              { id: 'cockpit', label: 'Live Cockpit', icon: Monitor },
              { id: 'integrations', label: 'Sync Hub', icon: LinkIcon },
              { id: 'analytics', label: 'Insights & Charts', icon: BarChart3 },
              { id: 'orders', label: 'Order Lists', icon: FileText }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3.5 rounded-full font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-[#6311f4] text-white shadow-md'
                      : 'bg-white dark:bg-zinc-800 text-on-surface/70 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-850 border border-gray-100 dark:border-zinc-750'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Tab Preview Frame */}
          <div className="reveal">
            <div className="glass-card p-3 rounded-[2.5rem] bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border border-white/30 dark:border-zinc-800/30 shadow-xl overflow-hidden">
              <div className="relative group">
                <img
                  src={images[activeTab]}
                  alt={`${activeTab} Interface Screenshot`}
                  className="w-full h-auto rounded-[2rem] shadow-lg transform transition-transform duration-700 group-hover:scale-[1.01]"
                />
              </div>
            </div>
            <p className="text-center mt-6 italic text-sm text-on-surface/70 dark:text-zinc-400">
              * Showing dynamic {isDark ? 'dark mode' : 'light mode'} layout screenshots. Switch theme in nav to preview the counterpart.
            </p>
          </div>
        </div>
      </section>

      {/* Why OmniServe Comparison */}
      <section className="py-section-gap" id="solutions">
        <div className="max-w-container-max mx-auto px-margin-desktop mb-16 text-center reveal">
          <h2 className="font-headline-xl text-headline-xl mb-4">Eliminating Operational Chaos</h2>
          <p className="text-on-surface/75 dark:text-zinc-300 max-w-2xl mx-auto">
            Traditional restaurant groups bleed revenue through sync gaps. OmniServe creates a single source of truth.
          </p>
        </div>

        <div className="max-w-container-max mx-auto px-margin-desktop grid grid-cols-1 md:grid-cols-2 gap-12 reveal">
          {/* Traditional Card */}
          <div className="bg-[#f7f6fc] dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-12 rounded-[2.5rem] shadow-sm">
            <h3 className="font-headline-lg text-headline-lg mb-8 text-on-surface/60 dark:text-zinc-400">Traditional System</h3>
            <ul className="space-y-6">
              <li className="flex items-start space-x-4">
                <XCircle className="text-error shrink-0 mt-1" />
                <p className="text-on-surface/80 dark:text-zinc-300">Fragmented data across 5+ disconnected legacy apps</p>
              </li>
              <li className="flex items-start space-x-4">
                <XCircle className="text-error shrink-0 mt-1" />
                <p className="text-on-surface/80 dark:text-zinc-300">Manual, error-prone reconciliation of delivery channel reports</p>
              </li>
              <li className="flex items-start space-x-4">
                <XCircle className="text-error shrink-0 mt-1" />
                <p className="text-on-surface/80 dark:text-zinc-300">No real-time insight into kitchen SLA or cooking delay indicators</p>
              </li>
              <li className="flex items-start space-x-4">
                <XCircle className="text-error shrink-0 mt-1" />
                <p className="text-on-surface/80 dark:text-zinc-300">Frequent synchronization delays and offline order losses</p>
              </li>
              <li className="flex items-start space-x-4">
                <XCircle className="text-error shrink-0 mt-1" />
                <p className="text-on-surface/80 dark:text-zinc-300">High vendor commission leaks due to lack of direct brand channels</p>
              </li>
            </ul>
          </div>

          {/* OmniServe Card */}
          <div className="bg-gradient-to-br from-[#f3efff] to-[#e6dbff] dark:from-[#161224] dark:to-[#25173f] border border-[#6311f4]/25 dark:border-[#6311f4]/35 p-12 rounded-[2.5rem] text-on-surface dark:text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <CheckCheck className="w-32 h-32 text-brand-accent" />
            </div>
            <h3 className="font-headline-lg text-headline-lg mb-8 text-[#6311f4] dark:text-[#a07cff] font-bold">OmniServe Platform</h3>
            <ul className="space-y-6">
              <li className="flex items-start space-x-4">
                <CheckCircle className="text-[#6311f4] dark:text-green-400 shrink-0 mt-1" />
                <p className="text-on-surface/90 dark:text-zinc-200 font-medium">Single canonical source of truth for every dining & delivery channel</p>
              </li>
              <li className="flex items-start space-x-4">
                <CheckCircle className="text-[#6311f4] dark:text-green-400 shrink-0 mt-1" />
                <p className="text-on-surface/90 dark:text-zinc-200 font-medium">Auto-synced billing, guest session management, and inventory engine</p>
              </li>
              <li className="flex items-start space-x-4">
                <CheckCircle className="text-[#6311f4] dark:text-green-400 shrink-0 mt-1" />
                <p className="text-on-surface/90 dark:text-zinc-200 font-medium">Predictive analytics and real-time inventory waste calculations</p>
              </li>
              <li className="flex items-start space-x-4">
                <CheckCircle className="text-[#6311f4] dark:text-green-400 shrink-0 mt-1" />
                <p className="text-on-surface/90 dark:text-zinc-200 font-medium">Unified AI Copilot assisting staff with menu optimization and customer insights</p>
              </li>
              <li className="flex items-start space-x-4">
                <CheckCircle className="text-[#6311f4] dark:text-green-400 shrink-0 mt-1" />
                <p className="text-on-surface/90 dark:text-zinc-200 font-medium">Real-time socket network keeping orders, kitchen displays, and dispatch in sync instantly</p>
              </li>
              <li className="flex items-start space-x-4">
                <CheckCircle className="text-[#6311f4] dark:text-green-400 shrink-0 mt-1" />
                <p className="text-on-surface/90 dark:text-zinc-200 font-medium">Inbuilt VectorDB & RAG engine enabling instant semantic search across all catalogs</p>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Technology Stack Grid */}
      <section className="py-section-gap bg-surface-container-low dark:bg-zinc-950/20 transition-colors duration-300" id="tech">
        <div className="max-w-container-max mx-auto px-margin-desktop text-center mb-16 reveal">
          <h2 className="font-headline-xl text-headline-xl mb-4 font-bold">Built for Extreme Scale</h2>
          <p className="text-on-surface/75 dark:text-zinc-300 max-w-xl mx-auto">
            Our technology grid delivers sub-second synchronization and offline fail-safes.
          </p>
        </div>

        <div className="max-w-container-max mx-auto px-margin-desktop reveal">
          <div className="grid grid-cols-2 md:grid-cols-9 gap-6 text-center items-start">
            {[
              { label: 'React', desc: 'Frontend', color: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' },
              { label: 'Node', desc: 'Backend', color: 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400' },
              { label: 'Redis', desc: 'Caching', color: 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400' },
              { label: 'Mongo', desc: 'Database', color: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' },
              { label: 'WS', desc: 'Real-time', color: 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400' },
              { label: 'Bus', desc: 'Events', color: 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400' },
              { label: 'Vector', desc: 'VectorDB', color: 'bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400' },
              { label: 'Graph', desc: 'GraphDB', color: 'bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400' },
              { label: 'RAG', desc: 'RAG Engine', color: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' }
            ].map((tech) => (
              <div key={tech.label} className="space-y-3 group cursor-default">
                <div className={`h-20 w-20 mx-auto rounded-2xl flex items-center justify-center font-bold text-lg transition-transform duration-300 group-hover:scale-105 ${tech.color} border border-black/5 dark:border-white/5 shadow-xs`}>
                  {tech.label}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-on-surface/50 dark:text-zinc-500 font-bold">{tech.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Meet Our Team */}
      <section className="py-section-gap">
        <div className="max-w-container-max mx-auto px-margin-desktop text-center mb-16 reveal">
          <h2 className="font-headline-xl text-headline-xl mb-4 font-bold">The Minds Behind OmniServe</h2>
          <p className="text-on-surface/75 dark:text-zinc-300">Experts in operations, scale engineering, and product systems.</p>
        </div>
        <div className="max-w-container-max mx-auto px-margin-desktop grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 reveal">
          {teamMembers.map((member) => (
            <div key={member.name} className="text-center group bg-white/30 dark:bg-zinc-900/30 p-6 rounded-3xl border border-gray-100 dark:border-zinc-800 transition-all hover:-translate-y-1">
              <div className="w-40 h-40 mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-[#6311f4]/15 rounded-full group-hover:scale-105 transition-transform duration-500"></div>
                <img
                  className="w-32 h-32 rounded-full mx-auto relative top-4 object-cover"
                  src={member.image}
                  alt={member.name}
                />
              </div>
              <h4 className="font-bold text-lg dark:text-zinc-100">{member.name}</h4>
              <p className="text-xs text-[#6311f4] dark:text-[#a07cff] font-bold uppercase tracking-wider mt-1.5">{member.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-section-gap bg-surface-container-low dark:bg-zinc-950/20 transition-colors duration-300">
        <div className="max-w-container-max mx-auto px-margin-desktop grid grid-cols-1 md:grid-cols-3 gap-8 reveal">
          <div className="glass-card p-10 rounded-[2rem]">
            <div className="flex text-amber-500 mb-6 space-x-1">
              {[...Array(5)].map((_, i) => <Star key={i} className="fill-current w-4 h-4 text-amber-400 fill-amber-400" />)}
            </div>
            <p className="italic text-lg mb-8">"OmniServe reduced our operational leakage by 22% in the first quarter alone. The inventory automation is unmatched."</p>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-sm select-none border border-teal-500/20">JM</div>
              <div>
                <p className="font-bold dark:text-zinc-100 font-sans">Julia Mendez</p>
                <p className="text-xs dark:text-zinc-400 font-sans">Director, Gusto Group</p>
              </div>
            </div>
          </div>
          
          <div className="glass-card p-10 rounded-[2rem]">
            <div className="flex text-amber-500 mb-6 space-x-1">
              {[...Array(5)].map((_, i) => <Star key={i} className="fill-current w-4 h-4 text-amber-400 fill-amber-400" />)}
            </div>
            <p className="italic text-lg mb-8">"Finally, a platform that understands the complexity of multi-outlet kitchen displays. Real-time updates are truly real-time."</p>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-[#fc8a63]/10 text-[#fc8a63] dark:text-[#ff9c7a] flex items-center justify-center font-bold text-sm select-none border border-[#fc8a63]/20">KW</div>
              <div>
                <p className="font-bold dark:text-zinc-100 font-sans">Kenji Wu</p>
                <p className="text-xs dark:text-zinc-400 font-sans">Operations Lead, Urban Eats</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-10 rounded-[2rem]">
            <div className="flex text-amber-500 mb-6 space-x-1">
              {[...Array(5)].map((_, i) => <Star key={i} className="fill-current w-4 h-4 text-amber-400 fill-amber-400" />)}
            </div>
            <p className="italic text-lg mb-8">"Integrating with Swiggy and Zomato used to be a nightmare. With OmniServe, it's a one-click setup. Absolute game changer."</p>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-[#6311f4]/10 text-[#6311f4] dark:text-[#b490ff] flex items-center justify-center font-bold text-sm select-none border border-[#6311f4]/20">RH</div>
              <div>
                <p className="font-bold dark:text-zinc-100 font-sans">Robert Hart</p>
                <p className="text-xs dark:text-zinc-400 font-sans">Founder, Bistro Cloud</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ accordion section */}
      <section className="py-section-gap">
        <div className="max-w-3xl mx-auto px-margin-desktop reveal">
          <h2 className="font-headline-xl text-headline-xl mb-12 text-center font-bold">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: 'How long does implementation take?', a: 'Typically, a single outlet can be live within 48 hours. Enterprise groups with 50+ locations usually complete roll-out in 2-3 weeks.' },
              { q: 'Do you support offline mode?', a: 'Yes. Our local sync engine ensures KDS and Billing continue to function even during internet outages, syncing automatically when connection returns.' },
              { q: 'Can we integrate our ERP?', a: 'Absolutely. OmniServe has native webhooks and a RESTful API to connect with SAP, Oracle, and custom ERP solutions.' },
              { q: 'How does OmniServe ensure high availability and scale?', a: 'OmniServe is built on a distributed, event-driven architecture utilizing high-performance Redis caching, MongoDB databases, and PGVector database search. Our multi-tenant system is engineered to sustain high concurrency during peak dining hours.' },
              { q: 'What payment modes and aggregators are supported?', a: 'We support out-of-the-box integrations with major delivery channels like Swiggy and Zomato, as well as multiple digital payment methods (UPI, cards, wallets) through pre-integrated enterprise payment gateways.' },
              { q: 'Can I manage permissions and roles for different staff members?', a: 'Yes, OmniServe has built-in role-based access control. You can assign roles such as Super Admin, Outlet Manager, and Kitchen Staff, configuring specific permissions per location.' }
            ].map((faq, index) => (
              <div key={index} className="glass-card rounded-2xl overflow-hidden border border-gray-100 dark:border-zinc-800">
                <button
                  className="w-full p-6 text-left font-bold flex justify-between items-center hover:bg-gray-50 dark:hover:bg-zinc-900/40 transition-colors cursor-pointer"
                  onClick={() => toggleFaq(index)}
                >
                  <span className="text-on-surface dark:text-zinc-100 text-base">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-on-surface/50 dark:text-zinc-400 transition-transform duration-300 ${faqOpen[index] ? 'rotate-180' : 'rotate-0'}`} />
                </button>
                <div
                  className="px-6 transition-all duration-300 overflow-hidden"
                  style={{
                    maxHeight: faqOpen[index] ? '200px' : '0px',
                    paddingBottom: faqOpen[index] ? '1.5rem' : '0px',
                    paddingTop: faqOpen[index] ? '0.5rem' : '0px'
                  }}
                >
                  <p className="text-on-surface/85 dark:text-zinc-350 text-sm leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-section-gap bg-surface-container-low dark:bg-zinc-950/20 transition-colors duration-300">
        <div className="max-w-container-max mx-auto px-margin-desktop reveal">
          <div className="glass-card p-12 md:p-20 rounded-[3rem] bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#6311f4]/5 rounded-full -mr-32 -mt-32"></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
              <div>
                <h2 className="font-display-lg text-display-lg mb-6 text-on-surface dark:text-white">Reach Our Enterprise Team</h2>
                <p className="text-on-surface/80 dark:text-zinc-300 text-body-lg mb-10">
                  Ready to optimize your restaurant operations? Contact our solutions experts for a custom setup blueprint.
                </p>
                
                <div className="space-y-6">
                  <div className="flex items-center space-x-6">
                    <div className="w-14 h-14 bg-secondary-container dark:bg-zinc-800 flex items-center justify-center rounded-2xl border border-[#61f6ea]/20">
                      <Mail className="text-secondary dark:text-zinc-300 w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-on-surface/50 dark:text-zinc-500">Email Us</p>
                      <a className="text-lg font-bold hover:text-brand-accent transition-colors dark:text-zinc-200" href="mailto:yusuf.rgpv@gmail.com">yusuf.rgpv@gmail.com</a>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="w-14 h-14 bg-secondary-container dark:bg-zinc-800 flex items-center justify-center rounded-2xl border border-[#61f6ea]/20">
                      <Phone className="text-secondary dark:text-zinc-300 w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-on-surface/50 dark:text-zinc-500">Call Us</p>
                      <a className="text-lg font-bold hover:text-brand-accent transition-colors dark:text-zinc-200" href="tel:+919939608743">+91 99396 08743</a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#f7f6fc] dark:bg-zinc-950 p-8 rounded-3xl border border-gray-200 dark:border-zinc-850">
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                  <div className="grid grid-cols-2 gap-4">
                    <input className="w-full px-6 py-4 rounded-xl border border-outline-variant dark:border-zinc-800 focus:ring-brand-accent focus:border-brand-accent bg-white dark:bg-zinc-900 dark:text-zinc-200 font-sans text-sm outline-none" placeholder="First Name" type="text" />
                    <input className="w-full px-6 py-4 rounded-xl border border-outline-variant dark:border-zinc-800 focus:ring-brand-accent focus:border-brand-accent bg-white dark:bg-zinc-900 dark:text-zinc-200 font-sans text-sm outline-none" placeholder="Last Name" type="text" />
                  </div>
                  <input className="w-full px-6 py-4 rounded-xl border border-outline-variant dark:border-zinc-800 focus:ring-brand-accent focus:border-brand-accent bg-white dark:bg-zinc-900 dark:text-zinc-200 font-sans text-sm outline-none" placeholder="Work Email" type="email" />
                  <input className="w-full px-6 py-4 rounded-xl border border-outline-variant dark:border-zinc-800 focus:ring-brand-accent focus:border-brand-accent bg-white dark:bg-zinc-900 dark:text-zinc-200 font-sans text-sm outline-none" placeholder="Phone Number (Optional)" type="tel" />
                  <textarea className="w-full px-6 py-4 rounded-xl border border-outline-variant dark:border-zinc-800 focus:ring-brand-accent focus:border-brand-accent bg-white dark:bg-zinc-900 dark:text-zinc-200 font-sans text-sm outline-none" placeholder="How can we help?" rows="4"></textarea>
                  <button className="w-full py-4.5 bg-gradient-to-r from-[#6311f4] to-[#510cc4] text-white rounded-xl font-bold hover:scale-[1.01] transition-all shadow-md cursor-pointer" type="submit">Send Message</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-section-gap max-w-container-max mx-auto px-margin-desktop reveal">
        <div className="bg-[#0b1f4a] dark:bg-zinc-950 rounded-[3rem] p-16 md:p-24 text-center text-white relative overflow-hidden border border-white/5 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[#6311f4]/20 to-transparent"></div>
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="font-display-lg text-display-lg mb-8 leading-tight">Ready to Modernize Your Operations?</h2>
            <p className="text-lg text-zinc-200 mb-12">
              Join 1,200+ restaurant groups scaling seamlessly with OmniServe's integrated modules.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link className="px-10 py-5 bg-white text-[#6311f4] hover:bg-gray-50 rounded-2xl font-bold text-base hover:scale-105 transition-all shadow-md" to="/login">Let's Get Started</Link>
              <a href="#contact" className="px-10 py-5 bg-white/10 backdrop-blur-md rounded-2xl font-bold text-base border border-white/20 hover:bg-white/20 hover:scale-105 transition-all flex items-center justify-center text-white">Schedule a Call</a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-container-lowest dark:bg-[#0f0e11] rounded-t-[3rem] border-t border-outline-variant dark:border-zinc-850 transition-colors duration-300">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter px-margin-desktop py-16 max-w-container-max mx-auto reveal">
          <div className="space-y-6">
            <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2 select-none cursor-pointer">
              <img src="/omniserve_logo.png" alt="OmniServe Logo" className="h-9 w-auto object-contain" />
              <span className="font-headline-lg text-headline-lg font-bold text-on-surface dark:text-zinc-100 tracking-tight">OmniServe</span>
            </Link>
            <p className="text-on-surface dark:text-zinc-355 text-sm leading-relaxed font-sans">
              Empowering the world's best restaurants with the most advanced operational software on the market.
            </p>
            <div className="flex space-x-4">
              <TwitterIcon className="w-5 h-5 text-on-surface dark:text-zinc-300 cursor-pointer hover:text-brand-accent dark:hover:text-[#a07cff] transition-colors" />
              <LinkedinIcon className="w-5 h-5 text-on-surface dark:text-zinc-300 cursor-pointer hover:text-brand-accent dark:hover:text-[#a07cff] transition-colors" />
              <InstagramIcon className="w-5 h-5 text-on-surface dark:text-zinc-300 cursor-pointer hover:text-brand-accent dark:hover:text-[#a07cff] transition-colors" />
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-6 dark:text-zinc-200">Platform</h4>
            <ul className="space-y-4 text-sm text-on-surface dark:text-zinc-400">
              <li className="hover:text-brand-accent transition-colors cursor-pointer">Operations Cockpit</li>
              <li className="hover:text-brand-accent transition-colors cursor-pointer">Smart Inventory</li>
              <li className="hover:text-brand-accent transition-colors cursor-pointer">Unified Billing</li>
              <li className="hover:text-brand-accent transition-colors cursor-pointer">KDS Engine</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 dark:text-zinc-200">Security</h4>
            <ul className="space-y-4 text-sm text-on-surface dark:text-zinc-400">
              <li className="hover:text-brand-accent transition-colors cursor-pointer">Enterprise SLA</li>
              <li className="hover:text-brand-accent transition-colors cursor-pointer">Privacy Policy</li>
              <li className="hover:text-brand-accent transition-colors cursor-pointer">Data Encryption</li>
              <li className="hover:text-brand-accent transition-colors cursor-pointer">Audit Logs</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 dark:text-zinc-200">Support</h4>
            <ul className="space-y-4 text-sm text-on-surface dark:text-zinc-400">
              <li className="hover:text-brand-accent transition-colors cursor-pointer">API Docs</li>
              <li className="hover:text-brand-accent transition-colors cursor-pointer">Case Studies</li>
              <li className="hover:text-brand-accent transition-colors cursor-pointer">Knowledge Base</li>
              <li className="hover:text-brand-accent transition-colors cursor-pointer">Contact Us</li>
            </ul>
          </div>
        </div>
        <div className="max-w-container-max mx-auto px-margin-desktop py-8 border-t border-outline-variant/30 dark:border-zinc-800/40 flex justify-between items-center text-xs dark:text-zinc-400">
          <p>© 2024 OmniServe Enterprise Solutions. All rights reserved.</p>
          <div className="flex space-x-6">
            <span className="cursor-pointer hover:underline">Terms of Service</span>
            <span className="cursor-pointer hover:underline">Privacy Policy</span>
            <span className="cursor-pointer hover:underline">Cookies</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
