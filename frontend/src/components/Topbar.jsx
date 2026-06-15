import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth.js";
import { OutletApi } from "../api/models/outlet.api.js";
import { NotificationApi } from "../api/models/notification.api.js";
import { useSelector, useDispatch } from "react-redux";
import { setNotifications } from "../store/notificationSlice.js";
import { POLLING_INTERVALS } from "../utils/constants.js";
import { useTheme } from "../hooks/useTheme.js";

export const Topbar = () => {
  const dispatch = useDispatch();
  const { user, logout } = useAuth();
  const { unreadCount } = useSelector((state) => state.notifications);
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState(localStorage.getItem("activeOutletId") || "");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  const [theme, setTheme] = useTheme();

  // Fetch outlets to populate the outlet selector
  useEffect(() => {
    const fetchOutlets = async () => {
      try {
        const response = await OutletApi.listOutlets();
        if (response.success && response.data) {
          const list = Array.isArray(response.data)
            ? response.data
            : response.data.outlets || [];
          setOutlets(list);
          // Auto select first outlet if none selected
          if (!selectedOutlet && list.length > 0) {
            const firstId = list[0]._id || list[0].id;
            setSelectedOutlet(firstId);
            localStorage.setItem("activeOutletId", firstId);
            window.dispatchEvent(new Event("active-outlet-changed"));
          }
        }
      } catch (err) {
        console.error("Failed to load outlets in topbar:", err);
      }
    };
    if (user) {
      fetchOutlets();
    }
  }, [user, selectedOutlet]);

  // Fetch notifications and poll for updates
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await NotificationApi.listNotifications();
        if (response.success && response.data) {
          dispatch(setNotifications(response.data));
        }
      } catch (err) {
        console.error("Failed to load notifications in topbar:", err);
      }
    };

    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, POLLING_INTERVALS.NOTIFICATIONS);
      return () => clearInterval(interval);
    }
  }, [user, dispatch]);

  const handleOutletChange = (e) => {
    const val = e.target.value;
    setSelectedOutlet(val);
    localStorage.setItem("activeOutletId", val);
    // Emit event so other sections (like Orders or Analytics) can re-fetch
    window.dispatchEvent(new Event("active-outlet-changed"));
  };

  return (
    <header className="bg-surface/80 dark:bg-zinc-900/80 backdrop-blur-xl text-primary dark:text-zinc-100 border-b border-outline-variant/30 dark:border-zinc-800 shadow-sm flex justify-between items-center px-6 py-2 w-full h-16 shrink-0 z-40 sticky top-0">
      <div className="flex items-center gap-4">
        <div className="text-title-md font-bold text-primary dark:text-zinc-100 text-[18px]">
          {user?.tenantId?.name || "FoodMesh Ops"}
        </div>
        
        {/* Outlet Selector Dropdown */}
        {outlets.length > 0 && (
          <div className="relative ml-4 hidden md:block">
            <select
              className="bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg px-3 py-1.5 text-label-sm font-medium text-on-surface dark:text-zinc-250 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer text-[13px]"
              value={selectedOutlet}
              onChange={handleOutletChange}
            >
              <option value="">All Outlets</option>
              {outlets.map((outlet) => (
                <option key={outlet._id || outlet.id} value={outlet._id || outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 relative">
        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
            className="p-2 rounded-full text-on-surface-variant dark:text-zinc-400 hover:bg-surface-container-high/50 dark:hover:bg-zinc-800/50 transition-colors relative"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-error text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                {unreadCount}
              </span>
            )}
          </button>
          
          {showNotificationsMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl whisper-shadow z-50 p-4">
              <h3 className="font-semibold text-on-surface dark:text-zinc-200 text-[14px] mb-2">Notifications</h3>
              <p className="text-body-sm text-[12px] text-on-surface-variant dark:text-zinc-400">
                You have {unreadCount} unread system notifications.
              </p>
              <button
                onClick={() => setShowNotificationsMenu(false)}
                className="mt-3 w-full bg-surface-container-high dark:bg-zinc-800 hover:bg-surface-variant dark:hover:bg-zinc-700 text-on-surface dark:text-zinc-200 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
              >
                Close Panel
              </button>
            </div>
          )}
        </div>

        {/* User Profile avatar dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1.5 rounded-full hover:bg-surface-container-high/50 dark:hover:bg-zinc-800/50 transition-colors"
          >
            <span className="material-symbols-outlined text-[28px] text-on-surface-variant dark:text-zinc-400">
              account_circle
            </span>
            <div className="text-left hidden lg:block">
              <div className="text-[13px] font-semibold text-on-surface dark:text-zinc-200">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-[10px] text-on-surface-variant dark:text-zinc-400 uppercase tracking-wider">
                {user?.role?.replace("_", " ")}
              </div>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-surface-container-lowest border border-border-base dark:border-zinc-800 rounded-xl whisper-shadow z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border-base dark:border-zinc-800">
                <p className="text-body-sm font-semibold text-on-surface dark:text-zinc-200 truncate text-[13px]">
                  {user?.email}
                </p>
              </div>
              <div className="px-4 py-3 border-b border-border-base dark:border-zinc-800 bg-surface-subtle/30 dark:bg-zinc-900/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-400 mb-2">
                  Appearance
                </p>
                <div className="grid grid-cols-3 gap-1 bg-surface-container-low dark:bg-zinc-800 rounded-lg p-1">
                  <button
                    onClick={() => setTheme("light")}
                    className={`py-1.5 px-1 rounded flex flex-col items-center justify-center gap-1 transition-all ${
                      theme === "light"
                        ? "bg-surface-container-lowest dark:bg-zinc-900 text-primary dark:text-primary-fixed-dim shadow-sm"
                        : "text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-200"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      light_mode
                    </span>
                    <span className="text-[10px] font-semibold">Light</span>
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    className={`py-1.5 px-1 rounded flex flex-col items-center justify-center gap-1 transition-all ${
                      theme === "dark"
                        ? "bg-surface-container-lowest dark:bg-zinc-900 text-primary dark:text-primary-fixed-dim shadow-sm"
                        : "text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-200"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      dark_mode
                    </span>
                    <span className="text-[10px] font-semibold">Dark</span>
                  </button>
                  <button
                    onClick={() => setTheme("system")}
                    className={`py-1.5 px-1 rounded flex flex-col items-center justify-center gap-1 transition-all ${
                      theme === "system"
                        ? "bg-surface-container-lowest dark:bg-zinc-900 text-primary dark:text-primary-fixed-dim shadow-sm"
                        : "text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-200"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      desktop_windows
                    </span>
                    <span className="text-[10px] font-semibold">System</span>
                  </button>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full text-left px-4 py-3 text-body-sm text-error hover:bg-error-container/10 flex items-center gap-2 text-[13px] transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
