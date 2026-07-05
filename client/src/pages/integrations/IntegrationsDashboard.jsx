import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getMappingsHealthApi,
  getExternalOrdersApi,
  replayOrderApi,
  getIntegrationStatsApi, getIntegrationEventsApi, getSyncJobsApi, replayEventApi
} from '../../api/models/integration.api';
import { getPayload } from '../../utils/apiData';
import Button from '../../components/ui/Button';

export default function IntegrationsDashboard() {
  const [health, setHealth] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [syncJobs, setSyncJobs] = useState([]);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingSyncJobs, setLoadingSyncJobs] = useState(true);
  
  const [replayingId, setReplayingId] = useState(null);
  const [replayingEventId, setReplayingEventId] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, events, jobs
  const [selectedItemDetail, setSelectedItemDetail] = useState(null); // Modal popup trace

  // Event Filters
  const [eventStatus, setEventStatus] = useState('');
  const [eventType, setEventType] = useState('');
  const [eventProvider, setEventProvider] = useState('');
  const [eventCorrelationId, setEventCorrelationId] = useState('');

  // Sync Job Filters
  const [syncProvider, setSyncProvider] = useState('');
  const [syncStatus, setSyncStatus] = useState('');
  const [syncType, setSyncType] = useState('');
  const [syncCorrelationId, setSyncCorrelationId] = useState('');

  const fetchHealth = async () => {
    try {
      setLoadingHealth(true);
      const res = await getMappingsHealthApi();
      setHealth(getPayload(res));
    } catch (err) {
      console.error('Failed to fetch mapping health:', err);
    } finally {
      setLoadingHealth(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const res = await getExternalOrdersApi({ limit: 10 });
      setRecentOrders(getPayload(res) || []);
    } catch (err) {
      console.error('Failed to fetch external orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await getIntegrationStatsApi();
      setStats(getPayload(res));
    } catch (err) {
      console.error('Failed to fetch integration stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoadingEvents(true);
      const params = { limit: 40 };
      if (eventStatus) params.status = eventStatus;
      if (eventType) params.eventType = eventType;
      if (eventProvider) params.provider = eventProvider;
      if (eventCorrelationId) params.correlationId = eventCorrelationId;

      const res = await getIntegrationEventsApi(params);
      const payload = getPayload(res);
      setEvents(payload?.events || []);
    } catch (err) {
      console.error('Failed to fetch integration events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const fetchSyncJobs = async () => {
    try {
      setLoadingSyncJobs(true);
      const params = { limit: 40 };
      if (syncProvider) params.provider = syncProvider;
      if (syncStatus) params.status = syncStatus;
      if (syncType) params.type = syncType;
      if (syncCorrelationId) params.correlationId = syncCorrelationId;

      const res = await getSyncJobsApi(params);
      const payload = getPayload(res);
      setSyncJobs(payload?.syncJobs || []);
    } catch (err) {
      console.error('Failed to fetch sync jobs:', err);
    } finally {
      setLoadingSyncJobs(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchOrders();
    fetchStats();
      }, []);

  useEffect(() => {
    if (activeTab === 'events') {
      fetchEvents();
    } else if (activeTab === 'jobs') {
      fetchSyncJobs();
    }
  }, [activeTab, eventStatus, eventType, eventProvider, eventCorrelationId, syncProvider, syncStatus, syncType, syncCorrelationId]);

  const handleReplay = async (id) => {
    try {
      setReplayingId(id);
      setFeedbackMsg(null);
      const res = await replayOrderApi(id);
      setFeedbackMsg({ type: 'success', text: `Order replayed successfully. Internal Order ID: ${res.data?.data?.internalOrderId}` });
      fetchOrders();
      fetchStats();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Replay failed' });
    } finally {
      setReplayingId(null);
    }
  };

  const handleEventReplay = async (id) => {
    try {
      setReplayingEventId(id);
      setFeedbackMsg(null);
      await replayEventApi(id);
      setFeedbackMsg({ type: 'success', text: 'Integration event queued for replay successfully.' });
      fetchStats();
      if (activeTab === 'events') fetchEvents();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Replay failed' });
    } finally {
      setReplayingEventId(null);
    }
  };

  const channels = [
    { id: 'swiggy', name: 'Mock Swiggy', provider: 'MOCK_SWIGGY', logo: '🍊' },
    { id: 'zomato', name: 'Mock Zomato', provider: 'MOCK_ZOMATO', logo: '🍕' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-on-surface dark:text-zinc-100 tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Integrations Control Center
          </h2>
          <p className="text-sm text-on-surface-variant dark:text-zinc-400 mt-1">
            Real-time transactional outbox event logs, capability expansion guards, and circuit breaker status indicators.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              fetchHealth();
              fetchOrders();
              fetchStats();
              if (activeTab === 'events') fetchEvents();
              if (activeTab === 'jobs') fetchSyncJobs();
            }}
            className="px-4 py-2 bg-zinc-150 dark:bg-zinc-800 text-on-surface dark:text-zinc-200 text-xs font-bold rounded-lg border border-border-base dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-750 transition"
          >
            Force Sync Refresh 🔄
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className={`p-4 rounded-xl border flex items-center justify-between animate-fade-in ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-250 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400' 
            : 'bg-rose-50 dark:bg-rose-950/20 border-rose-250 dark:border-rose-900/30 text-rose-800 dark:text-rose-455'
        }`}>
          <span className="text-sm font-semibold">{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-xs font-bold hover:underline opacity-80">Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border-base dark:border-zinc-800 gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition ${
            activeTab === 'overview'
              ? 'border-primary text-primary dark:text-primary-fixed-dim'
              : 'border-transparent text-on-surface-variant hover:text-on-surface dark:text-zinc-400'
          }`}
        >
          System Overview & Ingestion
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition ${
            activeTab === 'events'
              ? 'border-primary text-primary dark:text-primary-fixed-dim'
              : 'border-transparent text-on-surface-variant hover:text-on-surface dark:text-zinc-400'
          }`}
        >
          Event Queue Explorer (Outbox)
        </button>
        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition ${
            activeTab === 'jobs'
              ? 'border-primary text-primary dark:text-primary-fixed-dim'
              : 'border-transparent text-on-surface-variant hover:text-on-surface dark:text-zinc-400'
          }`}
        >
          Sync Job Trace Logs
        </button>
      </div>

      {/* Tab Contents: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider block">Outbox Pending</span>
              <span className="text-2xl font-black text-on-surface dark:text-zinc-100 block mt-1">{stats?.queue?.PENDING || 0}</span>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider block">Processing</span>
              <span className="text-2xl font-black text-on-surface dark:text-zinc-100 block mt-1">{stats?.queue?.PROCESSING || 0}</span>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider block">Success Sync</span>
              <span className="text-2xl font-black text-on-surface dark:text-zinc-100 block mt-1">{stats?.queue?.SUCCESS || 0}</span>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider block font-bold">Failed / Retries</span>
              <span className="text-2xl font-black text-on-surface dark:text-zinc-100 block mt-1">{stats?.queue?.FAILED || 0}</span>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-bold text-purple-550 uppercase tracking-wider block font-bold">DLQ Quarantine</span>
              <span className="text-2xl font-black text-on-surface dark:text-zinc-100 block mt-1">{stats?.queue?.DLQ || 0}</span>
            </div>
          </div>

          {/* Latency & Processing Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-850 border border-border-base dark:border-zinc-800 rounded-xl p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-450 mb-3">Sync Speed Latencies</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-on-surface-variant dark:text-zinc-400 block">Avg Outbox Wait Time:</span>
                  <span className="text-xl font-bold text-on-surface dark:text-zinc-100">{stats?.avgQueueWaitDurationMs || 0} ms</span>
                </div>
                <div>
                  <span className="text-xs text-on-surface-variant dark:text-zinc-400 block">Avg Integration Execution:</span>
                  <span className="text-xl font-bold text-on-surface dark:text-zinc-100">{stats?.avgProcessingDurationMs || 0} ms</span>
                </div>
              </div>
              {stats?.lastProcessedAt && (
                <div className="mt-4 text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                  Last successful sync processed at: {new Date(stats.lastProcessedAt).toLocaleString()}
                </div>
              )}
            </div>

            {/* Catalog Coverage Card */}
            <div className="bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl p-5 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-450 mb-3">Catalog Mapping Coverage</h4>
              {loadingHealth ? (
                <div className="py-2 text-xs text-zinc-500">Loading coverage...</div>
              ) : health ? (
                <div className="space-y-3.5">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1 text-on-surface dark:text-zinc-300">
                      <span>Menu Mappings Coverage</span>
                      <span>{health.menuItems?.mapped} / {health.menuItems?.total} ({health.menuItems?.percentage}%)</span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5">
                      <div 
                        className="bg-primary dark:bg-primary-fixed-dim h-1.5 rounded-full transition-all" 
                        style={{ width: `${health.menuItems?.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1 text-on-surface dark:text-zinc-300">
                      <span>Outlet Location Mappings</span>
                      <span>{health.outlets?.mapped} / {health.outlets?.total} ({health.outlets?.percentage}%)</span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5">
                      <div 
                        className="bg-teal-500 h-1.5 rounded-full transition-all" 
                        style={{ width: `${health.outlets?.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-rose-500">Failed to load mapping coverage metrics.</span>
              )}
            </div>
          </div>

          {/* Provider Sync State (Circuit Breakers / Health) */}
          <div className="bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-on-surface dark:text-zinc-200 uppercase tracking-wider mb-4">
              Channel Sync Health & Circuit Breakers
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {channels.map((chan) => {
                const syncState = stats?.providerStates?.find((ps) => ps.provider === chan.provider);
                const isCircuitOpen = syncState?.circuitOpenUntil && new Date(syncState.circuitOpenUntil) > new Date();
                
                return (
                  <div key={chan.id} className="border border-border-base dark:border-zinc-800 rounded-xl p-4 flex flex-col justify-between bg-zinc-50/50 dark:bg-zinc-950/10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{chan.logo}</span>
                        <div>
                          <h4 className="text-sm font-bold text-on-surface dark:text-zinc-200">{chan.name}</h4>
                          <span className="text-[10px] text-on-surface-variant/70 dark:text-zinc-500 font-bold uppercase tracking-wider">{chan.provider}</span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        syncState?.syncHealth === 'HEALTHY' 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/30'
                          : syncState?.syncHealth === 'DEGRADED'
                          ? 'bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-455 dark:border-amber-900/30'
                          : 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-455 dark:border-rose-900/30'
                      }`}>
                        {syncState?.syncHealth || 'HEALTHY'}
                      </span>
                    </div>

                    <div className="space-y-2 border-t border-border-base/50 dark:border-zinc-850 pt-2.5 text-xs text-on-surface-variant dark:text-zinc-400 font-medium">
                      <div className="flex justify-between">
                        <span>Circuit Status:</span>
                        <span className={isCircuitOpen ? 'text-rose-500 font-bold' : 'text-emerald-500 font-bold'}>
                          {isCircuitOpen ? `OPEN (Locked until ${new Date(syncState.circuitOpenUntil).toLocaleTimeString()})` : 'CLOSED (Normal)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Consecutive Failures:</span>
                        <span>{syncState?.consecutiveFailures || 0} / 5</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Failure Count:</span>
                        <span>{syncState?.failureCount || 0}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Connected Orders */}
          <div className="bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-on-surface dark:text-zinc-200 uppercase tracking-wider">
                Inbound Webhook Logs (Aggregators Ingestion)
              </h3>
              <button onClick={fetchOrders} className="text-xs font-bold text-primary dark:text-primary-fixed-dim hover:underline">Refresh</button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border-base dark:border-zinc-800 text-on-surface-variant/70 dark:text-zinc-500 font-bold">
                      <th className="py-2.5">Order ID</th>
                      <th className="py-2.5">Channel</th>
                      <th className="py-2.5">Outlet</th>
                      <th className="py-2.5">Status</th>
                      <th className="py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-base/55 dark:divide-zinc-850">
                    {loadingOrders ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-on-surface-variant/60 dark:text-zinc-550">Loading orders...</td>
                      </tr>
                    ) : recentOrders.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-on-surface-variant/60 dark:text-zinc-550">No external orders found.</td>
                      </tr>
                    ) : (
                      recentOrders.map((order) => (
                        <tr key={order._id} className="hover:bg-zinc-50/40 dark:hover:bg-zinc-950/20">
                          <td className="py-3 font-semibold text-on-surface dark:text-zinc-200">
                            <div>{order.externalOrderId}</div>
                            {order.failureReason && (
                              <div className="text-[10px] text-rose-500 font-mono mt-0.5 max-w-[220px] truncate" title={order.failureReason}>
                                {order.failureReason}
                              </div>
                            )}
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                              order.provider.includes('SWIGGY') 
                                ? 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/10 dark:text-orange-400 dark:border-orange-900/20'
                                : 'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/10 dark:text-red-400 dark:border-red-900/20'
                            }`}>
                              {order.provider.replace('MOCK_', '')}
                            </span>
                          </td>
                          <td className="py-3 text-on-surface-variant dark:text-zinc-400 font-medium">
                            {order.outletId?.name || 'Unmapped'}
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              order.status === 'PLACED' 
                                ? 'bg-emerald-50 text-emerald-655 dark:bg-emerald-950/10 dark:text-emerald-400' 
                                : order.status === 'MAPPING_REVIEW_REQUIRED'
                                ? 'bg-amber-50 text-amber-655 dark:bg-amber-950/10 dark:text-amber-400 animate-pulse border border-amber-200/40'
                                : 'bg-rose-50 text-rose-600 dark:bg-rose-950/10 dark:text-rose-400'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            {(order.status === 'MAPPING_REVIEW_REQUIRED' || order.status === 'FAILED_VALIDATION') ? (
                              <Button
                                size="xs"
                                variant="secondary"
                                onClick={() => handleReplay(order._id)}
                                disabled={replayingId === order._id}
                              >
                                {replayingId === order._id ? 'Replaying...' : 'Replay 🔄'}
                              </Button>
                            ) : (
                              <span className="text-on-surface-variant/40 dark:text-zinc-650">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            
        </div>
      )}

      {/* Tab Contents: Events (Outbox Event Queue) */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-zinc-450 uppercase mb-1">Status</label>
              <select
                value={eventStatus}
                onChange={(e) => setEventStatus(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-border-base dark:border-zinc-800 rounded-lg px-3 py-2 text-xs text-on-surface dark:text-zinc-200 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="FAILED">FAILED</option>
                <option value="DLQ">DLQ</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-450 uppercase mb-1">Event Type</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-border-base dark:border-zinc-800 rounded-lg px-3 py-2 text-xs text-on-surface dark:text-zinc-200 focus:outline-none"
              >
                <option value="">All Types</option>
                <option value="ORDER_CREATED">ORDER_CREATED</option>
                <option value="ORDER_STATUS_CHANGED">ORDER_STATUS_CHANGED</option>
                <option value="MENU_CHANGED">MENU_CHANGED</option>
                <option value="INVENTORY_CHANGED">INVENTORY_CHANGED</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-450 uppercase mb-1">Source System</label>
              <select
                value={eventProvider}
                onChange={(e) => setEventProvider(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-border-base dark:border-zinc-800 rounded-lg px-3 py-2 text-xs text-on-surface dark:text-zinc-200 focus:outline-none"
              >
                <option value="">All Sources</option>
                <option value="QR">QR Dine-in</option>
                <option value="SWIGGY">Swiggy</option>
                <option value="ZOMATO">Zomato</option>
                <option value="WEBSITE">Website</option>
                <option value="SYSTEM">System Engine</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-450 uppercase mb-1">Correlation ID</label>
              <input
                type="text"
                value={eventCorrelationId}
                onChange={(e) => setEventCorrelationId(e.target.value)}
                placeholder="Search order ID / trace..."
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-border-base dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-on-surface dark:text-zinc-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Event Table (Event Explorer) */}
          <div className="bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-on-surface dark:text-zinc-200 uppercase tracking-wider mb-4">
              Transactional Outbox Event Queue Log (Event Explorer)
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border-base dark:border-zinc-800 text-on-surface-variant/70 dark:text-zinc-500 font-bold">
                    <th className="py-2.5">Event Type / ID</th>
                    <th className="py-2.5">Source</th>
                    <th className="py-2.5">Correlation Key</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5">Latencies</th>
                    <th className="py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-base/55 dark:divide-zinc-850">
                  {loadingEvents ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-on-surface-variant/60 dark:text-zinc-550">Loading event explorer log...</td>
                    </tr>
                  ) : events.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-on-surface-variant/60 dark:text-zinc-550">No events found in queue matching filters.</td>
                    </tr>
                  ) : (
                    events.map((ev) => {
                      const queueTime = ev.startedAt ? new Date(ev.startedAt).getTime() - new Date(ev.queuedAt).getTime() : null;
                      const processTime = ev.processedAt && ev.startedAt ? new Date(ev.processedAt).getTime() - new Date(ev.startedAt).getTime() : null;
                      
                      return (
                        <tr key={ev._id} className="hover:bg-zinc-50/40 dark:hover:bg-zinc-950/20">
                          <td className="py-3 font-semibold text-on-surface dark:text-zinc-200">
                            <div>{ev.eventType}</div>
                            <div className="text-[10px] text-zinc-400 dark:text-zinc-55 font-mono mt-0.5">{ev._id} (v{ev.eventVersion})</div>
                            {ev.failureReason && (
                              <div className="text-[10px] text-rose-500 font-mono mt-1 max-w-[300px] truncate" title={ev.failureReason}>
                                Err: {ev.failureReason}
                              </div>
                            )}
                          </td>
                          <td className="py-3 text-on-surface-variant dark:text-zinc-400 font-medium">
                            {ev.sourceSystem}
                          </td>
                          <td className="py-3 font-mono text-zinc-650 dark:text-zinc-400">
                            {ev.correlationId}
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              ev.status === 'SUCCESS'
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/15 dark:text-emerald-400'
                                : ev.status === 'PROCESSING'
                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/15 dark:text-blue-400 animate-pulse'
                                : ev.status === 'PENDING'
                                ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                                : ev.status === 'FAILED'
                                ? 'bg-amber-50 text-amber-605 dark:bg-amber-950/15 dark:text-amber-400'
                                : 'bg-rose-50 text-rose-600 dark:bg-rose-950/15 dark:text-rose-455'
                            }`}>
                              {ev.status}
                            </span>
                          </td>
                          <td className="py-3 text-on-surface-variant dark:text-zinc-400 font-medium">
                            <div className="text-[10px]">Queue Wait: {queueTime !== null ? `${queueTime}ms` : '—'}</div>
                            <div className="text-[10px] mt-0.5">Exec Time: {processTime !== null ? `${processTime}ms` : '—'}</div>
                          </td>
                          <td className="py-3 text-right space-x-1.5">
                            <Button
                              size="xs"
                              variant="secondary"
                              onClick={() => setSelectedItemDetail({ type: 'Event Queue Payload', data: ev.payload })}
                            >
                              Inspect Payload
                            </Button>
                            {(ev.status === 'FAILED' || ev.status === 'DLQ' || ev.status === 'SUCCESS') && (
                              <Button
                                size="xs"
                                variant="primary"
                                onClick={() => handleEventReplay(ev._id)}
                                disabled={replayingEventId === ev._id}
                              >
                                {replayingEventId === ev._id ? 'Replaying...' : 'Replay Event 🔄'}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab Contents: Sync Jobs (Sync Job Tracing View) */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-zinc-450 uppercase mb-1">Provider</label>
              <select
                value={syncProvider}
                onChange={(e) => setSyncProvider(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-border-base dark:border-zinc-800 rounded-lg px-3 py-2 text-xs text-on-surface dark:text-zinc-200 focus:outline-none"
              >
                <option value="">All Providers</option>
                <option value="MOCK_SWIGGY">Mock Swiggy</option>
                <option value="MOCK_ZOMATO">Mock Zomato</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-450 uppercase mb-1">Status</label>
              <select
                value={syncStatus}
                onChange={(e) => setSyncStatus(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-border-base dark:border-zinc-800 rounded-lg px-3 py-2 text-xs text-on-surface dark:text-zinc-200 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="FAILED">FAILED</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-450 uppercase mb-1">Job Sync Type</label>
              <select
                value={syncType}
                onChange={(e) => setSyncType(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-border-base dark:border-zinc-800 rounded-lg px-3 py-2 text-xs text-on-surface dark:text-zinc-200 focus:outline-none"
              >
                <option value="">All Sync Types</option>
                <option value="ORDER_STATUS_SYNC">ORDER_STATUS_SYNC</option>
                <option value="INVENTORY_SYNC">INVENTORY_SYNC</option>
                <option value="MENU_SYNC">MENU_SYNC</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-450 uppercase mb-1">Correlation ID</label>
              <input
                type="text"
                value={syncCorrelationId}
                onChange={(e) => setSyncCorrelationId(e.target.value)}
                placeholder="Search order ID / trace..."
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-border-base dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-on-surface dark:text-zinc-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Sync Jobs Table */}
          <div className="bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-on-surface dark:text-zinc-200 uppercase tracking-wider mb-4">
              Connector Outbound Synchronization Jobs
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border-base dark:border-zinc-800 text-on-surface-variant/70 dark:text-zinc-500 font-bold">
                    <th className="py-2.5">Provider / Sync Type</th>
                    <th className="py-2.5">Correlation ID</th>
                    <th className="py-2.5">Linked Event ID</th>
                    <th className="py-2.5">Retries</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-base/55 dark:divide-zinc-850">
                  {loadingSyncJobs ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-on-surface-variant/60 dark:text-zinc-550">Loading outbound sync jobs...</td>
                    </tr>
                  ) : syncJobs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-on-surface-variant/60 dark:text-zinc-550">No sync jobs matching filters.</td>
                    </tr>
                  ) : (
                    syncJobs.map((job) => (
                      <tr key={job._id} className="hover:bg-zinc-50/40 dark:hover:bg-zinc-950/20">
                        <td className="py-3 font-semibold text-on-surface dark:text-zinc-200">
                          <div>{job.type}</div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                            job.provider.includes('SWIGGY') 
                              ? 'bg-orange-50 text-orange-655 border-orange-100 dark:bg-orange-950/10 dark:text-orange-400 dark:border-orange-900/20'
                              : 'bg-red-50 text-red-655 border-red-100 dark:bg-red-950/10 dark:text-red-400 dark:border-red-900/20'
                          }`}>
                            {job.provider.replace('MOCK_', '')}
                          </span>
                          {job.failureReason && (
                            <div className="text-[10px] text-rose-500 font-mono mt-1 max-w-[280px] truncate" title={job.failureReason}>
                              Reason: {job.failureReason}
                            </div>
                          )}
                        </td>
                        <td className="py-3 font-mono text-zinc-650 dark:text-zinc-450">
                          {job.correlationId}
                        </td>
                        <td className="py-3 font-mono text-zinc-400 dark:text-zinc-550">
                          {job.eventId || '—'}
                        </td>
                        <td className="py-3 text-on-surface-variant dark:text-zinc-400 font-medium">
                          {job.retryCount} / {job.maxRetryCount}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            job.status === 'SUCCESS' 
                              ? 'bg-emerald-50 text-emerald-650 dark:bg-emerald-950/10 dark:text-emerald-450' 
                              : job.status === 'PROCESSING'
                              ? 'bg-blue-50 text-blue-650 dark:bg-blue-950/10 dark:text-blue-450 animate-pulse'
                              : 'bg-rose-50 text-rose-600 dark:bg-rose-950/10 dark:text-rose-455'
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="py-3 text-right space-x-1.5">
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => setSelectedItemDetail({ type: 'Outbound Sync Payload', data: job.payload })}
                          >
                            Trace Payload
                          </Button>
                          {job.responsePayload && (
                            <Button
                              size="xs"
                              variant="secondary"
                              onClick={() => setSelectedItemDetail({ type: 'Provider API Response', data: job.responsePayload })}
                            >
                              API Response
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Detail Modal */}
      {selectedItemDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col justify-between shadow-2xl">
            <div className="p-5 border-b border-border-base dark:border-zinc-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-on-surface dark:text-zinc-100">
                {selectedItemDetail.type} Detail Trace
              </h3>
              <button 
                onClick={() => setSelectedItemDetail(null)} 
                className="text-zinc-400 hover:text-zinc-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 font-mono text-[11px] bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-350 p-4 rounded-lg m-4 border border-zinc-200/50 dark:border-zinc-850">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(selectedItemDetail.data, null, 2)}
              </pre>
            </div>

            <div className="p-5 border-t border-border-base dark:border-zinc-800 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedItemDetail(null)}
              >
                Close Trace Window
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
