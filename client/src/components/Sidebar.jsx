import { NavLink, Link } from 'react-router-dom';
import { getSidebarSections } from '../app/router/routeRegistry';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi2';

export default function Sidebar({ isOpen, onClose, userRole, isCollapsed = false, onToggleCollapse }) {
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
        className={`fixed left-0 top-0 bottom-0 bg-white dark:bg-zinc-950 border-r border-border-base dark:border-zinc-900 flex flex-col z-[100] transition-all duration-300 overflow-hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        ${isCollapsed ? 'md:w-[72px]' : 'md:w-[260px]'} w-[260px]`}
      >
        {/* Brand Logo Header */}
        <Link
          to="/dashboard"
          className="flex items-center gap-2.5 px-6 h-16 border-b border-border-base dark:border-zinc-900 shrink-0 hover:opacity-85 transition-opacity no-underline overflow-hidden"
        >
          <img src="/omniserve_logo.png" alt="OmniServe Logo" className="w-8 h-8 object-contain rounded-lg shrink-0" />
          <div className={`flex flex-col transition-all duration-300 ${isCollapsed ? 'md:hidden' : ''}`}>
            <span className="font-hanken text-[16px] font-bold text-primary dark:text-primary-fixed-dim leading-none">
              OmniServe
            </span>
            <span className="text-[10px] text-on-surface-variant dark:text-zinc-550 font-semibold tracking-wider uppercase mt-0.5">
              Operations OS
            </span>
          </div>
        </Link>

        {/* Navigation Items */}
        <nav className={`flex-1 overflow-y-auto p-3 space-y-1 ${isCollapsed ? 'md:px-2' : ''}`}>
          {sections.map((section) => (
            <div className="mb-4" key={section.section}>
              <div className={`text-[10px] font-bold text-on-surface-variant/40 dark:text-zinc-600 uppercase tracking-widest px-3 py-2 transition-all duration-300 ${
                isCollapsed ? 'md:hidden' : ''
              }`}>
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
                      `group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-150 no-underline whitespace-nowrap ${
                        isCollapsed ? 'md:justify-center md:px-0 md:py-2.5' : ''
                      } ${
                        isActive
                          ? 'bg-surface-container-low dark:bg-zinc-900/60 text-primary dark:text-primary-fixed-dim border-r-2 border-primary font-bold'
                          : 'text-on-surface-variant dark:text-zinc-400 hover:bg-surface-container-low dark:hover:bg-zinc-900/40 hover:text-on-surface dark:hover:text-zinc-200'
                      }`
                    }
                    onClick={onClose}
                  >
                    <span className={`text-lg shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                      isCollapsed ? 'md:text-xl' : ''
                    }`}>
                      <item.icon />
                    </span>
                    <span className={`transition-all duration-300 ${
                      isCollapsed ? 'md:hidden' : ''
                    }`}>
                      {item.label}
                    </span>
                    {/* Tooltip for collapsed state */}
                    {isCollapsed && (
                      <span className="hidden md:block absolute left-full ml-3 px-2.5 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold rounded-md shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-[200]">
                        {item.label}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse Toggle Button (desktop only) */}
        <div className="hidden md:flex items-center border-t border-border-base dark:border-zinc-900 shrink-0">
          <button
            onClick={onToggleCollapse}
            className={`w-full flex items-center gap-2.5 px-4 py-3.5 text-on-surface-variant dark:text-zinc-400 hover:bg-surface-container-low dark:hover:bg-zinc-900/40 hover:text-on-surface dark:hover:text-zinc-200 transition-all cursor-pointer border-none bg-transparent text-xs font-semibold ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <HiChevronRight className="text-lg shrink-0" />
            ) : (
              <>
                <HiChevronLeft className="text-lg shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
