import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { UserRole } from "../utils/constants.js";

export const Sidebar = () => {
  const { user } = useAuth();
  const role = user?.role || UserRole.STAFF;

  const menuItems = [
    {
      to: "/dashboard",
      label: "Dashboard",
      icon: "dashboard",
      roles: [UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.OUTLET_MANAGER, UserRole.STAFF],
      end: true,
    },
    {
      to: "/dashboard/orders",
      label: "Orders",
      icon: "receipt_long",
      roles: [UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.OUTLET_MANAGER, UserRole.STAFF],
    },
    {
      to: "/dashboard/outlets",
      label: "Outlets",
      icon: "storefront",
      roles: [UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.OUTLET_MANAGER],
    },
    {
      to: "/dashboard/menu",
      label: "Menu Management",
      icon: "restaurant_menu",
      roles: [UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.OUTLET_MANAGER],
    },
    {
      to: "/dashboard/inventory",
      label: "Inventory",
      icon: "inventory_2",
      roles: [UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.OUTLET_MANAGER, UserRole.STAFF],
    },
    {
      to: "/dashboard/analytics",
      label: "Analytics",
      icon: "analytics",
      roles: [UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.OUTLET_MANAGER],
    },
    {
      to: "/dashboard/subscriptions",
      label: "Subscriptions",
      icon: "credit_card",
      roles: [UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER],
    },
    {
      to: "/dashboard/users",
      label: "Team Management",
      icon: "groups",
      roles: [UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.OUTLET_MANAGER],
    },
    {
      to: "/dashboard/audit",
      label: "Audit Logs",
      icon: "history",
      roles: [UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER],
    },
    {
      to: "/dashboard/webhooks",
      label: "Webhook Logs",
      icon: "webhook",
      roles: [UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER],
    },
  ];

  const filteredItems = menuItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="bg-surface-container-low dark:bg-zinc-900 text-primary dark:text-zinc-100 border-r border-outline-variant/20 dark:border-zinc-800 flex flex-col h-full py-6 px-4 gap-y-1 w-64 shrink-0 transition-all duration-300">
      {/* Sidebar Header */}
      <div className="mb-8 px-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim text-[28px]">
            restaurant
          </span>
          <h1 className="text-title-md font-bold text-primary dark:text-zinc-100 tracking-tight text-[20px]">
            FoodMesh
          </h1>
        </div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant/80 dark:text-zinc-400/80 mt-1">
          Restaurant OS
        </p>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto space-y-1 pr-1">
        {filteredItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center px-3 py-2.5 text-body-md rounded-lg transition-all duration-200 group ${
                isActive
                  ? "bg-secondary-container dark:bg-teal-950 text-on-secondary-container dark:text-teal-300 font-semibold translate-x-1"
                  : "text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-200 hover:bg-surface-container-high dark:hover:bg-zinc-800"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`material-symbols-outlined mr-3 text-[20px] transition-colors ${
                    isActive ? "text-on-secondary-container dark:text-teal-300" : "text-outline dark:text-zinc-500 group-hover:text-primary dark:group-hover:text-teal-400"
                  }`}
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icon}
                </span>
                <span className="text-[14px]">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sidebar Footer AI Copilot button (pure visual shortcut) */}
      <div className="mt-auto pt-4 border-t border-outline-variant/10">
        <button
          className="w-full bg-primary-container text-on-primary py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-primary-container/90 active:scale-[0.98] transition-all whisper-shadow"
          onClick={() => alert("AI Copilot is indexing outlet datasets. Please try again shortly.")}
        >
          <span className="material-symbols-outlined text-[16px]">
            auto_awesome
          </span>
          <span className="text-label-md font-semibold text-[13px]">Ask AI Copilot</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
