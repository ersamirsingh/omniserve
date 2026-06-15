import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchOrders, updateOrderStatus, cancelOrder } from '../../store/orderSlice';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { ORDER_STATUS_VARIANT, ORDER_STATUS_LABELS } from '../../utils/constants';

const statusFlow = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'PICKED_UP', 'DELIVERED'];

export default function OrdersPage() {
  const dispatch = useDispatch();
  const { orders, loading } = useSelector((s) => s.orders);
  const { addToast } = useToast();
  const [filter, setFilter] = useState('');

  useEffect(() => { dispatch(fetchOrders()); }, [dispatch]);

  const handleStatusChange = async (id, newStatus) => {
    const r = await dispatch(updateOrderStatus({ id, status: newStatus }));
    addToast(r.meta.requestStatus === 'fulfilled' ? `Status → ${newStatus}` : 'Update failed', r.meta.requestStatus === 'fulfilled' ? 'success' : 'error');
  };
  const handleCancel = async (id) => {
    if (!confirm('Cancel this order?')) return;
    const r = await dispatch(cancelOrder(id));
    addToast(r.meta.requestStatus === 'fulfilled' ? 'Order cancelled' : 'Cancel failed', r.meta.requestStatus === 'fulfilled' ? 'success' : 'error');
  };

  const filtered = filter ? orders.filter((o) => o.status === filter) : orders;

  const columns = [
    { key: '_id', label: 'Order ID', render: (r) => <span className="font-mono text-xs">#{r._id?.slice(-8)}</span> },
    { key: 'customerName', label: 'Customer', render: (r) => r.customerName || '—' },
    { key: 'totalAmount', label: 'Total', render: (r) => `₹${r.totalAmount || 0}` },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={ORDER_STATUS_VARIANT[r.status] || 'neutral'}>{ORDER_STATUS_LABELS[r.status] || r.status}</Badge> },
    { key: 'createdAt', label: 'Date', render: (r) => new Date(r.createdAt).toLocaleDateString() },
    { key: 'actions', label: 'Actions', render: (r) => {
      const idx = statusFlow.indexOf(r.status);
      const next = idx >= 0 && idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null;
      return (
        <div className="flex gap-2">
          {next && <Button size="sm" variant="secondary" onClick={() => handleStatusChange(r._id, next)}>→ {next}</Button>}
          {r.status !== 'CANCELLED' && r.status !== 'DELIVERED' && <Button size="sm" variant="danger" onClick={() => handleCancel(r._id)}>Cancel</Button>}
        </div>
      );
    }},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4"><h1 className="text-xl font-bold text-slate-100">Orders</h1></div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <select className="px-4 py-2.5 bg-[#232640] border border-[rgba(99,102,241,0.15)] rounded-lg text-slate-100 text-sm outline-none cursor-pointer focus:border-indigo-500 transition-all" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <Table columns={columns} data={filtered} loading={loading === 'pending'} emptyMessage="No orders found" />
    </div>
  );
}
