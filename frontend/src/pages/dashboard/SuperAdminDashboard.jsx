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
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    getSummaryStatsApi()
      .then((r) => setStats(r.data?.data))
      .catch(() => {})
      .finally(() => setLoadingStats(false));

    listOrdersApi({ limit: 5 })
      .then((r) => setRecentOrders(Array.isArray(r.data?.data) ? r.data.data : []))
      .catch(() => {})
      .finally(() => setLoadingOrders(false));
  }, []);

  const columns = [
    { key: '_id', label: 'Order ID', render: (r) => <span className="font-mono text-xs text-on-surface dark:text-zinc-300">#{r._id?.slice(-8)}</span> },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={ORDER_STATUS_VARIANT[r.status] || 'neutral'}>{r.status}</Badge> },
    { key: 'totalAmount', label: 'Amount', render: (r) => <span className="font-semibold">₹{(r.totalAmount || 0).toLocaleString()}</span> },
    { key: 'createdAt', label: 'Date', render: (r) => new Date(r.createdAt).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5 mb-2">
        <h2 className="text-headline-lg font-headline-lg text-on-surface dark:text-zinc-100 text-[24px] font-bold tracking-tight">
          Super Admin Console
        </h2>
        <p className="text-body-md text-on-surface-variant dark:text-zinc-400 text-[14px]">
          Global dashboard metrics and active operations.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Revenue" 
          value={`₹${stats?.totalRevenue?.toLocaleString() || '0'}`} 
          icon={<HiCurrencyDollar className="text-[20px]" />} 
          color="emerald" 
          trend="+15%" 
          trendUp 
        />
        <StatCard 
          title="Total Orders" 
          value={(stats?.totalOrders || 0).toLocaleString()} 
          icon={<HiShoppingCart className="text-[20px]" />} 
          color="indigo" 
          trend="+8%" 
          trendUp 
        />
        <StatCard 
          title="Restaurants" 
          value={(stats?.totalRestaurants || 0).toString()} 
          icon={<HiBuildingStorefront className="text-[20px]" />} 
          color="amber" 
        />
        <StatCard 
          title="Active Subs" 
          value={(stats?.activeSubscriptions || 0).toString()} 
          icon={<HiCreditCard className="text-[20px]" />} 
          color="blue" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8 flex flex-col gap-4">
          <h3 className="text-headline-sm font-headline-sm text-on-surface dark:text-zinc-100 text-[16px] font-bold">
            Recent Orders
          </h3>
          <Table columns={columns} data={recentOrders} loading={loadingOrders} emptyMessage="No orders yet" />
        </Card>
        <Card className="lg:col-span-4 flex flex-col gap-4">
          <h3 className="text-headline-sm font-headline-sm text-on-surface dark:text-zinc-100 text-[16px] font-bold">
            Platform Overview
          </h3>
          <div className="flex flex-col gap-4 mt-2">
            {[
              ['Total Users', stats?.totalUsers],
              ['Active Outlets', stats?.activeOutlets],
              ['Menu Items', stats?.totalMenuItems],
              ['Avg Order Value', `₹${stats?.avgOrderValue?.toLocaleString() || 0}`]
            ].map(([label, val]) => (
              <div key={label} className="flex items-center justify-between border-b border-border-base dark:border-zinc-800 pb-2.5 last:border-b-0 last:pb-0">
                <span className="text-on-surface-variant dark:text-zinc-400 text-sm font-medium">{label}</span>
                <span className="font-bold text-on-surface dark:text-zinc-200">{val ?? 0}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
