import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { HiBars3, HiBell, HiArrowRightOnRectangle, HiUser } from 'react-icons/hi2';
import useAuth from '../hooks/useAuth';
import { ROLE_LABELS } from '../utils/constants';

export default function Topbar({ onMenuClick, title }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useSelector((s) => s.notifications);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleLogout = async () => { await logout(); navigate('/login'); };
  const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() : '?';

  return (
    <header className="fixed top-0 left-[260px] max-md:left-0 right-0 h-16 bg-[rgba(26,29,46,0.65)] backdrop-blur-2xl border-b border-[rgba(99,102,241,0.15)] flex items-center justify-between px-6 z-50 transition-[left] duration-300">
      <div className="flex items-center gap-4">
        <button className="hidden max-md:flex items-center justify-center w-9 h-9 rounded-lg bg-[#232640] text-slate-100 text-xl cursor-pointer border-none" onClick={onMenuClick}><HiBars3 /></button>
        <h1 className="text-lg font-bold text-slate-100">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <button className="relative flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 text-xl hover:bg-[#232640] hover:text-slate-100 transition-all cursor-pointer bg-transparent border-none" onClick={() => navigate('/notifications')}>
          <HiBell />
          {unreadCount > 0 && <span className="absolute top-0.5 right-0.5 w-4.5 h-4.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </button>

        {/* User dropdown */}
        <div className="relative" ref={ref}>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#232640] border border-[rgba(99,102,241,0.15)] cursor-pointer hover:border-indigo-500 transition-all" onClick={() => setOpen(!open)}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center font-bold text-sm text-white">{initials}</div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-100 leading-tight">{user?.firstName} {user?.lastName}</span>
              <span className="text-xs text-slate-500 leading-tight">{ROLE_LABELS[user?.role] || user?.role}</span>
            </div>
          </div>

          {open && (
            <div className="absolute top-full right-0 mt-2 min-w-[200px] bg-[#1a1d2e] border border-[rgba(99,102,241,0.15)] rounded-lg shadow-2xl p-1 animate-fade-in z-[200]">
              <button className="flex items-center gap-2 w-full px-3.5 py-2.5 rounded-md text-sm text-slate-400 hover:bg-indigo-500/10 hover:text-slate-100 transition-all cursor-pointer bg-transparent border-none font-sans" onClick={() => { setOpen(false); navigate('/dashboard'); }}>
                <HiUser /> Profile
              </button>
              <button className="flex items-center gap-2 w-full px-3.5 py-2.5 rounded-md text-sm text-red-400 hover:bg-red-500/10 transition-all cursor-pointer bg-transparent border-none font-sans" onClick={handleLogout}>
                <HiArrowRightOnRectangle /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
