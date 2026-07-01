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
  const { user } = useAuth();
  const location = useLocation();
  const dispatch = useDispatch();

  useEffect(() => { dispatch(fetchNotifications()); }, [dispatch]);

  return (
    <div className="flex min-h-screen">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} userRole={user?.role} />
      <Topbar onMenuClick={() => setSidebarOpen(true)} title={getPageTitle(location.pathname)} />
      <main className="flex-1 ml-[260px] max-md:ml-0 mt-16 p-6 transition-[margin-left] duration-300 min-h-[calc(100vh-64px)]">
        <Outlet />
      </main>
    </div>
  );
}
