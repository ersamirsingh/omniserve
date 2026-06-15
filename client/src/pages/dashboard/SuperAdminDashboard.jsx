import { useState, useEffect } from 'react';
import { HiBuildingStorefront, HiShoppingCart, HiCurrencyDollar, HiCreditCard } from 'react-icons/hi2';
import StatCard from '../../components/StatCard';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { getSummaryStatsApi } from '../../api/models/analytics.api';
import { listOrdersApi } from '../../api/models/order.api';
import { ORDER_STATUS_VARIANT } from '../../utils/constants';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    getSummaryStatsApi().then((r) => setStats(r.data?.data)).catch(() => {});
    listOrdersApi({ limit: 5 }).then((r) => setRecentOrders(Array.isArray(r.data?.data) ? r.data.data : [])).catch(() => {});
  }, []);

  const columns = [
    { key: '_id', label: 'Order ID', render: (r) => <span className="font-mono text-xs">#{r._id?.slice(-8)}</span> },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={ORDER_STATUS_VARIANT[r.status] || 'neutral'}>{r.status}</Badge> },
    { key: 'totalAmount', label: 'Amount', render: (r) => `₹${r.totalAmount || 0}` },
    { key: 'createdAt', label: 'Date', render: (r) => new Date(r.createdAt).toLocaleDateString() },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Revenue" value={`₹${stats?.totalRevenue?.toLocaleString() || '0'}`} icon={<HiCurrencyDollar />} color="emerald" trend="+15%" trendUp />
        <StatCard title="Total Orders" value={stats?.totalOrders || 0} icon={<HiShoppingCart />} color="indigo" trend="+8%" trendUp />
        <StatCard title="Restaurants" value={stats?.totalRestaurants || 0} icon={<HiBuildingStorefront />} color="amber" />
        <StatCard title="Active Subs" value={stats?.activeSubscriptions || 0} icon={<HiCreditCard />} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="mb-4 font-bold text-slate-100">Recent Orders</h3>
          <Table columns={columns} data={recentOrders} emptyMessage="No orders yet" />
        </Card>
        <Card>
          <h3 className="mb-4 font-bold text-slate-100">Platform Overview</h3>
          <div className="flex flex-col gap-4">
            {[['Total Users', stats?.totalUsers], ['Active Outlets', stats?.activeOutlets], ['Menu Items', stats?.totalMenuItems], ['Avg Order Value', `₹${stats?.avgOrderValue || 0}`]].map(([label, val]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">{label}</span>
                <span className="font-bold text-slate-100">{val || 0}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
