import { useState, useEffect } from 'react';
import { HiShoppingCart, HiCurrencyDollar, HiMapPin, HiCreditCard } from 'react-icons/hi2';
import StatCard from '../../components/StatCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { getSummaryStatsApi } from '../../api/models/analytics.api';
import { getCurrentSubscriptionApi } from '../../api/models/subscription.api';
import { listOutletsApi } from '../../api/models/outlet.api';
import { SUBSCRIPTION_STATUS_VARIANT } from '../../utils/constants';
import { getList } from '../../utils/apiData';

export default function OwnerDashboard() {
  const [stats, setStats] = useState(null);
  const [sub, setSub] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      getSummaryStatsApi(),
      getCurrentSubscriptionApi(),
      listOutletsApi()
    ]).then(([statsRes, subRes, outletsRes]) => {
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data?.data);
      if (subRes.status === 'fulfilled') setSub(subRes.value.data?.data);
      if (outletsRes.status === 'fulfilled') setOutlets(getList(outletsRes.value, 'outlets'));
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  const activeOutletsCount = outlets.filter((o) => (o.status ? o.status === 'ACTIVE' : o.isActive !== false)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5 mb-2">
        <h2 className="text-headline-lg font-headline-lg text-on-surface dark:text-zinc-100 text-[24px] font-bold tracking-tight">
          Restaurant Analytics
        </h2>
        <p className="text-body-md text-on-surface-variant dark:text-zinc-400 text-[14px]">
          Monitor sales performance and outlet configurations.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Revenue" 
          value={`₹${stats?.totalRevenue?.toLocaleString() || '0'}`} 
          icon={<HiCurrencyDollar className="text-[20px]" />} 
          color="emerald" 
        />
        <StatCard 
          title="Total Orders" 
          value={(stats?.totalOrders || 0).toString()} 
          icon={<HiShoppingCart className="text-[20px]" />} 
          color="indigo" 
        />
        <StatCard 
          title="Active Outlets" 
          value={activeOutletsCount.toString()} 
          icon={<HiMapPin className="text-[20px]" />} 
          color="amber" 
        />
        <StatCard 
          title="Current Plan" 
          value={sub?.plan || 'None'} 
          icon={<HiCreditCard className="text-[20px]" />} 
          color="blue" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col gap-4">
          <h3 className="text-headline-sm font-headline-sm text-on-surface dark:text-zinc-100 text-[16px] font-bold">
            Your Outlets
          </h3>
          {loading ? (
            <div className="flex justify-center py-6">
              <Spinner size="sm" />
            </div>
          ) : outlets.length === 0 ? (
            <p className="text-on-surface-variant dark:text-zinc-550 text-sm py-4">No outlets created yet.</p>
          ) : (
            <div className="flex flex-col gap-3.5 mt-2">
              {outlets.slice(0, 5).map((o) => {
                const isActive = o.status ? o.status === 'ACTIVE' : o.isActive !== false;
                return (
                  <div 
                    key={o.id || o._id} 
                    className="flex items-center justify-between p-3.5 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg hover:shadow-sm transition-all"
                  >
                    <div>
                      <div className="font-semibold text-sm text-on-surface dark:text-zinc-200">{o.name}</div>
                      <div className="text-xs text-on-surface-variant dark:text-zinc-400 mt-0.5">{o.city || o.address?.city || 'No address'}</div>
                    </div>
                    <Badge variant={isActive ? 'success' : 'neutral'}>
                      {isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-4">
          <h3 className="text-headline-sm font-headline-sm text-on-surface dark:text-zinc-100 text-[16px] font-bold">
            Subscription Details
          </h3>
          {loading ? (
            <div className="flex justify-center py-6">
              <Spinner size="sm" />
            </div>
          ) : sub ? (
            <div className="flex flex-col gap-4 mt-2">
              {[
                ['Plan Type', <Badge variant="info">{sub.plan}</Badge>],
                ['Current Status', <Badge variant={SUBSCRIPTION_STATUS_VARIANT[sub.status] || 'neutral'}>{sub.status}</Badge>],
                ['Start Date', <span className="font-bold text-sm text-on-surface dark:text-zinc-200">{sub.startDate ? new Date(sub.startDate).toLocaleDateString() : '—'}</span>],
                ['Expiration Date', <span className="font-bold text-sm text-on-surface dark:text-zinc-200">{sub.endDate ? new Date(sub.endDate).toLocaleDateString() : '—'}</span>]
              ].map(([label, val]) => (
                <div key={label} className="flex items-center justify-between border-b border-border-base dark:border-zinc-800 pb-2.5 last:border-b-0 last:pb-0">
                  <span className="text-sm text-on-surface-variant dark:text-zinc-400 font-medium">{label}</span>
                  {val}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-on-surface-variant dark:text-zinc-550 text-sm py-4">No active subscription plan.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
