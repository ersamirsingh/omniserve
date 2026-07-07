import { useState, useEffect } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { useSocket } from '../../context/SocketContext';
import useAuth from '../../hooks/useAuth';
import { listOutletsApi, toggleOutletStatusApi } from '../../api/models/outlet.api';

// Import sub-components
import RestaurantOperationsDashboard from './components/RestaurantOperationsDashboard';
import FloorView from './components/FloorView';
import FloorDesigner from './components/FloorDesigner';
import WaiterConsole from './components/WaiterConsole';
import BillingWorkspace from './components/BillingWorkspace';
import ReservationCalendar from './components/ReservationCalendar';
import DiningAnalyticsDashboard from './components/DiningAnalyticsDashboard';
import OperationsTimeline from './components/OperationsTimeline';
import OrdersPage from '../orders/OrdersPage';
import QRCodesCenter from './components/QRCodesCenter';

import {
  HiOutlinePresentationChartLine,
  HiOutlineMap,
  HiOutlinePencilSquare,
  HiOutlineQueueList,
  HiOutlineUserGroup,
  HiOutlineReceiptPercent,
  HiOutlineCalendarDays,
  HiOutlineClock,
  HiOutlineChartPie,
  HiOutlineListBullet,
  HiOutlineBellAlert,
  HiOutlineQrCode
} from 'react-icons/hi2';

export default function OperationsCockpit() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { connected, lastMessage } = useSocket();
  const { addToast } = useToast();
  const { user } = useAuth();
  
  const [outlet, setOutlet] = useState(null);

  useEffect(() => {
    const fetchOutlet = async () => {
      if (!user) return;
      const targetId = user.outletId || (user.outletIds && user.outletIds[0]);
      if (!targetId) return;
      try {
        const res = await listOutletsApi();
        const found = res.data?.data?.outlets?.find(o => o.id === targetId || o._id === targetId);
        if (found) {
          setOutlet(found);
        }
      } catch (err) {
        console.error('Failed to load outlet details:', err);
      }
    };
    fetchOutlet();
  }, [user]);

  // Listen for global real-time notifications to show toasts in cockpit
  useEffect(() => {
    if (!lastMessage) return;
    const { event, payload } = lastMessage;

    // Build notifications for specific events
    if (event === 'QR_ASSISTANCE_REQUESTED') {
      addToast(`Table ${payload.tableNumber || 'Unknown'} requested assistance: ${payload.assistanceType}`, 'warning');
    } else if (event === 'ORDER_STATUS_CHANGED' && payload.orderStatus === 'READY') {
      addToast(`Order #${payload.orderNumber || ''} is READY!`, 'success');
    } else if (event === 'BILL_REQUESTED') {
      addToast(`Bill requested for Session on Table ${payload.tableNumber || ''}`, 'info');
    } else if (event === 'WAITER_TASK_ESCALATED') {
      addToast(`CRITICAL: Waiter Task escalated for Table ${payload.tableId}`, 'error');
    }
  }, [lastMessage, addToast]);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: HiOutlinePresentationChartLine, component: RestaurantOperationsDashboard },
    { id: 'floor', label: 'Live Floor', icon: HiOutlineMap, component: FloorView },
    { id: 'dine-in-orders', label: 'Dine-In Orders', icon: HiOutlineListBullet, component: null },
    { id: 'qr-codes', label: 'QR Codes', icon: HiOutlineQrCode, component: QRCodesCenter },
    { id: 'designer', label: 'Floor Designer', icon: HiOutlinePencilSquare, component: FloorDesigner },
    { id: 'waiters', label: 'Waiter Console', icon: HiOutlineUserGroup, component: WaiterConsole },
    { id: 'billing', label: 'Billing Splits', icon: HiOutlineReceiptPercent, component: BillingWorkspace },
    { id: 'reservations', label: 'Reservations', icon: HiOutlineCalendarDays, component: ReservationCalendar },
    { id: 'analytics', label: 'Analytics', icon: HiOutlineChartPie, component: DiningAnalyticsDashboard },
    { id: 'timeline', label: 'Activity Feed', icon: HiOutlineListBullet, component: OperationsTimeline }
  ];

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || RestaurantOperationsDashboard;

  return (
    <div className="h-[calc(100vh-112px)] flex flex-col overflow-hidden space-y-4">
      {/* Top Banner with WebSocket connectivity status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
        <PageHeader 
          title="Operations Cockpit" 
          subtitle="Real-time control center for dining floor, kitchen, service tasks, and outlets."
        />
        <div className="flex items-center gap-4 self-start sm:self-center">
          {/* Socket Connection Dot */}
          <div className="flex items-center gap-1.5 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 px-2.5 py-1.5 rounded-xl">
            <span className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-success-green animate-pulse' : 'bg-red-500'}`} />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              {connected ? 'Sync Connected' : 'Sync Offline'}
            </span>
          </div>

          {/* Outlet status toggle slider */}
          {outlet && (
            <div className="flex items-center gap-2 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 px-3 py-1.5 rounded-xl">
              <span className="text-xs font-bold text-on-surface-variant dark:text-zinc-400">
                {outlet.status === 'ACTIVE' ? 'Outlet Open' : 'Outlet Closed'}
              </span>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={outlet.status === 'ACTIVE'}
                  onChange={async () => {
                    const newStatus = outlet.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                    try {
                      await toggleOutletStatusApi(outlet.id || outlet._id, newStatus);
                      setOutlet(prev => ({ ...prev, status: newStatus }));
                      addToast(`Outlet status updated to ${newStatus === 'ACTIVE' ? 'OPEN' : 'CLOSED'}`, 'success');
                    } catch (err) {
                      addToast(err.response?.data?.message || 'Failed to update outlet status', 'error');
                    }
                  }}
                />
                <div className="w-9 h-5 bg-zinc-300 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-success-green"></div>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Tabbed Navigation Bar */}
      <div className="border-b border-border-base dark:border-zinc-800 shrink-0">
        <div className="flex gap-2 overflow-x-auto pb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 text-[13px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-primary text-primary dark:border-primary-fixed-dim dark:text-primary-fixed-dim'
                    : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-200'
                }`}
              >
                <span className="text-base"><Icon /></span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Subpage Workspace wrapper */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'dine-in-orders' ? (
          <OrdersPage mode="DINE_IN" hideHeader={true} onNavigate={setActiveTab} />
        ) : (
          <ActiveComponent onNavigate={setActiveTab} />
        )}
      </div>
    </div>
  );
}
