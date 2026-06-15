import { useState, useEffect } from 'react';
import { HiShoppingCart, HiCurrencyDollar, HiMapPin, HiCreditCard } from 'react-icons/hi2';
import StatCard from '../../components/StatCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { getSummaryStatsApi } from '../../api/models/analytics.api';
import { getCurrentSubscriptionApi } from '../../api/models/subscription.api';
import { listOutletsApi } from '../../api/models/outlet.api';
import { SUBSCRIPTION_STATUS_VARIANT } from '../../utils/constants';

export default function OwnerDashboard() {
  const [stats, setStats] = useState(null);
  const [sub, setSub] = useState(null);
  const [outlets, setOutlets] = useState([]);

  useEffect(() => {
    getSummaryStatsApi().then((r) => setStats(r.data?.data)).catch(() => {});
    getCurrentSubscriptionApi().then((r) => setSub(r.data?.data)).catch(() => {});
    listOutletsApi().then((r) => setOutlets(Array.isArray(r.data?.data) ? r.data.data : [])).catch(() => {});
  }, []);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard title="Revenue" value={`₹${stats?.totalRevenue?.toLocaleString() || '0'}`} icon={<HiCurrencyDollar />} color="emerald" trend="+12%" trendUp />
        <StatCard title="Orders Today" value={stats?.ordersToday || 0} icon={<HiShoppingCart />} color="indigo" />
        <StatCard title="Active Outlets" value={outlets.filter((o) => o.isActive).length} icon={<HiMapPin />} color="amber" />
        <StatCard title="Plan" value={sub?.plan || 'None'} icon={<HiCreditCard />} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="mb-4 font-bold text-slate-100">Your Outlets</h3>
          {outlets.length === 0 ? <p className="text-slate-500">No outlets created yet.</p> : (
            <div className="flex flex-col gap-3">
              {outlets.slice(0, 5).map((o) => (
                <div key={o._id} className="flex items-center justify-between p-3 bg-[#232640] rounded-lg">
                  <div>
                    <div className="font-semibold text-sm text-slate-100">{o.name}</div>
                    <div className="text-xs text-slate-500">{o.address?.city || 'No address'}</div>
                  </div>
                  <Badge variant={o.isActive ? 'success' : 'neutral'}>{o.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h3 className="mb-4 font-bold text-slate-100">Subscription</h3>
          {sub ? (
            <div className="flex flex-col gap-3">
              {[['Plan', <Badge variant="info">{sub.plan}</Badge>], ['Status', <Badge variant={SUBSCRIPTION_STATUS_VARIANT[sub.status] || 'neutral'}>{sub.status}</Badge>], ['Expires', <span className="font-semibold text-sm text-slate-100">{sub.endDate ? new Date(sub.endDate).toLocaleDateString() : '—'}</span>]].map(([label, val]) => (
                <div key={label} className="flex items-center justify-between"><span className="text-sm text-slate-400">{label}</span>{val}</div>
              ))}
            </div>
          ) : <p className="text-slate-500">No active subscription.</p>}
        </Card>
      </div>
    </div>
  );
}
