import { useState, useEffect } from 'react';
import StatCard from '../../components/StatCard';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { HiChartBar, HiCurrencyDollar, HiShoppingCart, HiStar } from 'react-icons/hi2';
import { getSummaryStatsApi, getDailyStatsApi, getSentimentSummaryApi } from '../../api/models/analytics.api';

export default function AnalyticsPage() {
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [sentiment, setSentiment] = useState(null);

  useEffect(() => {
    getSummaryStatsApi().then((r) => setSummary(r.data?.data)).catch(() => {});
    getDailyStatsApi().then((r) => setDaily(Array.isArray(r.data?.data) ? r.data.data : [])).catch(() => {});
    getSentimentSummaryApi().then((r) => setSentiment(r.data?.data)).catch(() => {});
  }, []);

  const dailyCols = [
    { key: 'date', label: 'Date', render: (r) => r.date ? new Date(r.date).toLocaleDateString() : '—' },
    { key: 'totalOrders', label: 'Orders' },
    { key: 'totalRevenue', label: 'Revenue', render: (r) => `₹${r.totalRevenue || 0}` },
    { key: 'avgOrderValue', label: 'Avg Order', render: (r) => `₹${r.avgOrderValue || 0}` },
  ];

  const sv = { POSITIVE: 'success', NEUTRAL: 'warning', NEGATIVE: 'danger' };

  return (
    <div>
      <div className="flex items-center justify-between mb-6"><h1 className="text-xl font-bold text-slate-100">Analytics</h1></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Revenue" value={`₹${summary?.totalRevenue?.toLocaleString() || '0'}`} icon={<HiCurrencyDollar />} color="emerald" />
        <StatCard title="Total Orders" value={summary?.totalOrders || 0} icon={<HiShoppingCart />} color="indigo" />
        <StatCard title="Avg Order Value" value={`₹${summary?.avgOrderValue || 0}`} icon={<HiChartBar />} color="amber" />
        <StatCard title="Reviews" value={sentiment?.totalReviews || 0} icon={<HiStar />} color="blue" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><h3 className="mb-4 font-bold text-slate-100">Daily Metrics</h3><Table columns={dailyCols} data={daily.slice(0, 10)} emptyMessage="No daily data" /></Card>
        <Card>
          <h3 className="mb-4 font-bold text-slate-100">Sentiment Summary</h3>
          {sentiment ? (
            <div className="flex flex-col gap-3">
              {Object.entries(sentiment.breakdown || {}).map(([label, count]) => (
                <div key={label} className="flex items-center justify-between"><Badge variant={sv[label] || 'neutral'}>{label}</Badge><span className="font-bold text-slate-100">{count}</span></div>
              ))}
              {(!sentiment.breakdown || Object.keys(sentiment.breakdown).length === 0) && <p className="text-slate-500">No sentiment data</p>}
            </div>
          ) : <p className="text-slate-500">Loading...</p>}
        </Card>
      </div>
    </div>
  );
}
