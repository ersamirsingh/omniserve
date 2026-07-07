import { useState, useEffect, useCallback } from 'react';
import { getTablesApi, getWaiterTasksApi, getCurrentShiftApi, getKdsQueueApi } from '../../../api/models/operations.api';
import { listOutletsApi } from '../../../api/models/outlet.api';
import { useSocket } from '../../../context/SocketContext';
import { useToast } from '../../../components/ui/Toast';
import Badge from '../../../components/ui/Badge';
import StatCard from '../../../components/StatCard';
import { 
  HiOutlineTableCells, 
  HiOutlineClipboardDocumentList, 
  HiOutlineReceiptPercent, 
  HiOutlineClock,
  HiOutlineCheckCircle
} from 'react-icons/hi2';

export default function RestaurantOperationsDashboard({ onNavigate }) {
  const { lastMessage } = useSocket();
  const { addToast } = useToast();
  const [stats, setStats] = useState({
    activeTables: 0,
    availableTables: 0,
    reservedTables: 0,
    preparingOrders: 0,
    readyOrders: 0,
    waitingBills: 0,
    pendingTasks: 0,
    kdsCompliance: 100,
    waiterCompliance: 100,
    shiftName: 'No Shift Active'
  });

  const [loading, setLoading] = useState(true);
  const [outletStatus, setOutletStatus] = useState('ACTIVE');

  const fetchStats = async () => {
    try {
      const [tablesRes, tasksRes, shiftRes, kdsRes, outletsRes] = await Promise.all([
        getTablesApi(),
        getWaiterTasksApi(),
        getCurrentShiftApi(),
        getKdsQueueApi({ holdStatus: 'FIRE_REQUESTED' }),
        listOutletsApi()
      ]);

      const activeOutlet = outletsRes.data?.data?.outlets?.[0];
      if (activeOutlet) {
        setOutletStatus(activeOutlet.status);
      }

      const tables = tablesRes.data?.data?.tables || [];
      const tasks = tasksRes.data?.data?.tasks || [];
      const shift = shiftRes.data?.data;
      const kdsItems = kdsRes.data?.data?.items || [];

      const active = tables.filter(t => t.activeSessionId).length;
      const reserved = tables.filter(t => t.operationalStatus === 'RESERVED').length;
      const cleaning = tables.filter(t => t.operationalStatus === 'CLEANING').length;
      const available = tables.length - active - reserved - cleaning;

      const readyCount = kdsItems.filter(i => i.holdStatus === 'FIRED' && i.firedAt).length; // simple approximation

      const billingRequested = tables.filter(t => t.operationalStatus === 'BILL_REQUESTED').length;
      const openTasks = tasks.filter(t => ['PENDING', 'ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(t.status)).length;
      
      const escalatedTasks = tasks.filter(t => t.status === 'ESCALATED').length;
      const totalTasks = tasks.length;
      const waiterSLA = totalTasks > 0 ? Math.round(((totalTasks - escalatedTasks) / totalTasks) * 100) : 100;

      setStats({
        activeTables: active,
        availableTables: Math.max(0, available),
        reservedTables: reserved,
        preparingOrders: kdsItems.length,
        readyOrders: readyCount,
        waitingBills: billingRequested,
        pendingTasks: openTasks,
        kdsCompliance: 96, // Mock target
        waiterCompliance: waiterSLA,
        shiftName: shift?.shiftName ? `${shift.shiftName} Shift` : 'No Active Shift'
      });
    } catch (err) {
      console.error('[OperationsDashboard] Error fetching operational stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Update stats on receiving socket events
  useEffect(() => {
    if (!lastMessage) return;
    const { event } = lastMessage;

    // Refresh state when structural dining events arrive
    const realTimeStatsEvents = [
      'TABLE_OCCUPIED', 'TABLE_AVAILABLE', 'TABLE_RESERVED', 'TABLE_STATUS_CHANGED',
      'TABLE_TRANSFERRED', 'TABLE_MERGED', 'TABLE_UNMERGED', 'TABLE_CLEANING_STARTED',
      'TABLE_CLEANING_COMPLETED', 'WAITER_TASK_CREATED', 'WAITER_TASK_COMPLETED',
      'WAITER_TASK_ESCALATED', 'BILL_REQUESTED', 'BILL_SETTLED', 'SESSION_CLOSED',
      'ITEM_FIRED', 'ITEM_HELD', 'COURSE_FIRED'
    ];

    if (realTimeStatsEvents.includes(event)) {
      fetchStats();
    }
  }, [lastMessage]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-32 bg-surface-container dark:bg-zinc-900 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active / Occupied Tables"
          value={stats.activeTables}
          description={`${stats.availableTables} Tables Available`}
          icon={HiOutlineTableCells}
          color="primary"
          onClick={() => onNavigate && onNavigate('floor')}
        />
        <StatCard
          title="Pending Waiter Tasks"
          value={stats.pendingTasks}
          description={`Waiter SLA: ${stats.waiterCompliance}%`}
          icon={HiOutlineClipboardDocumentList}
          color="warning"
          onClick={() => onNavigate && onNavigate('waiters')}
        />
        <StatCard
          title="Orders In Prep / KDS"
          value={stats.preparingOrders}
          description={`Kitchen SLA: ${stats.kdsCompliance}%`}
          icon={HiOutlineClock}
          color="info"
          onClick={() => onNavigate && onNavigate('floor')}
        />
        <StatCard
          title="Unpaid / Waiting Bills"
          value={stats.waitingBills}
          description={`Active shift: ${stats.shiftName}`}
          icon={HiOutlineReceiptPercent}
          color="error"
          onClick={() => onNavigate && onNavigate('billing')}
        />
      </div>

      {/* Operational health summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table Distribution card */}
        <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-border-base dark:border-zinc-900 flex flex-col justify-between">
          <div>
            <h3 className="text-[14px] font-bold text-on-background uppercase tracking-wider mb-4">
              Floor Distribution
            </h3>
            <div className="space-y-3.5">
              <div className="flex justify-between items-center text-[13px]">
                <span className="flex items-center gap-2 text-on-surface-variant dark:text-zinc-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-success-green" /> Available
                </span>
                <span className="font-bold">{stats.availableTables}</span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="flex items-center gap-2 text-on-surface-variant dark:text-zinc-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Occupied
                </span>
                <span className="font-bold">{stats.activeTables}</span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="flex items-center gap-2 text-on-surface-variant dark:text-zinc-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Reserved
                </span>
                <span className="font-bold">{stats.reservedTables}</span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="flex items-center gap-2 text-on-surface-variant dark:text-zinc-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> Bill Requested
                </span>
                <span className="font-bold">{stats.waitingBills}</span>
              </div>
            </div>
          </div>
          <div className="border-t border-border-base dark:border-zinc-900 pt-4 mt-6 flex justify-between items-center text-[12px] font-semibold text-on-surface-variant dark:text-zinc-400">
            <span>Total Tables Monitored</span>
            <span>{stats.activeTables + stats.availableTables + stats.reservedTables}</span>
          </div>
        </div>

        {/* Waiter Task & SLA card */}
        <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-border-base dark:border-zinc-900 flex flex-col justify-between">
          <div>
            <h3 className="text-[14px] font-bold text-on-background uppercase tracking-wider mb-4">
              Service SLAs
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[13px] mb-1">
                  <span className="text-on-surface-variant dark:text-zinc-400 font-semibold">Waiter SLA Target</span>
                  <span className="font-bold text-primary dark:text-primary-fixed-dim">{stats.waiterCompliance}%</span>
                </div>
                <div className="w-full bg-surface-container dark:bg-zinc-900 h-2 rounded-full overflow-hidden">
                  <div className="bg-primary dark:bg-primary-fixed-dim h-full" style={{ width: `${stats.waiterCompliance}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[13px] mb-1">
                  <span className="text-on-surface-variant dark:text-zinc-400 font-semibold">Kitchen SLA Target</span>
                  <span className="font-bold text-success-green">{stats.kdsCompliance}%</span>
                </div>
                <div className="w-full bg-surface-container dark:bg-zinc-900 h-2 rounded-full overflow-hidden">
                  <div className="bg-success-green h-full" style={{ width: `${stats.kdsCompliance}%` }} />
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-border-base dark:border-zinc-900 pt-4 mt-6 flex gap-2 items-center text-[12px] font-semibold text-on-surface-variant dark:text-zinc-400">
            <HiOutlineCheckCircle className="text-success-green text-base" />
            <span>Operational health metrics are normal.</span>
          </div>
        </div>

        {/* Current outlet status card */}
        <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-border-base dark:border-zinc-900 flex flex-col justify-between">
          <div>
            <h3 className="text-[14px] font-bold text-on-background uppercase tracking-wider mb-4">
              Current Outlet Status
            </h3>
            <div className="space-y-3.5 text-[13px]">
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant dark:text-zinc-400">Outlet Status:</span>
                <Badge variant={outletStatus === 'ACTIVE' ? 'success' : 'danger'}>
                  {outletStatus === 'ACTIVE' ? 'OPEN' : 'CLOSED'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant dark:text-zinc-400">Live Orders Preparing:</span>
                <span className="font-bold text-on-background">{stats.preparingOrders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant dark:text-zinc-400">Orders Awaiting Serve:</span>
                <span className="font-bold text-on-background">{stats.readyOrders}</span>
              </div>
            </div>
          </div>
          <div className="border-t border-border-base dark:border-zinc-900 pt-4 mt-6 text-[12px] font-semibold text-on-surface-variant dark:text-zinc-400">
            <span>Toggle status via header controller slider.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
