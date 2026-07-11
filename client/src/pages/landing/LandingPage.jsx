import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  CheckCheck
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

  const toggleFaq = (index) => {
    setFaqOpen((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

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

  const teamMembers = [
    { name: 'Md Yusuf', image: '/images/landingpage/yusuf.png' },
    { name: 'Samir Kumar Singh', image: '/images/landingpage/samir.jpg' },
    { name: 'Nitish Kumar', image: '/images/landingpage/nitish.jpg' },
    { name: 'Ajay Rathore', image: '/images/landingpage/ajay.jpg' }
  ];

  return (
    <div className="landing-page bg-background text-on-surface font-body-lg overflow-x-hidden selection:bg-secondary-container selection:text-on-secondary-container">
      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-lg border-b border-[#6311f4]/10 shadow-xs transition-all duration-500">
        <div className="flex justify-between items-center h-20 px-margin-desktop max-w-container-max mx-auto">
          <div className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">OmniServe</div>
          <div className="hidden md:flex items-center space-x-10">
            <a href="#product" className="text-on-surface hover:text-brand-accent transition-colors duration-300 font-body-md text-body-md">Product</a>
            <a href="#solutions" className="text-on-surface hover:text-brand-accent transition-colors duration-300 font-body-md text-body-md">Solutions</a>
            <a href="#tech" className="text-on-surface hover:text-brand-accent transition-colors duration-300 font-body-md text-body-md">Technology</a>
            <a href="#contact" className="text-on-surface hover:text-brand-accent transition-colors duration-300 font-body-md text-body-md">Contact</a>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/login" className="px-8 py-3 bg-[#6311f4] text-white rounded-full font-bold transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg">Let's Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-section-gap overflow-hidden">
        <div className="max-w-container-max mx-auto px-margin-desktop grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="reveal">
            <div className="inline-flex items-center space-x-2 bg-[#fc8a63]/10 px-4 py-1.5 rounded-full mb-8">
              <span className="w-2 h-2 rounded-full bg-[#014c05] animate-pulse"></span>
              <span className="text-[#159309] font-semibold text-label-sm uppercase tracking-widest">Enterprise Ready</span>
            </div>
            <h1 className="font-display-lg text-display-lg leading-[1.1] mb-8 text-on-surface">
              One Platform.<br />
              <span className="text-brand-accent">Every Restaurant</span><br />
              Operation.
            </h1>
            <p className="text-on-surface text-body-lg mb-10 max-w-lg">
              Unify your front-of-house, kitchen, inventory, and delivery aggregators into a single, canonical data stream. Scale with OmniServe.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/login" className="px-10 py-5 bg-[#6311f4] text-white rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-[#520dd4] transition-transform shadow-xl">
                <span>Let's Get Started</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button className="px-10 py-5 glass-card rounded-2xl font-bold flex items-center justify-center space-x-2 group">
                <PlayCircle className="w-5 h-5 group-hover:text-brand-accent transition-colors" />
                <span>Book Demo</span>
              </button>
            </div>
          </div>
          <div className="relative reveal delay-200">
            <div className="absolute -inset-10 bg-secondary-container/20 blur-[100px] rounded-full z-0"></div>
            <img src="/images/landingpage/hero.jpg" className="w-full max-h-[480px] object-cover rounded-3xl relative z-10 shadow-2xl animate-float" alt="OmniServe Platform Visualization" />
          </div>
        </div>
      </section>

      {/* Integrations Control Center */}
      <section id="solutions" className="py-section-gap bg-surface-container-low">
        <div className="max-w-container-max mx-auto px-margin-desktop reveal">
          <div className="glass-card p-4 md:p-8 rounded-[2.5rem] relative overflow-hidden bg-white/40">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-headline-xl text-headline-xl mb-4">Integrations Control Center</h2>
                <p className="text-on-surface mb-6">OmniServe acts as the central intelligence for your entire stack. Monitor sync health, manage circuit breakers, and ensure data integrity across Swiggy, Zomato, and your direct channels from a single 'Live Look' interface.</p>
              </div>
              <div className="relative group">
                <img alt="OmniServe Integrations Control Center" className="w-full h-auto rounded-2xl shadow-2xl transform transition-transform group-hover:scale-[1.02]" src="/images/landingpage/integrations.png" />
                <div className="absolute inset-0 rounded-2xl ring-1 ring-black/10"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Modules Bento */}
      <section className="py-section-gap" id="product">
        <div className="max-w-container-max mx-auto px-margin-desktop mb-20 flex justify-between items-end">
          <div className="reveal">
            <h2 className="font-headline-xl text-headline-xl mb-4">Powerful Core Modules</h2>
            <p className="text-on-surface max-w-xl">Every tool you need to run an enterprise-grade restaurant group, available in one unified dashboard.</p>
          </div>
        </div>
        <div className="max-w-container-max mx-auto px-margin-desktop grid grid-cols-2 md:grid-cols-4 gap-6 reveal">
          <div className="glass-card p-8 rounded-3xl group">
            <Monitor className="w-8 h-8 mb-6 text-brand-accent group-hover:scale-110 transition-transform" />
            <h3 className="font-bold mb-2">Restaurant Ops</h3>
            <p className="text-sm ">Real-time hub for every outlet activity.</p>
          </div>
          <div className="glass-card p-8 rounded-3xl group">
            <ChefHat className="w-8 h-8 mb-6 text-brand-accent group-hover:scale-110 transition-transform" />
            <h3 className="font-bold mb-2">KDS</h3>
            <p className="text-sm ">Smart kitchen display routing.</p>
          </div>
          <div className="glass-card p-8 rounded-3xl group">
            <Package className="w-8 h-8 mb-6 text-brand-accent group-hover:scale-110 transition-transform" />
            <h3 className="font-bold mb-2">Inventory</h3>
            <p className="text-sm ">Automated waste and stock tracking.</p>
          </div>
          <div className="glass-card p-8 rounded-3xl group">
            <CreditCard className="w-8 h-8 mb-6 text-brand-accent group-hover:scale-110 transition-transform" />
            <h3 className="font-bold mb-2">Billing</h3>
            <p className="text-sm ">Multi-modal checkout experience.</p>
          </div>
          <div className="glass-card p-8 rounded-3xl group">
            <BarChart3 className="w-8 h-8 mb-6 text-brand-accent group-hover:scale-110 transition-transform" />
            <h3 className="font-bold mb-2">Analytics</h3>
            <p className="text-sm ">Predictive demand & revenue maps.</p>
          </div>
          <div className="glass-card p-8 rounded-3xl group">
            <Calendar className="w-8 h-8 mb-6 text-brand-accent group-hover:scale-110 transition-transform" />
            <h3 className="font-bold mb-2">Reservations</h3>
            <p className="text-sm ">Unified table management engine.</p>
          </div>
          <div className="glass-card p-8 rounded-3xl group">
            <Scan className="w-8 h-8 mb-6 text-brand-accent group-hover:scale-110 transition-transform" />
            <h3 className="font-bold mb-2">QR Ordering</h3>
            <p className="text-sm ">Zero-latency mobile menus.</p>
          </div>
          <div className="glass-card p-8 rounded-3xl group">
            <LinkIcon className="w-8 h-8 mb-6 text-brand-accent group-hover:scale-110 transition-transform" />
            <h3 className="font-bold mb-2">Integrations</h3>
            <p className="text-sm ">Native sync with major aggregators.</p>
          </div>
          <div className="glass-card p-8 rounded-3xl group">
            <Bell className="w-8 h-8 mb-6 text-brand-accent group-hover:scale-110 transition-transform" />
            <h3 className="font-bold mb-2">Notifications</h3>
            <p className="text-sm ">Omnichannel staff & guest alerts.</p>
          </div>
          <div className="glass-card p-8 rounded-3xl group">
            <Zap className="w-8 h-8 mb-6 text-brand-accent group-hover:scale-110 transition-transform" />
            <h3 className="font-bold mb-2">Event Bus</h3>
            <p className="text-sm ">Event-driven webhooks for scale.</p>
          </div>
          <div className="glass-card p-8 rounded-3xl group">
            <Users className="w-8 h-8 mb-6 text-brand-accent group-hover:scale-110 transition-transform" />
            <h3 className="font-bold mb-2">Staff Mgmt</h3>
            <p className="text-sm ">Role-based access & payroll sync.</p>
          </div>
          <div className="glass-card p-8 rounded-3xl group">
            <FileText className="w-8 h-8 mb-6 text-brand-accent group-hover:scale-110 transition-transform" />
            <h3 className="font-bold mb-2">Menu Mgmt</h3>
            <p className="text-sm ">Global catalog distribution.</p>
          </div>
        </div>
      </section>

      {/* Product Screen Preview / Operations Cockpit */}
      <section className="py-section-gap bg-[#0b1f4a] text-white overflow-hidden">
        <div className="max-w-container-max mx-auto px-margin-desktop grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
          <div className="reveal">
            <h2 className="font-headline-xl text-headline-xl mb-8">The Operations Cockpit</h2>
            <div className="space-y-6">
              <div className="flex items-start space-x-4 p-6 bg-white/5 rounded-2xl border border-white/10">
                <Layout className="text-brand-accent shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold mb-1">Super Admin Console</h4>
                  <p className="text-sm text-zinc-200">Global dashboard metrics and active operations across all restaurant locations.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4 p-6 bg-white/5 rounded-2xl border border-white/10">
                <Activity className="text-brand-accent shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold mb-1">Real-time Order Flow</h4>
                  <p className="text-sm text-zinc-200">Monitor live orders across all channels with zero lag using OmniServe's internal event bus.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4 p-6 bg-white/5 rounded-2xl border border-white/10">
                <TrendingUp className="text-brand-accent shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold mb-1">SLA Analytics</h4>
                  <p className="text-sm text-zinc-200">Track kitchen preparation times and waiter efficiency in real-time.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative reveal delay-200">
            <img alt="OmniServe Super Admin Console" className="w-full h-auto rounded-[2rem] shadow-2xl border border-white/10" src="/images/landingpage/cockpit.png" />
            <div className="absolute -bottom-10 -left-10 glass-card p-6 rounded-2xl text-on-surface w-64 border-l-4 border-brand-accent hidden md:block">
              <p className="text-sm font-bold mb-1">Global Revenue</p>
              <div className="h-12 flex items-end space-x-1">
                <div className="w-full bg-brand-accent/20 h-4 rounded-t"></div>
                <div className="w-full bg-brand-accent/40 h-8 rounded-t"></div>
                <div className="w-full bg-brand-accent/60 h-6 rounded-t"></div>
                <div className="w-full bg-brand-accent h-10 rounded-t"></div>
              </div>
              <p className="text-xs mt-2 text-green-600 font-bold">+15% Growth Rate</p>
            </div>
          </div>
        </div>
      </section>

      {/* Analytics Section */}
      <section className="py-section-gap bg-surface-container-low">
        <div className="max-w-container-max mx-auto px-margin-desktop grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="reveal order-2 lg:order-1">
            <img alt="OmniServe Analytics Dashboard" className="w-full h-auto rounded-3xl shadow-2xl border border-outline-variant" src="/images/landingpage/analytics.png" />
          </div>
          <div className="reveal order-1 lg:order-2">
            <h2 className="font-headline-xl text-headline-xl mb-6">Live Insights & Analytics</h2>
            <p className="text-on-surface mb-8 text-body-lg">Stop guessing. OmniServe provides a real-time view of revenue, order volume, and outlet performance. Drill down into specific regions or view your entire enterprise scope at a glance.</p>
            <div className="grid grid-cols-2 gap-6">
              <div className="glass-card p-6 rounded-2xl">
                <div className="text-brand-accent font-bold text-2xl mb-1">105+</div>
                <p className="text-xs  font-bold uppercase tracking-wider">Outlets in Scope</p>
              </div>
              <div className="glass-card p-6 rounded-2xl">
                <div className="text-brand-accent font-bold text-2xl mb-1">₹85,070</div>
                <p className="text-xs  font-bold uppercase tracking-wider">Daily Revenue</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Order Journey */}
      <section className="py-section-gap">
        <div className="max-w-container-max mx-auto px-margin-desktop text-center mb-16 reveal">
          <h2 className="font-headline-xl text-headline-xl mb-6">The Seamless Order Journey</h2>
          <p className="text-on-surface max-w-2xl mx-auto">From the first click to the final delivery, OmniServe choreographs every step with precision.</p>
        </div>
        <div className="max-w-container-max mx-auto px-margin-desktop reveal">
          <div className="relative group">
            <img alt="OmniServe Orders List View" className="w-full h-auto rounded-3xl shadow-2xl" src="/images/landingpage/orders.png" />
            <div className="absolute inset-0 bg-gradient-to-t from-on-surface/20 to-transparent pointer-events-none rounded-3xl"></div>
          </div>
          <p className="mt-8 text-center text-on-surface italic font-body-md">Manage live customer orders, update kitchen preparation stages, and handle delivery handoffs in one fluid list.</p>
        </div>
      </section>

      {/* Staff Management */}
      <section className="py-section-gap bg-surface-container-low overflow-hidden">
        <div className="max-w-container-max mx-auto px-margin-desktop grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-5 reveal">
            <h2 className="font-headline-xl text-headline-xl mb-6">Effortless Staff Management</h2>
            <p className="text-on-surface mb-8">Manage team access and roles across hundreds of outlets. Create platform users and send invitation access from one central place.</p>
            <ul className="space-y-4">
              <li className="flex items-center space-x-3">
                <span className="w-2 h-2 rounded-full bg-brand-accent"></span>
                <span className="font-medium">Role-based access control</span>
              </li>
              <li className="flex items-center space-x-3">
                <span className="w-2 h-2 rounded-full bg-brand-accent"></span>
                <span className="font-medium">Outlet-specific permissions</span>
              </li>
              <li className="flex items-center space-x-3">
                <span className="w-2 h-2 rounded-full bg-brand-accent"></span>
                <span className="font-medium">Centralized audit logs</span>
              </li>
            </ul>
          </div>
          <div className="lg:col-span-7 reveal delay-200">
            <img alt="OmniServe Staff Management Interface" className="w-full h-auto rounded-[2rem] shadow-2xl border border-outline-variant" src="/images/landingpage/staff.png" />
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="py-section-gap" id="tech">
        <div className="max-w-container-max mx-auto px-margin-desktop text-center mb-20 reveal">
          <h2 className="font-headline-xl text-headline-xl mb-4">Built for Scale</h2>
          <p className="text-on-surface">OmniServe\'s enterprise architecture ensures 99.9% uptime and sub-second latency.</p>
        </div>
        <div className="max-w-container-max mx-auto px-margin-desktop reveal">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 text-center">
            <div className="space-y-4">
              <div className="h-20 w-20 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-bold text-xl">React</div>
              <p className="text-sm font-bold ">Frontend</p>
            </div>
            <div className="space-y-4">
              <div className="h-20 w-20 mx-auto bg-green-50 rounded-2xl flex items-center justify-center text-green-600 font-bold text-xl">Node</div>
              <p className="text-sm font-bold ">Backend</p>
            </div>
            <div className="space-y-4">
              <div className="h-20 w-20 mx-auto bg-red-50 rounded-2xl flex items-center justify-center text-red-600 font-bold text-xl">Redis</div>
              <p className="text-sm font-bold ">Caching</p>
            </div>
            <div className="space-y-4">
              <div className="h-20 w-20 mx-auto bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 font-bold text-xl">Mongo</div>
              <p className="text-sm font-bold ">Database</p>
            </div>
            <div className="space-y-4">
              <div className="h-20 w-20 mx-auto bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 font-bold text-xl">WS</div>
              <p className="text-sm font-bold ">Real-time</p>
            </div>
            <div className="space-y-4">
              <div className="h-20 w-20 mx-auto bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 font-bold text-xl">Bus</div>
              <p className="text-sm font-bold ">Events</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why OmniServe */}
      <section className="py-section-gap bg-surface-container">
        <div className="max-w-container-max mx-auto px-margin-desktop grid grid-cols-1 md:grid-cols-2 gap-12 reveal">
          <div className="bg-[#f7f6fc] p-12 rounded-[2.5rem] shadow-xs">
            <h3 className="font-headline-lg text-headline-lg mb-8 text-on-surface/40">Traditional System</h3>
            <ul className="space-y-6">
              <li className="flex items-start space-x-4">
                <XCircle className="text-error shrink-0 mt-1" />
                <p>Fragmented data across 5+ disconnected apps</p>
              </li>
              <li className="flex items-start space-x-4">
                <XCircle className="text-error shrink-0 mt-1" />
                <p>Manual reconciliation of delivery reports</p>
              </li>
              <li className="flex items-start space-x-4">
                <XCircle className="text-error shrink-0 mt-1" />
                <p>No real-time insight into kitchen SLA</p>
              </li>
            </ul>
          </div>
          <div className="bg-on-surface p-12 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <CheckCheck className="w-32 h-32 text-brand-accent" />
            </div>
            <h3 className="font-headline-lg text-headline-lg mb-8 text-brand-accent">OmniServe Platform</h3>
            <ul className="space-y-6">
              <li className="flex items-start space-x-4">
                <CheckCircle className="text-brand-accent shrink-0 mt-1" />
                <p>Single source of truth for every operation</p>
              </li>
              <li className="flex items-start space-x-4">
                <CheckCircle className="text-brand-accent shrink-0 mt-1" />
                <p>Auto-synced billing and inventory engine</p>
              </li>
              <li className="flex items-start space-x-4">
                <CheckCircle className="text-brand-accent shrink-0 mt-1" />
                <p>Predictive analytics for inventory waste</p>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Meet Our Team */}
      <section className="py-section-gap">
        <div className="max-w-container-max mx-auto px-margin-desktop text-center mb-16 reveal">
          <h2 className="font-headline-xl text-headline-xl mb-4">The Minds Behind OmniServe</h2>
          <p className="text-on-surface">Experts in hospitality, engineering, and product design.</p>
        </div>
        <div className="max-w-container-max mx-auto px-margin-desktop grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 reveal">
          {teamMembers.map((member) => (
            <div key={member.name} className="text-center group">
              <div className="w-48 h-48 mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-brand-accent/10 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
                <img
                  className="w-40 h-40 rounded-full mx-auto relative top-4 object-cover"
                  src={member.image}
                  alt={member.name}
                />
              </div>
              <h4 className="font-bold text-lg">{member.name}</h4>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-section-gap bg-surface-container-low">
        <div className="max-w-container-max mx-auto px-margin-desktop grid grid-cols-1 md:grid-cols-3 gap-8 reveal">
          <div className="glass-card p-10 rounded-[2rem]">
            <div className="flex text-brand-accent mb-6 space-x-1">
              {[...Array(5)].map((_, i) => <Star key={i} className="fill-current w-4 h-4" />)}
            </div>
            <p className="italic text-lg mb-8">"OmniServe reduced our operational leakage by 22% in the first quarter alone. The inventory automation is unmatched."</p>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-gray-200"></div>
              <div>
                <p className="font-bold">Julia Mendez</p>
                <p className="text-xs ">Director, Gusto Group</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-10 rounded-[2rem] bg-[#0b1f4a] text-white">
            <div className="flex text-brand-accent mb-6 space-x-1">
              {[...Array(5)].map((_, i) => <Star key={i} className="fill-current w-4 h-4" />)}
            </div>
            <p className="italic text-lg mb-8">"Finally, a platform that understands the complexity of multi-outlet kitchen displays. Real-time updates are truly real-time."</p>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-white/20"></div>
              <div>
                <p className="font-bold">Kenji Wu</p>
                <p className="text-xs ">Operations Lead, Urban Eats</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-10 rounded-[2rem]">
            <div className="flex text-brand-accent mb-6 space-x-1">
              {[...Array(5)].map((_, i) => <Star key={i} className="fill-current w-4 h-4" />)}
            </div>
            <p className="italic text-lg mb-8">"Integrating with Swiggy and Zomato used to be a nightmare. With OmniServe, it's a one-click setup. Absolute game changer."</p>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-gray-200"></div>
              <div>
                <p className="font-bold">Robert Hart</p>
                <p className="text-xs ">Founder, Bistro Cloud</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-section-gap">
        <div className="max-w-3xl mx-auto px-margin-desktop reveal">
          <h2 className="font-headline-xl text-headline-xl mb-12 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: 'How long does implementation take?', a: 'Typically, a single outlet can be live within 48 hours. Enterprise groups with 50+ locations usually complete roll-out in 2-3 weeks.' },
              { q: 'Do you support offline mode?', a: 'Yes. Our local sync engine ensures KDS and Billing continue to function even during internet outages, syncing automatically when connection returns.' },
              { q: 'Can we integrate our ERP?', a: 'Absolutely. OmniServe has native webhooks and a RESTful API to connect with SAP, Oracle, and custom ERP solutions.' }
            ].map((faq, index) => (
              <div key={index} className="glass-card rounded-2xl overflow-hidden">
                <button
                  className="w-full p-6 text-left font-bold flex justify-between items-center hover:bg-surface-container transition-colors"
                  onClick={() => toggleFaq(index)}
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${faqOpen[index] ? 'rotate-180' : 'rotate-0'}`} />
                </button>
                <div
                  className="px-6 transition-all duration-300 overflow-hidden"
                  style={{
                    maxHeight: faqOpen[index] ? '200px' : '0px',
                    paddingBottom: faqOpen[index] ? '1.5rem' : '0px',
                    paddingTop: faqOpen[index] ? '0.5rem' : '0px'
                  }}
                >
                  <p className="text-on-surface">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section id="contact" className="py-section-gap bg-surface-container">
        <div className="max-w-container-max mx-auto px-margin-desktop reveal">
          <div className="glass-card p-12 md:p-20 rounded-[3rem] bg-white border border-outline-variant shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-accent/5 rounded-full -mr-32 -mt-32"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
              <div>
                <h2 className="font-display-lg text-display-lg mb-6">Contact Us</h2>
                <p className="text-on-surface text-body-lg mb-10">Ready to transform your restaurant operations? Reach out to our enterprise team for a custom consultation.</p>
                <div className="space-y-6">
                  <div className="flex items-center space-x-6">
                    <div className="w-14 h-14 bg-secondary-container flex items-center justify-center rounded-2xl">
                      <Mail className="text-secondary w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm  font-bold uppercase tracking-wider">Email Us</p>
                      <a className="text-lg font-bold hover:text-brand-accent transition-colors" href="mailto:yusuf.rgpv@gmail.com">yusuf.rgpv@gmail.com</a>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="w-14 h-14 bg-secondary-container flex items-center justify-center rounded-2xl">
                      <Phone className="text-secondary w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm  font-bold uppercase tracking-wider">Call Us</p>
                      <a className="text-lg font-bold hover:text-brand-accent transition-colors" href="tel:+919939608743">+91 99396 08743</a>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-surface-container-low p-8 rounded-3xl border border-outline-variant">
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                  <div className="grid grid-cols-2 gap-4">
                    <input className="w-full px-6 py-4 rounded-xl border border-outline-variant focus:ring-brand-accent focus:border-brand-accent bg-white" placeholder="First Name" type="text" />
                    <input className="w-full px-6 py-4 rounded-xl border border-outline-variant focus:ring-brand-accent focus:border-brand-accent bg-white" placeholder="Last Name" type="text" />
                  </div>
                  <input className="w-full px-6 py-4 rounded-xl border border-outline-variant focus:ring-brand-accent focus:border-brand-accent bg-white" placeholder="Work Email" type="email" />
                  <textarea className="w-full px-6 py-4 rounded-xl border border-outline-variant focus:ring-brand-accent focus:border-brand-accent bg-white" placeholder="How can we help?" rows="4"></textarea>
                  <button className="w-full py-5 bg-[#6311f4] text-white rounded-xl font-bold hover:bg-[#520dd4] transition-colors shadow-lg" type="submit">Send Message</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-section-gap max-w-container-max mx-auto px-margin-desktop reveal">
        <div className="bg-[#0b1f4a] rounded-[3rem] p-16 md:p-24 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/20 to-transparent"></div>
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="font-display-lg text-display-lg mb-8">Ready to modernize?</h2>
            <p className="text-xl text-white mb-12">Join 1,200+ restaurant groups worldwide using OmniServe to orchestrate their operations.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link className="px-12 py-6 bg-white text-[#6311f4] rounded-2xl font-bold text-lg hover:scale-105 transition-transform shadow-xl" to="/login">Let's Get Started</Link>
              <button className="px-12 py-6 bg-white/10 backdrop-blur-md rounded-2xl font-bold text-lg border border-white/20 hover:bg-white/20 transition-all">Schedule a Call</button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-container-lowest rounded-t-[3rem] border-t border-outline-variant">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter px-margin-desktop py-16 max-w-container-max mx-auto reveal">
          <div className="space-y-6">
            <div className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">OmniServe</div>
            <p className="text-on-surface text-sm">Empowering the world's best restaurants with the most advanced operational software on the market.</p>
            <div className="flex space-x-4">
              <TwitterIcon className="w-5 h-5 text-on-surface cursor-pointer hover:text-brand-accent transition-colors" />
              <LinkedinIcon className="w-5 h-5 text-on-surface cursor-pointer hover:text-brand-accent transition-colors" />
              <InstagramIcon className="w-5 h-5 text-on-surface cursor-pointer hover:text-brand-accent transition-colors" />
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-6">Platform</h4>
            <ul className="space-y-4 text-sm text-on-surface">
              <li className="hover:text-brand-accent transition-colors cursor-pointer">Operations Cockpit</li>
              <li className="hover:text-brand-accent transition-colors cursor-pointer">Smart Inventory</li>
              <li className="hover:text-brand-accent transition-colors cursor-pointer">Unified Billing</li>
              <li className="hover:text-brand-accent transition-colors cursor-pointer">KDS Engine</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6">Security</h4>
            <ul className="space-y-4 text-sm text-on-surface">
              <li className="hover:text-brand-accent transition-colors cursor-pointer">Enterprise SLA</li>
              <li className="hover:text-brand-accent transition-colors cursor-pointer">Privacy Policy</li>
              <li className="hover:text-brand-accent transition-colors cursor-pointer">Data Encryption</li>
              <li className="hover:text-brand-accent transition-colors cursor-pointer">Audit Logs</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6">Support</h4>
            <ul className="space-y-4 text-sm text-on-surface">
              <li className="hover:text-brand-accent transition-colors cursor-pointer">API Docs</li>
              <li className="hover:text-brand-accent transition-colors cursor-pointer">Case Studies</li>
              <li className="hover:text-brand-accent transition-colors cursor-pointer">Knowledge Base</li>
              <li className="hover:text-brand-accent transition-colors cursor-pointer">Contact Us</li>
            </ul>
          </div>
        </div>
        <div className="max-w-container-max mx-auto px-margin-desktop py-8 border-t border-outline-variant/30 flex justify-between items-center text-xs ">
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
