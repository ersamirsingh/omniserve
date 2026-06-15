import { NavLink } from 'react-router-dom';
import {
  HiOutlineHome, HiOutlineBuildingStorefront, HiOutlineMapPin,
  HiOutlineRectangleStack, HiOutlineClipboardDocumentList, HiOutlineShoppingCart,
  HiOutlineUsers, HiOutlineCube, HiOutlineCreditCard, HiOutlineBell,
  HiOutlineChartBarSquare, HiOutlineDocumentText, HiOutlineCog6Tooth,
  HiOutlineTag, HiOutlineSquares2X2, HiOutlineEnvelope,
} from 'react-icons/hi2';
import { USER_ROLES } from '../utils/constants';

const allNav = [
  { section: 'Main', items: [
    { to: '/dashboard', label: 'Dashboard', icon: <HiOutlineHome />, roles: 'all' },
  ]},
  { section: 'Management', items: [
    { to: '/restaurants', label: 'Restaurants', icon: <HiOutlineBuildingStorefront />, roles: [USER_ROLES.SUPER_ADMIN] },
    { to: '/outlets', label: 'Outlets', icon: <HiOutlineMapPin />, roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.RESTAURANT_OWNER] },
    { to: '/categories', label: 'Categories', icon: <HiOutlineSquares2X2 />, roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.RESTAURANT_OWNER, USER_ROLES.OUTLET_MANAGER] },
    { to: '/menu-items', label: 'Menu Items', icon: <HiOutlineRectangleStack />, roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.RESTAURANT_OWNER, USER_ROLES.OUTLET_MANAGER] },
    { to: '/variants', label: 'Variants', icon: <HiOutlineTag />, roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.RESTAURANT_OWNER, USER_ROLES.OUTLET_MANAGER] },
    { to: '/addons', label: 'Addons', icon: <HiOutlineTag />, roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.RESTAURANT_OWNER, USER_ROLES.OUTLET_MANAGER] },
  ]},
  { section: 'Operations', items: [
    { to: '/orders', label: 'Orders', icon: <HiOutlineShoppingCart />, roles: 'all' },
    { to: '/customers', label: 'Customers', icon: <HiOutlineUsers />, roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.RESTAURANT_OWNER, USER_ROLES.OUTLET_MANAGER] },
    { to: '/inventory', label: 'Inventory', icon: <HiOutlineCube />, roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.RESTAURANT_OWNER, USER_ROLES.OUTLET_MANAGER] },
  ]},
  { section: 'Finance', items: [
    { to: '/subscriptions', label: 'Subscriptions', icon: <HiOutlineCreditCard />, roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.RESTAURANT_OWNER] },
  ]},
  { section: 'Insights', items: [
    { to: '/analytics', label: 'Analytics', icon: <HiOutlineChartBarSquare />, roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.RESTAURANT_OWNER] },
    { to: '/notifications', label: 'Notifications', icon: <HiOutlineBell />, roles: 'all' },
    { to: '/audit-logs', label: 'Audit Logs', icon: <HiOutlineDocumentText />, roles: [USER_ROLES.SUPER_ADMIN] },
    { to: '/join-requests', label: 'Join Requests', icon: <HiOutlineEnvelope />, roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.RESTAURANT_OWNER, USER_ROLES.OUTLET_MANAGER] },
    { to: '/users', label: 'Team', icon: <HiOutlineCog6Tooth />, roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.RESTAURANT_OWNER] },
  ]},
];

export default function Sidebar({ isOpen, onClose, userRole }) {
  const filtered = allNav
    .map((s) => ({ ...s, items: s.items.filter((i) => i.roles === 'all' || i.roles.includes(userRole)) }))
    .filter((s) => s.items.length > 0);

  return (
    <>
      {/* Mobile overlay */}
      <div className={`fixed inset-0 bg-black/50 z-[99] md:hidden ${isOpen ? 'block' : 'hidden'}`} onClick={onClose} />

      <aside className={`fixed left-0 top-0 bottom-0 w-[260px] bg-[#1a1d2e] border-r border-[rgba(99,102,241,0.15)] flex flex-col z-[100] transition-transform duration-300 overflow-hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>

        {/* Logo */}
        <div className="flex items-center gap-2 px-6 h-16 border-b border-[rgba(99,102,241,0.15)] shrink-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center font-extrabold text-lg text-white shrink-0">F</div>
          <div className="font-bold text-lg text-slate-100"><span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">Food</span>Mesh</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2">
          {filtered.map((section) => (
            <div className="mb-2" key={section.section}>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest px-4 py-2">{section.section}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all no-underline whitespace-nowrap
                    ${isActive ? 'bg-indigo-500/15 text-indigo-400 font-semibold' : 'text-slate-400 hover:bg-indigo-500/10 hover:text-slate-100'}`
                  }
                  onClick={onClose}
                >
                  <span className="text-xl shrink-0">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
