import { useState, useEffect, useCallback } from 'react';
import { getTablesApi, getSessionBillApi, requestBillApi, splitBillApi, settleBillApi } from '../../../api/models/operations.api';
import { useSocket } from '../../../context/SocketContext';
import { useToast } from '../../../components/ui/Toast';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import { HiOutlineReceiptPercent, HiOutlineCheckCircle, HiOutlineUserGroup, HiOutlineCreditCard } from 'react-icons/hi2';

export default function BillingWorkspace() {
  const { lastMessage } = useSocket();
  const { addToast } = useToast();

  const [activeTables, setActiveTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [billData, setBillData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form input states
  const [discount, setDiscount] = useState(0);
  const [tip, setTip] = useState(0);
  const [notes, setNotes] = useState('');
  
  // Settle Modal state
  const [paymentModal, setPaymentModal] = useState({ open: false, seatNumber: null });
  const [selectedMethod, setSelectedMethod] = useState('CASH');

  // Custom split parameters
  const [customSplitSeats, setCustomSplitSeats] = useState([]);

  // Fetch tables to find sessions requiring billing
  const fetchBillingSessions = useCallback(async () => {
    try {
      const res = await getTablesApi();
      const tables = res.data?.data?.tables || [];
      // Table statuses matching billing pending: occupied or explicitly BILL_REQUESTED
      const billingTables = tables.filter(t => t.activeSessionId);
      setActiveTables(billingTables);

      const targetTableId = sessionStorage.getItem('selectedTableId');
      if (targetTableId) {
        sessionStorage.removeItem('selectedTableId'); // Clear it immediately
        const matched = billingTables.find(t => t._id === targetTableId || t.id === targetTableId);
        if (matched) {
          setSelectedTable(matched);
          loadBillDetails(matched.activeSessionId);
          return;
        }
      }

      if (billingTables.length > 0 && !selectedTable) {
        setSelectedTable(billingTables[0]);
        loadBillDetails(billingTables[0].activeSessionId);
      }
    } catch {
      addToast('Failed to load active billing sessions', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedTable, addToast]);

  const loadBillDetails = async (sessionId) => {
    try {
      const res = await getSessionBillApi(sessionId);
      const data = res.data?.data;
      setBillData(data);
      if (data?.billSession) {
        setDiscount(data.billSession.discount || 0);
        setTip(data.billSession.tip || 0);
        setNotes(data.billSession.notes || '');
      }
    } catch {
      setBillData(null);
    }
  };

  useEffect(() => {
    fetchBillingSessions();
  }, [fetchBillingSessions]);

  // Sync state changes on websocket notification
  useEffect(() => {
    if (!lastMessage) return;
    const { event, payload } = lastMessage;

    const billingEvents = ['BILL_REQUESTED', 'BILL_SPLIT_CREATED', 'BILL_SETTLED', 'TABLE_OCCUPIED', 'TABLE_AVAILABLE', 'SESSION_CLOSED'];

    if (billingEvents.includes(event)) {
      fetchBillingSessions().then(() => {
        if (selectedTable) {
          loadBillDetails(selectedTable.activeSessionId);
        }
      });
    }
  }, [lastMessage, selectedTable, fetchBillingSessions]);

  const handleTableChange = (table) => {
    setSelectedTable(table);
    loadBillDetails(table.activeSessionId);
  };

  const handleApplyAdjustments = async () => {
    if (!selectedTable) return;
    try {
      await requestBillApi(selectedTable.activeSessionId, {
        discount: Number(discount),
        tip: Number(tip),
        notes
      });
      addToast('Bill calculations updated successfully', 'success');
      loadBillDetails(selectedTable.activeSessionId);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update adjustments', 'error');
    }
  };

  const handleSplit = async (splitType) => {
    if (!billData?.billSession) return;
    try {
      const payload = { splitType };
      if (splitType === 'CUSTOM') {
        payload.customSplits = customSplitSeats;
      }
      await splitBillApi(billData.billSession._id, payload);
      addToast(`Bill split created: ${splitType}`, 'success');
      loadBillDetails(selectedTable.activeSessionId);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to split bill', 'error');
    }
  };

  const handleSettle = (seatNumber) => {
    setPaymentModal({ open: true, seatNumber });
  };

  const confirmSettle = async () => {
    if (!billData?.billSession) return;
    const { seatNumber } = paymentModal;
    try {
      const paymentId = 'pay_' + Math.random().toString(36).substring(2, 9);
      await settleBillApi(billData.billSession._id, {
        ...(seatNumber && { seatNumber }),
        paymentId,
        paymentMethod: selectedMethod
      });
      addToast(seatNumber ? `Seat ${seatNumber} payment settled` : 'Full bill settled successfully!', 'success');
      setPaymentModal({ open: false, seatNumber: null });
      fetchBillingSessions();
    } catch (err) {
      addToast(err.response?.data?.message || 'Settle payment failed', 'error');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
      {/* Active sessions list */}
      <div className="lg:col-span-1 bg-white dark:bg-zinc-950 p-4 border border-border-base dark:border-zinc-900 rounded-xl space-y-4">
        <h3 className="text-[13px] font-bold text-on-surface-variant/70 uppercase tracking-wider">Active Billing Queues</h3>
        
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
                className={`w-full text-left p-3 rounded-lg text-[13px] font-bold cursor-pointer transition-all flex justify-between items-center ${
                  selectedTable?._id === table._id
                    ? 'bg-primary/10 text-primary border border-primary/20 dark:text-primary-fixed-dim'
                    : 'bg-surface-container-low dark:bg-zinc-900/30 text-on-surface border border-transparent hover:bg-surface-container'
                }`}
              >
                <span>Table {table.tableNumber}</span>
                {table.operationalStatus === 'BILL_REQUESTED' && (
                  <Badge variant="warning" size="sm" className="uppercase tracking-wider">Pending</Badge>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bill workspace layout */}
      <div className="lg:col-span-3 space-y-6">
        {selectedTable && billData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Calculations breakdown & Adjustments */}
            <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-border-base dark:border-zinc-900 space-y-5">
              <h4 className="text-[14px] font-bold text-on-background border-b border-border-base dark:border-zinc-800 pb-2 flex items-center gap-2">
                <HiOutlineReceiptPercent className="text-primary text-base" /> Calculations Summary
              </h4>

              <div className="space-y-2.5 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant dark:text-zinc-400">Subtotal:</span>
                  <span className="font-bold">${billData.billSession?.subtotal?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant dark:text-zinc-400">Taxes:</span>
                  <span className="font-bold">${billData.billSession?.tax?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant dark:text-zinc-400">Discounts Applied:</span>
                  <span className="font-bold text-red-500">-${billData.billSession?.discount?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant dark:text-zinc-400">Tips:</span>
                  <span className="font-bold text-success-green">+${billData.billSession?.tip?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between border-t border-border-base dark:border-zinc-850 pt-2.5 text-[14px] font-extrabold text-on-background">
                  <span>Grand Total:</span>
                  <span className="text-primary dark:text-primary-fixed-dim">${billData.billSession?.totalAmount?.toFixed(2) || '0.00'}</span>
                </div>
              </div>

              {/* Adjustments inputs */}
              <div className="space-y-4 border-t border-border-base dark:border-zinc-850 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide">Discount ($)</label>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg p-2 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide">Tip ($)</label>
                    <input
                      type="number"
                      value={tip}
                      onChange={(e) => setTip(e.target.value)}
                      className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg p-2 text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide">Notes</label>
                  <input
                    type="text"
                    value={notes}
                    placeholder="Enter cashier instructions..."
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg p-2 text-xs"
                  />
                </div>
                <Button size="sm" variant="secondary" className="w-full" onClick={handleApplyAdjustments}>
                  Apply Adjustments
                </Button>
              </div>
            </div>

            {/* Split & Settle Panel */}
            <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-border-base dark:border-zinc-900 space-y-5">
              <h4 className="text-[14px] font-bold text-on-background border-b border-border-base dark:border-zinc-800 pb-2 flex items-center gap-2">
                <HiOutlineUserGroup className="text-primary text-base" /> Splits & Settlement
              </h4>

              {/* Split type buttons */}
              <div className="grid grid-cols-3 gap-2">
                {['EQUAL', 'BY_SEAT', 'NONE'].map(type => (
                  <button
                    key={type}
                    onClick={() => handleSplit(type)}
                    className={`p-2 border rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      billData.billSession?.splitType === type
                        ? 'bg-primary text-white border-primary dark:bg-primary-fixed dark:text-zinc-950'
                        : 'border-border-base text-on-surface-variant hover:bg-surface-container-low dark:border-zinc-900'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Split items status */}
              {billData.billSession?.splits?.length > 0 ? (
                <div className="space-y-3">
                  <h5 className="text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wider">Split Payment Progress</h5>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {billData.billSession.splits.map((split, index) => (
                      <div key={index} className="flex justify-between items-center p-2 border border-border-base dark:border-zinc-850 rounded-lg text-xs">
                        <span className="font-semibold text-on-background">
                          Seat {split.seatNumber || (index + 1)} (${split.amount.toFixed(2)})
                        </span>
                        {split.isPaid ? (
                          <Badge variant="success" size="sm" className="flex items-center gap-1 font-bold"><HiOutlineCheckCircle /> Paid</Badge>
                        ) : (
                          <button
                            onClick={() => handleSettle(split.seatNumber)}
                            className="bg-primary text-white text-[11px] font-bold px-2 py-1 rounded-md hover:bg-indigo-650 cursor-pointer dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                          >
                            Pay Portion
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col justify-between h-[120px] bg-surface-container-low dark:bg-zinc-900/30 p-4 rounded-lg text-xs">
                    <div className="flex justify-between text-sm font-extrabold">
                      <span>Outstanding Balance:</span>
                      <span className="text-red-500">${billData.billSession?.outstandingBalance?.toFixed(2) || '0.00'}</span>
                    </div>
                    <span className="text-[11px] text-on-surface-variant dark:text-zinc-500">
                      No splits defined. Pay full amount to settle the table.
                    </span>
                  </div>
                  <Button size="sm" variant="success" className="w-full" onClick={() => handleSettle(null)}>
                    Settle Full Bill
                  </Button>
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-on-surface-variant dark:text-zinc-550 bg-white dark:bg-zinc-950 border border-dashed border-border-base dark:border-zinc-900 rounded-xl">
            <HiOutlineCreditCard className="text-4xl text-on-surface-variant/40 mb-3" />
            <span className="text-[14px] font-semibold">Select a table queue</span>
            <span className="text-[12px] mt-1 font-normal text-center max-w-xs">
              Click on a billing-active dining table from the queue list to load calculations.
            </span>
          </div>
        )}
      </div>

      {paymentModal.open && (
        <Modal
          isOpen={paymentModal.open}
          onClose={() => setPaymentModal({ open: false, seatNumber: null })}
          title="Settle Bill Payment"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-on-surface-variant dark:text-zinc-400">
              Select the payment method to settle the {paymentModal.seatNumber ? `Seat ${paymentModal.seatNumber}` : 'Full'} bill:
            </p>
            <div className="space-y-2">
              {[
                { method: 'CASH', label: 'Cash (Offline)', desc: 'Cash paid in hand at counter' },
                { method: 'CARD', label: 'Card Payment', desc: 'Credit/Debit card swipe' },
                { method: 'UPI', label: 'UPI / QR Scan', desc: 'Instant UPI/QR code payment' },
                { method: 'WALLET', label: 'Digital Wallet', desc: 'Paytm, PhonePe, etc.' },
              ].map(({ method, label, desc }) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setSelectedMethod(method)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col cursor-pointer ${
                    selectedMethod === method
                      ? 'border-success-green bg-success-green/5 ring-1 ring-success-green'
                      : 'border-border-base dark:border-zinc-800 hover:bg-surface-container-low'
                  }`}
                >
                  <span className="text-xs font-bold text-on-background">{label}</span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-450">{desc}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-border-base dark:border-zinc-850">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPaymentModal({ open: false, seatNumber: null })}
              >
                Cancel
              </Button>
              <Button
                variant="success"
                size="sm"
                className="font-bold"
                onClick={confirmSettle}
              >
                Confirm Settlement
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
