import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { HiBars3, HiBell, HiArrowRightOnRectangle, HiUser } from 'react-icons/hi2';
import useAuth from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { ROLE_LABELS } from '../utils/constants';

export default function Topbar({ onMenuClick, title }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useSelector((s) => s.notifications);
  const { theme, selectTheme } = useTheme();
  
  const [open, setOpen] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  
  const ref = useRef(null);
  const themeRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const h = (e) => { 
      if (ref.current && !ref.current.contains(e.target)) setOpen(false); 
      if (themeRef.current && !themeRef.current.contains(e.target)) setShowThemeMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleLogout = async () => { 
    await logout(); 
    navigate('/login'); 
  };
  
  const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() : '?';

  return (
    <header className="fixed top-0 left-[260px] max-md:left-0 right-0 h-16 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md border-b border-border-base dark:border-zinc-900 flex items-center justify-between px-6 z-50 transition-all duration-300">
      <div className="flex items-center gap-4">
        <button 
          className="hidden max-md:flex items-center justify-center w-9 h-9 rounded-lg bg-surface-subtle dark:bg-zinc-900 text-on-surface dark:text-zinc-200 text-xl cursor-pointer border border-border-base dark:border-zinc-800 hover:bg-surface-container-low dark:hover:bg-zinc-800 active:scale-95 transition-all" 
          onClick={onMenuClick}
        >
          <HiBars3 />
        </button>
        <h1 className="text-[17px] font-bold text-on-surface dark:text-zinc-100 font-hanken">{title}</h1>
      </div>

      <div className="flex items-center gap-4 sm:gap-5">
        {/* Theme Selector */}
        <div className="relative" ref={themeRef}>
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-on-surface-variant dark:text-zinc-400 text-xl hover:bg-surface-container-low dark:hover:bg-zinc-900/80 hover:text-primary dark:hover:text-primary-fixed-dim transition-all cursor-pointer bg-transparent border-none"
            aria-label="Toggle Theme"
          >
            <span className="material-symbols-outlined text-[20px]">
              {theme === 'light' ? 'light_mode' : theme === 'dark' ? 'dark_mode' : 'desktop_windows'}
            </span>
          </button>
          {showThemeMenu && (
            <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-850 rounded-lg shadow-xl p-1 z-[200] animate-scale-in">
              {['light', 'dark', 'system'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    selectTheme(mode);
                    setShowThemeMenu(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer capitalize ${
                    theme === mode
                      ? 'bg-primary/10 text-primary dark:text-zinc-200'
                      : 'text-on-surface-variant dark:text-zinc-400 hover:bg-surface-container-low dark:hover:bg-zinc-900/40 hover:text-on-surface dark:hover:text-zinc-200'
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

        {/* Notification bell */}
        <button 
          className="relative flex items-center justify-center w-9 h-9 rounded-lg text-on-surface-variant dark:text-zinc-400 text-xl hover:bg-surface-container-low dark:hover:bg-zinc-900/80 hover:text-primary dark:hover:text-primary-fixed-dim transition-all cursor-pointer bg-transparent border-none" 
          onClick={() => navigate('/notifications')}
        >
          <HiBell />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 w-4.5 h-4.5 rounded-full bg-red-500 text-white text-[9px] font-extrabold flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User profile dropdown trigger */}
        <div className="relative font-sans" ref={ref}>
          <div 
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 cursor-pointer hover:border-primary-container dark:hover:border-primary-fixed-dim transition-all select-none" 
            onClick={() => setOpen(!open)}
          >
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center font-bold text-xs text-white uppercase shadow-sm">
              {initials}
            </div>
            <div className="flex flex-col max-sm:hidden">
              <span className="text-xs font-bold text-on-surface dark:text-zinc-200 leading-tight">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="text-[10px] text-on-surface-variant dark:text-zinc-405 font-medium leading-tight mt-0.5">
                {ROLE_LABELS[user?.role] || user?.role}
              </span>
            </div>
          </div>

          {open && (
            <div className="absolute top-full right-0 mt-2 min-w-[190px] bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-850 rounded-lg shadow-xl p-1 animate-scale-in z-[200]">
              <button 
                className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-md text-xs font-semibold text-on-surface-variant dark:text-zinc-400 hover:bg-surface-container-low dark:hover:bg-zinc-900 hover:text-on-surface dark:hover:text-zinc-200 transition-all cursor-pointer bg-transparent border-none font-sans" 
                onClick={() => { setOpen(false); navigate('/profile'); }}
              >
                <HiUser className="text-sm" /> My Profile
              </button>
              <div className="h-px bg-border-base dark:bg-zinc-850 my-1" />
              <button 
                className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-md text-xs font-semibold text-red-500 hover:bg-red-500/5 dark:hover:bg-red-500/10 transition-all cursor-pointer bg-transparent border-none font-sans" 
                onClick={handleLogout}
              >
                <HiArrowRightOnRectangle className="text-sm" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
