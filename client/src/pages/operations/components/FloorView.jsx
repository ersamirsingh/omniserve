import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getTablesApi, 
  getDiningAreasApi, 
  executeDiningOperationApi, 
  getUnifiedTimelineApi, 
  getSessionBillApi 
} from '../../../api/models/operations.api';
import { listUsersApi } from '../../../api/models/user.api';
import { useSocket } from '../../../context/SocketContext';
import { useToast } from '../../../components/ui/Toast';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Spinner from '../../../components/ui/Spinner';
import { 
  HiOutlineUser, 
  HiOutlineXMark, 
  HiOutlinePlus, 
  HiOutlineTrash, 
  HiArrowsRightLeft, 
  HiOutlineArrowRight,
  HiOutlineArrowsUpDown,
  HiUserMinus,
  HiOutlineSparkles,
  HiOutlineQueueList,
  HiOutlineCheckCircle,
  HiOutlineCurrencyDollar,
  HiOutlineArrowPath,
  HiOutlineClock
} from 'react-icons/hi2';
import OrderLifecycleActions from '../../../components/shared/OrderLifecycleActions';

export default function FloorView({ onNavigate }) {
  const { lastMessage, joinSession, leaveSession } = useSocket();
  const { addToast } = useToast();
  
  const [diningAreas, setDiningAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [tables, setTables] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Table Drawer state
  const [selectedTable, setSelectedTable] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tableTimeline, setTableTimeline] = useState([]);
  const [billDetails, setBillDetails] = useState(null);

  // Operations modal states
  const [opModal, setOpModal] = useState({ open: false, type: '', data: {} });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [opLoading, setOpLoading] = useState(false);

  // Promise locking refs to prevent race conditions from overlapping loads
  const fetchPromiseRef = useRef(null);
  const drawerPromiseRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (fetchPromiseRef.current) {
      return fetchPromiseRef.current;
    }

    const promise = (async () => {
      try {
        const [areasRes, tablesRes, usersRes] = await Promise.all([
          getDiningAreasApi(),
          getTablesApi(),
          listUsersApi().catch(() => ({ data: { data: [] } }))
        ]);
        const areas = areasRes.data?.data?.areas || [];
        const allTables = tablesRes.data?.data?.tables || [];
        const users = usersRes.data?.data?.users || usersRes.data?.data || [];

        setDiningAreas(areas);
        setTables(allTables);
        setStaff(users.filter(u => u.role === 'STAFF' || u.role === 'OUTLET_MANAGER'));

        if (areas.length > 0 && !selectedAreaId) {
          setSelectedAreaId(areas[0]._id || areas[0].id);
        }
        return allTables;
      } catch (err) {
        addToast('Failed to load floor layout', 'error');
        return null;
      } finally {
        fetchPromiseRef.current = null;
        setLoading(false);
      }
    })();

    fetchPromiseRef.current = promise;
    return promise;
  }, [selectedAreaId, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Drawer details lookup with lock checking to prevent concurrent fetches
  const loadDrawerDetails = useCallback(async (table) => {
    if (!table.activeSessionId) {
      setTableTimeline([]);
      setBillDetails(null);
      return;
    }

    const sessionKey = table.activeSessionId.toString();
    if (drawerPromiseRef.current === sessionKey) {
      return; // Already loading this session details
    }

    drawerPromiseRef.current = sessionKey;
    try {
      joinSession(sessionKey);
      const [timelineRes, billRes] = await Promise.all([
        getUnifiedTimelineApi(table.activeSessionId),
        getSessionBillApi(table.activeSessionId).catch(() => ({ data: { data: null } }))
      ]);

      setTableTimeline(timelineRes.data?.data?.timeline || []);
      setBillDetails(billRes.data?.data || null);
    } catch (err) {
      console.warn('Failed to load table drawer details:', err);
    } finally {
      if (drawerPromiseRef.current === sessionKey) {
        drawerPromiseRef.current = null;
      }
    }
  }, [joinSession]);

  // WebSocket event handler - ignore events if client is currently executing a manual operation
  useEffect(() => {
    if (!lastMessage || opLoading) return;
    const { event } = lastMessage;

    const tableEvents = [
      'TABLE_OCCUPIED', 'TABLE_AVAILABLE', 'TABLE_RESERVED', 'TABLE_STATUS_CHANGED',
      'TABLE_TRANSFERRED', 'TABLE_MERGED', 'TABLE_UNMERGED', 'TABLE_CLEANING_STARTED',
      'TABLE_CLEANING_COMPLETED', 'SESSION_CLOSED', 'GUEST_COUNT_CHANGED', 'WAITER_CHANGED',
      'SEAT_ADDED', 'SEAT_REMOVED', 'SEAT_MOVED', 'SEAT_SWAPPED', 'BILL_REQUESTED', 'BILL_SETTLED'
    ];

    if (tableEvents.includes(event)) {
      fetchData().then((latestTables) => {
        if (selectedTable && latestTables) {
          const targetId = selectedTable._id?.toString() || selectedTable.id?.toString();
          const updatedTable = latestTables.find(t => (t._id?.toString() || t.id?.toString()) === targetId);
          if (updatedTable) {
            setSelectedTable(updatedTable);
            if (updatedTable.activeSessionId) {
              loadDrawerDetails(updatedTable);
            } else {
              setBillDetails(null);
              setTableTimeline([]);
            }
          }
        }
      });
    }
  }, [lastMessage, selectedTable, fetchData, loadDrawerDetails, opLoading]);

  // Handle table drawer toggle
  const handleTableClick = (table) => {
    if (selectedTable?.activeSessionId) {
      leaveSession(selectedTable.activeSessionId.toString());
    }
    drawerPromiseRef.current = null; // Prevent lock from getting stuck in-flight
    setSelectedTable(table);
    setDrawerOpen(true);
    loadDrawerDetails(table);
  };

  const handleCloseDrawer = () => {
    if (selectedTable?.activeSessionId) {
      leaveSession(selectedTable.activeSessionId.toString());
    }
    drawerPromiseRef.current = null; // Clear lock
    setDrawerOpen(false);
    setSelectedTable(null);
    setShowAdvanced(false);
  };

  // Perform operational commands on backend
  const runOperation = async (operationType, payload) => {
    setOpLoading(true);
    try {
      await executeDiningOperationApi({
        operationType,
        payload
      });
      addToast(`Operation ${operationType.replace('_', ' ')} succeeded`, 'success');
      setOpModal({ open: false, type: '', data: {} });
      
      const latestTables = await fetchData();
      if (selectedTable && latestTables) {
        const targetId = selectedTable._id?.toString() || selectedTable.id?.toString();
        const updatedTable = latestTables.find(t => (t._id?.toString() || t.id?.toString()) === targetId);
        if (updatedTable) {
          setSelectedTable(updatedTable);
          if (updatedTable.activeSessionId) {
            await loadDrawerDetails(updatedTable);
          } else {
            setBillDetails(null);
            setTableTimeline([]);
          }
        }
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Operation failed', 'error');
    } finally {
      setOpLoading(false);
    }
  };

  const getTableColor = (table) => {
    if (table.operationalStatus === 'CLEANING') return 'bg-purple-600 text-white hover:bg-purple-700 shadow-purple-500/20';
    if (table.operationalStatus === 'BILL_REQUESTED') return 'bg-amber-500 text-black hover:bg-amber-600 shadow-amber-500/20';
    if (table.operationalStatus === 'PAYMENT_PENDING') return 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/20';
    if (table.operationalStatus === 'RESERVED') return 'bg-blue-500 text-white hover:bg-blue-600 shadow-blue-500/20';
    if (table.operationalStatus === 'HELD') return 'bg-zinc-400 text-white hover:bg-zinc-500 shadow-zinc-400/20';
    if (table.activeSessionId && table.operationalStatus !== 'AVAILABLE') return 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/20';
    return 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20';
  };

  const getStatusLabelText = (status) => {
    if (status === 'AVAILABLE') return 'Available';
    if (status === 'HELD') return 'Held (Lock)';
    if (status === 'OCCUPIED') return 'Occupied';
    if (status === 'RESERVED') return 'Reserved';
    if (status === 'BILL_REQUESTED') return 'Bill Requested';
    if (status === 'PAYMENT_PENDING') return 'Payment Pending';
    if (status === 'CLEANING') return 'Cleaning';
    return status;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>;
  }

  const currentAreaTables = tables.filter(t => t.diningAreaId?.toString() === selectedAreaId || t.diningAreaId?._id?.toString() === selectedAreaId);
  const availableTables = tables.filter(t => !t.activeSessionId && t._id?.toString() !== selectedTable?._id?.toString());

  return (
    <div className="relative flex flex-col gap-6 animate-fade-in pb-12">
      {/* Restructured Top Header Area with Legend & Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-border-base dark:border-zinc-900 shadow-2xs">
        {/* Area Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {diningAreas.map(area => (
            <button
              key={area._id || area.id}
              onClick={() => setSelectedAreaId(area._id || area.id)}
              className={`px-4 py-2 rounded-xl text-[12px] font-bold cursor-pointer transition-all shrink-0 ${
                selectedAreaId === (area._id || area.id)
                  ? 'bg-primary text-white dark:bg-primary-fixed dark:text-zinc-950 shadow-xs'
                  : 'bg-surface-subtle text-on-surface-variant border border-border-base/60 hover:bg-surface-container-low dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800'
              }`}
            >
              📍 {area.name}
            </button>
          ))}
          <Button
            size="sm"
            variant="outline"
            className="flex items-center gap-1.5 font-bold text-[12px] px-3.5 py-2.5 rounded-xl shrink-0"
            onClick={() => fetchData()}
          >
            <HiOutlineArrowPath className="text-sm" /> Refresh
          </Button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3.5 text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 border-t lg:border-t-0 lg:border-l border-border-base dark:border-zinc-800 pt-3 lg:pt-0 lg:pl-6">
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" /> Available</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-xs" /> Reserved</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-zinc-400 shadow-xs" /> Held</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs" /> Occupied</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" /> Bill Req</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-600 shadow-xs" /> Cleaning</div>
        </div>
      </div>

      {/* Grid Floor workspace */}
      <div className="relative w-full h-[620px] bg-zinc-50 dark:bg-zinc-950 border border-border-base dark:border-zinc-900 rounded-3xl overflow-hidden shadow-inner flex">
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1.2px,transparent_1.2px)] [bg-size:24px_24px] opacity-60" />

        {currentAreaTables.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center flex-col text-on-surface-variant dark:text-zinc-500 space-y-2 z-10">
            <span className="text-3xl">🪑</span>
            <span className="text-[13px] font-bold">No tables mapped to this area.</span>
            <span className="text-[11px] font-medium opacity-80">Use the Floor Designer to place tables and chairs.</span>
          </div>
        ) : (
          <div className="absolute inset-0 overflow-auto p-8">
            {currentAreaTables.map((table) => {
              const layout = table.layout || { x: 50, y: 50, width: 80, height: 80, rotation: 0, shape: 'square' };
              const isRound = layout.shape === 'round';
              const tableColor = getTableColor(table);

              return (
                <button
                  key={table._id || table.id}
                  onClick={() => handleTableClick(table)}
                  style={{
                    position: 'absolute',
                    left: `${layout.x}px`,
                    top: `${layout.y}px`,
                    width: `${layout.width}px`,
                    height: `${layout.height}px`,
                    transform: `rotate(${layout.rotation || 0}deg)`,
                    zIndex: layout.zIndex || 10,
                  }}
                  className={`flex flex-col items-center justify-center p-2 cursor-pointer shadow-md transition-all hover:scale-105 active:scale-95 select-none focus:outline-none border border-black/10 dark:border-white/10 ${
                    isRound ? 'rounded-full' : 'rounded-2xl'
                  } ${tableColor}`}
                >
                  <span className="font-extrabold text-[13px] tracking-tight">{table.tableNumber}</span>
                  <span className="text-[9px] font-bold opacity-80 mt-0.5">Cap: {table.seatCount}</span>
                  {table.operationalStatus !== 'AVAILABLE' && (
                    <span className="text-[8px] font-black uppercase tracking-wider bg-black/20 dark:bg-white/10 px-1.5 py-0.5 rounded-full mt-1.5 scale-90">
                      {table.operationalStatus === 'BILL_REQUESTED' ? 'BILL' : table.operationalStatus.slice(0, 5)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Table Side Detail Drawer - Restructured UI */}
      {drawerOpen && selectedTable && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[410px] bg-white dark:bg-zinc-950 border-l border-border-base dark:border-zinc-900 shadow-2xl z-150 flex flex-col animate-slide-in-right">
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-5 border-b border-border-base dark:border-zinc-900 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-extrabold text-on-background">Table {selectedTable.tableNumber}</h2>
                {selectedTable.isMerged && <Badge variant="info">Merged</Badge>}
              </div>
              <span className="text-[10px] text-primary dark:text-primary-fixed-dim uppercase tracking-wider font-black block mt-0.5">
                {getStatusLabelText(selectedTable.operationalStatus)}
              </span>
            </div>
            <button onClick={handleCloseDrawer} className="text-on-surface-variant hover:text-on-background p-1.5 hover:bg-surface-subtle dark:hover:bg-zinc-900 rounded-lg cursor-pointer transition-all">
              <HiOutlineXMark className="text-xl" />
            </button>
          </div>

          {/* Drawer Body Scroll */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 relative">
            {/* Loading Cover for Drawer during Operations to prevent race condition clicks */}
            {opLoading && (
              <div className="absolute inset-0 bg-white/70 dark:bg-zinc-950/70 z-50 flex flex-col items-center justify-center space-y-3 backdrop-blur-xs">
                <Spinner size="lg" />
                <span className="text-xs font-bold text-on-surface-variant dark:text-zinc-400 animate-pulse">Updating table state...</span>
              </div>
            )}

            {selectedTable.operationalStatus === 'CLEANING' ? (
              /* Cleaning Mode Layout */
              <div className="space-y-4 py-8">
                <div className="bg-purple-50/50 dark:bg-purple-950/10 border border-purple-200/50 dark:border-purple-900/30 p-6 rounded-2xl text-center space-y-3">
                  <span className="text-3xl block">🧹</span>
                  <h4 className="text-sm font-extrabold text-purple-950 dark:text-purple-300">Table Needs Cleaning</h4>
                  <p className="text-[11px] text-purple-700/80 dark:text-purple-400/80 max-w-xs mx-auto leading-relaxed">
                    The guest session has ended. Mark cleaning completed to release table lock and allow new guest QR scans.
                  </p>
                </div>
                <Button
                  size="md"
                  variant="primary"
                  className="w-full text-white bg-purple-600 hover:bg-purple-700 py-3.5 font-bold text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer border-none"
                  disabled={opLoading}
                  onClick={() => runOperation('COMPLETE_CLEANING', { tableId: selectedTable._id || selectedTable.id })}
                >
                  🧹 Mark Cleaning Completed
                </Button>
              </div>
            ) : selectedTable.activeSessionId ? (
              /* Occupied / Dining Mode Layout */
              <div className="space-y-6">
                {/* Active Session Info Card */}
                {billDetails && (
                  <div className="bg-surface-subtle dark:bg-zinc-900/50 border border-border-base dark:border-zinc-850 p-4.5 rounded-2xl space-y-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant dark:text-zinc-450 font-bold">Assigned Waiter</span>
                      <span className="font-extrabold text-on-surface dark:text-zinc-200 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-md">
                        👤 {billDetails.billSession?.waiterName || 'None'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t border-border-base/20 pt-2">
                      <span className="text-on-surface-variant dark:text-zinc-450 font-bold">Total Bill</span>
                      <span className="font-black text-primary dark:text-primary-fixed-dim text-sm">
                        ${billDetails.billSession?.totalAmount?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t border-border-base/20 pt-2">
                      <span className="text-on-surface-variant dark:text-zinc-450 font-bold">Outstanding Balance</span>
                      <span className="font-black text-rose-500 text-sm">
                        ${billDetails.billSession?.outstandingBalance?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Primary Floor Cockpit Actions Panel */}
                {(() => {
                  const hasRequestedBill = selectedTable.operationalStatus === 'BILL_REQUESTED' || 
                                           selectedTable.operationalStatus === 'PAYMENT_PENDING' || 
                                           tableTimeline.some(e => e.status === 'BILL_REQUESTED' || e.status === 'PAYMENT_PENDING');
                  const hasStartedCleaning = selectedTable.operationalStatus === 'CLEANING' || 
                                             tableTimeline.some(e => e.status === 'CLEANING_STARTED' || e.status === 'CLEANING');

                  return (
                    <div className="bg-zinc-50 dark:bg-zinc-900/30 border border-border-base dark:border-zinc-900 p-4.5 rounded-2xl space-y-4 mb-4">
                      <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/40 dark:text-zinc-550 block">Quick Floor Actions</span>
                      <div className="grid grid-cols-1 gap-2.5">
                        <Button
                          size="sm"
                          variant="primary"
                          className="w-full font-bold text-xs py-3"
                          disabled={opLoading || hasRequestedBill}
                          onClick={() => runOperation('REQUEST_BILL', { sessionId: selectedTable.activeSessionId })}
                        >
                          💵 {hasRequestedBill ? 'Bill Already Requested' : 'Request Outstanding Bill'}
                        </Button>
                        <div className="grid grid-cols-2 gap-2.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="font-bold text-xs py-3"
                            disabled={opLoading || hasStartedCleaning}
                            onClick={() => runOperation('START_CLEANING', { tableId: selectedTable._id })}
                          >
                            🧹 {hasStartedCleaning ? 'Cleaning In Progress' : 'Start Cleaning'}
                          </Button>
                          <Button
                            size="sm"
                            className="font-bold text-xs py-3 text-rose-500 border-rose-200 dark:border-rose-950/40 hover:bg-rose-50 dark:hover:bg-rose-950/10"
                            variant="outline"
                            disabled={opLoading}
                            onClick={() => runOperation('CLOSE_SESSION', { sessionId: selectedTable.activeSessionId })}
                          >
                            🚪 Close Session
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="border-t border-border-base dark:border-zinc-900 pt-5">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex justify-between items-center text-left text-[11px] font-black uppercase tracking-wider text-on-surface-variant/60 dark:text-zinc-400 hover:text-primary dark:hover:text-primary-fixed-dim transition-all cursor-pointer border-none bg-transparent"
                  >
                    <span>⚙️ Advanced Operations & Seat Maps</span>
                    <span>{showAdvanced ? 'Hide Options ▲' : 'Show Options ▼'}</span>
                  </button>

                  {showAdvanced && (
                    <div className="space-y-6 mt-4 pt-4 border-t border-dashed border-border-base dark:border-zinc-800 animate-fade-in">
                      {/* Navigation Shortcuts */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={opLoading}
                          onClick={() => {
                            sessionStorage.setItem('selectedTableNumber', selectedTable.tableNumber);
                            if (onNavigate) onNavigate('waiters');
                          }}
                          className="font-bold text-[11px]"
                        >
                          Waiter Tasks Console
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={opLoading}
                          onClick={() => {
                            sessionStorage.setItem('selectedTableId', selectedTable._id || selectedTable.id);
                            if (onNavigate) onNavigate('billing');
                          }}
                          className="font-bold text-[11px]"
                        >
                          Split Bill Workspace
                        </Button>
                      </div>

                      {/* Structural updates */}
                      <div className="bg-zinc-50/50 dark:bg-zinc-900/10 border border-border-base dark:border-zinc-900 p-4 rounded-xl space-y-3">
                        <span className="text-[9px] font-extrabold text-on-surface-variant/40 dark:text-zinc-500 uppercase tracking-widest block">Structural Adjustments</span>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="font-bold text-[11px]"
                            disabled={opLoading}
                            onClick={() => setOpModal({ open: true, type: 'TRANSFER_TABLE', data: { fromTableId: selectedTable._id } })}
                          >
                            Transfer Table
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="font-bold text-[11px]"
                            disabled={opLoading}
                            onClick={() => setOpModal({ open: true, type: 'MERGE_TABLE', data: { primaryTableId: selectedTable._id } })}
                          >
                            Merge Tables
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="font-bold text-[11px]"
                            disabled={opLoading}
                            onClick={() => setOpModal({ open: true, type: 'CHANGE_WAITER', data: { sessionId: selectedTable.activeSessionId } })}
                          >
                            Assign Waiter
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="font-bold text-[11px]"
                            disabled={opLoading}
                            onClick={() => setOpModal({ open: true, type: 'CHANGE_GUEST_COUNT', data: { tableId: selectedTable._id, currentCap: selectedTable.seatCount } })}
                          >
                            Capacity Sizing
                          </Button>
                          {selectedTable.isMerged && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="col-span-2 font-bold text-[11px]"
                              disabled={opLoading}
                              onClick={() => runOperation('UNMERGE_TABLE', { primaryTableId: selectedTable._id })}
                            >
                              Unmerge Table Layout
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Seat Maps & Order Statuses */}
                {billDetails && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/45 dark:text-zinc-500">Seat Map List</span>
                      <button
                        disabled={opLoading}
                        onClick={() => setOpModal({ open: true, type: 'ADD_SEAT', data: { sessionId: selectedTable.activeSessionId } })}
                        className="text-primary hover:underline text-xs font-bold bg-transparent border-none cursor-pointer"
                      >
                        + Add Seat
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-3.5">
                      {billDetails.orders?.map((order, index) => (
                        <div key={order._id || order.id} className="border border-border-base dark:border-zinc-900 p-3 rounded-2xl flex flex-col justify-between bg-zinc-50/55 dark:bg-zinc-900/20">
                          <div className="flex items-center gap-1.5 mb-1.5 text-xs font-bold text-on-surface dark:text-zinc-200">
                            <HiOutlineUser className="text-primary" />
                            <span>Seat {order.diningContext?.seatNumber || (index + 1)}</span>
                          </div>
                          <span className="text-[10px] text-on-surface-variant dark:text-zinc-500 mb-3 block truncate">
                            Order #{order.orderNumber || ''}
                          </span>

                          <div className="mb-3">
                            <OrderLifecycleActions
                              order={order}
                              onStatusChanged={() => loadDrawerDetails(selectedTable)}
                            />
                          </div>

                          <div className="flex justify-between items-center gap-2 border-t border-border-base/40 dark:border-zinc-800/40 pt-2 mt-1">
                            <span className="text-xs font-extrabold">${order.totalAmount?.toFixed(2)}</span>
                            <div className="flex gap-1">
                              <button
                                disabled={opLoading}
                                title="Move/Swap Seat"
                                onClick={() => setOpModal({ open: true, type: 'MOVE_SEAT', data: { sessionId: selectedTable.activeSessionId, seatNumber: order.diningContext?.seatNumber } })}
                                className="p-1 hover:bg-surface-subtle dark:hover:bg-zinc-900 rounded-md cursor-pointer border-none bg-transparent"
                              >
                                <HiArrowsRightLeft className="text-xs text-primary" />
                              </button>
                              <button
                                disabled={opLoading}
                                onClick={() => runOperation('REMOVE_SEAT', { sessionId: selectedTable.activeSessionId, seatNumber: order.diningContext?.seatNumber })}
                                className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md cursor-pointer border-none bg-transparent"
                              >
                                <HiOutlineTrash className="text-xs text-rose-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div className="space-y-3 border-t border-border-base dark:border-zinc-900 pt-5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/45 dark:text-zinc-550 block">Live Session Timeline</span>
                  <div className="relative border-l border-border-base dark:border-zinc-800 pl-4 space-y-4 ml-1">
                    {tableTimeline.slice(-4).reverse().map((event, idx) => (
                      <div key={idx} className="relative text-xs leading-normal">
                        <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-primary" />
                        <span className="text-on-surface-variant dark:text-zinc-500 text-[9px] font-bold block mb-0.5">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="font-extrabold text-on-background block">{event.status}</span>
                        <p className="text-on-surface-variant dark:text-zinc-400 text-[10px] mt-0.5 leading-relaxed">{event.notes}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Available / Empty Mode Layout */
              <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant dark:text-zinc-500 border border-dashed border-border-base dark:border-zinc-800 rounded-2xl bg-zinc-50/30 dark:bg-zinc-900/5 gap-3">
                <span className="text-3xl">🍽️</span>
                <span className="font-extrabold text-xs text-on-surface dark:text-zinc-300">Table is Empty & Available</span>
                <p className="text-[10px] text-on-surface-variant dark:text-zinc-500 max-w-xs text-center leading-relaxed">
                  Guests can scan table QR code to start dining session, or you can seat a reservation directly via Reservations panel.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unified Operations Modal Dialog - Centered properly */}
      {opModal.open && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
          <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-border-base dark:border-zinc-900 w-96 space-y-4 shadow-2xl shadow-primary/10 animate-scale-in text-xs font-semibold">
            <h3 className="text-[14px] font-extrabold text-on-background capitalize flex items-center gap-1.5">
              ⚙️ {opModal.type.replace('_', ' ')}
            </h3>
            
            <div className="space-y-4">
              {/* Add Seat */}
              {opModal.type === 'ADD_SEAT' && (
                <div className="space-y-2">
                  <label className="font-bold text-on-surface-variant dark:text-zinc-400">Seat Designation</label>
                  <input
                    type="text"
                    id="seatNumberInput"
                    className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-850 rounded-lg p-2 text-xs"
                    placeholder="e.g. Seat 5"
                  />
                </div>
              )}

              {/* Transfer Table */}
              {opModal.type === 'TRANSFER_TABLE' && (
                <div className="space-y-2">
                  <label className="font-bold text-on-surface-variant dark:text-zinc-400">Target Table</label>
                  <select
                    id="toTableIdInput"
                    className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-850 rounded-lg p-2 text-xs text-on-background"
                  >
                    <option value="">Choose available destination</option>
                    {availableTables.map(t => (
                      <option key={t._id} value={t._id}>Table {t.tableNumber} (Cap: {t.seatCount})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Merge Table */}
              {opModal.type === 'MERGE_TABLE' && (
                <div className="space-y-2">
                  <label className="font-bold text-on-surface-variant dark:text-zinc-400 mb-1 block">Choose Secondary Table</label>
                  <select
                    id="secondaryTableIdInput"
                    className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-850 rounded-lg p-2 text-xs text-on-background"
                  >
                    <option value="">Select table</option>
                    {availableTables.map(t => (
                      <option key={t._id} value={t._id}>Table {t.tableNumber} (Cap: {t.seatCount})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Assign Waiter */}
              {opModal.type === 'CHANGE_WAITER' && (
                <div className="space-y-2">
                  <label className="font-bold text-on-surface-variant dark:text-zinc-400">Select Waiter Staff</label>
                  <select
                    id="waiterIdInput"
                    className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-855 rounded-lg p-2 text-xs text-on-background"
                  >
                    <option value="">Select Waiter</option>
                    {staff.map(u => (
                      <option key={u._id || u.id} value={u._id || u.id}>{u.firstName} {u.lastName || ''} ({u.role})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Change Capacity */}
              {opModal.type === 'CHANGE_GUEST_COUNT' && (
                <div className="space-y-2">
                  <label className="font-bold text-on-surface-variant dark:text-zinc-400">Guest Count / Sizing</label>
                  <input
                    type="number"
                    id="guestCountInput"
                    defaultValue={opModal.data.currentCap || 4}
                    className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-850 rounded-lg p-2 text-xs"
                  />
                </div>
              )}

              {/* Move / Swap Seat */}
              {opModal.type === 'MOVE_SEAT' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="font-bold text-on-surface-variant dark:text-zinc-400">Target Seat Designation</label>
                    <input
                      type="text"
                      id="targetSeatInput"
                      className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-850 rounded-lg p-2 text-xs"
                      placeholder="e.g. Seat 2"
                    />
                  </div>
                  <div className="flex items-center gap-2 py-1">
                    <input type="checkbox" id="swapCheckbox" className="checkbox checkbox-xs" />
                    <label htmlFor="swapCheckbox" className="font-bold text-on-surface-variant dark:text-zinc-400">Swap seat contents instead of moving</label>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border-base dark:border-zinc-900">
              <Button size="sm" variant="outline" disabled={opLoading} onClick={() => setOpModal({ open: false, type: '', data: {} })}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" disabled={opLoading} loading={opLoading} onClick={() => {
                if (opModal.type === 'ADD_SEAT') {
                  const num = document.getElementById('seatNumberInput')?.value;
                  if (num) runOperation('ADD_SEAT', { sessionId: opModal.data.sessionId, seatNumber: num });
                } else if (opModal.type === 'TRANSFER_TABLE') {
                  const toId = document.getElementById('toTableIdInput')?.value;
                  if (toId) runOperation('TRANSFER_TABLE', { fromTableId: opModal.data.fromTableId, toTableId: toId });
                } else if (opModal.type === 'MERGE_TABLE') {
                  const secId = document.getElementById('secondaryTableIdInput')?.value;
                  if (secId) runOperation('MERGE_TABLE', { primaryTableId: opModal.data.primaryTableId, secondaryTableIds: [secId] });
                } else if (opModal.type === 'CHANGE_WAITER') {
                  const waiterId = document.getElementById('waiterIdInput')?.value;
                  if (waiterId) runOperation('CHANGE_WAITER', { sessionId: opModal.data.sessionId, waiterId });
                } else if (opModal.type === 'CHANGE_GUEST_COUNT') {
                  const count = document.getElementById('guestCountInput')?.value;
                  if (count) runOperation('CHANGE_GUEST_COUNT', { tableId: opModal.data.tableId, seatCount: count });
                } else if (opModal.type === 'MOVE_SEAT') {
                  const target = document.getElementById('targetSeatInput')?.value;
                  const isSwap = document.getElementById('swapCheckbox')?.checked;
                  if (target) {
                    runOperation(isSwap ? 'SWAP_SEAT' : 'MOVE_SEAT', {
                      sessionId: opModal.data.sessionId,
                      fromSeatNumber: opModal.data.seatNumber,
                      ...(isSwap ? { seatNumberA: opModal.data.seatNumber, seatNumberB: target } : { toSeatNumber: target })
                    });
                  }
                }
              }}>
                Execute Command
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
