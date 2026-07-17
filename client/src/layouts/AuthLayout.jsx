import { Outlet, Navigate, Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { useState } from 'react';
import { CheckCircle, Star } from 'lucide-react';

export default function AuthLayout() {
  const { isAuthenticated } = useAuth();
  const { theme, selectTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen font-body-md text-on-surface dark:text-zinc-100 antialiased bg-pattern bg-surface-subtle dark:bg-zinc-950 flex items-center justify-center p-4 md:p-8 relative transition-colors duration-300">
      
      {/* Floating Theme Selector */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={() => setShowThemeMenu(!showThemeMenu)}
          className="p-2.5 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-full text-on-surface-variant dark:text-zinc-400 hover:text-primary dark:hover:text-primary transition-all duration-200 shadow-sm flex items-center justify-center cursor-pointer active:scale-95"
          aria-label="Toggle Theme"
        >
          <span className="material-symbols-outlined text-[20px]">
            {theme === 'light' ? 'light_mode' : theme === 'dark' ? 'dark_mode' : 'desktop_windows'}
          </span>
        </button>
        {showThemeMenu && (
          <div className="absolute right-0 mt-2 w-36 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl shadow-lg p-1 z-50 animate-scale-in">
            {['light', 'dark', 'system'].map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  selectTheme(mode);
                  setShowThemeMenu(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] font-semibold rounded-lg transition-colors cursor-pointer capitalize ${
                  theme === mode
                    ? 'bg-primary/10 text-primary dark:text-zinc-200'
                    : 'text-on-surface-variant dark:text-zinc-400 hover:bg-surface-container-low dark:hover:bg-zinc-800'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {mode === 'light' ? 'light_mode' : mode === 'dark' ? 'dark_mode' : 'desktop_windows'}
                </span>
                <span>{mode}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Container */}
      <main className="w-full max-w-3xl bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row transition-all duration-300 min-h-[520px]">
        
        {/* Left Column: Restro Info (Marketing Showcase) */}
        <div className="hidden md:flex md:w-1/2 flex-col justify-between p-8 bg-gradient-to-br from-[#120f1e] to-[#25173f] text-white relative overflow-hidden select-none border-r border-white/5">
          {/* Decorative Glow Orbs */}
          <div className="absolute top-0 left-0 w-48 h-48 bg-[#6311f4]/15 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-[#61f6ea]/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Logo & Header */}
          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <img src="/omniserve_logo.png" alt="OmniServe Logo" className="h-8 w-auto object-contain" />
              <span className="font-hanken text-xl font-bold text-white tracking-tight">OmniServe</span>
            </Link>
            
            <h2 className="text-xl font-bold leading-snug mb-3 text-zinc-100">
              The OS for Modern Restaurants
            </h2>
            <p className="text-zinc-400 text-xs mb-6 max-w-sm">
              Streamline your outlets with automated routing, inventory controls, and live SLA audits.
            </p>

            {/* Checklist */}
            <ul className="space-y-4">
              {[
                { title: 'Super Operations Cockpit', desc: 'Monitor orders and guest sessions live.' },
                { title: 'Smart KDS Dispatcher', desc: 'Lag-free order coordination across stations.' },
                { title: 'Automatic Inventory Sheets', desc: 'Real-time stock depletion linked to billing.' },
                { title: 'AI Copilot Predictions', desc: 'Harness VectorDB & AI Copilot to cut ingredient costs.' }
              ].map((item, idx) => (
                <li key={idx} className="flex items-start space-x-2.5 text-xs">
                  <CheckCircle className="text-green-400 w-4.5 h-4.5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-zinc-200 leading-none mb-0.5">{item.title}</h4>
                    <p className="text-zinc-400 text-[11px]">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Testimonial Quote */}
          <div className="relative z-10 pt-6 border-t border-white/10 mt-6">
            <div className="flex text-amber-400 mb-2 space-x-0.5">
              {[...Array(5)].map((_, i) => <Star key={i} className="fill-current w-3.5 h-3.5" />)}
            </div>
            <p className="italic text-zinc-300 text-[11px] mb-2 leading-relaxed">
              "OmniServe reduced our operational leakages by 22% in month one. The auto inventory sheets are unmatched."
            </p>
            <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
              Julia Mendez — Gusto Group
            </div>
          </div>
        </div>

        {/* Right Column: Info Collection (Auth Form) */}
        <div className="w-full md:w-1/2 p-8 flex flex-col justify-center bg-white dark:bg-zinc-900 relative">
          
          {/* Mobile Logo Branding */}
          <div className="md:hidden flex items-center gap-2 mb-6 justify-center select-none">
            <img src="/omniserve_logo.png" alt="OmniServe Logo" className="h-7 w-auto object-contain" />
            <span className="font-hanken text-xl font-bold text-primary tracking-tight">OmniServe</span>
          </div>

          <div className="w-full max-w-[320px] mx-auto">
            <Outlet />
          </div>
        </div>

      </main>
    </div>
  );
}
