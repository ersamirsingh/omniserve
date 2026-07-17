import { useState, useEffect, useCallback } from 'react';
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
  HiUserMinus
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

  const fetchData = useCallback(async () => {
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
    } finally {
      setLoading(false);
    }
  }, [selectedAreaId, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Drawer details lookup
  const loadDrawerDetails = useCallback(async (table) => {
    if (!table.activeSessionId) {
      setTableTimeline([]);
      setBillDetails(null);
      return;
    }

    try {
      joinSession(table.activeSessionId.toString());
      const [timelineRes, billRes] = await Promise.all([
        getUnifiedTimelineApi(table.activeSessionId),
        getSessionBillApi(table.activeSessionId).catch(() => ({ data: { data: null } }))
      ]);

      setTableTimeline(timelineRes.data?.data?.timeline || []);
      setBillDetails(billRes.data?.data || null);
    } catch (err) {
      console.warn('Failed to load table drawer details:', err);
    }
  }, [joinSession]);

  // WebSocket event handler
  useEffect(() => {
    if (!lastMessage) return;
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
          const updatedTable = latestTables.find(t => t._id === selectedTable._id || t.id === selectedTable.id);
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
  }, [lastMessage, selectedTable, fetchData, loadDrawerDetails, tables]);

  // Handle table drawer toggle
  const handleTableClick = (table) => {
    if (selectedTable?.activeSessionId) {
      leaveSession(selectedTable.activeSessionId.toString());
    }
    setSelectedTable(table);
    setDrawerOpen(true);
    loadDrawerDetails(table);
  };

  const handleCloseDrawer = () => {
    if (selectedTable?.activeSessionId) {
      leaveSession(selectedTable.activeSessionId.toString());
    }
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
      addToast(`Operation ${operationType} succeeded`, 'success');
      setOpModal({ open: false, type: '', data: {} });
      
      const latestTables = await fetchData();
      if (selectedTable && latestTables) {
        const updatedTable = latestTables.find(t => t._id === selectedTable._id || t.id === selectedTable.id);
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
    if (table.operationalStatus === 'CLEANING') return 'bg-purple-500 text-white hover:bg-purple-650';
    if (table.operationalStatus === 'BILL_REQUESTED') return 'bg-yellow-500 text-black hover:bg-yellow-600';
    if (table.operationalStatus === 'RESERVED') return 'bg-blue-500 text-white hover:bg-blue-600';
    if (table.activeSessionId && table.operationalStatus !== 'AVAILABLE') return 'bg-red-500 text-white hover:bg-red-600';
    return 'bg-success-green text-white hover:bg-emerald-600';
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>;
  }

  const currentAreaTables = tables.filter(t => t.diningAreaId?.toString() === selectedAreaId || t.diningAreaId?._id?.toString() === selectedAreaId);
  const availableTables = tables.filter(t => !t.activeSessionId && t._id !== selectedTable?._id);

  return (
    <div className="relative flex flex-col gap-6 animate-fade-in">
      {/* Area selector tabs */}
      <div className="flex gap-2 pb-2 overflow-x-auto">
        {diningAreas.map(area => (
          <button
            key={area._id || area.id}
            onClick={() => setSelectedAreaId(area._id || area.id)}
            className={`px-4 py-2 rounded-lg text-[13px] font-bold cursor-pointer transition-all ${
              selectedAreaId === (area._id || area.id)
                ? 'bg-primary text-white dark:bg-primary-fixed dark:text-zinc-950 shadow-md'
                : 'bg-white text-on-surface-variant border border-border-base hover:bg-surface-container-low dark:bg-zinc-950 dark:text-zinc-400 dark:border-zinc-900'
            }`}
          >
            {area.name}
          </button>
        ))}
      </div>

      {/* Grid Floor workspace */}
      <div className="relative w-full h-150 bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-900 rounded-xl overflow-hidden shadow-inner">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [bg-size:20px_20px] opacity-70" />

        {currentAreaTables.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center flex-col text-on-surface-variant dark:text-zinc-550">
            <span className="text-[14px] font-semibold">No tables mapped to this dining area.</span>
            <span className="text-[12px] mt-1">Use the Floor Designer tab to place tables.</span>
          </div>
        ) : (
          currentAreaTables.map((table) => {
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
                  cursor: 'pointer'
                }}
                className={`flex flex-col items-center justify-center shadow-lg font-hanken text-[12px] font-bold border border-black/10 transition-all ${
                  isRound ? 'rounded-full' : 'rounded-lg'
                } ${tableColor}`}
              >
                <span className="text-[13px]">{table.tableNumber}</span>
                <span className="text-[10px] opacity-80 font-normal">Cap: {table.seatCount}</span>
                {table.operationalStatus === 'CLEANING' && <span className="text-[9px] uppercase tracking-wider font-semibold bg-black/20 px-1 rounded mt-1">Cleaning</span>}
                {table.operationalStatus === 'BILL_REQUESTED' && <span className="text-[9px] uppercase tracking-wider font-semibold bg-black/25 px-1 rounded mt-1">Bill</span>}
              </button>
            );
          })
        )}
      </div>

      {/* Table Side Detail Drawer */}
      {drawerOpen && selectedTable && (
        <div className="fixed inset-y-0 right-0 w-112.5 bg-white dark:bg-zinc-950 border-l border-border-base dark:border-zinc-900 shadow-2xl z-150 flex flex-col animate-slide-in-right">
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-border-base dark:border-zinc-900">
            <div>
              <h2 className="text-[16px] font-bold text-on-background">Table {selectedTable.tableNumber}</h2>
              <span className="text-[11px] text-on-surface-variant dark:text-zinc-550 uppercase tracking-widest font-bold">
                {selectedTable.operationalStatus || 'Available'}
              </span>
            </div>
            <button onClick={handleCloseDrawer} className="text-on-surface-variant hover:text-on-background cursor-pointer">
              <HiOutlineXMark className="text-xl" />
            </button>
          </div>

          {/* Drawer Body Scroll */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {selectedTable.operationalStatus === 'CLEANING' ? (
              /* Cleaning Mode: Show ONLY the Cleaning Done action for simplicity */
              <div className="space-y-4 py-4">
                <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 p-4 rounded-2xl text-center space-y-2">
                  <span className="text-2xl block">🧹</span>
                  <h4 className="text-xs font-bold text-purple-950 dark:text-purple-300">Table needs cleaning</h4>
                  <p className="text-[11px] text-purple-700 dark:text-purple-400">Previous guest session has ended. Mark it clean to make it available for new scans.</p>
                </div>
                <Button
                  size="md"
                  variant="primary"
                  className="w-full text-white bg-purple-600 hover:bg-purple-700 py-3 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer border-none"
                  disabled={opLoading}
                  onClick={() => runOperation('COMPLETE_CLEANING', { tableId: selectedTable._id || selectedTable.id })}
                >
                  ✅ Cleaning Done - Mark Available
                </Button>
              </div>
            ) : selectedTable.activeSessionId ? (
              /* Dining Mode */
              <div className="space-y-5">
                {/* Active Session Info Card */}
                {billDetails && (
                  <div className="bg-surface-subtle dark:bg-zinc-900/40 border border-border-base dark:border-zinc-850 p-4 rounded-2xl space-y-2 text-[12px]">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant dark:text-zinc-400 font-semibold">Waiter:</span>
                      <span className="font-bold text-on-surface dark:text-zinc-200">{billDetails.billSession?.waiterName || 'None'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant dark:text-zinc-400 font-semibold">Total Amount:</span>
                      <span className="font-extrabold text-primary dark:text-primary-fixed-dim">
                        ${billDetails.billSession?.totalAmount?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border-base/40 dark:border-zinc-800/40 pt-1.5">
                      <span className="text-on-surface-variant dark:text-zinc-400 font-semibold">Outstanding:</span>
                      <span className="font-extrabold text-red-500">
                        ${billDetails.billSession?.outstandingBalance?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Primary Operations Panel */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/40 dark:text-zinc-500">Primary Actions</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      className="w-full font-bold text-xs"
                      disabled={opLoading}
                      onClick={() => runOperation('REQUEST_BILL', { sessionId: selectedTable.activeSessionId })}
                    >
                      💵 Request Bill
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="font-bold text-xs"
                        disabled={opLoading}
                        onClick={() => runOperation('START_CLEANING', { tableId: selectedTable._id })}
                      >
                        🧹 Start Cleaning
                      </Button>
                      <Button
                        size="sm"
                        className="font-bold text-xs text-red-550 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
                        variant="outline"
                        disabled={opLoading}
                        onClick={() => runOperation('CLOSE_SESSION', { sessionId: selectedTable.activeSessionId })}
                      >
                        🚪 Close Session
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Collapsible Advanced Panel */}
                <div className="border-t border-border-base dark:border-zinc-900 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex justify-between items-center text-left text-[11px] font-black uppercase tracking-wider text-on-surface-variant/60 dark:text-zinc-400 hover:text-primary dark:hover:text-primary-fixed-dim transition-colors cursor-pointer border-none bg-transparent"
                  >
                    <span>⚙️ Advanced Actions & Seat List</span>
                    <span>{showAdvanced ? 'Collapse ▲' : 'Expand ▼'}</span>
                  </button>

                  {showAdvanced && (
                    <div className="space-y-5 mt-4 pt-4 border-t border-dashed border-border-base dark:border-zinc-800 animate-fade-in">
                      {/* Navigation Actions */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-on-surface-variant/40 dark:text-zinc-500 uppercase tracking-widest block">Dashboard Shortcuts</span>
                        <div className="grid grid-cols-2 gap-2">
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
                            Go to Waiters
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
                            Go to Splits
                          </Button>
                        </div>
                      </div>

                      {/* Structural operations */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-on-surface-variant/40 dark:text-zinc-500 uppercase tracking-widest block">Structure Updates</span>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="font-semibold text-[11px]"
                            disabled={opLoading}
                            onClick={() => setOpModal({ open: true, type: 'TRANSFER_TABLE', data: { fromTableId: selectedTable._id } })}
                          >
                            Transfer Table
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="font-semibold text-[11px]"
                            disabled={opLoading}
                            onClick={() => setOpModal({ open: true, type: 'MERGE_TABLE', data: { primaryTableId: selectedTable._id } })}
                          >
                            Merge Table
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="font-semibold text-[11px]"
                            disabled={opLoading}
                            onClick={() => setOpModal({ open: true, type: 'CHANGE_WAITER', data: { sessionId: selectedTable.activeSessionId } })}
                          >
                            Assign Waiter
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="font-semibold text-[11px]"
                            disabled={opLoading}
                            onClick={() => setOpModal({ open: true, type: 'CHANGE_GUEST_COUNT', data: { tableId: selectedTable._id, currentCap: selectedTable.seatCount } })}
                          >
                            Guest Capacity
                          </Button>
                          {selectedTable.isMerged && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="col-span-2 font-semibold text-[11px]"
                              disabled={opLoading}
                              onClick={() => runOperation('UNMERGE_TABLE', { primaryTableId: selectedTable._id })}
                            >
                              Unmerge Table
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Seats occupied */}
                      {billDetails && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-on-surface-variant/40 dark:text-zinc-550 uppercase tracking-widest">Seats List</span>
                            <button
                              disabled={opLoading}
                              onClick={() => setOpModal({ open: true, type: 'ADD_SEAT', data: { sessionId: selectedTable.activeSessionId } })}
                              className="text-primary text-[10px] font-bold flex items-center gap-0.5 hover:underline cursor-pointer bg-transparent border-none disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              + Add Seat
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {billDetails.orders?.map((order, index) => (
                              <div key={order._id || order.id} className="border border-border-base dark:border-zinc-900 p-2.5 rounded-xl flex flex-col justify-between bg-zinc-50 dark:bg-zinc-900/40">
                                <div className="flex items-center gap-1.5 mb-1 text-[11px] font-bold text-on-surface dark:text-zinc-200">
                                  <HiOutlineUser className="text-on-surface-variant" />
                                  <span>Seat {order.diningContext?.seatNumber || (index + 1)}</span>
                                </div>
                                <span className="text-[10px] text-on-surface-variant dark:text-zinc-550 mb-2 truncate">
                                  Order #{order.orderNumber || ''}
                                </span>

                                <div className="mb-2 scale-95 origin-left">
                                  <OrderLifecycleActions
                                    order={order}
                                    onStatusChanged={() => loadDrawerDetails(selectedTable)}
                                  />
                                </div>

                                <div className="flex justify-between items-center gap-1.5 border-t border-border-base dark:border-zinc-800/60 pt-1.5">
                                  <span className="text-[11px] font-bold">${order.totalAmount?.toFixed(2)}</span>
                                  <div className="flex gap-0.5">
                                    <button
                                      disabled={opLoading}
                                      title="Move/Swap Seat"
                                      onClick={() => setOpModal({ open: true, type: 'MOVE_SEAT', data: { sessionId: selectedTable.activeSessionId, seatNumber: order.diningContext?.seatNumber } })}
                                      className="text-primary hover:bg-indigo-50 dark:hover:bg-zinc-900 p-1 rounded text-xs cursor-pointer border-none bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <HiArrowsRightLeft />
                                    </button>
                                    <button
                                      disabled={opLoading}
                                      onClick={() => runOperation('REMOVE_SEAT', { sessionId: selectedTable.activeSessionId, seatNumber: order.diningContext?.seatNumber })}
                                      className="text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded text-xs cursor-pointer border-none bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <HiOutlineTrash />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Timeline */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-on-surface-variant/40 dark:text-zinc-555 uppercase tracking-widest block">Live Table Timeline</span>
                        <div className="relative border-l border-border-base dark:border-zinc-800 pl-3.5 space-y-3.5 ml-1">
                          {tableTimeline.slice(-5).reverse().map((event, idx) => (
                            <div key={idx} className="relative text-[11px] leading-tight">
                              <span className="absolute -left-4.75 top-1.5 w-2 h-2 rounded-full bg-primary dark:bg-primary-fixed-dim" />
                              <span className="text-on-surface-variant dark:text-zinc-500 text-[9px] block">
                                {new Date(event.timestamp).toLocaleTimeString()}
                              </span>
                              <span className="font-bold text-on-background block">{event.status}</span>
                              <p className="text-on-surface-variant dark:text-zinc-400 text-[10px] mt-0.5">{event.notes}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Available / Empty Mode */
              <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant dark:text-zinc-555 border border-dashed border-border-base dark:border-zinc-855 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/10 gap-2">
                <span className="text-2xl">🍽️</span>
                <span className="font-bold text-xs text-on-surface dark:text-zinc-300">Table is Available</span>
                <span className="text-[10px] text-on-surface-variant dark:text-zinc-455">Scan QR or seat a reservation to occupy this table.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unified Operations Modal Dialog */}
      {opModal.open && (
        <div className="fixed inset-0 bg-black/50 z-200 flex items-center justify-center backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-border-base dark:border-zinc-900 w-95 space-y-4 shadow-2xl animate-scale-in">
            <h3 className="text-[15px] font-bold text-on-background capitalize">
              {opModal.type.replace('_', ' ')}
            </h3>
            
            <div className="space-y-4 text-xs">
              {/* Add Seat */}
              {opModal.type === 'ADD_SEAT' && (
                <div className="space-y-2">
                  <label className="font-bold text-on-surface-variant dark:text-zinc-400">Seat Designation (e.g. Seat 5)</label>
                  <input
                    type="text"
                    id="seatNumberInput"
                    className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-850 rounded-lg p-2 text-xs"
                    placeholder="Enter seat number"
                  />
                </div>
              )}

              {/* Transfer Table */}
              {opModal.type === 'TRANSFER_TABLE' && (
                <div className="space-y-2">
                  <label className="font-bold text-on-surface-variant dark:text-zinc-400">Select Target Table</label>
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
                  <label className="font-bold text-on-surface-variant dark:text-zinc-400 mb-1 block">Choose Table to Merge</label>
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
                    className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-850 rounded-lg p-2 text-xs text-on-background"
                  >
                    <option value="">Select Waiter</option>
                    {staff.map(u => (
                      <option key={u._id || u.id} value={u._id || u.id}>{u.name} ({u.role})</option>
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
                    <label htmlFor="swapCheckbox" className="font-semibold text-on-surface-variant">Swap seat content instead of moving</label>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border-base dark:border-zinc-900">
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
                Execute
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
