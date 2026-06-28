import { useState, useEffect } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { useSocket } from '../../context/SocketContext';

// Import sub-components
import RestaurantOperationsDashboard from './components/RestaurantOperationsDashboard';
import FloorView from './components/FloorView';
import FloorDesigner from './components/FloorDesigner';
import KitchenDisplay from './components/KitchenDisplay';
import WaiterConsole from './components/WaiterConsole';
import BillingWorkspace from './components/BillingWorkspace';
import ReservationCalendar from './components/ReservationCalendar';
import ShiftDashboard from './components/ShiftDashboard';
import DiningAnalyticsDashboard from './components/DiningAnalyticsDashboard';
import OperationsTimeline from './components/OperationsTimeline';

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
  HiOutlineBellAlert
} from 'react-icons/hi2';

export default function OperationsCockpit() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { connected, lastMessage } = useSocket();
  const { addToast } = useToast();

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
    { id: 'designer', label: 'Floor Designer', icon: HiOutlinePencilSquare, component: FloorDesigner },
    { id: 'kds', label: 'Kitchen (KDS)', icon: HiOutlineQueueList, component: KitchenDisplay },
    { id: 'waiters', label: 'Waiter Console', icon: HiOutlineUserGroup, component: WaiterConsole },
    { id: 'billing', label: 'Billing Splits', icon: HiOutlineReceiptPercent, component: BillingWorkspace },
    { id: 'reservations', label: 'Reservations', icon: HiOutlineCalendarDays, component: ReservationCalendar },
    { id: 'shifts', label: 'Shift Ops', icon: HiOutlineClock, component: ShiftDashboard },
    { id: 'analytics', label: 'Analytics', icon: HiOutlineChartPie, component: DiningAnalyticsDashboard },
    { id: 'timeline', label: 'Activity Feed', icon: HiOutlineListBullet, component: OperationsTimeline }
  ];

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || RestaurantOperationsDashboard;

  return (
    <div className="space-y-6">
      {/* Top Banner with WebSocket connectivity status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader 
          title="Operations Cockpit" 
          subtitle="Real-time control center for dining floor, kitchen, service tasks, and shifts."
        />
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${connected ? 'bg-success-green animate-pulse' : 'bg-red-500'}`} />
          <span className="text-[12px] font-semibold text-on-surface-variant dark:text-zinc-400">
            {connected ? 'Live Sync Active' : 'Disconnected (Reconnecting...)'}
          </span>
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
      <div className="min-h-[500px]">
        <ActiveComponent onNavigate={setActiveTab} />
      </div>
    </div>
  );
}
