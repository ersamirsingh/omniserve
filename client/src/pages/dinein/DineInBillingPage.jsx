import { useCallback, useEffect, useMemo, useState } from 'react';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Card from '../../components/ui/Card';
import { useToast } from '../../components/ui/Toast';
import DineInPageShell from './DineInPageShell';
import { useDineInScope } from './useDineInScope';
import {
  extractApiData,
  generateDineInBillApi,
  getDineInBillBySessionApi,
  listDineInFloorMapApi,
  listDineInSessionsApi,
  recordDineInPaymentApi,
} from '../../api/models/dinein.api';
import { DINEIN_PAYMENT_METHODS, SPLIT_TYPES } from './dinein.constants';
import { formatCurrency, formatDateTime, statusBadge } from './dinein.utils';

const INITIAL_BILL_FORM = {
  sessionId: '',
  tableId: '',
  splitType: 'NO_SPLIT',
  splitCount: 1,
  discount: 0,
  couponCode: '',
  couponDiscount: 0,
  tip: 0,
  serviceChargeRate: 5,
  notes: '',
};

export default function DineInBillingPage() {
  const scopeState = useDineInScope();
  const { scope, isReady } = scopeState;
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [tablesById, setTablesById] = useState({});
  const [selectedBill, setSelectedBill] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [billModal, setBillModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [billForm, setBillForm] = useState(INITIAL_BILL_FORM);
  const [paymentForm, setPaymentForm] = useState({ method: 'UPI', amount: '' });

  const loadBillingData = useCallback(async () => {
    if (!isReady) return;
    setLoading(true);
    try {
      const [sessionsRes, floorRes] = await Promise.all([
        listDineInSessionsApi(scope),
        listDineInFloorMapApi(scope),
      ]);
      const sessionsData = extractApiData(sessionsRes) || [];
      const floorMap = extractApiData(floorRes) || { tables: [] };
      setSessions(sessionsData);
      setTablesById(Object.fromEntries((floorMap.tables || []).map((table) => [String(table._id || table.id), table])));
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to load billing data', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, isReady, scope]);

  useEffect(() => {
    void loadBillingData();
  }, [loadBillingData]);

  const loadBillForSession = async (sessionId) => {
    setSelectedSessionId(sessionId);
    try {
      const response = await getDineInBillBySessionApi(scope, sessionId);
      setSelectedBill(extractApiData(response));
    } catch (error) {
      setSelectedBill(null);
      addToast(error.response?.data?.message || 'No bill found for this session yet', 'info');
    }
  };

  const sessionRows = useMemo(
    () =>
      sessions.map((session) => ({
        ...session,
        tableLabel: tablesById[String(session.tableId)]?.displayName || tablesById[String(session.tableId)]?.tableNumber || session.tableId,
      })),
    [sessions, tablesById]
  );

  const handleGenerateBill = async (event) => {
    event.preventDefault();
    try {
      const response = await generateDineInBillApi(scope, {
        ...billForm,
        splitCount: Number(billForm.splitCount),
        discount: Number(billForm.discount),
        couponDiscount: Number(billForm.couponDiscount),
        tip: Number(billForm.tip),
        serviceChargeRate: Number(billForm.serviceChargeRate),
      });
      setSelectedBill(extractApiData(response));
      setSelectedSessionId(billForm.sessionId);
      setBillModal(false);
      addToast('Bill generated', 'success');
      await loadBillingData();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to generate bill', 'error');
    }
  };

  const handleRecordPayment = async (event) => {
    event.preventDefault();
    if (!selectedBill) return;

    try {
      const response = await recordDineInPaymentApi(scope, selectedBill._id || selectedBill.id, {
        method: paymentForm.method,
        amount: Number(paymentForm.amount),
      });
      setSelectedBill(extractApiData(response));
      setPaymentModal(false);
      setPaymentForm({ method: 'UPI', amount: '' });
      addToast('Payment recorded', 'success');
      await loadBillingData();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to record payment', 'error');
    }
  };

  return (
    <DineInPageShell
      title="Billing"
      description="Generate dine-in bills, review line items, and settle guest payments."
      scopeState={scopeState}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => void loadBillingData()} loading={loading}>Refresh</Button>
          <Button onClick={() => setBillModal(true)}>Generate Bill</Button>
        </div>
      }
    >
      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card className="rounded-lg p-0 overflow-hidden">
          <Table
            loading={loading}
            data={sessionRows}
            emptyMessage="No sessions available for billing"
            columns={[
              { key: 'sessionCode', label: 'Session', render: (session) => <button type="button" onClick={() => void loadBillForSession(session._id || session.id)} className="font-semibold text-primary">{session.sessionCode}</button> },
              { key: 'tableLabel', label: 'Table' },
              { key: 'guestCount', label: 'Guests', render: (session) => session.guestCount },
              { key: 'status', label: 'Status', render: (session) => statusBadge(session.status) },
              { key: 'billId', label: 'Bill', render: (session) => (session.billId ? <span className="text-xs font-semibold text-emerald-500">Generated</span> : <span className="text-xs text-on-surface-variant dark:text-zinc-500">Pending</span>) },
            ]}
          />
        </Card>

        <Card className="rounded-lg p-5">
          {selectedBill ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-on-surface dark:text-zinc-100">{selectedBill.invoiceNumber}</h3>
                  <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1">
                    Requested {formatDateTime(selectedBill.requestedAt)}
                  </p>
                </div>
                {statusBadge(selectedBill.paymentStatus)}
              </div>

              <div className="grid gap-3 grid-cols-2">
                <div className="rounded-lg border border-border-base dark:border-zinc-800 p-3">
                  <div className="text-xs uppercase tracking-wide text-on-surface-variant dark:text-zinc-500 font-semibold">Total</div>
                  <div className="mt-2 text-lg font-bold text-on-surface dark:text-zinc-100">{formatCurrency(selectedBill.totalAmount)}</div>
                </div>
                <div className="rounded-lg border border-border-base dark:border-zinc-800 p-3">
                  <div className="text-xs uppercase tracking-wide text-on-surface-variant dark:text-zinc-500 font-semibold">Pending</div>
                  <div className="mt-2 text-lg font-bold text-on-surface dark:text-zinc-100">{formatCurrency(selectedBill.pendingAmount)}</div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-on-surface dark:text-zinc-100">Line Items</h4>
                <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                  {(selectedBill.lineItems || []).map((item, index) => (
                    <div key={`${item.orderItemId}-${index}`} className="flex items-center justify-between rounded-lg border border-border-base dark:border-zinc-800 px-3 py-2">
                      <div>
                        <div className="text-sm font-semibold text-on-surface dark:text-zinc-100">{item.name}</div>
                        <div className="text-xs text-on-surface-variant dark:text-zinc-400">
                          Qty {item.quantity} • {formatCurrency(item.unitPrice)}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-on-surface dark:text-zinc-100">{formatCurrency(item.totalPrice)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={() => {
                setPaymentForm((current) => ({ ...current, amount: selectedBill.pendingAmount || selectedBill.totalAmount || '' }));
                setPaymentModal(true);
              }}>
                Record Payment
              </Button>
            </div>
          ) : (
            <div className="text-sm text-on-surface-variant dark:text-zinc-400">
              Select a session to inspect its generated bill. If no bill exists yet, use the Generate Bill action.
            </div>
          )}
        </Card>
      </section>

      <Modal isOpen={billModal} onClose={() => setBillModal(false)} title="Generate Bill" size="lg">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleGenerateBill}>
          <Select label="Session" value={billForm.sessionId} onChange={(event) => {
            const session = sessionRows.find((row) => String(row._id || row.id) === String(event.target.value));
            setBillForm((current) => ({
              ...current,
              sessionId: event.target.value,
              tableId: String(session?.tableId || ''),
            }));
          }} required>
            <option value="">Select session</option>
            {sessionRows.map((session) => (
              <option key={session._id || session.id} value={session._id || session.id}>{session.sessionCode} • {session.tableLabel}</option>
            ))}
          </Select>
          <Select label="Split Type" value={billForm.splitType} onChange={(event) => setBillForm((current) => ({ ...current, splitType: event.target.value }))}>
            {SPLIT_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}
          </Select>
          <Input label="Split Count" type="number" value={billForm.splitCount} onChange={(event) => setBillForm((current) => ({ ...current, splitCount: event.target.value }))} />
          <Input label="Discount" type="number" value={billForm.discount} onChange={(event) => setBillForm((current) => ({ ...current, discount: event.target.value }))} />
          <Input label="Coupon Code" value={billForm.couponCode} onChange={(event) => setBillForm((current) => ({ ...current, couponCode: event.target.value }))} />
          <Input label="Coupon Discount" type="number" value={billForm.couponDiscount} onChange={(event) => setBillForm((current) => ({ ...current, couponDiscount: event.target.value }))} />
          <Input label="Tip" type="number" value={billForm.tip} onChange={(event) => setBillForm((current) => ({ ...current, tip: event.target.value }))} />
          <Input label="Service Charge %" type="number" value={billForm.serviceChargeRate} onChange={(event) => setBillForm((current) => ({ ...current, serviceChargeRate: event.target.value }))} />
          <Input label="Notes" value={billForm.notes} onChange={(event) => setBillForm((current) => ({ ...current, notes: event.target.value }))} />
          <div className="md:col-span-2">
            <Button type="submit">Generate Bill</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={paymentModal} onClose={() => setPaymentModal(false)} title="Record Payment">
        <form className="space-y-4" onSubmit={handleRecordPayment}>
          <Select label="Method" value={paymentForm.method} onChange={(event) => setPaymentForm((current) => ({ ...current, method: event.target.value }))}>
            {DINEIN_PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method.replaceAll('_', ' ')}</option>)}
          </Select>
          <Input label="Amount" type="number" value={paymentForm.amount} onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))} required />
          <Button type="submit">Record Payment</Button>
        </form>
      </Modal>
    </DineInPageShell>
  );
}
