import { useState, useEffect } from 'react';
import StatCard from '../../components/StatCard';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import PageHeader from '../../components/ui/PageHeader';
import { HiChartBar, HiCurrencyDollar, HiShoppingCart, HiStar } from 'react-icons/hi2';
import { getSummaryStatsApi, getDailyStatsApi, getSentimentSummaryApi } from '../../api/models/analytics.api';

export default function AnalyticsPage() {
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [sentiment, setSentiment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      getSummaryStatsApi(),
      getDailyStatsApi(),
      getSentimentSummaryApi()
    ]).then(([sumRes, dailyRes, sentRes]) => {
      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data?.data);
      if (dailyRes.status === 'fulfilled') setDaily(Array.isArray(dailyRes.value.data?.data) ? dailyRes.value.data.data : []);
      if (sentRes.status === 'fulfilled') setSentiment(sentRes.value.data?.data);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const dailyCols = [
    { key: 'reportDate', label: 'Date', render: (r) => r.reportDate ? new Date(r.reportDate).toLocaleDateString() : '—' },
    { key: 'totalOrders', label: 'Total Orders' },
    { key: 'totalRevenue', label: 'Revenue', render: (r) => `₹${(r.totalRevenue || 0).toLocaleString()}` },
    { key: 'averageOrderValue', label: 'Avg Order Value', render: (r) => `₹${(r.averageOrderValue || 0).toLocaleString()}` },
  ];

  const totalReviews = sentiment 
    ? (sentiment.positive?.count || 0) + (sentiment.neutral?.count || 0) + (sentiment.negative?.count || 0)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader 
        section="Insights"
        title="Analytics" 
        description="Verify daily checkout stats, checkout metrics, and review customer satisfaction reviews."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6 animate-fade-in">
        <StatCard title="Total Revenue" value={`₹${summary?.totalRevenue?.toLocaleString() || '0'}`} icon={<HiCurrencyDollar />} color="emerald" />
        <StatCard title="Total Orders" value={summary?.totalOrders || 0} icon={<HiShoppingCart />} color="indigo" />
        <StatCard title="Avg Order Value" value={`₹${summary?.averageOrderValue || 0}`} icon={<HiChartBar />} color="amber" />
        <StatCard title="Reviews" value={totalReviews} icon={<HiStar />} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="mb-4 font-bold text-on-surface dark:text-zinc-150 text-[16px]">Daily Metrics</h3>
          <Table columns={dailyCols} data={daily.slice().reverse().slice(0, 10)} loading={loading} emptyMessage="No daily data available" />
        </Card>
        <Card>
          <h3 className="mb-4 font-bold text-on-surface dark:text-zinc-150 text-[16px]">Sentiment Summary</h3>
          {sentiment ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-border-base dark:border-zinc-800 pb-2">
                <span className="text-sm font-semibold text-on-surface dark:text-zinc-350">Sentiment Type</span>
                <span className="text-sm font-semibold text-on-surface dark:text-zinc-350">Rating Distribution</span>
              </div>
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <Badge variant="success">POSITIVE</Badge>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-on-surface-variant dark:text-zinc-400 font-medium">({sentiment.positive?.percentage || 0}%)</span>
                    <span className="font-bold text-on-surface dark:text-zinc-100 w-8 text-right">{sentiment.positive?.count || 0}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="warning">NEUTRAL</Badge>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-on-surface-variant dark:text-zinc-400 font-medium">({sentiment.neutral?.percentage || 0}%)</span>
                    <span className="font-bold text-on-surface dark:text-zinc-100 w-8 text-right">{sentiment.neutral?.count || 0}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="danger">NEGATIVE</Badge>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-on-surface-variant dark:text-zinc-400 font-medium">({sentiment.negative?.percentage || 0}%)</span>
                    <span className="font-bold text-on-surface dark:text-zinc-100 w-8 text-right">{sentiment.negative?.count || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-6">
              <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></span>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
