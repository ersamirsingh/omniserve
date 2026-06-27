import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineBell,
  HiOutlineChartBarSquare,
  HiOutlineClipboardDocumentList,
  HiOutlineCreditCard,
  HiOutlineMapPin,
  HiOutlineShoppingCart,
} from 'react-icons/hi2';
import StatCard from '../../components/StatCard';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import DineInPageShell from './DineInPageShell';
import { useDineInScope } from './useDineInScope';
import {
  extractApiData,
  listDineInAssistanceApi,
  listDineInFloorMapApi,
  listDineInOrdersApi,
  listDineInReservationsApi,
  listDineInSessionsApi,
} from '../../api/models/dinein.api';
import { formatCurrency, formatDateTime, sortByDateDesc, statusBadge } from './dinein.utils';

export default function DineInDashboardPage() {
  const scopeState = useDineInScope();
  const { scope, isReady } = scopeState;
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState({
    loading: false,
    floorMap: { floors: [], sections: [], tables: [] },
    sessions: [],
    reservations: [],
    orders: [],
    assistance: [],
  });

  const loadSnapshot = useCallback(async () => {
    if (!isReady) return;

    setSnapshot((current) => ({ ...current, loading: true }));

    try {
      const [floorMapRes, sessionsRes, reservationsRes, ordersRes, assistanceRes] = await Promise.all([
        listDineInFloorMapApi(scope),
        listDineInSessionsApi(scope),
        listDineInReservationsApi(scope),
        listDineInOrdersApi(scope),
        listDineInAssistanceApi(scope),
      ]);

      setSnapshot({
        loading: false,
        floorMap: extractApiData(floorMapRes) || { floors: [], sections: [], tables: [] },
        sessions: extractApiData(sessionsRes) || [],
        reservations: extractApiData(reservationsRes) || [],
        orders: extractApiData(ordersRes) || [],
        assistance: extractApiData(assistanceRes) || [],
      });
    } catch (error) {
      setSnapshot((current) => ({ ...current, loading: false }));
      addToast(error.response?.data?.message || 'Failed to load dine-in dashboard', 'error');
    }
  }, [addToast, isReady, scope]);

  useEffect(() => {
    void loadSnapshot();
    if (!isReady) return undefined;

    const interval = setInterval(() => {
      void loadSnapshot();
    }, 15000);

    return () => clearInterval(interval);
  }, [isReady, loadSnapshot]);

  const metrics = useMemo(() => {
    const tables = snapshot.floorMap.tables || [];
    const sessions = snapshot.sessions || [];
    const reservations = snapshot.reservations || [];
    const orders = snapshot.orders || [];
    const assistance = snapshot.assistance || [];

    const occupiedTables = tables.filter((table) =>
      ['OCCUPIED', 'ORDERING', 'PREPARING', 'READY', 'SERVING', 'SERVED', 'BILL_REQUESTED', 'PAYMENT_PENDING'].includes(table.status)
    ).length;
    const availableTables = tables.filter((table) => table.status === 'AVAILABLE').length;
    const activeSessions = sessions.filter((session) => !['CLOSED', 'ABANDONED'].includes(session.status)).length;
    const pendingReservations = reservations.filter((reservation) => ['PENDING', 'CONFIRMED'].includes(reservation.status)).length;
    const openAssistance = assistance.filter((request) => !['RESOLVED', 'CANCELLED'].includes(request.status)).length;
    const orderRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

    return {
      totalTables: tables.length,
      occupiedTables,
      availableTables,
      activeSessions,
      pendingReservations,
      openAssistance,
      orderRevenue,
    };
  }, [snapshot]);

  const activeTables = useMemo(
    () =>
      sortByDateDesc(snapshot.floorMap.tables || [], 'updatedAt')
        .filter((table) => table.status !== 'AVAILABLE')
        .slice(0, 6),
    [snapshot.floorMap.tables]
  );

  const incomingReservations = useMemo(
    () => sortByDateDesc(snapshot.reservations || [], 'reservedFor').slice(0, 6),
    [snapshot.reservations]
  );

  const assistanceQueue = useMemo(
    () => sortByDateDesc(snapshot.assistance || []).slice(0, 6),
    [snapshot.assistance]
  );

  return (
    <DineInPageShell
      title="Dashboard"
      description="Monitor occupancy, order flow, guest demand, and revenue signals across the dining room."
      scopeState={scopeState}
      actions={
        <Button variant="secondary" onClick={() => void loadSnapshot()} loading={snapshot.loading}>
          Refresh
        </Button>
      }
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard title="Total Tables" value={metrics.totalTables} icon={<HiOutlineMapPin />} color="blue" />
        <StatCard title="Occupied Tables" value={metrics.occupiedTables} icon={<HiOutlineChartBarSquare />} color="rose" />
        <StatCard title="Available Tables" value={metrics.availableTables} icon={<HiOutlineMapPin />} color="emerald" />
        <StatCard title="Active Sessions" value={metrics.activeSessions} icon={<HiOutlineClipboardDocumentList />} color="indigo" />
        <StatCard title="Open Assistance" value={metrics.openAssistance} icon={<HiOutlineBell />} color="amber" />
        <StatCard title="Order Revenue" value={formatCurrency(metrics.orderRevenue)} icon={<HiOutlineCreditCard />} color="blue" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card className="rounded-lg p-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-base dark:border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-on-surface dark:text-zinc-100">Floor Activity</h3>
              <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1">
                Latest non-idle tables across all sections.
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => navigate('/dine-in/floor')}>
              Open floor
            </Button>
          </div>
          <Table
            loading={snapshot.loading}
            data={activeTables}
            emptyMessage="No active tables"
            columns={[
              { key: 'tableNumber', label: 'Table', render: (table) => <span className="font-semibold">{table.displayName || table.tableNumber}</span> },
              { key: 'capacity', label: 'Capacity', render: (table) => `${table.minCapacity || 1}-${table.capacity}` },
              { key: 'status', label: 'Status', render: (table) => statusBadge(table.status) },
              { key: 'updatedAt', label: 'Updated', render: (table) => formatDateTime(table.updatedAt) },
            ]}
          />
        </Card>

        <Card className="rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-on-surface dark:text-zinc-100">Operational Jump Points</h3>
              <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1">
                Open the primary dine-in work queues directly.
              </p>
            </div>
          </div>
          <div className="grid gap-3 mt-5">
            {[
              { label: 'Sessions', to: '/dine-in/sessions', icon: <HiOutlineClipboardDocumentList />, count: metrics.activeSessions },
              { label: 'Reservations', to: '/dine-in/reservations', icon: <HiOutlineMapPin />, count: metrics.pendingReservations },
              { label: 'Orders', to: '/dine-in/orders', icon: <HiOutlineShoppingCart />, count: snapshot.orders.length },
              { label: 'Assistance', to: '/dine-in/assistance', icon: <HiOutlineBell />, count: metrics.openAssistance },
              { label: 'Billing', to: '/dine-in/billing', icon: <HiOutlineCreditCard />, count: snapshot.sessions.filter((session) => session.billId).length },
            ].map((item) => (
              <button
                key={item.to}
                type="button"
                onClick={() => navigate(item.to)}
                className="flex items-center justify-between rounded-lg border border-border-base dark:border-zinc-800 px-4 py-3 text-left hover:bg-surface-subtle dark:hover:bg-zinc-900/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg text-primary">{item.icon}</span>
                  <span className="text-sm font-semibold text-on-surface dark:text-zinc-100">{item.label}</span>
                </div>
                <span className="text-xs font-bold text-on-surface-variant dark:text-zinc-400">{item.count}</span>
              </button>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-lg p-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-base dark:border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-on-surface dark:text-zinc-100">Upcoming Reservations</h3>
              <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1">Next confirmed and pending arrivals.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => navigate('/dine-in/reservations')}>
              Manage
            </Button>
          </div>
          <Table
            loading={snapshot.loading}
            data={incomingReservations}
            emptyMessage="No reservations scheduled"
            columns={[
              { key: 'customerName', label: 'Guest', render: (reservation) => <div><div className="font-semibold">{reservation.customerName}</div><div className="text-xs text-on-surface-variant dark:text-zinc-400">{reservation.customerPhone}</div></div> },
              { key: 'partySize', label: 'Party', render: (reservation) => reservation.partySize },
              { key: 'reservedFor', label: 'Reserved For', render: (reservation) => formatDateTime(reservation.reservedFor) },
              { key: 'status', label: 'Status', render: (reservation) => statusBadge(reservation.status) },
            ]}
          />
        </Card>

        <Card className="rounded-lg p-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-base dark:border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-on-surface dark:text-zinc-100">Assistance Queue</h3>
              <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1">Outstanding guest requests needing response.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => navigate('/dine-in/assistance')}>
              Open queue
            </Button>
          </div>
          <Table
            loading={snapshot.loading}
            data={assistanceQueue}
            emptyMessage="No pending requests"
            columns={[
              { key: 'type', label: 'Request', render: (request) => <div><div className="font-semibold">{request.type?.replaceAll('_', ' ')}</div><div className="text-xs text-on-surface-variant dark:text-zinc-400">{request.customMessage || 'Standard service request'}</div></div> },
              { key: 'tableId', label: 'Table', render: (request) => request.tableId?.slice?.(-6) || request.tableId || '—' },
              { key: 'status', label: 'Status', render: (request) => statusBadge(request.status) },
              { key: 'createdAt', label: 'Raised', render: (request) => formatDateTime(request.createdAt) },
            ]}
          />
        </Card>
      </section>
    </DineInPageShell>
  );
}
