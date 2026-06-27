import { useState, useEffect, useCallback } from 'react';
import { getReservationsApi, createReservationApi, confirmReservationApi, seatReservationApi, markReservationNoShowApi, cancelReservationApi, getTablesApi } from '../../../api/models/operations.api';
import { useSocket } from '../../../context/SocketContext';
import { useToast } from '../../../components/ui/Toast';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import Badge from '../../../components/ui/Badge';
import { HiOutlineCalendarDays, HiOutlineCheck, HiOutlineUserMinus, HiOutlineTrash, HiOutlinePlus, HiOutlineSparkles } from 'react-icons/hi2';

export default function ReservationCalendar() {
  const { lastMessage } = useSocket();
  const { addToast } = useToast();

  const [reservations, setReservations] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const getLocalDateTimeString = () => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
  };

  // New reservation form state
  const [newResModal, setNewResModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [form, setForm] = useState({
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    partySize: 2,
    scheduledAt: getLocalDateTimeString(),
    tableId: '',
    seatNumber: '',
    notes: ''
  });

  const fetchData = useCallback(async (targetDate = selectedDate) => {
    try {
      const [resResponse, tablesResponse] = await Promise.all([
        getReservationsApi({ date: targetDate }),
        getTablesApi()
      ]);
      setReservations(resResponse.data?.data?.reservations || []);
      setTables(tablesResponse.data?.data?.tables || []);
    } catch {
      addToast('Failed to load reservations list', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, addToast]);

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate, fetchData]);

  // Handle WebSocket updates
  useEffect(() => {
    if (!lastMessage) return;
    const { event } = lastMessage;

    // Simple refresh on reservation events
    const reservationEvents = ['TABLE_RESERVED', 'TABLE_AVAILABLE', 'TABLE_OCCUPIED'];
    if (reservationEvents.includes(event)) {
      fetchData(selectedDate);
    }
  }, [lastMessage, selectedDate, fetchData]);

  const handleAction = async (id, action, params = {}) => {
    try {
      if (action === 'confirm') await confirmReservationApi(id);
      else if (action === 'seat') await seatReservationApi(id, params);
      else if (action === 'noshow') await markReservationNoShowApi(id);
      else if (action === 'cancel') await cancelReservationApi(id, params);
      
      addToast(`Reservation ${action}ed successfully`, 'success');
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update reservation state', 'error');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const outletId = localStorage.getItem('selectedOutletId') || tables[0]?.outletId || '';
      await createReservationApi({
        ...form,
        outletId,
        partySize: Number(form.partySize),
        scheduledAt: new Date(form.scheduledAt)
      });
      addToast('Reservation created successfully', 'success');
      setNewResModal(false);
      setForm({
        guestName: '',
        guestPhone: '',
        guestEmail: '',
        partySize: 2,
        scheduledAt: getLocalDateTimeString(),
        tableId: '',
        seatNumber: '',
        notes: ''
      });
      fetchData(selectedDate);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create reservation', 'error');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>;
  }

  const filteredReservations = reservations.filter(res => {
    if (filterStatus === 'ALL') return true;
    return res.status === filterStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center flex-wrap gap-4">
        {/* Status and Date filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1.5 overflow-x-auto">
            {['ALL', 'PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'NO_SHOW', 'CANCELLED'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3.5 py-2 rounded-lg text-[12px] font-bold cursor-pointer transition-all ${
                  filterStatus === status
                    ? 'bg-primary text-white dark:bg-primary-fixed dark:text-zinc-950 shadow-md'
                    : 'bg-white text-on-surface-variant border border-border-base hover:bg-surface-container-low dark:bg-zinc-950 dark:text-zinc-400 dark:border-zinc-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3.5 py-1.5 bg-white border border-border-base rounded-lg text-[12px] font-bold dark:bg-zinc-950 dark:border-zinc-900 text-on-surface outline-hidden"
          />
        </div>
        <Button size="sm" variant="primary" className="flex items-center gap-1" onClick={() => setNewResModal(true)}>
          <HiOutlinePlus /> New Booking
        </Button>
      </div>

      {filteredReservations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-on-surface-variant dark:text-zinc-550 bg-white dark:bg-zinc-950 border border-dashed border-border-base dark:border-zinc-900 rounded-xl">
          <HiOutlineCalendarDays className="text-4xl text-on-surface-variant/40 mb-3" />
          <span className="text-[14px] font-semibold">No bookings found</span>
          <span className="text-[12px] mt-1 font-normal">There are no reservations matching this filter for today.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReservations.map(res => (
            <div key={res._id || res.id} className="bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-900 rounded-xl p-5 shadow-xs flex flex-col justify-between h-[220px]">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-[14px] text-on-background truncate max-w-[160px]">{res.guestName}</h4>
                    <span className="text-[11px] text-on-surface-variant dark:text-zinc-550 block font-semibold">
                      {new Date(res.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {res.partySize} Guests
                    </span>
                  </div>
                  <Badge variant={res.status === 'CONFIRMED' ? 'success' : res.status === 'SEATED' ? 'info' : 'warning'} size="sm" className="uppercase font-bold tracking-wider">
                    {res.status}
                  </Badge>
                </div>

                <div className="text-[12px] text-on-surface-variant dark:text-zinc-400 space-y-1">
                  {res.guestPhone && <p className="truncate">Phone: {res.guestPhone}</p>}
                  {res.tableId ? (
                    <p className="font-semibold text-primary dark:text-primary-fixed-dim">
                      Table: {res.tableId.tableNumber || 'Assigned'}
                    </p>
                  ) : (
                    <p className="text-amber-500 italic">No table assigned</p>
                  )}
                  {res.specialRequests && <p className="italic text-[11px] truncate">"{res.specialRequests}"</p>}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 justify-end pt-3 border-t border-border-base dark:border-zinc-900">
                {res.status === 'PENDING' && (
                  <Button size="xs" variant="primary" onClick={() => handleAction(res._id, 'confirm')}>
                    Confirm
                  </Button>
                )}
                {['PENDING', 'CONFIRMED'].includes(res.status) && (
                  <Button 
                    size="xs" 
                    variant="success" 
                    onClick={() => {
                      // Seat guest on assigned table
                      if (res.tableId?._id || res.tableId) {
                        handleAction(res._id, 'seat', { tableId: res.tableId?._id || res.tableId });
                      } else {
                        addToast('Please assign a table in details before seating guest', 'warning');
                      }
                    }}
                  >
                    Seat Guest
                  </Button>
                )}
                {['PENDING', 'CONFIRMED'].includes(res.status) && (
                  <Button size="xs" variant="outline" className="text-red-500 border-red-550 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => handleAction(res._id, 'noshow')}>
                    No Show
                  </Button>
                )}
                {res.status !== 'CANCELLED' && res.status !== 'SEATED' && res.status !== 'COMPLETED' && (
                  <Button size="xs" variant="outline" onClick={() => handleAction(res._id, 'cancel', { reason: 'Guest cancelled' })}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New reservation modal */}
      {newResModal && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center backdrop-blur-xs">
          <form onSubmit={handleCreate} className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-border-base dark:border-zinc-900 w-[420px] space-y-4 shadow-2xl animate-scale-in">
            <h3 className="text-[15px] font-bold text-on-background flex items-center gap-1.5"><HiOutlineSparkles className="text-primary" /> Create Reservation</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <label className="text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide">Guest Name</label>
                <input
                  type="text"
                  required
                  value={form.guestName}
                  onChange={(e) => setForm(prev => ({ ...prev, guestName: e.target.value }))}
                  className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg p-2 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide">Phone</label>
                <input
                  type="text"
                  value={form.guestPhone}
                  onChange={(e) => setForm(prev => ({ ...prev, guestPhone: e.target.value }))}
                  className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg p-2 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide">Guests Count</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={form.partySize}
                  onChange={(e) => setForm(prev => ({ ...prev, partySize: e.target.value }))}
                  className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg p-2 text-xs"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide">Scheduled At</label>
                <input
                  type="datetime-local"
                  required
                  value={form.scheduledAt}
                  onChange={(e) => setForm(prev => ({ ...prev, scheduledAt: e.target.value }))}
                  className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg p-2 text-xs text-on-background"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide">Assign Table (Optional)</label>
                <select
                  value={form.tableId}
                  onChange={(e) => setForm(prev => ({ ...prev, tableId: e.target.value, seatNumber: '' }))}
                  className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg p-2 text-xs text-on-background"
                >
                  <option value="">Choose Available Table</option>
                  {tables.map(t => (
                    <option key={t._id} value={t._id}>Table {t.tableNumber} (Cap: {t.seatCount})</option>
                  ))}
                </select>
              </div>
              {form.tableId && (() => {
                const selectedTableObj = tables.find(t => t._id === form.tableId);
                const seatOptions = selectedTableObj
                  ? Array.from({ length: selectedTableObj.seatCount }, (_, i) => `Seat ${i + 1}`)
                  : [];
                return (
                  <div className="space-y-1 col-span-2">
                    <label className="text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide">Assign Seat (Optional)</label>
                    <select
                      value={form.seatNumber}
                      onChange={(e) => setForm(prev => ({ ...prev, seatNumber: e.target.value }))}
                      className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg p-2 text-xs text-on-background"
                    >
                      <option value="">Choose Seat...</option>
                      {seatOptions.map(seat => (
                        <option key={seat} value={seat}>{seat}</option>
                      ))}
                    </select>
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border-base dark:border-zinc-900">
              <Button size="sm" variant="outline" onClick={() => setNewResModal(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" type="submit">
                Create Booking
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
