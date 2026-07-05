import { useState, useEffect, useCallback } from 'react';
import { getKdsQueueApi, holdKdsItemApi, fireKdsItemApi, fireKdsCourseApi, updateKdsItemStationApi } from '../../../api/models/operations.api';
import { useSocket } from '../../../context/SocketContext';
import { useToast } from '../../../components/ui/Toast';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import { HiOutlineFire, HiOutlinePause, HiOutlineChevronDoubleRight, HiOutlineArrowPath } from 'react-icons/hi2';

export default function KitchenDisplay() {
  const { lastMessage } = useSocket();
  const { addToast } = useToast();
  
  const [kdsItems, setKdsItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all pending kitchen tickets
  const fetchKdsQueue = useCallback(async () => {
    try {
      const res = await getKdsQueueApi();
      setKdsItems(res.data?.data?.items || []);
    } catch {
      addToast('Failed to load KDS queue', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h3 className="text-[14px] font-bold text-on-background uppercase tracking-wider">Kitchen Display Channels</h3>
        <Button size="xs" variant="outline" onClick={fetchKdsQueue} className="flex items-center gap-1">
          <HiOutlineArrowPath /> Refresh KDS
        </Button>
      </div>

      {/* Grid lanes by KDS Station */}
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

              {/* Items List */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px] pr-1">
                {stationItems.length === 0 ? (
                  <span className="text-[11px] text-on-surface-variant/40 dark:text-zinc-650 block text-center py-8">
                    Queue clear
                  </span>
                ) : (
                  stationItems.map(item => {
                    const isFired = item.holdStatus === 'FIRED';
                    const isPendingFire = item.holdStatus === 'FIRE_REQUESTED';

                    return (
                      <div 
                        key={item.itemId} 
                        className={`bg-white dark:bg-zinc-950 p-3.5 rounded-lg border shadow-xs space-y-2.5 transition-all ${
                          isFired ? 'border-success-green' : 'border-border-base dark:border-zinc-800'
                        }`}
                      >
                        {/* Title, Course, Quantity */}
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

                        {/* Note & Table/Seat Details */}
                        <div className="text-[11px] text-on-surface-variant dark:text-zinc-450 space-y-1">
                          {item.notes && <p className="italic bg-yellow-50 dark:bg-yellow-950/20 p-1 rounded">"{item.notes}"</p>}
                          <div className="flex justify-between text-[10px] font-semibold">
                            <span>Table: {item.tableNumber || 'N/A'}</span>
                            {item.seatNumber && <span>Seat: {item.seatNumber}</span>}
                          </div>
                        </div>

                        {/* SLA timer */}
                        <div className="flex justify-between items-center text-[11px] border-t border-border-base dark:border-zinc-900 pt-2">
                          <span className="text-on-surface-variant/70 dark:text-zinc-500">Status:</span>
                          <PrepTimer firedAt={item.firedAt} />
                        </div>

                        {/* Item Control actions */}
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
                              className="text-success-green hover:bg-emerald-50 p-1.5 rounded text-xs dark:hover:bg-emerald-950/20 cursor-pointer"
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

                          {/* Reroute select dropdown */}
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
    </div>
  );
}
