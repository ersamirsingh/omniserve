import { useEffect, useState } from 'react';
import { HiChartBar, HiCurrencyDollar, HiMapPin, HiShoppingCart, HiStar, HiUsers } from 'react-icons/hi2';
import StatCard from '../../components/StatCard';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import PageHeader from '../../components/ui/PageHeader';
import Select from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';
import useAuth from '../../hooks/useAuth';
import { listOutletsApi } from '../../api/models/outlet.api';
import { getSummaryStatsApi, getDailyStatsApi, getSentimentSummaryApi } from '../../api/models/analytics.api';
import { getEntityId, getList, getPayload, getRefId } from '../../utils/apiData';

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString()}`;
const formatPercent = (value) => `${Number(value || 0).toFixed(2)}%`;

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [sentiment, setSentiment] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState(user?.outletId || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.outletId) {
      setSelectedOutletId(user.outletId);
    }
  }, [user?.outletId]);

  useEffect(() => {
    let isCancelled = false;

    const loadAnalytics = async () => {
      setLoading(true);
      try {
        const params = selectedOutletId ? { outletId: selectedOutletId } : undefined;
        const [summaryRes, dailyRes, sentimentRes, outletsRes] = await Promise.all([
          getSummaryStatsApi(params),
          getDailyStatsApi(params),
          getSentimentSummaryApi(params),
          listOutletsApi(),
        ]);

        if (isCancelled) return;

        setSummary(getPayload(summaryRes));
        setDaily(getList(dailyRes));
        setSentiment(getPayload(sentimentRes));
        setOutlets(getList(outletsRes, 'outlets'));
      } catch (error) {
        if (!isCancelled) {
          addToast(error.response?.data?.message || 'Failed to load analytics data', 'error');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadAnalytics();
    return () => {
      isCancelled = true;
    };
  }, [addToast, selectedOutletId]);

  const visibleOutlets = user?.role === 'SUPER_ADMIN'
    ? outlets
    : outlets.filter((outlet) => {
        const outletId = getEntityId(outlet);
        if (user?.outletIds?.length) return user.outletIds.includes(outletId);
        if (user?.outletId) return user.outletId === outletId;
        if (user?.restaurantId) return getRefId(outlet.restaurantId) === user.restaurantId;
        return true;
      });

  const dailyCols = [
    { key: 'reportDate', label: 'Date', render: (row) => row.reportDate ? new Date(row.reportDate).toLocaleDateString() : '—' },
    { key: 'totalOrders', label: 'Orders' },
    { key: 'cancelledOrders', label: 'Cancelled' },
    { key: 'totalRevenue', label: 'Revenue', render: (row) => formatCurrency(row.totalRevenue) },
    { key: 'averageOrderValue', label: 'Avg Order Value', render: (row) => formatCurrency(row.averageOrderValue) },
    { key: 'newCustomers', label: 'New Customers' },
    { key: 'repeatCustomers', label: 'Repeat Customers' },
  ];

  const totalReviews = sentiment
    ? (sentiment.positive?.count || 0) + (sentiment.neutral?.count || 0) + (sentiment.negative?.count || 0)
    : 0;

  const selectedOutletName = selectedOutletId
    ? visibleOutlets.find((outlet) => getEntityId(outlet) === selectedOutletId)?.name || 'Selected Outlet'
    : 'All Accessible Outlets';

  return (
    <div className="space-y-6">
      <PageHeader
        section="Insights"
        title="Analytics"
        description="Live order and review metrics across the outlets you can access."
        actions={(
          <div className="min-w-60">
            <Select
              id="analytics-outlet-filter"
              label="Outlet Scope"
              value={selectedOutletId}
              onChange={(event) => setSelectedOutletId(event.target.value)}
              disabled={Boolean(user?.outletId)}
            >
              {!user?.outletId && <option value="">All accessible outlets</option>}
              {visibleOutlets.map((outlet) => (
                <option key={getEntityId(outlet)} value={getEntityId(outlet)}>
                  {outlet.name}
                </option>
              ))}
            </Select>
          </div>
        )}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 animate-fade-in">
        <StatCard title="Total Revenue" value={formatCurrency(summary?.totalRevenue)} icon={<HiCurrencyDollar />} color="emerald" />
        <StatCard title="Total Orders" value={summary?.totalOrders || 0} icon={<HiShoppingCart />} color="indigo" />
        <StatCard title="Avg Order Value" value={formatCurrency(summary?.averageOrderValue)} icon={<HiChartBar />} color="amber" />
        <StatCard title="Cancelled Orders" value={summary?.cancelledOrders || 0} icon={<HiChartBar />} color="rose" />
        <StatCard title="Outlets In Scope" value={summary?.outletCount || 0} icon={<HiMapPin />} color="blue" />
        <StatCard title="Reviews" value={totalReviews} icon={<HiStar />} color="blue" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="font-bold text-on-surface dark:text-zinc-150 text-[16px]">Daily Metrics</h3>
              <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1">
                Showing live order aggregates for {selectedOutletName}.
              </p>
            </div>
            <Badge variant="info">{daily.length} day{daily.length === 1 ? '' : 's'}</Badge>
          </div>
          <Table
            columns={dailyCols}
            data={daily.slice().reverse().slice(0, 14)}
            loading={loading}
            emptyMessage="No analytics data available for the selected scope"
          />
        </Card>

        <Card>
          <h3 className="mb-4 font-bold text-on-surface dark:text-zinc-150 text-[16px]">Scope Snapshot</h3>
          <div className="space-y-4">
            <div className="rounded-xl border border-border-base dark:border-zinc-800 bg-surface-subtle/60 dark:bg-zinc-900/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-on-surface dark:text-zinc-200">Restaurants</span>
                <Badge variant="success">{summary?.totalRestaurants || 0}</Badge>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-on-surface dark:text-zinc-200">Active Outlets</span>
                <Badge variant="info">{summary?.activeOutlets || 0}</Badge>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-on-surface dark:text-zinc-200">Team Members</span>
                <Badge variant="warning">{summary?.totalUsers || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-on-surface dark:text-zinc-200">Menu Items</span>
                <Badge variant="neutral">{summary?.totalMenuItems || 0}</Badge>
              </div>
            </div>

            <div className="rounded-xl border border-border-base dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
              <div className="flex items-center gap-2 mb-3">
                <HiUsers className="text-primary text-lg" />
                <h4 className="font-bold text-on-surface dark:text-zinc-150">Sentiment Summary</h4>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="success">POSITIVE</Badge>
                  <span className="text-sm font-semibold text-on-surface dark:text-zinc-150">
                    {sentiment ? `${sentiment.positive?.count || 0} • ${formatPercent(sentiment.positive?.percentage)}` : '0 • 0.00%'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="warning">NEUTRAL</Badge>
                  <span className="text-sm font-semibold text-on-surface dark:text-zinc-150">
                    {sentiment ? `${sentiment.neutral?.count || 0} • ${formatPercent(sentiment.neutral?.percentage)}` : '0 • 0.00%'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="danger">NEGATIVE</Badge>
                  <span className="text-sm font-semibold text-on-surface dark:text-zinc-150">
                    {sentiment ? `${sentiment.negative?.count || 0} • ${formatPercent(sentiment.negative?.percentage)}` : '0 • 0.00%'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
