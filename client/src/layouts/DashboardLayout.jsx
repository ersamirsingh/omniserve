import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import useAuth from '../hooks/useAuth';
import { fetchNotifications } from '../store/notificationSlice';
import { getPageTitle } from '../app/router/routeRegistry';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('omniserve_sidebar_collapsed') === 'true';
  });
  const { user } = useAuth();
  const location = useLocation();
  const dispatch = useDispatch();

  useEffect(() => { dispatch(fetchNotifications()); }, [dispatch]);

  const handleToggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('omniserve_sidebar_collapsed', String(next));
      return next;
    });
  };

  const sidebarWidth = sidebarCollapsed ? 'ml-[72px]' : 'ml-[260px]';

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole={user?.role}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />
      <Topbar
        onMenuClick={() => setSidebarOpen(true)}
        title={getPageTitle(location.pathname)}
        isCollapsed={sidebarCollapsed}
      />
      <main className={`flex-1 ${sidebarWidth} max-md:ml-0 mt-16 p-6 transition-[margin-left] duration-300 h-[calc(100vh-64px)] overflow-hidden flex flex-col`}>
        <div className="flex-1 overflow-y-auto min-h-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
