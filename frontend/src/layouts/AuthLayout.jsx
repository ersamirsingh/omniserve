import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useTheme } from "../hooks/useTheme.js";

export const AuthLayout = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [theme, setTheme] = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  // Redirect directly to dashboard if already logged in
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen font-body-md text-on-surface dark:text-zinc-100 antialiased bg-pattern bg-surface-subtle dark:bg-zinc-950 flex items-center justify-center p-4 relative">
      {/* Floating Theme Selector */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={() => setShowThemeMenu(!showThemeMenu)}
          className="p-2 bg-surface-container-lowest dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-full text-on-surface-variant dark:text-zinc-400 hover:text-primary dark:hover:text-primary-fixed-dim transition-colors whisper-shadow flex items-center justify-center"
          aria-label="Toggle Theme"
        >
          <span className="material-symbols-outlined text-[20px]">
            {theme === "light" ? "light_mode" : theme === "dark" ? "dark_mode" : "desktop_windows"}
          </span>
        </button>
        {showThemeMenu && (
          <div className="absolute right-0 mt-2 w-36 bg-surface-container-lowest dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl whisper-shadow p-1 z-50">
            <button
              onClick={() => {
                setTheme("light");
                setShowThemeMenu(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium rounded-lg transition-colors ${
                theme === "light"
                  ? "bg-primary/5 text-primary dark:text-primary-fixed-dim"
                  : "text-on-surface-variant dark:text-zinc-400 hover:bg-surface-container-low dark:hover:bg-zinc-800"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">light_mode</span>
              Light
            </button>
            <button
              onClick={() => {
                setTheme("dark");
                setShowThemeMenu(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium rounded-lg transition-colors ${
                theme === "dark"
                  ? "bg-primary/5 text-primary dark:text-primary-fixed-dim"
                  : "text-on-surface-variant dark:text-zinc-400 hover:bg-surface-container-low dark:hover:bg-zinc-800"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">dark_mode</span>
              Dark
            </button>
            <button
              onClick={() => {
                setTheme("system");
                setShowThemeMenu(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium rounded-lg transition-colors ${
                theme === "system"
                  ? "bg-primary/5 text-primary dark:text-primary-fixed-dim"
                  : "text-on-surface-variant dark:text-zinc-400 hover:bg-surface-container-low dark:hover:bg-zinc-800"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">desktop_windows</span>
              System
            </button>
          </div>
        )}
      </div>

      <main className="w-full max-w-[420px]">
        {/* Brand Header */}
        <div className="text-center mb-stack-lg animate-fade-in">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[32px] text-primary dark:text-primary-fixed-dim" data-icon="restaurant">
              restaurant
            </span>
            <h1 className="font-display-lg text-[32px] font-bold text-primary dark:text-primary-fixed-dim tracking-tight">
              FoodMesh
            </h1>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-zinc-400">
            Restaurant Operations & POS Management
          </p>
        </div>

        {/* Auth Card */}
        <div className="glass-card dark:bg-zinc-900/80 dark:border-zinc-800 rounded-xl whisper-shadow p-8 relative overflow-hidden transition-all duration-300 hover:shadow-lg">
          {/* Decorative Top Line Accent */}
          <div className="absolute top-0 left-0 w-full h-1 bg-primary-container"></div>
          {children}
        </div>
      </main>
    </div>
  );
};

export default AuthLayout;
