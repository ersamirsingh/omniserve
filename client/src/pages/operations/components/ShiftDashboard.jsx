import { useState, useEffect, useCallback } from 'react';
import { openShiftApi, closeShiftApi, getCurrentShiftApi, getShiftHistoryApi } from '../../../api/models/operations.api';
import { useToast } from '../../../components/ui/Toast';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import Badge from '../../../components/ui/Badge';
import { HiOutlineClock, HiOutlineLockClosed, HiOutlineLockOpen, HiOutlineChevronRight } from 'react-icons/hi2';

export default function ShiftDashboard() {
  const { addToast } = useToast();
  
  const [currentShift, setCurrentShift] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [shiftName, setShiftName] = useState('MORNING');
  const [handoverNotes, setHandoverNotes] = useState('');

  const fetchShiftData = useCallback(async () => {
    try {
      const [currRes, histRes] = await Promise.all([
        getCurrentShiftApi(),
        getShiftHistoryApi()
      ]);
      setCurrentShift(currRes.data?.data || null);
      setHistory(histRes.data?.data?.shifts || []);
    } catch {
      addToast('Failed to load shift records', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchShiftData();
  }, [fetchShiftData]);

  const handleOpenShift = async () => {
    try {
      await openShiftApi({ shiftName });
      addToast(`${shiftName} shift opened successfully`, 'success');
      setOpenModal(false);
      fetchShiftData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to open shift', 'error');
    }
  };

  const handleCloseShift = async () => {
    if (!currentShift) return;
    try {
      await closeShiftApi(currentShift._id || currentShift.id, { handoverNotes });
      addToast('Shift closed successfully. Logs archived.', 'success');
      setCloseModal(false);
      setHandoverNotes('');
      fetchShiftData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to close shift', 'error');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      
      {/* Current Active shift control card */}
      <div className="lg:col-span-2 bg-white dark:bg-zinc-950 p-6 border border-border-base dark:border-zinc-900 rounded-xl space-y-6">
        <div className="flex justify-between items-center border-b border-border-base dark:border-zinc-800 pb-3">
          <h3 className="text-[14px] font-bold text-on-background uppercase tracking-wider flex items-center gap-1.5">
            <HiOutlineClock className="text-primary" /> Live Shift Console
          </h3>
          {currentShift ? (
            <Badge variant="success" size="sm" className="uppercase font-bold tracking-wider">Active</Badge>
          ) : (
            <Badge variant="warning" size="sm" className="uppercase font-bold tracking-wider">No Active Shift</Badge>
          )}
        </div>

        {currentShift ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-surface-container-low dark:bg-zinc-900/30 p-4 rounded-lg text-center">
                <span className="text-[10px] font-bold text-on-surface-variant dark:text-zinc-500 uppercase block">Name</span>
                <span className="font-extrabold text-[15px] text-on-background mt-1 block">{currentShift.shiftName}</span>
              </div>
              <div className="bg-surface-container-low dark:bg-zinc-900/30 p-4 rounded-lg text-center">
                <span className="text-[10px] font-bold text-on-surface-variant dark:text-zinc-550 uppercase block">Open Since</span>
                <span className="font-extrabold text-[13px] text-on-background mt-1.5 block">
                  {new Date(currentShift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="bg-surface-container-low dark:bg-zinc-900/30 p-4 rounded-lg text-center col-span-2">
                <span className="text-[10px] font-bold text-on-surface-variant dark:text-zinc-550 uppercase block">Total Revenue</span>
                <span className="font-extrabold text-[15px] text-primary dark:text-primary-fixed-dim mt-1 block">
                  ${currentShift.statistics?.totalRevenue?.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>

            {/* Close Shift panel */}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="w-full text-red-500 border-red-550 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => setCloseModal(true)}>
                <HiOutlineLockClosed className="inline mr-1" /> Close Shift
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <span className="text-on-surface-variant/40 dark:text-zinc-650 text-4xl"><HiOutlineLockOpen /></span>
            <div>
              <span className="text-[14px] font-semibold text-on-background block">No active shift started</span>
              <span className="text-[12px] text-on-surface-variant dark:text-zinc-550 block mt-0.5">
                Open a shift to start recording orders and tracking floor revenue.
              </span>
            </div>
            <Button size="sm" variant="primary" onClick={() => setOpenModal(true)}>
              Open New Shift
            </Button>
          </div>
        )}
      </div>

      {/* Shift History list */}
      <div className="bg-white dark:bg-zinc-950 p-6 border border-border-base dark:border-zinc-900 rounded-xl space-y-4">
        <h3 className="text-[13px] font-bold text-on-surface-variant/70 uppercase tracking-wider">Shift History logs</h3>
        
        {history.length === 0 ? (
          <span className="text-[11px] text-on-surface-variant/40 dark:text-zinc-650 block text-center py-12">
            No past shift records.
          </span>
        ) : (
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {history.map(s => (
              <div key={s._id || s.id} className="p-3 border border-border-base dark:border-zinc-900 rounded-lg text-xs flex justify-between items-center bg-surface-container-low/20">
                <div>
                  <span className="font-bold block uppercase">{s.shiftName} Shift</span>
                  <span className="text-[10px] text-on-surface-variant dark:text-zinc-500">
                    {new Date(s.openedAt).toLocaleDateString()} • Closed
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-primary dark:text-primary-fixed-dim block">${s.statistics?.totalRevenue?.toFixed(2)}</span>
                  <span className="text-[9px] text-on-surface-variant/80 dark:text-zinc-400">
                    Turns: {s.statistics?.turnoverCount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Open shift modal */}
      {openModal && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-border-base dark:border-zinc-900 w-[350px] space-y-4 shadow-2xl animate-scale-in">
            <h3 className="text-[15px] font-bold text-on-background">Open Shift</h3>
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide">Select Shift Slot</label>
              <select
                value={shiftName}
                onChange={(e) => setShiftName(e.target.value)}
                className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg p-2 text-xs text-on-background"
              >
                {['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'].map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setOpenModal(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleOpenShift}>
                Confirm Open
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Close shift modal */}
      {closeModal && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-border-base dark:border-zinc-900 w-[380px] space-y-4 shadow-2xl animate-scale-in">
            <h3 className="text-[15px] font-bold text-on-background">Close Shift & Archive Stats</h3>
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide">Handover Notes</label>
              <textarea
                placeholder="Enter drawer counts, cash drop notes, or team handover logs..."
                value={handoverNotes}
                onChange={(e) => setHandoverNotes(e.target.value)}
                className="w-full h-24 bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg p-2 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border-base dark:border-zinc-900">
              <Button size="sm" variant="outline" onClick={() => setCloseModal(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleCloseShift}>
                Archive & Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
