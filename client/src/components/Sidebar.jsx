import { NavLink, Link } from 'react-router-dom';
import { getSidebarSections } from '../app/router/routeRegistry';

export default function Sidebar({ isOpen, onClose, userRole }) {
  const sections = getSidebarSections(userRole);

  return (
    <>
      {/* Mobile overlay */}
      <div 
        className={`fixed inset-0 bg-black/40 z-[99] md:hidden backdrop-blur-xs transition-opacity duration-300 ${
          isOpen ? 'opacity-100 block' : 'opacity-0 hidden'
        }`} 
        onClick={onClose} 
      />

      <aside 
        className={`fixed left-0 top-0 bottom-0 w-[260px] bg-white dark:bg-zinc-950 border-r border-border-base dark:border-zinc-900 flex flex-col z-[100] transition-all duration-300 overflow-hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        {/* Brand Logo Header */}
        <Link 
          to="/dashboard"
          className="flex items-center gap-2.5 px-6 h-16 border-b border-border-base dark:border-zinc-900 shrink-0 hover:opacity-85 transition-opacity no-underline"
        >
          <img src="/omniserve_logo.png" alt="OmniServe Logo" className="w-8 h-8 object-contain rounded-lg shrink-0" />
          <div className="flex flex-col">
            <span className="font-hanken text-[16px] font-bold text-primary dark:text-primary-fixed-dim leading-none">
              OmniServe
            </span>
            <span className="text-[10px] text-on-surface-variant dark:text-zinc-550 font-semibold tracking-wider uppercase mt-0.5">
              Operations OS
            </span>
          </div>
        </Link>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {sections.map((section) => (
            <div className="mb-4" key={section.section}>
              <div className="text-[10px] font-bold text-on-surface-variant/40 dark:text-zinc-600 uppercase tracking-widest px-3 py-2">
                {section.section}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onMouseEnter={() => item.preload?.()}
                    onFocus={() => item.preload?.()}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-150 no-underline whitespace-nowrap ${
                        isActive 
                          ? 'bg-surface-container-low dark:bg-zinc-900/60 text-primary dark:text-primary-fixed-dim border-r-2 border-primary font-bold' 
                          : 'text-on-surface-variant dark:text-zinc-400 hover:bg-surface-container-low dark:hover:bg-zinc-900/40 hover:text-on-surface dark:hover:text-zinc-200'
                      }`
                    }
                    onClick={onClose}
                  >
                    <span className="text-lg shrink-0"><item.icon /></span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
