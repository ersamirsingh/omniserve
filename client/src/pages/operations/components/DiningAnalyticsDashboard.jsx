import { useState, useEffect, useCallback } from 'react';
import { getDiningAnalyticsSummaryApi } from '../../../api/models/operations.api';
import { useToast } from '../../../components/ui/Toast';
import Spinner from '../../../components/ui/Spinner';
import { HiOutlineChartPie, HiOutlineCalendarDays } from 'react-icons/hi2';

export default function DiningAnalyticsDashboard() {
  const { addToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Date range selectors (default to last 7 days)
  const [dateRange, setDateRange] = useState({
    from: (() => {
      const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0];
    })(),
    to: new Date().toISOString().split('T')[0]
  });

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDiningAnalyticsSummaryApi({
        from: dateRange.from,
        to: dateRange.to
      });
      setData(res.data?.data || null);
    } catch {
      addToast('Failed to load dining analytics summary', 'error');
    } finally {
      setLoading(false);
    }
  }, [dateRange, addToast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Date selector toolbar */}
      <div className="flex justify-between items-center flex-wrap gap-4 bg-white dark:bg-zinc-950 p-4 border border-border-base dark:border-zinc-900 rounded-xl">
        <h3 className="text-[13px] font-bold text-on-surface-variant/75 uppercase tracking-wider flex items-center gap-1.5">
          <HiOutlineChartPie className="text-primary text-base" /> Dining Analytics Parameters
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            className="bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg p-1.5 text-xs text-on-background"
          />
          <span className="text-xs text-on-surface-variant font-semibold">to</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            className="bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg p-1.5 text-xs text-on-background"
          />
          <button
            onClick={fetchAnalytics}
            className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-indigo-650 cursor-pointer dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Apply Range
          </button>
        </div>
      </div>

      {data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Revenue Analytics Card */}
          <div className="bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-900 rounded-xl p-5 space-y-4">
            <h4 className="text-[13px] font-extrabold text-on-background uppercase tracking-wider border-b border-border-base dark:border-zinc-850 pb-2">
              Dine-In Revenue
            </h4>
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant dark:text-zinc-400">Total Dine-In Revenue:</span>
                <span className="font-extrabold text-sm text-primary dark:text-primary-fixed-dim">
                  ${data.revenue?.total?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant dark:text-zinc-400">Average Revenue / Table:</span>
                <span className="font-bold">${data.revenue?.averagePerTable?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant dark:text-zinc-400">Average Revenue / Cover:</span>
                <span className="font-bold">${data.revenue?.averagePerCover?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>

          {/* Covers Analytics Card */}
          <div className="bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-900 rounded-xl p-5 space-y-4">
            <h4 className="text-[13px] font-extrabold text-on-background uppercase tracking-wider border-b border-border-base dark:border-zinc-850 pb-2">
              Cover Counts
            </h4>
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant dark:text-zinc-400">Total Covers Seated:</span>
                <span className="font-extrabold text-sm text-on-background">{data.covers?.total || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant dark:text-zinc-400">Covers / Day:</span>
                <span className="font-bold">{data.covers?.perDay || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant dark:text-zinc-400">Average Party Size:</span>
                <span className="font-bold">{data.covers?.averagePartySize || 0} guests</span>
              </div>
            </div>
          </div>

          {/* Table Turn & SLA Card */}
          <div className="bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-900 rounded-xl p-5 space-y-4">
            <h4 className="text-[13px] font-extrabold text-on-background uppercase tracking-wider border-b border-border-base dark:border-zinc-850 pb-2">
              Turnover & SLAs
            </h4>
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant dark:text-zinc-400">Total Table Turns:</span>
                <span className="font-bold">{data.tableTurns?.total || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant dark:text-zinc-400">Average Turn Time:</span>
                <span className="font-bold text-success-green">{data.tableTurns?.averageTurnTimeMinutes || 0} mins</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant dark:text-zinc-400">Waiter SLA Compliance:</span>
                <span className="font-extrabold text-primary dark:text-primary-fixed-dim">{data.tasks?.slaComplianceRate || 100}%</span>
              </div>
            </div>
          </div>

          {/* Top-10 Performing Tables */}
          <div className="bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-900 rounded-xl p-5 lg:col-span-3 space-y-4">
            <h4 className="text-[13px] font-extrabold text-on-background uppercase tracking-wider border-b border-border-base dark:border-zinc-850 pb-2">
              Top Performing Tables by Revenue
            </h4>
            {data.topTables?.length === 0 ? (
              <span className="text-[11px] text-on-surface-variant/40 dark:text-zinc-650 block py-6 text-center">
                No revenue records during selected date range
              </span>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border-base dark:border-zinc-900 font-bold text-on-surface-variant/80">
                      <th className="py-2.5">Table Number</th>
                      <th className="py-2.5">Total Revenue Generated</th>
                      <th className="py-2.5">Turns Count</th>
                      <th className="py-2.5">Average Spend / Session</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topTables?.map((t, idx) => (
                      <tr key={idx} className="border-b border-border-base dark:border-zinc-900 hover:bg-surface-container-low/20">
                        <td className="py-2.5 font-bold">Table {t.tableNumber}</td>
                        <td className="py-2.5 font-semibold text-primary dark:text-primary-fixed-dim">${t.revenue?.toFixed(2)}</td>
                        <td className="py-2.5">{t.turnCount} turns</td>
                        <td className="py-2.5">
                          ${t.turnCount > 0 ? (t.revenue / t.turnCount).toFixed(2) : t.revenue?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-on-surface-variant dark:text-zinc-550 bg-white dark:bg-zinc-950 border border-dashed border-border-base dark:border-zinc-900 rounded-xl">
          <HiOutlineCalendarDays className="text-4xl text-on-surface-variant/40 mb-3" />
          <span className="text-[14px] font-semibold">No analytics generated</span>
          <span className="text-[12px] mt-1 font-normal">Please adjust dates to match completed operational shifts.</span>
        </div>
      )}
    </div>
  );
}
