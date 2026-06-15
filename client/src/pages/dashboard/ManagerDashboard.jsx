import { useState, useEffect } from 'react';
import { HiShoppingCart, HiCube, HiClipboardDocumentList, HiExclamationTriangle } from 'react-icons/hi2';
import StatCard from '../../components/StatCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import { listOrdersApi } from '../../api/models/order.api';
import { listInventoryApi } from '../../api/models/inventory.api';
import { ORDER_STATUS_VARIANT } from '../../utils/constants';

export default function ManagerDashboard() {
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    listOrdersApi({ limit: 10 }).then((r) => setOrders(Array.isArray(r.data?.data) ? r.data.data : [])).catch(() => {});
    listInventoryApi().then((r) => setInventory(Array.isArray(r.data?.data) ? r.data.data : [])).catch(() => {});
  }, []);

  const pending = orders.filter((o) => o.status === 'PENDING').length;
  const lowStock = inventory.filter((i) => i.quantity <= (i.lowStockThreshold || 10));

  const cols = [
    { key: '_id', label: 'ID', render: (r) => <span className="font-mono text-xs">#{r._id?.slice(-8)}</span> },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={ORDER_STATUS_VARIANT[r.status] || 'neutral'}>{r.status}</Badge> },
    { key: 'totalAmount', label: 'Amount', render: (r) => `₹${r.totalAmount || 0}` },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard title="Today's Orders" value={orders.length} icon={<HiShoppingCart />} color="indigo" />
        <StatCard title="Pending Orders" value={pending} icon={<HiClipboardDocumentList />} color="amber" />
        <StatCard title="Low Stock Items" value={lowStock.length} icon={<HiExclamationTriangle />} color="rose" />
        <StatCard title="Inventory Items" value={inventory.length} icon={<HiCube />} color="emerald" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="mb-4 font-bold text-slate-100">Recent Orders</h3>
          <Table columns={cols} data={orders.slice(0, 5)} emptyMessage="No orders" />
        </Card>
        <Card>
          <h3 className="mb-4 font-bold text-slate-100">Low Stock Alerts</h3>
          {lowStock.length === 0 ? <p className="text-slate-500 text-center py-5">All stock levels healthy 🎉</p> : (
            <div className="flex flex-col gap-2">
              {lowStock.slice(0, 5).map((i) => (
                <div key={i._id} className="flex items-center justify-between p-2.5 bg-amber-500/10 rounded-lg">
                  <span className="font-semibold text-sm">{i.name || i.itemName || 'Item'}</span>
                  <Badge variant="danger">{i.quantity} left</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
