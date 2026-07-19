import { useState, useEffect, useCallback } from 'react';
import { getTablesApi, getUnifiedTimelineApi } from '../../../api/models/operations.api';
import { useSocket } from '../../../context/SocketContext';
import { useToast } from '../../../components/ui/Toast';
import Spinner from '../../../components/ui/Spinner';
import Badge from '../../../components/ui/Badge';
import { HiOutlineListBullet, HiOutlineClock, HiOutlineFunnel } from 'react-icons/hi2';

export default function OperationsTimeline() {
  const { lastMessage } = useSocket();
  const { addToast } = useToast();

  const [activeTables, setActiveTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');

  const fetchTables = useCallback(async () => {
    try {
      const res = await getTablesApi();
      const tables = res.data?.data?.tables || [];
      const occupied = tables.filter(t => t.activeSessionId);
      setActiveTables(occupied);

      if (occupied.length > 0 && !selectedTable) {
        setSelectedTable(occupied[0]);
        loadTimeline(occupied[0].activeSessionId);
      }
    } catch {
      addToast('Failed to load active dining sessions', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedTable, addToast]);

  const loadTimeline = async (sessionId) => {
    try {
      const res = await getUnifiedTimelineApi(sessionId);
      setTimeline(res.data?.data?.timeline || []);
    } catch {
      setTimeline([]);
    }
  };

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  // Sync state changes on websocket notification
  useEffect(() => {
    if (!lastMessage) return;
    const { event } = lastMessage;

    const timelineRefreshEvents = [
      'TABLE_OCCUPIED', 'TABLE_AVAILABLE', 'TABLE_STATUS_CHANGED', 'TABLE_TRANSFERRED',
      'TABLE_MERGED', 'TABLE_UNMERGED', 'SEAT_MOVED', 'SEAT_SWAPPED', 'SEAT_ADDED',
      'SEAT_REMOVED', 'WAITER_TASK_CREATED', 'WAITER_TASK_COMPLETED', 'WAITER_TASK_ESCALATED',
      'BILL_REQUESTED', 'BILL_SETTLED', 'SESSION_CLOSED'
    ];

    if (timelineRefreshEvents.includes(event)) {
      fetchTables().then(() => {
        if (selectedTable) {
          loadTimeline(selectedTable.activeSessionId);
        }
      });
    }
  }, [lastMessage, selectedTable, fetchTables]);

  const handleTableChange = (table) => {
    setSelectedTable(table);
    loadTimeline(table.activeSessionId);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>;
  }

  const safeTimeline = Array.isArray(timeline) ? timeline : [];
  const filteredTimeline = safeTimeline.filter(event => {
    if (!event) return false;
    if (filterType === 'ALL') return true;
    return event.type === filterType;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
      {/* Session selector sidebar */}
      <div className="lg:col-span-1 bg-white dark:bg-zinc-950 p-4 border border-border-base dark:border-zinc-900 rounded-xl space-y-4">
        <h3 className="text-[13px] font-bold text-on-surface-variant/70 uppercase tracking-wider">Active Dining Sessions</h3>
        {activeTables.length === 0 ? (
          <span className="text-[11px] text-on-surface-variant/40 dark:text-zinc-650 block text-center py-12">
            No active dining tables
          </span>
        ) : (
          <div className="space-y-1.5">
            {activeTables.map(table => (
              <button
                key={table._id}
                onClick={() => handleTableChange(table)}
                className={`w-full text-left p-3 rounded-lg text-[13px] font-bold cursor-pointer transition-all ${
                  selectedTable?._id === table._id
                    ? 'bg-primary/10 text-primary border border-primary/20 dark:text-primary-fixed-dim'
                    : 'bg-surface-container-low dark:bg-zinc-900/30 text-on-surface border border-transparent hover:bg-surface-container'
                }`}
              >
                Table {table.tableNumber}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Unified chronological activity feed */}
      <div className="lg:col-span-3 bg-white dark:bg-zinc-950 p-6 border border-border-base dark:border-zinc-900 rounded-xl space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4 border-b border-border-base dark:border-zinc-850 pb-3">
          <h4 className="text-[14px] font-bold text-on-background flex items-center gap-1.5">
            <HiOutlineListBullet className="text-primary text-base" /> Chronological Operations Timeline
          </h4>

          {/* Timeline filter dropdown */}
          <div className="flex items-center gap-1.5 text-xs">
            <HiOutlineFunnel className="text-on-surface-variant" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg p-1.5 text-xs text-on-background cursor-pointer"
            >
              <option value="ALL">All Event Types</option>
              <option value="TABLE">Table Coordinates & Seats</option>
              <option value="ORDER">Canonical Orders</option>
              <option value="WAITER_TASK">Waiter Tasks & SLAs</option>
            </select>
          </div>
        </div>

        {selectedTable && filteredTimeline.length === 0 ? (
          <span className="text-[11px] text-on-surface-variant/40 dark:text-zinc-650 block text-center py-24">
            No events registered for this session yet.
          </span>
        ) : selectedTable ? (
          <div className="relative border-l border-border-base dark:border-zinc-800 pl-6 space-y-6 ml-2">
            {filteredTimeline.slice().reverse().map((event, idx) => (
              <div key={idx} className="relative text-[13px] animate-fade-in">
                {/* Visual indicator point */}
                <span className="absolute -left-[29px] top-1 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-white dark:bg-primary-fixed-dim dark:ring-zinc-950" />
                
                <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant dark:text-zinc-550 font-bold">
                  <HiOutlineClock className="text-sm" />
                  <span>{event?.timestamp ? new Date(event.timestamp).toLocaleTimeString() : '—'}</span>
                  <Badge variant={event?.type === 'TABLE' ? 'info' : event?.type === 'ORDER' ? 'success' : 'warning'} size="xs" className="uppercase text-[9px] font-bold tracking-wider">
                    {event?.type || 'EVENT'}
                  </Badge>
                </div>

                <span className="font-bold text-on-background block mt-1">{event.status}</span>
                <p className="text-on-surface-variant dark:text-zinc-400 text-xs mt-0.5">{event.notes}</p>

                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <div className="bg-surface-container-low dark:bg-zinc-900/40 p-2 rounded-md text-[10px] font-semibold text-on-surface-variant/80 dark:text-zinc-500 mt-2 max-w-sm truncate">
                    Metadata: {JSON.stringify(event.metadata)}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-on-surface-variant dark:text-zinc-550">
            <HiOutlineListBullet className="text-4xl text-on-surface-variant/40 mb-3" />
            <span className="text-[14px] font-semibold">Select an active session</span>
            <span className="text-[12px] mt-1 font-normal">Choose an occupied table to inspect its chronological audit trail.</span>
          </div>
        )}
      </div>
    </div>
  );
}
