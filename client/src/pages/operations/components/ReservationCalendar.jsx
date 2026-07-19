import { useState, useEffect, useCallback } from 'react';
import { getReservationsApi, createReservationApi, confirmReservationApi, seatReservationApi, markReservationNoShowApi, cancelReservationApi, getTablesApi, holdTableApi } from '../../../api/models/operations.api';
import { useSocket } from '../../../context/SocketContext';
import { useToast } from '../../../components/ui/Toast';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import Badge from '../../../components/ui/Badge';
import { HiOutlineCalendarDays, HiOutlineCheck, HiOutlineUserMinus, HiOutlineTrash, HiOutlinePlus, HiOutlineSparkles, HiOutlineArrowPath } from 'react-icons/hi2';

export default function ReservationCalendar() {
  const { lastMessage } = useSocket();
  const { addToast } = useToast();

  const [reservations, setReservations] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [mergeConfirm, setMergeConfirm] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

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
    seatNumbers: [],
    isManualSeats: false,
    notes: ''
  });

  const fetchData = useCallback(async (targetDate = selectedDate) => {
    try {
      const currentOutletId = localStorage.getItem('selectedOutletId') || '';
      const [resResponse, tablesResponse] = await Promise.all([
        getReservationsApi({ date: targetDate, ...(currentOutletId && { outletId: currentOutletId }) }),
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

  const handleCreate = async (e, forceMergePayload = null) => {
    if (e) e.preventDefault();

    if (!forceMergePayload && form.tableId && form.seatNumbers && form.seatNumbers.length > 0) {
      if (form.seatNumbers.length !== Number(form.partySize)) {
        addToast(`Please select exactly ${form.partySize} seats`, 'warning');
        return;
      }
    }

    try {
      const outletId = localStorage.getItem('selectedOutletId') || tables[0]?.outletId || '';
      const payload = forceMergePayload || {
        ...form,
        outletId,
        partySize: Number(form.partySize),
        scheduledAt: new Date(form.scheduledAt)
      };

      await createReservationApi(payload);
      addToast(forceMergePayload ? 'Bookings merged successfully!' : 'Reservation created successfully', 'success');
      setNewResModal(false);
      setMergeConfirm(null);
      setForm({
        guestName: '',
        guestPhone: '',
        guestEmail: '',
        partySize: 2,
        scheduledAt: getLocalDateTimeString(),
        tableId: '',
        seatNumber: '',
        seatNumbers: [],
        isManualSeats: false,
        notes: ''
      });
      fetchData(selectedDate);
    } catch (err) {
      const errMsg = err.response?.data?.message || '';
      if (errMsg.startsWith('ACTIVE_BOOKING_EXISTS:')) {
        const info = JSON.parse(errMsg.substring('ACTIVE_BOOKING_EXISTS:'.length));
        setMergeConfirm({
          ...info,
          payload: {
            ...form,
            outletId: localStorage.getItem('selectedOutletId') || tables[0]?.outletId || '',
            partySize: Number(form.partySize),
            scheduledAt: new Date(form.scheduledAt),
            allowMerge: true
          }
        });
      } else {
        addToast(err.response?.data?.message || 'Failed to create reservation', 'error');
      }
    }
  };

  const handleTableSelect = async (e) => {
    const tableId = e.target.value;
    setForm(prev => ({ ...prev, tableId, seatNumbers: [], isManualSeats: false }));

    if (tableId) {
      try {
        await holdTableApi(tableId);
        addToast('Table held for 15 minutes', 'info');
      } catch (err) {
        addToast(err.response?.data?.message || 'Failed to hold table', 'error');
        setForm(prev => ({ ...prev, tableId: '' }));
      }
    }
  };

  // Default seats based on partySize
  useEffect(() => {
    if (form.tableId && !form.isManualSeats) {
      const selectedTableObj = tables.find(t => t._id === form.tableId);
      if (selectedTableObj) {
        const guestCount = Math.min(Number(form.partySize) || 1, selectedTableObj.seatCount);
        const defaultSeats = Array.from({ length: guestCount }, (_, i) => `Seat ${i + 1}`);
        setForm(prev => ({
          ...prev,
          seatNumbers: defaultSeats
        }));
      }
    }
  }, [form.partySize, form.tableId, tables, form.isManualSeats]);

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
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {[
              { key: 'ALL', label: 'All' },
              { key: 'PENDING', label: 'Pending' },
              { key: 'CONFIRMED', label: 'Confirmed' },
              { key: 'SEATED', label: 'Seated' },
              { key: 'COMPLETED', label: 'Completed' },
              { key: 'NO_SHOW', label: 'No Show' },
              { key: 'CANCELLED', label: 'Cancelled' },
            ].map(({ key, label }) => {
              const count = key === 'ALL' ? reservations.length : reservations.filter(r => r.status === key).length;
              return (
                <button
                  key={key}
                  onClick={() => setFilterStatus(key)}
                  className={`px-3.5 py-2 rounded-lg text-[12px] font-bold cursor-pointer transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    filterStatus === key
                      ? 'bg-primary text-white dark:bg-primary-fixed dark:text-zinc-950 shadow-md'
                      : 'bg-white text-on-surface-variant border border-border-base hover:bg-surface-container-low dark:bg-zinc-950 dark:text-zinc-400 dark:border-zinc-900'
                  }`}
                >
                  {label}
                  {count > 0 && (
                    <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                      filterStatus === key
                        ? 'bg-white/20 text-white dark:bg-zinc-950/20 dark:text-zinc-200'
                        : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3.5 py-1.5 bg-white border border-border-base rounded-lg text-[12px] font-bold dark:bg-zinc-950 dark:border-zinc-900 text-on-surface outline-hidden"
          />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex items-center gap-1.5 font-bold"
            onClick={async () => {
              setRefreshing(true);
              try {
                await fetchData();
                addToast('Reservations refreshed', 'success');
              } finally {
                setRefreshing(false);
              }
            }}
            loading={refreshing}
            disabled={refreshing}
          >
            <HiOutlineArrowPath className="text-sm" /> Refresh
          </Button>
          <Button size="sm" variant="primary" className="flex items-center gap-1" onClick={() => setNewResModal(true)}>
            <HiOutlinePlus /> New Booking
          </Button>
        </div>
      </div>

      {filteredReservations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-on-surface-variant dark:text-zinc-550 bg-white dark:bg-zinc-950 border border-dashed border-border-base dark:border-zinc-900 rounded-xl">
          <HiOutlineCalendarDays className="text-4xl text-on-surface-variant/40 mb-3" />
          <span className="text-[14px] font-semibold">No bookings found</span>
          <span className="text-[12px] mt-1 font-normal">There are no reservations matching this filter for today.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredReservations.map(res => {
            const statusColors = {
              PENDING: 'border-l-amber-500',
              CONFIRMED: 'border-l-emerald-500',
              SEATED: 'border-l-blue-500',
              COMPLETED: 'border-l-zinc-400',
              NO_SHOW: 'border-l-orange-500',
              CANCELLED: 'border-l-red-500',
              HOLD: 'border-l-violet-500',
            };
            const accentClass = statusColors[res.status] || 'border-l-zinc-400';
            return (
              <div key={res._id || res.id} className={`bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-900 border-l-[3px] ${accentClass} rounded-xl p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md dark:hover:border-zinc-800`}>
                <div className="space-y-3 min-w-0">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-[15px] text-on-background dark:text-zinc-100 truncate" title={res.guestName}>
                        {res.guestName}
                      </h4>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[11px] text-on-surface-variant dark:text-zinc-450 font-medium">
                        <span>{new Date(res.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                        <span className="text-zinc-300 dark:text-zinc-700">•</span>
                        <span>{new Date(res.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-zinc-300 dark:text-zinc-700">•</span>
                        <span className="text-primary dark:text-primary-fixed-dim font-semibold">{res.partySize} Guests</span>
                      </div>
                    </div>
                    <Badge 
                      variant={
                        res.status === 'CONFIRMED' ? 'success' : 
                        res.status === 'SEATED' ? 'info' : 
                        res.status === 'COMPLETED' ? 'neutral' :
                        res.status === 'CANCELLED' ? 'danger' : 'warning'
                      } 
                      className="uppercase font-bold tracking-wider shrink-0 text-[10px]"
                    >
                      {res.status}
                    </Badge>
                  </div>

                  <div className="text-[12px] text-on-surface-variant dark:text-zinc-400 space-y-1.5">
                    {res.guestPhone && (
                      <p className="flex items-center gap-1.5">
                        <span className="text-zinc-400 dark:text-zinc-600 font-medium">Phone:</span>
                        <span className="font-semibold text-on-background dark:text-zinc-300">{res.guestPhone}</span>
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-zinc-400 dark:text-zinc-600 font-medium">Seating:</span>
                      {res.tableId ? (
                        <Badge variant="outline" className="font-semibold border-primary/20 text-primary dark:text-primary-fixed-dim bg-primary/5 text-[10px]">
                          Table {res.tableId.tableNumber || 'Assigned'}
                          {res.seatNumbers && res.seatNumbers.length > 0 && ` (${res.seatNumbers.join(', ')})`}
                        </Badge>
                      ) : (
                        <span className="text-amber-500 italic font-medium text-[11px]">No table assigned</span>
                      )}
                    </div>
                    {res.specialRequests && (
                      <p className="italic text-[11px] text-zinc-500 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded-lg border border-zinc-100 dark:border-zinc-900/50 truncate mt-1">
                        "{res.specialRequests}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                {(res.status !== 'COMPLETED' && res.status !== 'CANCELLED' && res.status !== 'NO_SHOW') && (
                  <div className="flex gap-2 items-center pt-3 border-t border-zinc-100 dark:border-zinc-900 mt-4 flex-wrap">
                    {res.status === 'PENDING' && (
                      <Button size="xs" variant="primary" className="text-[11px] font-bold" onClick={() => handleAction(res._id, 'confirm')}>
                        Confirm
                      </Button>
                    )}
                    {['PENDING', 'CONFIRMED'].includes(res.status) && (
                      <Button 
                        size="xs" 
                        variant="success" 
                        className="text-[11px] font-bold"
                        onClick={() => {
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
                      <Button size="xs" variant="outline" className="text-[11px] font-bold text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/20" onClick={() => handleAction(res._id, 'noshow')}>
                        No Show
                      </Button>
                    )}
                    {res.status !== 'SEATED' && (
                      <Button size="xs" variant="outline" className="text-[11px] font-bold text-red-500 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/20 ml-auto" onClick={() => handleAction(res._id, 'cancel', { reason: 'Guest cancelled' })}>
                        Cancel
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New reservation modal */}
      {newResModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
          <form onSubmit={handleCreate} className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-border-base dark:border-zinc-900 w-[420px] max-w-[90vw] space-y-4 shadow-2xl shadow-primary/10 animate-scale-in">
            <h3 className="text-[16px] font-extrabold text-on-background flex items-center gap-1.5"><HiOutlineSparkles className="text-primary" /> Create Reservation</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <label className="text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide">Guest Name</label>
                <input
                  type="text"
                  required
                  value={form.guestName}
                  onChange={(e) => setForm(prev => ({ ...prev, guestName: e.target.value }))}
                  className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg p-2 text-xs text-on-background outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide">Phone</label>
                <input
                  type="text"
                  value={form.guestPhone}
                  onChange={(e) => setForm(prev => ({ ...prev, guestPhone: e.target.value }))}
                  className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg p-2 text-xs text-on-background outline-none"
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
                  className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg p-2 text-xs text-on-background outline-none"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide">Scheduled At</label>
                <input
                  type="datetime-local"
                  required
                  value={form.scheduledAt}
                  onChange={(e) => setForm(prev => ({ ...prev, scheduledAt: e.target.value }))}
                  className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg p-2 text-xs text-on-background outline-none"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide">Assign Table (Optional)</label>
                <select
                  value={form.tableId}
                  onChange={handleTableSelect}
                  className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg p-2 text-xs text-on-background outline-none"
                >
                  <option value="">Choose Table...</option>
                  {tables.map(t => {
                    const now = new Date();
                    const selectedTime = new Date(form.scheduledAt || now);
                    const diffMs = Math.abs(selectedTime.getTime() - now.getTime());
                    const isWithinTwoHours = diffMs <= 2 * 60 * 60 * 1000;
                    
                    const isUnavailable = isWithinTwoHours && ['OCCUPIED', 'RESERVED', 'HELD', 'BILL_REQUESTED', 'PAYMENT_PENDING', 'ORDERING', 'DINING', 'CLEANING'].includes(t.operationalStatus);
                    let statusLabel = '';
                    if (t.operationalStatus === 'BILL_REQUESTED') statusLabel = 'Bill Requested';
                    else if (t.operationalStatus === 'PAYMENT_PENDING') statusLabel = 'Payment Pending';
                    else if (t.operationalStatus === 'OCCUPIED') statusLabel = 'Occupied';
                    else if (t.operationalStatus === 'RESERVED') statusLabel = 'Reserved';
                    else if (t.operationalStatus === 'HELD') statusLabel = 'Held';
                    else if (t.operationalStatus !== 'AVAILABLE') statusLabel = t.operationalStatus;
                    return (
                      <option 
                        key={t._id} 
                        value={t._id}
                        disabled={isUnavailable}
                        className={isUnavailable ? 'text-zinc-400 dark:text-zinc-600 bg-surface-container-low font-semibold' : ''}
                      >
                        Table {t.tableNumber} (Cap: {t.seatCount}){statusLabel ? ` - [${statusLabel}${isWithinTwoHours ? '' : ' - Current Status'}]` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
              {form.tableId && (() => {
                const selectedTableObj = tables.find(t => t._id === form.tableId);
                const seatCount = selectedTableObj ? selectedTableObj.seatCount : 0;
                const seatsList = Array.from({ length: seatCount }, (_, i) => `Seat ${i + 1}`);
                return (
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide block">
                      Assign Seats (Select {form.partySize})
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2.5 bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg">
                      {seatsList.map(seat => {
                        const isChecked = form.seatNumbers?.includes(seat);
                        return (
                          <label key={seat} className="flex items-center gap-2 text-xs font-semibold text-on-surface dark:text-zinc-350 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                let newSeats = [...(form.seatNumbers || [])];
                                if (e.target.checked) {
                                  newSeats.push(seat);
                                } else {
                                  newSeats = newSeats.filter(s => s !== seat);
                                }
                                setForm(prev => ({
                                  ...prev,
                                  seatNumbers: newSeats,
                                  isManualSeats: true
                                }));
                              }}
                              className="checkbox checkbox-primary rounded text-primary accent-primary cursor-pointer w-4 h-4"
                            />
                            {seat}
                          </label>
                        );
                      })}
                    </div>
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

      {/* Merge Confirmation Modal */}
      {mergeConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
          <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-border-base dark:border-zinc-900 w-[400px] max-w-[90vw] space-y-4 shadow-2xl shadow-primary/10 animate-scale-in text-center">
            <HiOutlineSparkles className="text-4xl text-amber-500 mx-auto" />
            <h3 className="text-[16px] font-bold text-on-background">Active Booking Found</h3>
            <p className="text-xs text-on-surface-variant dark:text-zinc-400">
              {form.guestName} already has an active booking:
            </p>
            <div className="p-3 bg-surface-container dark:bg-zinc-900 rounded-lg text-xs font-semibold text-primary dark:text-primary-fixed-dim">
              {mergeConfirm.details}
            </div>
            <p className="text-[11px] text-zinc-500">
              Would you like to merge this booking and seating selection instead of creating a duplicate reservation?
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <Button size="sm" variant="outline" onClick={() => setMergeConfirm(null)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={() => handleCreate(null, mergeConfirm.payload)}>
                Merge Bookings
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
