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
  createDineInOrderApi,
  extractApiData,
  listDineInFloorMapApi,
  listDineInOrdersApi,
  listDineInSessionsApi,
  updateDineInOrderStatusApi,
} from '../../api/models/dinein.api';
import { DINEIN_ORDER_STATUSES } from './dinein.constants';
import { formatCurrency, formatDateTime, statusBadge } from './dinein.utils';

const blankItem = () => ({
  menuItemId: '',
  variantId: '',
  name: '',
  quantity: 1,
  unitPrice: 0,
  category: '',
  notes: '',
});

export default function DineInOrdersPage() {
  const scopeState = useDineInScope();
  const { scope, isReady } = scopeState;
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [tablesById, setTablesById] = useState({});
  const [createModal, setCreateModal] = useState(false);
  const [orderForm, setOrderForm] = useState({
    sessionId: '',
    tableId: '',
    sectionId: '',
    guestId: '',
    waiterId: '',
    notes: '',
    items: [blankItem()],
  });

  const loadOrders = useCallback(async () => {
    if (!isReady) return;
    setLoading(true);
    try {
      const [ordersRes, sessionsRes, floorRes] = await Promise.all([
        listDineInOrdersApi(scope),
        listDineInSessionsApi(scope),
        listDineInFloorMapApi(scope),
      ]);
      const floorMap = extractApiData(floorRes) || { tables: [] };
      const tableIndex = Object.fromEntries((floorMap.tables || []).map((table) => [String(table._id || table.id), table]));

      setOrders(extractApiData(ordersRes) || []);
      setSessions(extractApiData(sessionsRes) || []);
      setTablesById(tableIndex);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to load dine-in orders', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, isReady, scope]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const sessionOptions = useMemo(
    () =>
      sessions.map((session) => {
        const sessionId = session._id || session.id;
        const table = tablesById[String(session.tableId)];
        return {
          id: sessionId,
          label: `${session.sessionCode} • ${table?.displayName || table?.tableNumber || session.tableId}`,
          tableId: String(session.tableId),
          sectionId: String(table?.sectionId || ''),
          waiterId: String(session.waiterId || ''),
        };
      }),
    [sessions, tablesById]
  );

  const handleSessionChange = (sessionId) => {
    const selected = sessionOptions.find((option) => option.id === sessionId);
    setOrderForm((current) => ({
      ...current,
      sessionId,
      tableId: selected?.tableId || '',
      sectionId: selected?.sectionId || '',
      waiterId: selected?.waiterId || current.waiterId,
    }));
  };

  const updateItem = (index, field, value) => {
    setOrderForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  };

  const addItem = () => {
    setOrderForm((current) => ({ ...current, items: [...current.items, blankItem()] }));
  };

  const removeItem = (index) => {
    setOrderForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleCreateOrder = async (event) => {
    event.preventDefault();
    try {
      await createDineInOrderApi(scope, {
        ...orderForm,
        guestId: orderForm.guestId || undefined,
        waiterId: orderForm.waiterId || undefined,
        items: orderForm.items.map((item) => ({
          ...item,
          variantId: item.variantId || undefined,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          addons: [],
        })),
      });
      addToast('Dine-in order created', 'success');
      setCreateModal(false);
      setOrderForm({
        sessionId: '',
        tableId: '',
        sectionId: '',
        guestId: '',
        waiterId: '',
        notes: '',
        items: [blankItem()],
      });
      await loadOrders();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to create order', 'error');
    }
  };

  const handleStatusUpdate = async (orderId, status) => {
    try {
      await updateDineInOrderStatusApi(scope, orderId, { status });
      addToast('Order status updated', 'success');
      await loadOrders();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to update order', 'error');
    }
  };

  return (
    <DineInPageShell
      title="Orders"
      description="Manage dine-in order creation and progression from placement through service."
      scopeState={scopeState}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => void loadOrders()} loading={loading}>Refresh</Button>
          <Button onClick={() => setCreateModal(true)}>Create Order</Button>
        </div>
      }
    >
      <Table
        loading={loading}
        data={orders}
        emptyMessage="No dine-in orders found"
        columns={[
          { key: 'orderNumber', label: 'Order', render: (order) => <span className="font-semibold">{order.orderNumber}</span> },
          { key: 'sessionId', label: 'Session', render: (order) => sessions.find((session) => String(session._id || session.id) === String(order.sessionId))?.sessionCode || order.sessionId },
          { key: 'tableId', label: 'Table', render: (order) => tablesById[String(order.tableId)]?.displayName || tablesById[String(order.tableId)]?.tableNumber || order.tableId },
          { key: 'totalAmount', label: 'Amount', render: (order) => formatCurrency(order.totalAmount) },
          { key: 'status', label: 'Status', render: (order) => statusBadge(order.status) },
          { key: 'placedAt', label: 'Placed', render: (order) => formatDateTime(order.placedAt || order.createdAt) },
          {
            key: 'actions',
            label: 'Actions',
            render: (order) => (
              <Select
                value={order.status}
                onChange={(event) => void handleStatusUpdate(order._id || order.id, event.target.value)}
                className="min-w-[160px]"
              >
                {DINEIN_ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>
                ))}
              </Select>
            ),
          },
        ]}
      />

      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Create Dine-In Order" size="lg">
        <form className="space-y-5" onSubmit={handleCreateOrder}>
          <div className="grid gap-4 md:grid-cols-2">
            <Select label="Session" value={orderForm.sessionId} onChange={(event) => handleSessionChange(event.target.value)} required>
              <option value="">Select session</option>
              {sessionOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </Select>
            <Input label="Waiter ID" value={orderForm.waiterId} onChange={(event) => setOrderForm((current) => ({ ...current, waiterId: event.target.value }))} />
            <Input label="Guest ID" value={orderForm.guestId} onChange={(event) => setOrderForm((current) => ({ ...current, guestId: event.target.value }))} />
            <Input label="Notes" value={orderForm.notes} onChange={(event) => setOrderForm((current) => ({ ...current, notes: event.target.value }))} />
          </div>

          <Card className="rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-on-surface dark:text-zinc-100">Order Items</h3>
              <Button size="sm" variant="secondary" onClick={addItem}>Add Item</Button>
            </div>
            <div className="space-y-4">
              {orderForm.items.map((item, index) => (
                <div key={`${item.menuItemId}-${index}`} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 border border-border-base dark:border-zinc-800 rounded-lg p-3">
                  <Input label="Menu Item ID" value={item.menuItemId} onChange={(event) => updateItem(index, 'menuItemId', event.target.value)} required />
                  <Input label="Item Name" value={item.name} onChange={(event) => updateItem(index, 'name', event.target.value)} required />
                  <Input label="Category" value={item.category} onChange={(event) => updateItem(index, 'category', event.target.value)} />
                  <Input label="Variant ID" value={item.variantId} onChange={(event) => updateItem(index, 'variantId', event.target.value)} />
                  <Input label="Quantity" type="number" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} required />
                  <Input label="Unit Price" type="number" value={item.unitPrice} onChange={(event) => updateItem(index, 'unitPrice', event.target.value)} required />
                  <Input label="Notes" value={item.notes} onChange={(event) => updateItem(index, 'notes', event.target.value)} />
                  <div className="flex items-end">
                    <Button variant="danger" size="sm" onClick={() => removeItem(index)} disabled={orderForm.items.length === 1}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Button type="submit">Create Order</Button>
        </form>
      </Modal>
    </DineInPageShell>
  );
}
