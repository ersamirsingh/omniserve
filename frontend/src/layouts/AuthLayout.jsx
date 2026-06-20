import { Outlet, Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { useState } from 'react';

export default function AuthLayout() {
  const { isAuthenticated } = useAuth();
  const { theme, selectTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen font-body-md text-on-surface dark:text-zinc-100 antialiased bg-pattern bg-surface-subtle dark:bg-zinc-950 flex items-center justify-center p-4 relative transition-colors duration-300">
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
                {mode}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Container */}
      <main className="w-full max-w-[420px]">
        {/* Brand Header */}
        <div className="text-center mb-stack-lg animate-fade-in">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[32px] text-primary" data-icon="restaurant">
              restaurant
            </span>
            <h1 className="font-hanken text-[32px] font-bold text-primary tracking-tight">
              FoodMesh
            </h1>
          </div>
          <p className="font-sans text-body-md text-on-surface-variant dark:text-zinc-400">
            Restaurant Operations & POS Management
          </p>
        </div>

        {/* Auth Card */}
        <div className="relative overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-border-base dark:border-zinc-800 rounded-xl shadow-md p-8 transition-all duration-300 hover:shadow-lg">
          {/* Decorative Top Line Accent */}
          <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
