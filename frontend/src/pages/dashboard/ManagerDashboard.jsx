import { useState, useEffect } from 'react';
import { HiShoppingCart, HiCube, HiClipboardDocumentList, HiExclamationTriangle } from 'react-icons/hi2';
import StatCard from '../../components/StatCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import { listOrdersApi } from '../../api/models/order.api';
import { listInventoryApi } from '../../api/models/inventory.api';
import { ORDER_STATUS_VARIANT } from '../../utils/constants';
import { getList } from '../../utils/apiData';

export default function ManagerDashboard() {
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingInventory, setLoadingInventory] = useState(true);

  useEffect(() => {
    listOrdersApi({ limit: 10 })
      .then((r) => setOrders(getList(r, 'orders')))
      .catch(() => {})
      .finally(() => setLoadingOrders(false));

    listInventoryApi()
      .then((r) => setInventory(getList(r, 'inventory')))
      .catch(() => {})
      .finally(() => setLoadingInventory(false));
  }, []);

  const pending = orders.filter((o) => (o.orderStatus || o.status) === 'PENDING').length;
  const lowStock = inventory.filter((i) => i.isLowStock || i.quantity <= (i.threshold || i.lowStockThreshold || 10));

  const cols = [
    { key: 'id', label: 'Order ID', render: (r) => <span className="font-mono text-xs text-on-surface dark:text-zinc-300">#{(r.id || r._id || '').slice(-8)}</span> },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={ORDER_STATUS_VARIANT[r.orderStatus || r.status] || 'neutral'}>{r.orderStatus || r.status}</Badge> },
    { key: 'totalAmount', label: 'Amount', render: (r) => <span className="font-semibold">₹{(r.totalAmount || 0).toLocaleString()}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5 mb-2">
        <h2 className="text-headline-lg font-headline-lg text-on-surface dark:text-zinc-100 text-[24px] font-bold tracking-tight">
          Outlet Dashboard
        </h2>
        <p className="text-body-md text-on-surface-variant dark:text-zinc-400 text-[14px]">
          Operational metrics and stock status for your kitchen site.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Today's Orders" 
          value={orders.length.toString()} 
          icon={<HiShoppingCart className="text-[20px]" />} 
          color="indigo" 
        />
        <StatCard 
          title="Pending Orders" 
          value={pending.toString()} 
          icon={<HiClipboardDocumentList className="text-[20px]" />} 
          color="amber" 
        />
        <StatCard 
          title="Low Stock Items" 
          value={lowStock.length.toString()} 
          icon={<HiExclamationTriangle className="text-[20px]" />} 
          color="rose" 
        />
        <StatCard 
          title="Inventory Items" 
          value={inventory.length.toString()} 
          icon={<HiCube className="text-[20px]" />} 
          color="emerald" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col gap-4">
          <h3 className="text-headline-sm font-headline-sm text-on-surface dark:text-zinc-100 text-[16px] font-bold">
            Recent Orders
          </h3>
          <Table columns={cols} data={orders.slice(0, 5)} loading={loadingOrders} emptyMessage="No orders received yet" />
        </Card>

        <Card className="flex flex-col gap-4">
          <h3 className="text-headline-sm font-headline-sm text-on-surface dark:text-zinc-100 text-[16px] font-bold">
            Low Stock Alerts
          </h3>
          {loadingInventory ? (
            <div className="flex justify-center py-6">
              <span className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin-custom" />
            </div>
          ) : lowStock.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="material-symbols-outlined text-success-green text-[36px] mb-2">check_circle</span>
              <p className="text-on-surface-variant dark:text-zinc-400 font-semibold text-sm">All stock levels healthy 🎉</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 mt-1">
              {lowStock.slice(0, 5).map((i) => (
                <div 
                  key={i.id || i._id} 
                  className="flex items-center justify-between p-3.5 bg-red-500/5 dark:bg-red-500/10 border border-red-500/10 rounded-lg hover:shadow-sm transition-all"
                >
                  <span className="font-semibold text-sm text-on-surface dark:text-zinc-200">{i.name || i.itemName || 'Item'}</span>
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
