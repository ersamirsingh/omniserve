import { useState, useEffect } from 'react';
import { 
  HiOutlineArrowPath, 
  HiOutlineHeart, 
  HiOutlineCircleStack, 
  HiOutlineExclamationCircle, 
  HiOutlineCpuChip, 
  HiOutlineLockClosed,
  HiOutlineBolt,
  HiOutlineCircleStack as HiOutlineStack,
  HiOutlineShieldCheck
} from 'react-icons/hi2';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { getHealthDiagnosticsApi, getHealthStatsApi } from '../../api/models/systemAdmin.api';

export default function HealthDiagnostics() {
  const [data, setData] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHealth = () => {
    setLoading(true);
    setError('');
    Promise.all([
      getHealthDiagnosticsApi(),
      getHealthStatsApi()
    ])
      .then(([diagRes, statsRes]) => {
        setData(diagRes.data?.data || null);
        setStatsData(statsRes.data?.data || null);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to fetch detailed diagnostics');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const overallStatus = data?.status || 'unknown';
  let overallColor = 'badge-neutral';
  let overallBg = 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800';
  if (overallStatus === 'ok') {
    overallColor = 'badge-success text-emerald-700 bg-emerald-100';
    overallBg = 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50';
  } else if (overallStatus === 'degraded') {
    overallColor = 'badge-warning text-amber-700 bg-amber-100';
    overallBg = 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/50';
  } else if (overallStatus === 'down') {
    overallColor = 'badge-error text-rose-700 bg-rose-100';
    overallBg = 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/50';
  }

  const infraChecks = data?.checks?.infra ? Object.entries(data.checks.infra) : [];
  const moduleChecks = data?.checks?.modules ? Object.entries(data.checks.modules) : [];
  const counts = statsData?.counts || {};
  const dbStats = statsData?.dbStats || {};
  const predictions = statsData?.predictions || [];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-[24px] font-bold text-on-surface dark:text-zinc-100 tracking-tight">
            Platform Health & Diagnostics
          </h2>
          <p className="text-[13px] text-on-surface-variant dark:text-zinc-400">
            Real-time visual diagnostic dashboard, collection indices, anomaly warnings, and prediction reports.
          </p>
        </div>
        <Button onClick={fetchHealth} variant="primary" loading={loading} className="font-bold flex items-center gap-1.5 shadow-md">
          <HiOutlineArrowPath className="text-lg" /> Refresh Diagnostics
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-xs text-rose-500">
          <HiOutlineExclamationCircle className="text-lg shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-44 skeleton rounded-2xl"></div>
          <div className="h-44 skeleton rounded-2xl"></div>
          <div className="h-44 skeleton rounded-2xl"></div>
          <div className="lg:col-span-2 h-96 skeleton rounded-2xl"></div>
          <div className="h-96 skeleton rounded-2xl"></div>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Top Summary Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Status overview card */}
            <div className={`p-5 rounded-2xl border flex items-center justify-between shadow-2xs ${overallBg}`}>
              <div className="space-y-1">
                <span className="text-[10px] text-on-surface-variant dark:text-zinc-400 uppercase tracking-widest font-extrabold block">Platform State</span>
                <h3 className="text-3xl font-black text-on-surface dark:text-zinc-100 tracking-tight flex items-center gap-2">
                  <HiOutlineHeart className={overallStatus === 'ok' ? 'text-emerald-500 animate-pulse' : overallStatus === 'degraded' ? 'text-amber-500' : 'text-rose-500'} />
                  {overallStatus.toUpperCase()}
                </h3>
              </div>
              <Badge variant={overallStatus === 'ok' ? 'success' : overallStatus === 'degraded' ? 'warning' : 'danger'} className="uppercase font-bold px-3 py-1 text-[10px]">
                Diagnostics Check
              </Badge>
            </div>

            {/* DB Storage details card */}
            <Card className="p-5 flex flex-col justify-between shadow-2xs border border-border-base dark:border-zinc-900 bg-white dark:bg-zinc-950">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] text-on-surface-variant dark:text-zinc-450 uppercase tracking-widest font-extrabold block">Database Storage</span>
                  <h3 className="text-2xl font-black text-on-surface dark:text-zinc-100 tracking-tight">
                    {dbStats.dataSize ? (dbStats.dataSize / (1024 * 1024)).toFixed(1) : '0.0'} MB
                  </h3>
                </div>
                <HiOutlineStack className="text-2xl text-primary" />
              </div>
              <div className="text-[11px] text-on-surface-variant dark:text-zinc-450 font-semibold mt-2">
                Across <span className="text-primary">{dbStats.collections || 0} collections</span> and <span className="text-primary">{dbStats.objects || 0} documents</span>
              </div>
            </Card>

            {/* Diagnostic Details card */}
            <Card className="p-5 flex flex-col justify-between shadow-2xs border border-border-base dark:border-zinc-900 bg-white dark:bg-zinc-950">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] text-on-surface-variant dark:text-zinc-450 uppercase tracking-widest font-extrabold block">Uptime Metric</span>
                  <h3 className="text-xl font-black text-on-surface dark:text-zinc-100 tracking-tight truncate">
                    {Math.floor(data.uptime / 3600)}h {Math.floor((data.uptime % 3600) / 60)}m
                  </h3>
                </div>
                <HiOutlineCpuChip className="text-2xl text-primary" />
              </div>
              <div className="text-[11px] text-on-surface-variant dark:text-zinc-450 font-semibold mt-2">
                Response timestamp: <span className="font-mono">{new Date(data.timestamp).toLocaleTimeString()}</span>
              </div>
            </Card>
          </div>

          {/* Predictions & Problems Section */}
          {predictions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[14px] font-bold text-on-surface dark:text-zinc-100 flex items-center gap-1.5">
                <HiOutlineShieldCheck className="text-lg text-amber-500" /> Platform Diagnostic Predictions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {predictions.map((p, idx) => (
                  <div 
                    key={idx} 
                    className={`p-4 rounded-xl border flex gap-3.5 items-start ${
                      p.type === 'WARNING' 
                        ? 'bg-amber-500/5 border-amber-500/20 text-amber-900 dark:text-amber-300' 
                        : p.type === 'OPTIMAL'
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-900 dark:text-emerald-300'
                        : 'bg-blue-500/5 border-blue-500/20 text-blue-900 dark:text-blue-300'
                    }`}
                  >
                    <HiOutlineExclamationCircle className={`text-xl shrink-0 mt-0.5 ${p.type === 'WARNING' ? 'text-amber-500' : p.type === 'OPTIMAL' ? 'text-emerald-500' : 'text-blue-500'}`} />
                    <div className="space-y-1">
                      <h4 className="font-bold text-xs">{p.title}</h4>
                      <p className="text-[11px] leading-relaxed opacity-90">{p.message}</p>
                      {p.suggestion && (
                        <p className="text-[10px] font-semibold opacity-75 mt-1">💡 Solution: {p.suggestion}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Charts & DB counts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Visual Charts Card */}
            <Card className="lg:col-span-8 p-5 space-y-6 border border-border-base dark:border-zinc-900 bg-white dark:bg-zinc-950 shadow-2xs">
              <div className="border-b border-border-base dark:border-zinc-900 pb-3">
                <h4 className="font-bold text-sm text-on-surface dark:text-zinc-200 flex items-center gap-1.5">
                  <HiOutlineBolt className="text-lg text-primary" /> Visual Performance Latency
                </h4>
                <p className="text-[11px] text-on-surface-variant dark:text-zinc-500 mt-0.5">Response latency compared across storage tiers and external gateways</p>
              </div>

              {/* Core Integrations Latency Bar Chart */}
              <div className="space-y-4">
                {infraChecks
                  .filter(([key]) => key !== 'diskSpace')
                  .map(([name, check]) => {
                    const latency = check.responseTimeMs || 0;
                    // Max latency scale is 200ms
                    const percentage = Math.min((latency / 200) * 100, 100);
                    const isFailing = check.status === 'down';
                    
                    return (
                      <div key={name} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-on-surface dark:text-zinc-350">
                          <span className="capitalize">{name}</span>
                          <span className="font-mono text-[11px]">{isFailing ? 'FAILED' : `${latency} ms`}</span>
                        </div>
                        <div className="h-3 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden flex">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isFailing 
                                ? 'bg-red-500' 
                                : latency < 30 
                                ? 'bg-emerald-500' 
                                : latency < 80 
                                ? 'bg-blue-500' 
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${isFailing ? 100 : Math.max(percentage, 2)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Collection stats representation */}
              {Object.keys(counts).length > 0 && (
                <div className="pt-2">
                  <div className="border-t border-border-base dark:border-zinc-900 pt-4 pb-2">
                    <h5 className="font-bold text-xs text-on-surface dark:text-zinc-300">Document Volume per Collection</h5>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(counts).map(([name, count]) => (
                      <div key={name} className="p-3 bg-surface-container dark:bg-zinc-900/40 border border-border-base dark:border-zinc-900 rounded-xl text-center space-y-1">
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold capitalize block">{name.replace(/([A-Z])/g, ' $1')}</span>
                        <span className="text-sm font-black text-on-surface dark:text-zinc-200 font-mono">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Diagnostics details list */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="p-5 flex flex-col gap-4 border border-border-base dark:border-zinc-900 bg-white dark:bg-zinc-950 shadow-2xs">
                <h4 className="font-bold text-sm text-on-surface dark:text-zinc-200 border-b border-border-base dark:border-zinc-900 pb-2 flex items-center gap-1.5">
                  <HiOutlineCircleStack className="text-lg text-primary" /> Disk Parameters
                </h4>
                {data.checks?.infra?.diskSpace && (
                  <div className="text-xs space-y-2">
                    <div className="font-mono text-zinc-600 dark:text-zinc-400 text-[10.5px] leading-relaxed bg-zinc-55-bg dark:bg-zinc-900/50 p-3 rounded-lg border border-border-base dark:border-zinc-900 whitespace-pre-wrap">
                      {data.checks.infra.diskSpace.details}
                    </div>
                  </div>
                )}
              </Card>

              <Card className="p-5 flex flex-col gap-4 border border-border-base dark:border-zinc-900 bg-white dark:bg-zinc-950 shadow-2xs">
                <h4 className="font-bold text-sm text-on-surface dark:text-zinc-200 border-b border-border-base dark:border-zinc-900 pb-2 flex items-center gap-1.5">
                  <HiOutlineLockClosed className="text-lg text-primary" /> Storage Details
                </h4>
                <div className="text-xs space-y-2 font-semibold">
                  <div className="flex justify-between py-1 border-b border-border-base/50 dark:border-zinc-900/50">
                    <span className="text-zinc-400">Total Indexes</span>
                    <span className="font-mono text-on-background">{dbStats.indexSize ? `${(dbStats.indexSize / (1024 * 1024)).toFixed(2)} MB` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border-base/50 dark:border-zinc-900/50">
                    <span className="text-zinc-400">Disk Allocations</span>
                    <span className="font-mono text-on-background">{dbStats.storageSize ? `${(dbStats.storageSize / (1024 * 1024)).toFixed(2)} MB` : 'N/A'}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Model Health Matrix Grid */}
          <Card className="p-5 space-y-4 border border-border-base dark:border-zinc-900 bg-white dark:bg-zinc-950 shadow-2xs">
            <div className="flex justify-between items-center border-b border-border-base dark:border-zinc-900 pb-3">
              <div>
                <h4 className="font-bold text-sm text-on-surface dark:text-zinc-200 flex items-center gap-1.5">
                  <HiOutlineCpuChip className="text-lg text-primary" /> Mongoose Schema Health Matrix
                </h4>
                <p className="text-[11px] text-on-surface-variant dark:text-zinc-500 mt-0.5">Individual model check response times. Red/Amber indicates queries taking longer than 80ms.</p>
              </div>
              <Badge variant="info" className="text-[10px] font-bold">Deep Write Verification</Badge>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
              {moduleChecks.map(([name, check]) => {
                const isFailing = check.status === 'down';
                const latency = check.responseTimeMs || 0;
                const isReadOnly = check.details?.includes('Read check succeeded') || check.details?.includes('read-only');

                return (
                  <div 
                    key={name} 
                    className={`p-3 rounded-xl border flex flex-col justify-between gap-2 transition-all hover:scale-[1.01] ${
                      isFailing 
                        ? 'bg-rose-500/5 border-rose-500/20' 
                        : latency < 35 
                        ? 'bg-emerald-500/5 border-emerald-500/20' 
                        : latency < 80 
                        ? 'bg-blue-500/5 border-blue-500/20' 
                        : 'bg-amber-500/5 border-amber-500/20'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-bold text-xs capitalize text-on-surface dark:text-zinc-200">{name}</span>
                        {isReadOnly && (
                          <span className="badge badge-xs badge-ghost text-[8px] font-bold flex items-center gap-0.5 text-zinc-400" title="Relational Model - Run as Read-only">
                            <HiOutlineLockClosed className="text-[9px]" /> R/O
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-on-surface-variant dark:text-zinc-450 block leading-snug line-clamp-2">{check.details}</span>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 border-t border-border-base/20 dark:border-zinc-900/30">
                      <span className="text-[9px] text-zinc-400 font-mono">{latency}ms</span>
                      <Badge 
                        variant={isFailing ? 'danger' : latency < 35 ? 'success' : latency < 80 ? 'info' : 'warning'} 
                        className="text-[8.5px] uppercase font-mono px-2 py-0"
                      >
                        {check.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-8 text-center border border-border-base dark:border-zinc-900 bg-white dark:bg-zinc-950">
          <p className="text-xs text-zinc-500">Click Refresh Diagnostics to pull live metrics from the backend.</p>
        </Card>
      )}
    </div>
  );
}
