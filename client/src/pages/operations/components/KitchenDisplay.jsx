import { useState, useEffect, useCallback } from 'react';
import { getKdsQueueApi, holdKdsItemApi, fireKdsItemApi, fireKdsCourseApi, updateKdsItemStationApi } from '../../../api/models/operations.api';
import { useSocket } from '../../../context/SocketContext';
import { useToast } from '../../../components/ui/Toast';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import { HiOutlineFire, HiOutlinePause, HiOutlineChevronDoubleRight, HiOutlineArrowPath } from 'react-icons/hi2';

export default function KitchenDisplay({ viewMode = 'CARDS', onRefreshDone }) {
  const { lastMessage } = useSocket();
  const { addToast } = useToast();
  
  const [kdsItems, setKdsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStation, setSelectedStation] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'FIRE_NEEDED' | 'FIRED' | 'HELD'

  // Fetch all pending kitchen tickets
  const fetchKdsQueue = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await getKdsQueueApi();
      setKdsItems(res.data?.data?.items || []);
    } catch {
      addToast('Failed to load KDS queue', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
      if (onRefreshDone) onRefreshDone();
    }
  }, [addToast, onRefreshDone]);

  useEffect(() => {
    fetchKdsQueue();
  }, [fetchKdsQueue]);

  // Sync KDS live tickets via Socket.IO events
  useEffect(() => {
    if (!lastMessage) return;
    const { event } = lastMessage;

    const kdsEvents = [
      'ITEM_FIRED', 'ITEM_HELD', 'COURSE_FIRED', 'ITEM_FIRE_REQUESTED', 'ORDER_CREATED', 'ORDER_STATUS_CHANGED'
    ];

    if (kdsEvents.includes(event)) {
      fetchKdsQueue();
    }
  }, [lastMessage, fetchKdsQueue]);

  // Timer helper for active fired item preparation
  const PrepTimer = ({ firedAt }) => {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
      if (!firedAt) return;
      const start = new Date(firedAt).getTime();
      
      const interval = setInterval(() => {
        setSeconds(Math.round((Date.now() - start) / 1000));
      }, 1000);

      return () => clearInterval(interval);
    }, [firedAt]);

    if (!firedAt) return <span className="text-zinc-400">HELD</span>;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return (
      <span className={seconds > 600 ? 'text-red-500 font-bold' : 'text-success-green font-semibold'}>
        {mins}:{secs < 10 ? `0${secs}` : secs} mins
      </span>
    );
  };

  const handleHold = async (itemId) => {
    try {
      await holdKdsItemApi(itemId);
      addToast('Item marked as HELD', 'success');
      fetchKdsQueue();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to hold item', 'error');
    }
  };

  const handleFire = async (itemId) => {
    try {
      await fireKdsItemApi(itemId);
      addToast('Item FIRED to KDS', 'success');
      fetchKdsQueue();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to fire item', 'error');
    }
  };

  const handleFireCourse = async (orderId, course) => {
    try {
      await fireKdsCourseApi(orderId, { course });
      addToast(`Course ${course} fired successfully`, 'success');
      fetchKdsQueue();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to fire course', 'error');
    }
  };

  const handleChangeStation = async (itemId, station) => {
    try {
      await updateKdsItemStationApi(itemId, { kdsStation: station });
      addToast(`Rerouted to station: ${station}`, 'success');
      fetchKdsQueue();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to reroute station', 'error');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>;
  }

  const kdsStations = ['HOT', 'GRILL', 'BAR', 'SALAD', 'COLD', 'PASTRY', 'GENERAL'];

  // Summary Metrics
  const stats = {
    total: kdsItems.length,
    fireNeeded: kdsItems.filter(i => i.holdStatus === 'FIRE_REQUESTED').length,
    fired: kdsItems.filter(i => i.holdStatus === 'FIRED').length,
    held: kdsItems.filter(i => !i.holdStatus || i.holdStatus === 'HELD').length,
  };

  // Filtered KDS items
  const filteredItems = kdsItems.filter(item => {
    // Station filter
    if (selectedStation !== 'ALL') {
      const itemStation = item.kdsStation || 'GENERAL';
      if (itemStation !== selectedStation) return false;
    }
    // Status filter
    if (statusFilter === 'FIRE_NEEDED') {
      return item.holdStatus === 'FIRE_REQUESTED';
    }
    if (statusFilter === 'FIRED') {
      return item.holdStatus === 'FIRED';
    }
    if (statusFilter === 'HELD') {
      return !item.holdStatus || item.holdStatus === 'HELD';
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Metrics Summary Control Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-2xl border transition-all text-left cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-primary/10 border-primary text-primary dark:text-primary-fixed-dim font-bold shadow-xs'
              : 'bg-white dark:bg-zinc-950 border-border-base dark:border-zinc-900 text-on-surface-variant hover:bg-surface-subtle dark:hover:bg-zinc-900'
          }`}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block">Total Tickets</span>
          <span className="text-2xl font-black text-on-background">{stats.total}</span>
        </button>

        <button
          onClick={() => setStatusFilter('FIRE_NEEDED')}
          className={`p-4 rounded-2xl border transition-all text-left cursor-pointer ${
            statusFilter === 'FIRE_NEEDED'
              ? 'bg-rose-500/15 border-rose-500 text-rose-700 dark:text-rose-300 font-bold shadow-xs'
              : 'bg-white dark:bg-zinc-950 border-border-base dark:border-zinc-900 text-on-surface-variant hover:bg-surface-subtle dark:hover:bg-zinc-900'
          }`}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600 dark:text-rose-400 block flex items-center gap-1">
            🔥 Fire Needed
          </span>
          <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{stats.fireNeeded}</span>
        </button>

        <button
          onClick={() => setStatusFilter('FIRED')}
          className={`p-4 rounded-2xl border transition-all text-left cursor-pointer ${
            statusFilter === 'FIRED'
              ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs'
              : 'bg-white dark:bg-zinc-950 border-border-base dark:border-zinc-900 text-on-surface-variant hover:bg-surface-subtle dark:hover:bg-zinc-900'
          }`}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 block flex items-center gap-1">
            ⏳ In Prep / Fired
          </span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.fired}</span>
        </button>

        <button
          onClick={() => setStatusFilter('HELD')}
          className={`p-4 rounded-2xl border transition-all text-left cursor-pointer ${
            statusFilter === 'HELD'
              ? 'bg-amber-500/15 border-amber-500 text-amber-800 dark:text-amber-300 font-bold shadow-xs'
              : 'bg-white dark:bg-zinc-950 border-border-base dark:border-zinc-900 text-on-surface-variant hover:bg-surface-subtle dark:hover:bg-zinc-900'
          }`}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400 block flex items-center gap-1">
            ⏸️ Held
          </span>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.held}</span>
        </button>
      </div>

      {/* Station Navigation Tabs & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-border-base dark:border-zinc-900 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedStation('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shrink-0 ${
              selectedStation === 'ALL'
                ? 'bg-primary text-white dark:bg-primary-fixed dark:text-zinc-950 shadow-xs'
                : 'bg-surface-subtle text-on-surface-variant border border-border-base/60 hover:bg-surface-container-low dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800'
            }`}
          >
            All Kitchen Stations ({kdsItems.length})
          </button>
          {kdsStations.map(st => {
            const count = kdsItems.filter(i => (i.kdsStation || 'GENERAL') === st).length;
            return (
              <button
                key={st}
                onClick={() => setSelectedStation(st)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shrink-0 ${
                  selectedStation === st
                    ? 'bg-primary text-white dark:bg-primary-fixed dark:text-zinc-950 shadow-xs'
                    : 'bg-surface-subtle text-on-surface-variant border border-border-base/60 hover:bg-surface-container-low dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800'
                }`}
              >
                {st} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content View Switcher */}
      {viewMode === 'LANES' ? (
        /* Multi-Column Station Lanes View (Previous KDS Layout) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4 max-w-full overflow-x-auto pb-4">
          {kdsStations.map(station => {
            const stationItems = kdsItems.filter(item => item.kdsStation === station || (!item.kdsStation && station === 'GENERAL'));

            return (
              <div key={station} className="bg-surface-container-low dark:bg-zinc-900/20 p-4 rounded-xl min-w-[220px] flex flex-col gap-4 border border-border-base dark:border-zinc-900">
                <div className="flex justify-between items-center border-b border-border-base dark:border-zinc-800 pb-2">
                  <span className="text-[12px] font-extrabold text-primary dark:text-primary-fixed-dim tracking-wider">{station}</span>
                  <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full dark:bg-zinc-800 dark:text-zinc-400">
                    {stationItems.length}
                  </span>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto max-h-[550px] pr-1">
                  {stationItems.length === 0 ? (
                    <span className="text-[11px] text-on-surface-variant/40 dark:text-zinc-650 block text-center py-8">
                      Queue clear
                    </span>
                  ) : (
                    stationItems.map(item => {
                      const isFired = item.holdStatus === 'FIRED';

                      return (
                        <div
                          key={item.itemId}
                          className={`bg-white dark:bg-zinc-950 p-3.5 rounded-lg border shadow-xs space-y-2.5 transition-all ${
                            isFired ? 'border-emerald-500' : 'border-border-base dark:border-zinc-800'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-1">
                            <div>
                              <span className="text-[10px] font-bold text-on-surface-variant/50 uppercase block">
                                {item.course}
                              </span>
                              <span className="font-bold text-[13px] text-on-background line-clamp-2">
                                {item.itemName}
                              </span>
                            </div>
                            <span className="bg-surface-container text-on-background text-[11px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0">
                              x{item.quantity}
                            </span>
                          </div>

                          <div className="text-[11px] text-on-surface-variant dark:text-zinc-450 space-y-1">
                            {item.notes && <p className="italic bg-yellow-50 dark:bg-yellow-950/20 p-1 rounded">"{item.notes}"</p>}
                            <div className="flex justify-between text-[10px] font-semibold">
                              <span>Table: {item.tableNumber || 'N/A'}</span>
                              {item.seatNumber && <span>Seat: {item.seatNumber}</span>}
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-[11px] border-t border-border-base dark:border-zinc-900 pt-2">
                            <span className="text-on-surface-variant/70 dark:text-zinc-500">Status:</span>
                            <PrepTimer firedAt={item.firedAt} />
                          </div>

                          <div className="flex justify-end gap-1.5 pt-1 border-t border-border-base dark:border-zinc-900">
                            {isFired ? (
                              <button
                                onClick={() => handleHold(item.itemId)}
                                title="Hold Ticket"
                                className="text-amber-500 hover:bg-amber-50 p-1.5 rounded text-xs dark:hover:bg-amber-950/20 cursor-pointer"
                              >
                                <HiOutlinePause />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleFire(item.itemId)}
                                title="Fire to KDS"
                                className="text-emerald-500 hover:bg-emerald-50 p-1.5 rounded text-xs dark:hover:bg-emerald-950/20 cursor-pointer"
                              >
                                <HiOutlineFire />
                              </button>
                            )}

                            {!isFired && (
                              <button
                                onClick={() => handleFireCourse(item.orderId, item.course)}
                                title="Fire Course Batch"
                                className="text-primary hover:bg-indigo-50 p-1.5 rounded text-xs dark:hover:bg-zinc-800 cursor-pointer"
                              >
                                <HiOutlineChevronDoubleRight />
                              </button>
                            )}

                            <select
                              onChange={(e) => handleChangeStation(item.itemId, e.target.value)}
                              value={item.kdsStation || 'GENERAL'}
                              className="bg-surface-container dark:bg-zinc-900 text-[10px] font-bold rounded p-1 border-none outline-none max-w-[85px] cursor-pointer"
                            >
                              {kdsStations.map(st => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-zinc-950 border border-dashed border-border-base dark:border-zinc-900 rounded-3xl p-16 text-center space-y-3">
          <span className="text-4xl block">👨‍🍳</span>
          <h3 className="text-sm font-extrabold text-on-background">Kitchen Queue Clear!</h3>
          <p className="text-xs text-on-surface-variant dark:text-zinc-400 max-w-sm mx-auto">
            There are currently no pending items matching station "{selectedStation}" and status "{statusFilter}".
          </p>
          <Button size="sm" variant="outline" onClick={() => { setSelectedStation('ALL'); setStatusFilter('ALL'); }}>
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map(item => {
            const isFired = item.holdStatus === 'FIRED';
            const isPendingFire = item.holdStatus === 'FIRE_REQUESTED';

            return (
              <div
                key={item.itemId}
                className={`bg-white dark:bg-zinc-950 p-4.5 rounded-2xl border space-y-4 shadow-2xs transition-all ${
                  isFired ? 'border-emerald-400 dark:border-emerald-950 ring-1 ring-emerald-500/20' :
                  isPendingFire ? 'border-rose-400 dark:border-rose-950 ring-1 ring-rose-500/20 animate-pulse' :
                  'border-border-base dark:border-zinc-900'
                }`}
              >
                {/* Header: Course & Station Badge */}
                <div className="flex justify-between items-center border-b border-border-base/50 dark:border-zinc-900 pb-2.5">
                  <span className="text-[10px] font-extrabold text-primary dark:text-primary-fixed-dim uppercase tracking-wider bg-primary/10 dark:bg-zinc-900 px-2 py-0.5 rounded-md">
                    {item.course || 'STARTER'}
                  </span>
                  <span className="text-[10px] font-bold text-on-surface-variant/70 dark:text-zinc-500 uppercase tracking-wider">
                    Station: <strong className="text-on-background">{item.kdsStation || 'GENERAL'}</strong>
                  </span>
                </div>

                {/* Item Name & Quantity */}
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-extrabold text-sm text-on-background leading-snug">
                    {item.itemName}
                  </h4>
                  <span className="bg-primary text-white dark:bg-primary-fixed dark:text-zinc-950 text-xs font-black px-2.5 py-1 rounded-lg shrink-0">
                    x{item.quantity}
                  </span>
                </div>

                {/* Table & Notes */}
                <div className="bg-surface-subtle dark:bg-zinc-900/50 p-2.5 rounded-xl border border-border-base/30 dark:border-zinc-850/50 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-on-surface-variant dark:text-zinc-400 font-bold text-[11px]">
                    <span>📍 Table {item.tableNumber || 'Takeout/Delivery'}</span>
                    {item.seatNumber && <span>Seat: {item.seatNumber}</span>}
                  </div>
                  {item.notes && (
                    <p className="italic text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-1.5 rounded-lg border border-amber-200/50 dark:border-amber-900/30">
                      💬 "{item.notes}"
                    </p>
                  )}
                </div>

                {/* Prep Timer & Status */}
                <div className="flex justify-between items-center text-xs font-bold pt-1">
                  <span className="text-on-surface-variant dark:text-zinc-500 text-[11px]">Prep Duration:</span>
                  <div className="bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 rounded-lg text-xs font-mono">
                    <PrepTimer firedAt={item.firedAt} />
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="pt-2 border-t border-border-base dark:border-zinc-900 flex items-center justify-between gap-2">
                  {isFired ? (
                    <Button
                      size="sm"
                      variant="primary"
                      className="flex-1 font-bold text-xs py-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleHold(item.itemId)}
                    >
                      <HiOutlinePause className="text-sm" /> Hold Ticket
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="primary"
                      className="flex-1 font-bold text-xs py-2 bg-rose-600 hover:bg-rose-700 text-white"
                      onClick={() => handleFire(item.itemId)}
                    >
                      <HiOutlineFire className="text-sm" /> 🔥 Fire Now
                    </Button>
                  )}

                  {!isFired && (
                    <Button
                      size="sm"
                      variant="outline"
                      title="Fire Course Batch"
                      onClick={() => handleFireCourse(item.orderId, item.course)}
                      className="font-bold text-xs py-2 px-3"
                    >
                      <HiOutlineChevronDoubleRight className="text-sm" />
                    </Button>
                  )}

                  {/* Reroute Station Select */}
                  <select
                    onChange={(e) => handleChangeStation(item.itemId, e.target.value)}
                    value={item.kdsStation || 'GENERAL'}
                    className="bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 text-[11px] font-bold rounded-xl p-2 text-on-background outline-none cursor-pointer shrink-0"
                  >
                    {kdsStations.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
