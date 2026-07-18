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
import { getSummaryStatsApi, getDailyStatsApi, getSentimentSummaryApi, getExtendedStatsApi } from '../../api/models/analytics.api';
import { getEntityId, getList, getPayload, getRefId } from '../../utils/apiData';
import AnalyticsChartCard from './components/AnalyticsChartCard';

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString()}`;
const formatPercent = (value) => `${Number(value || 0).toFixed(2)}%`;

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [sentiment, setSentiment] = useState(null);
  const [extended, setExtended] = useState(null);
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
        const [summaryRes, dailyRes, sentimentRes, extendedRes, outletsRes] = await Promise.all([
          getSummaryStatsApi(params),
          getDailyStatsApi(params),
          getSentimentSummaryApi(params),
          getExtendedStatsApi(params),
          listOutletsApi(),
        ]);

        if (isCancelled) return;

        setSummary(getPayload(summaryRes));
        setDaily(getList(dailyRes));
        setSentiment(getPayload(sentimentRes));
        setExtended(getPayload(extendedRes));
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

      {/* Daily Performance Trend Charts */}
      <AnalyticsChartCard dailyData={daily} />

      {/* New Extended Dashboard Analytics Grid */}
      {extended && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          <PeakHoursHeatmap data={extended.peakHours} />
          <ChannelVolumeChart data={extended.channelVolume} />
        </div>
      )}

      {extended && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          <CustomerRetentionGauge rate={extended.customerRetention} />
          <TurnoverReservationCard turnover={extended.tableTurnover} reservationDuration={extended.avgReservationDuration} />
        </div>
      )}

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

function PeakHoursHeatmap({ data = [] }) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const [hoveredCell, setHoveredCell] = useState(null);

  const map = {};
  data.forEach(item => {
    map[`${item.dayOfWeek}-${item.hour}`] = item.count;
  });

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <Card className="p-6">
      <h3 className="font-bold text-on-surface dark:text-zinc-150 text-[16px] mb-1">Peak Hours Heatmap</h3>
      <p className="text-xs text-on-surface-variant dark:text-zinc-400 mb-6">
        Identify your busiest operational hours based on hourly order frequency.
      </p>
      
      <div className="overflow-x-auto">
        <div className="min-w-[640px] select-none relative">
          <div className="flex pl-16 mb-2">
            {hours.map(h => (
              <span key={h} className="flex-1 text-center text-[10px] font-bold text-on-surface-variant dark:text-zinc-500 font-mono">
                {h.toString().padStart(2, '0')}
              </span>
            ))}
          </div>

          <div className="space-y-1.5">
            {days.map((dayName, dayIndex) => {
              const mongoDay = dayIndex + 1;
              return (
                <div key={dayName} className="flex items-center">
                  <span className="w-16 pr-3 text-right text-[10px] font-bold text-on-surface-variant dark:text-zinc-400">
                    {dayName.slice(0, 3)}
                  </span>
                  <div className="flex-1 flex gap-1">
                    {hours.map(hour => {
                      const count = map[`${mongoDay}-${hour}`] || 0;
                      const ratio = count / maxCount;
                      const colorStyle = count > 0 
                        ? { backgroundColor: `hsla(245, 75%, 55%, ${0.15 + ratio * 0.85})` }
                        : {};

                      return (
                        <div
                          key={hour}
                          style={colorStyle}
                          className={`flex-1 aspect-square rounded-sm border border-border-base/10 dark:border-zinc-900/30 transition-all duration-200 cursor-pointer ${
                            count === 0 ? 'bg-surface-container-low dark:bg-zinc-900/20' : 'hover:scale-125 hover:shadow-md'
                          }`}
                          onMouseEnter={(e) => {
                            if (count > 0) {
                              setHoveredCell({
                                day: dayName,
                                hour: `${hour.toString().padStart(2, '0')}:00`,
                                count,
                                x: e.currentTarget.offsetLeft,
                                y: e.currentTarget.offsetTop
                              });
                            }
                          }}
                          onMouseLeave={() => setHoveredCell(null)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {hoveredCell && (
            <div
              className="absolute z-10 bg-zinc-900 text-white dark:bg-zinc-800 dark:text-zinc-100 rounded-lg p-2 text-[10px] font-semibold shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full flex flex-col gap-0.5"
              style={{
                left: `${hoveredCell.x + 8}px`,
                top: `${hoveredCell.y - 12}px`
              }}
            >
              <span className="opacity-70">{hoveredCell.day} at {hoveredCell.hour}</span>
              <span className="font-bold text-xs">{hoveredCell.count} order{hoveredCell.count === 1 ? '' : 's'}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function ChannelVolumeChart({ data = [] }) {
  const totalOrders = data.reduce((sum, d) => sum + d.count, 0) || 1;
  const channelColors = {
    DINE_IN: '#10b981',
    QR_DINE_IN: '#34d399',
    WAITER: '#059669',
    TAKEAWAY: '#3b82f6',
    DELIVERY: '#6366f1',
    ONLINE: '#8b5cf6',
    SWIGGY: '#f97316',
    ZOMATO: '#ef4444',
    WEBSITE: '#ec4899',
  };

  const getChannelColor = (c) => channelColors[c] || '#9ca3af';

  return (
    <Card className="p-6">
      <h3 className="font-bold text-on-surface dark:text-zinc-150 text-[16px] mb-1">Order Volume by Channel</h3>
      <p className="text-xs text-on-surface-variant dark:text-zinc-400 mb-6">
        Distribution of order volume across different sales channels.
      </p>

      <div className="h-6 w-full rounded-full overflow-hidden flex bg-surface-container-low dark:bg-zinc-900 border border-border-base dark:border-zinc-800 mb-6">
        {data.map(d => {
          const pct = (d.count / totalOrders) * 100;
          return (
            <div
              key={d.channel}
              style={{
                width: `${pct}%`,
                backgroundColor: getChannelColor(d.channel)
              }}
              className="h-full transition-all hover:opacity-85 cursor-pointer relative group"
              title={`${d.channel}: ${pct.toFixed(1)}%`}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {data.map(d => {
          const pct = (d.count / totalOrders) * 100;
          return (
            <div key={d.channel} className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getChannelColor(d.channel) }} />
              <div className="flex-1 flex items-center justify-between min-w-0">
                <span className="text-xs font-bold text-on-surface truncate dark:text-zinc-350">{d.channel}</span>
                <span className="text-xs font-mono font-bold text-on-surface-variant dark:text-zinc-500">
                  {d.count} ({pct.toFixed(1)}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function CustomerRetentionGauge({ rate = 0 }) {
  const radius = 50;
  const strokeWidth = 8;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (rate / 100) * circumference;

  return (
    <Card className="p-6 flex flex-col justify-between">
      <div>
        <h3 className="font-bold text-on-surface dark:text-zinc-150 text-[16px] mb-1">Customer Retention</h3>
        <p className="text-xs text-on-surface-variant dark:text-zinc-400 mb-4">
          Percentage of customer accounts returning for repeat orders.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center my-2 relative">
        <svg width="140" height="80" className="overflow-visible">
          <defs>
            <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          <path
            d="M 20 70 A 50 50 0 0 1 120 70"
            fill="none"
            stroke="#e4e4e7"
            className="dark:stroke-zinc-800"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <path
            d="M 20 70 A 50 50 0 0 1 120 70"
            fill="none"
            stroke="url(#gauge-grad)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute bottom-1 text-center">
          <span className="text-2xl font-black text-on-surface dark:text-zinc-100 font-mono">
            {rate.toFixed(1)}%
          </span>
          <span className="block text-[10px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wider">
            Repeat Visit Rate
          </span>
        </div>
      </div>

      <div className="text-center text-xs font-semibold text-on-surface-variant dark:text-zinc-400 mt-2">
        {rate > 35 
          ? "🎉 High loyalty index! Outstanding repeat client retention." 
          : "💡 Tip: Launch loyalty promotions or direct coupons to boost return visits."}
      </div>
    </Card>
  );
}

function TurnoverReservationCard({ turnover = 0, reservationDuration = 0 }) {
  return (
    <Card className="p-6 flex flex-col justify-between">
      <div>
        <h3 className="font-bold text-on-surface dark:text-zinc-150 text-[16px] mb-1">Turnover & Seating</h3>
        <p className="text-xs text-on-surface-variant dark:text-zinc-400 mb-6">
          Efficiency of floor plan utilization and reservation service length.
        </p>
      </div>

      <div className="space-y-5">
        <div className="flex items-center gap-4 p-3 rounded-xl border border-border-base dark:border-zinc-850 bg-surface-subtle/50 dark:bg-zinc-900/30">
          <span className="material-symbols-outlined text-primary text-2xl">table_restaurant</span>
          <div className="flex-1">
            <span className="text-[10px] font-bold text-on-surface-variant dark:text-zinc-500 uppercase tracking-wider block">
              Table Turnover Rate
            </span>
            <span className="text-lg font-black text-on-surface dark:text-zinc-200 font-mono">
              {turnover.toFixed(1)} <span className="text-xs font-medium text-on-surface-variant">turns / table</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 p-3 rounded-xl border border-border-base dark:border-zinc-850 bg-surface-subtle/50 dark:bg-zinc-900/30">
          <span className="material-symbols-outlined text-amber-500 text-2xl">schedule</span>
          <div className="flex-1">
            <span className="text-[10px] font-bold text-on-surface-variant dark:text-zinc-500 uppercase tracking-wider block">
              Avg Reservation Duration
            </span>
            <span className="text-lg font-black text-on-surface dark:text-zinc-200 font-mono">
              {reservationDuration} <span className="text-xs font-medium text-on-surface-variant">minutes</span>
            </span>
          </div>
        </div>
      </div>
      
      <div className="text-[10px] leading-relaxed text-on-surface-variant/80 dark:text-zinc-500 mt-4">
        Turnover rate is calculated as total closed dining sessions divided by active physical tables.
      </div>
    </Card>
  );
}
