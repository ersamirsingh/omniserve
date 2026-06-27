import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../../components/ui/Toast';
import {
  getDevConfigApi,
  loadDemoCatalogApi,
  generateMappingsApi,
  validateMappingsApi,
  resetDevSandboxApi,
  simulateOrderApi,
  runSmokeTestApi,
  getExternalOrdersApi,
  getIntegrationEventsApi,
  getSyncJobsApi,
  replayOrderApi,
  replayEventApi,
  getSimulatorSessionsApi,
  getSimulatorMetricsApi,
  getSimulatorEventsApi,
  stopSimulatorSessionApi,
  simulateDineInApi
} from '../../api/models/integration.api';
import { getTablesApi } from '../../api/models/operations.api';
import { getPayload } from '../../utils/apiData';
import { 
  resolveQrCodeApi, 
  getPublicMenuApi, 
  createOrUpdateCartApi, 
  checkoutCartApi,
  getCartApi
} from '../../api/models/public.api';
import {
  HiOutlineBuildingStorefront,
  HiOutlineMapPin,
  HiOutlineSquares2X2,
  HiOutlineRectangleStack,
  HiOutlineTag,
  HiOutlineCube,
  HiOutlineClipboardDocumentList,
  HiOutlineArrowPath,
  HiOutlineClock,
  HiOutlinePlay,
  HiOutlineTrash,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineCog6Tooth,
  HiOutlineCpuChip,
  HiOutlineStop,
  HiOutlineQueueList
} from 'react-icons/hi2';

export default function DeveloperCockpit() {
  const { addToast } = useToast();
  const consoleEndRef = useRef(null);
  const consoleContainerRef = useRef(null);
  
  const [outlets, setOutlets] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeAction, setActiveAction] = useState(null); // 'catalog', 'mapping', 'validate', 'reset', 'smoke'

  // Live Feed Lists
  const [recentOrders, setRecentOrders] = useState([]);
  const [externalOrders, setExternalOrders] = useState([]);
  const [events, setEvents] = useState([]);
  const [syncJobs, setSyncJobs] = useState([]);
  const [liveTab, setLiveTab] = useState('orders'); // 'orders', 'external', 'events', 'jobs', 'replay', 'dlq'

  // Simulator setup state
  const [simProvider, setSimProvider] = useState('');
  const [simMode, setSimMode] = useState('BURST'); // 'BURST' | 'CONTINUOUS'
  const [simOrderCount, setSimOrderCount] = useState(10);
  const [simDurationMinutes, setSimDurationMinutes] = useState(5);
  const [simSpeed, setSimSpeed] = useState('REALTIME'); // 'REALTIME' | 'FAST' | 'STRESS_TEST'
  const [simChaosMode, setSimChaosMode] = useState(false);
  const [simSeed, setSimSeed] = useState('');

  // Live simulation execution state
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [simulationMetrics, setSimulationMetrics] = useState(null);
  const [simulationEvents, setSimulationEvents] = useState([]);
  const [simulatorSessions, setSimulatorSessions] = useState([]);
  const [selectedTraceOrderId, setSelectedTraceOrderId] = useState('');
  const [tables, setTables] = useState([]);
  const [selectedDineInTableId, setSelectedDineInTableId] = useState('');
  const [simulatingDineIn, setSimulatingDineIn] = useState(false);

  // Guest QR simulation states
  const [guestSession, setGuestSession] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [guestMenu, setGuestMenu] = useState(null);
  const [guestCart, setGuestCart] = useState(null);
  const [guestLoading, setGuestLoading] = useState(false);

  // Fetch simulator sessions
  const fetchSimulatorSessions = useCallback(async () => {
    try {
      const res = await getSimulatorSessionsApi();
      const data = getPayload(res) || [];
      setSimulatorSessions(data);
      
      // Auto-reconnect if there's a running simulation in the background
      const active = data.find(s => s.status === 'RUNNING');
      if (active && !activeSessionId) {
        setActiveSessionId(active._id);
      }
    } catch (err) {
      console.error('Error fetching simulator sessions:', err);
    }
  }, [activeSessionId]);

  // Load configuration and static fields
  const fetchConfig = useCallback(async (outletId) => {
    try {
      if (!outletId) return;
      const res = await getDevConfigApi({ outletId });
      const data = getPayload(res);
      setConfig(data);
      if (data?.outlets && outlets.length === 0) {
        setOutlets(data.outlets);
      }
    } catch (err) {
      console.error('Failed to fetch developer config:', err);
      addToast(err.response?.data?.message || 'Failed to fetch sandbox configuration', 'error');
    }
  }, [outlets.length, addToast]);
  
  const fetchTables = useCallback(async (outletId) => {
    if (!outletId) return;
    try {
      const res = await getTablesApi({ outletId });
      setTables(res.data?.data?.tables || []);
    } catch (err) {
      console.error('Failed to fetch tables:', err);
    }
  }, []);

  // Fetch live lists
  const fetchLiveLists = useCallback(async (outletId) => {
    if (!outletId) return;
    try {
      const [extRes, evRes, syncRes] = await Promise.all([
        getExternalOrdersApi({ tenantId: config?.tenant?._id, limit: 10 }),
        getIntegrationEventsApi({ tenantId: config?.tenant?._id, limit: 10 }),
        getSyncJobsApi({ tenantId: config?.tenant?._id, limit: 10 })
      ]);

      const extData = getPayload(extRes) || [];
      const evData = getPayload(evRes)?.events || [];
      const syncData = getPayload(syncRes)?.syncJobs || [];

      setExternalOrders(extData);
      setEvents(evData);
      setSyncJobs(syncData);

      const placedOrders = extData.filter(o => o.status === 'PLACED' && o.internalOrderId);
      setRecentOrders(placedOrders);
    } catch (err) {
      console.error('Error fetching live feeds:', err);
    }
  }, [config?.tenant?._id]);

  // Handle mount and outlet selections
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const res = await getDevConfigApi();
        const data = getPayload(res);
        if (data?.outlets && data.outlets.length > 0) {
          setOutlets(data.outlets);
          
          const saved = localStorage.getItem('selectedOutletId');
          const matched = data.outlets.find(o => o._id === saved);
          const activeId = matched ? matched._id : data.outlets[0]._id;
          
          setSelectedOutletId(activeId);
          localStorage.setItem('selectedOutletId', activeId);
          
          setConfig(data);
          await Promise.all([
            fetchLiveLists(activeId),
            fetchTables(activeId),
            fetchSimulatorSessions()
          ]);
        }
      } catch (err) {
        console.error('Initialization failed:', err);
        addToast('Failed to load sandbox environments', 'error');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchLiveLists, fetchTables, fetchSimulatorSessions, addToast]);

  // Reload when outlet changes
  useEffect(() => {
    if (selectedOutletId) {
      fetchConfig(selectedOutletId);
      fetchLiveLists(selectedOutletId);
      fetchTables(selectedOutletId);
    }
  }, [selectedOutletId, fetchConfig, fetchLiveLists, fetchTables]);

  // Auto-refresh live feeds every 5 seconds
  useEffect(() => {
    if (!selectedOutletId) return;
    const interval = setInterval(() => {
      fetchConfig(selectedOutletId);
      fetchLiveLists(selectedOutletId);
      fetchTables(selectedOutletId);
      if (!activeSessionId) {
        fetchSimulatorSessions();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedOutletId, activeSessionId, fetchConfig, fetchLiveLists, fetchTables, fetchSimulatorSessions]);

  // Polling for active simulation details
  useEffect(() => {
    if (!activeSessionId) return;

    const fetchSessionData = async () => {
      try {
        const [metricsRes, eventsRes] = await Promise.all([
          getSimulatorMetricsApi(activeSessionId),
          getSimulatorEventsApi(activeSessionId)
        ]);

        const metricsData = getPayload(metricsRes);
        const eventsData = getPayload(eventsRes) || [];

        setSimulationMetrics(metricsData);
        setSimulationEvents(eventsData);

        // Auto-select latest order for tracking if none selected
        const uniqueOrders = Array.from(new Set(eventsData.map(e => e.externalOrderId).filter(Boolean)));
        if (uniqueOrders.length > 0 && !selectedTraceOrderId) {
          setSelectedTraceOrderId(uniqueOrders[uniqueOrders.length - 1]);
        }

        if (metricsData && metricsData.status !== 'RUNNING') {
          addToast(`Simulation session ${metricsData.status.toLowerCase()}`, metricsData.status === 'COMPLETED' ? 'success' : 'info');
          setActiveSessionId(null);
          setSimulationMetrics(null);
          setSimulationEvents([]);
          await fetchSimulatorSessions();
        }
      } catch (err) {
        console.error('Error polling simulation:', err);
      }
    };

    fetchSessionData();
    const interval = setInterval(fetchSessionData, 1500);

    return () => clearInterval(interval);
  }, [activeSessionId, selectedTraceOrderId, fetchSimulatorSessions, addToast]);

  // Auto-scroll console container to bottom on new logs (no page scroll locking)
  useEffect(() => {
    if (consoleContainerRef.current) {
      consoleContainerRef.current.scrollTop = consoleContainerRef.current.scrollHeight;
    }
  }, [simulationEvents]);

  // Handle environment switches
  const handleOutletChange = (id) => {
    setSelectedOutletId(id);
    localStorage.setItem('selectedOutletId', id);
    addToast('Sandbox outlet context switched successfully', 'success');
  };

  // Trigger dev actions
  const triggerAction = async (actionType, apiCall, successMsg) => {
    if (!selectedOutletId) return;
    try {
      setActionLoading(true);
      setActiveAction(actionType);
      await apiCall({ outletId: selectedOutletId });
      addToast(successMsg, 'success');
      await fetchConfig(selectedOutletId);
      await fetchLiveLists(selectedOutletId);
    } catch (err) {
      console.error(`${actionType} action failed:`, err);
      addToast(err.response?.data?.message || `Sandbox operation failed`, 'error');
    } finally {
      setActionLoading(false);
      setActiveAction(null);
    }
  };

  const handleLoadDemoCatalog = () => 
    triggerAction('catalog', loadDemoCatalogApi, 'Demo catalog loaded successfully');

  const handleGenerateMappings = () => 
    triggerAction('mapping', generateMappingsApi, 'Channel mappings generated successfully');

  const handleValidateMappings = () => 
    triggerAction('validate', validateMappingsApi, 'Mappings validation complete');

  const handleResetSandbox = () => 
    triggerAction('reset', resetDevSandboxApi, 'Dev Sandbox reset complete. Production data preserved.');

  const handleSimulateDineInOrder = async (e) => {
    e.preventDefault();
    if (!selectedDineInTableId) {
      addToast('Please select a target table for Dine-In simulation', 'warning');
      return;
    }

    try {
      setSimulatingDineIn(true);
      const res = await simulateDineInApi({
        outletId: selectedOutletId,
        tableId: selectedDineInTableId
      });
      const order = res.data?.data;
      addToast(`Dine-In order ${order.orderNumber} successfully simulated on Table ${order.tableNumber}!`, 'success');
      setSelectedDineInTableId('');
      fetchLiveLists(selectedOutletId);
      fetchTables(selectedOutletId);
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.message || 'Failed to place mock Dine-In order', 'error');
    } finally {
      setSimulatingDineIn(false);
    }
  };

  const handleInitializeGuestSession = async () => {
    if (!selectedDineInTableId) {
      addToast('Please select a target table to scan QR', 'warning');
      return;
    }
    const tableObj = tables.find(t => t._id === selectedDineInTableId);
    if (!tableObj) return;

    try {
      setGuestLoading(true);
      // 1. Resolve QR token (joins or creates session and occupies table)
      const resolveRes = await resolveQrCodeApi(tableObj.qrToken);
      const sessionData = resolveRes.data.data;
      setGuestSession(sessionData);

      // Temporarily store session token in localStorage so axios interceptor automatically attaches it!
      localStorage.setItem('sessionToken', sessionData.sessionToken);
      localStorage.setItem('selectedOutletId', sessionData.outletId);

      // 2. Fetch public menu for the outlet
      const menuRes = await getPublicMenuApi(sessionData.outletSlug);
      setGuestMenu(menuRes.data.data);

      // 3. Fetch cart
      const cartRes = await getCartApi();
      setGuestCart(cartRes.data.data);

      addToast(`QR Scan resolved! Guest session ${sessionData.sessionToken} opened on Table ${sessionData.tableNumber}.`, 'success');
      fetchTables(selectedOutletId); // reload tables list to show OCCUPIED status
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.message || 'Failed to resolve QR scan', 'error');
    } finally {
      setGuestLoading(false);
    }
  };

  const handleToggleSeat = (seat) => {
    setSelectedSeats(prev => 
      prev.includes(seat) ? prev.filter(s => s !== seat) : [...prev, seat]
    );
  };

  const handleGuestAddToCart = async (item) => {
    try {
      setGuestLoading(true);
      const sessionToken = localStorage.getItem('sessionToken');
      const outletId = localStorage.getItem('selectedOutletId');
      
      const payload = {
        sessionToken,
        outletId,
        item: {
          menuItemId: item._id,
          quantity: 1,
          customizations: []
        }
      };

      const res = await createOrUpdateCartApi(payload);
      setGuestCart(res.data.data);
      addToast(`Added ${item.name} to Guest Cart`, 'success');
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.message || 'Failed to add item to cart', 'error');
    } finally {
      setGuestLoading(false);
    }
  };

  const handleCheckoutGuestOrder = async () => {
    try {
      setGuestLoading(true);
      const payload = {
        customerName: 'Guest Sim',
        customerPhone: '9999999999',
        customerEmail: 'guest@sim.com',
        fulfillment: {
          type: 'DINE_IN',
          dineInDetails: {
            tableNumber: guestSession.tableNumber,
            seats: selectedSeats.length > 0 ? selectedSeats : ['Seat 1']
          }
        },
        payment: {
          method: 'COD',
          amount: guestCart.subtotal + (guestCart.tax || 0)
        }
      };

      const res = await checkoutCartApi(payload);
      const order = res.data.data.processedOrder;
      addToast(`Guest order placed! Order ID: ${order.internalOrderId}`, 'success');
      
      // Reset guest states
      setGuestCart(null);
      setSelectedSeats([]);
      
      // Reload admin dashboard
      fetchLiveLists(selectedOutletId);
      fetchTables(selectedOutletId);
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.message || 'Failed to place guest order', 'error');
    } finally {
      setGuestLoading(false);
    }
  };

  const handleClearGuestSession = () => {
    localStorage.removeItem('sessionToken');
    setGuestSession(null);
    setGuestMenu(null);
    setGuestCart(null);
    setSelectedSeats([]);
    addToast('Guest simulator session cleared from active sandbox browser memory.', 'info');
  };

  const handleRunSmokeTest = () => 
    triggerAction('smoke', runSmokeTestApi, 'Smoke test execution triggered');

  // Replay actions
  const handleReplayOrder = async (id) => {
    try {
      setActionLoading(true);
      await replayOrderApi(id);
      addToast('Mock order replayed successfully', 'success');
      await fetchLiveLists(selectedOutletId);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to replay order', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReplayEvent = async (id) => {
    try {
      setActionLoading(true);
      await replayEventApi(id);
      addToast('Integration event outbox queued for replay', 'success');
      await fetchLiveLists(selectedOutletId);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to replay event', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Start simulation session
  const handleStartSimulation = async (e) => {
    e.preventDefault();
    if (!simProvider) {
      addToast('Please select a provider adapter to simulate', 'info');
      return;
    }

    try {
      setActionLoading(true);
      const res = await simulateOrderApi({
        outletId: selectedOutletId,
        provider: simProvider,
        mode: simMode,
        totalOrders: simMode === 'BURST' ? simOrderCount : undefined,
        durationMinutes: simMode === 'CONTINUOUS' ? simDurationMinutes : undefined,
        speed: simSpeed,
        chaosMode: simChaosMode,
        seed: simSeed !== '' ? Number(simSeed) : undefined
      });

      const data = getPayload(res);
      if (data?.sessionId) {
        setActiveSessionId(data.sessionId);
        setSimulationMetrics(null);
        setSimulationEvents([]);
        setSelectedTraceOrderId('');
        addToast('Simulation session triggered asynchronously', 'success');
      }
    } catch (err) {
      console.error('Failed to start simulation:', err);
      addToast(err.response?.data?.message || 'Failed to start simulation', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Stop simulation session
  const handleStopSimulation = async () => {
    if (!activeSessionId) return;
    try {
      setActionLoading(true);
      await stopSimulatorSessionApi(activeSessionId);
      addToast('Simulation session stopped successfully', 'success');
      setActiveSessionId(null);
      setSimulationMetrics(null);
      setSimulationEvents([]);
      await fetchSimulatorSessions();
    } catch (err) {
      console.error('Failed to stop simulation:', err);
      addToast(err.response?.data?.message || 'Failed to stop simulation', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Selected Outlet Info
  const activeOutlet = outlets.find(o => o._id === selectedOutletId);

  // Tab calculations for replay/dlq count
  const replayOrdersList = externalOrders.filter(o => o.status === 'MAPPING_REVIEW_REQUIRED');
  const dlqEventsList = events.filter(e => e.status === 'DLQ');

  // Extract unique orders for the visual tracking timeline dropdown
  const simulatedOrderIds = Array.from(new Set(simulationEvents.map(e => e.externalOrderId).filter(Boolean)));

  // Calculate timeline steps for selected trace order
  const getTimelineSteps = () => {
    if (!selectedTraceOrderId) return [];

    const orderEvents = simulationEvents.filter(e => e.externalOrderId === selectedTraceOrderId);
    const hasPayloadGen = orderEvents.some(e => e.eventType === 'PAYLOAD_GENERATED');
    const hasSent = orderEvents.some(e => e.eventType === 'ORDER_SENT');
    const acceptedEvent = orderEvents.find(e => e.eventType === 'ORDER_ACCEPTED');
    const failedEvent = orderEvents.find(e => e.eventType === 'ORDER_FAILED');
    const hasOutbox = orderEvents.some(e => e.eventType === 'OUTBOX_CREATED');
    const hasSyncJob = orderEvents.some(e => e.eventType === 'SYNCJOB_CREATED');
    const syncCompleteEvent = orderEvents.find(e => e.eventType === 'CONNECTOR_COMPLETED');

    const steps = [
      { id: 1, name: 'Payload Built', status: hasPayloadGen ? 'success' : 'pending' },
      { id: 2, name: 'Sent Webhook', status: hasSent ? 'success' : hasPayloadGen ? 'active' : 'pending' },
      {
        id: 3,
        name: failedEvent ? 'Failed Ingest' : 'Accepted Order',
        status: acceptedEvent ? 'success' : failedEvent ? 'failed' : hasSent ? 'active' : 'pending',
        notes: failedEvent?.details?.reason
      },
      {
        id: 4,
        name: 'Outbox Event',
        status: hasOutbox ? 'success' : (acceptedEvent && !failedEvent) ? 'active' : 'pending'
      },
      {
        id: 5,
        name: 'Sync Job Created',
        status: hasSyncJob ? 'success' : hasOutbox ? 'active' : 'pending'
      },
      {
        id: 6,
        name: syncCompleteEvent?.details?.status === 'SUCCESS' ? 'Sync Completed' : syncCompleteEvent ? 'Sync Failed' : 'Sync Processing',
        status: syncCompleteEvent?.details?.status === 'SUCCESS' ? 'success' : syncCompleteEvent ? 'failed' : hasSyncJob ? 'active' : 'pending',
        notes: syncCompleteEvent?.details?.error
      }
    ];

    return steps;
  };

  const timelineSteps = getTimelineSteps();

  if (loading) {
    return (
      <div className="space-y-6 pb-12 animate-pulse">
        <div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-44 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
          <div className="h-44 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-on-surface dark:text-zinc-100 tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent font-hanken">
            Developer Cockpit
          </h2>
          <p className="text-sm text-on-surface-variant dark:text-zinc-400 mt-1">
            Perform mock order callbacks, validate integrations mappings, and simulate live outbox transaction events in an isolated environment.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (selectedOutletId) {
                fetchConfig(selectedOutletId);
                fetchLiveLists(selectedOutletId);
                fetchSimulatorSessions();
                addToast('Developer status dashboard refreshed', 'info');
              }
            }}
            disabled={actionLoading}
            className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-850 text-on-surface dark:text-zinc-200 text-xs font-bold rounded-lg border border-border-base dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <HiOutlineArrowPath className={`text-sm ${actionLoading ? 'animate-spin' : ''}`} />
            Refresh Control Panel
          </button>
        </div>
      </div>

      {/* Row 1: Environment Selector & Mappings Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Environment Settings Card */}
        <div className="bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-450 dark:text-zinc-550 flex items-center gap-2">
                <HiOutlineBuildingStorefront className="text-sm" />
                Target Environment Settings
              </h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-primary/10 text-primary border border-primary/20 dark:bg-primary-fixed-dim/20 dark:text-primary-fixed-dim uppercase tracking-wider">
                Development
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs font-medium text-on-surface-variant dark:text-zinc-400 mb-4">
              <div>
                <span className="text-[10px] text-zinc-405 dark:text-zinc-600 block uppercase tracking-wide">Current Tenant</span>
                <span className="font-bold text-on-surface dark:text-zinc-200 text-[13px]">{config?.tenant?.name || 'Loading...'}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-405 dark:text-zinc-600 block uppercase tracking-wide">Restaurant Brand</span>
                <span className="font-bold text-on-surface dark:text-zinc-200 text-[13px]">{config?.restaurant?.name || 'Loading...'}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-405 dark:text-zinc-600 block uppercase tracking-wide">Active Target Outlet</span>
                <span className="font-bold text-on-surface dark:text-zinc-200 text-[13px]">{activeOutlet?.name || 'Select Outlet'}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-405 dark:text-zinc-600 block uppercase tracking-wide">Outlet Code & Slug</span>
                <span className="font-bold text-on-surface dark:text-zinc-200 text-[13px]">{activeOutlet ? `${activeOutlet.code} (${activeOutlet.slug})` : '—'}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border-base/50 dark:border-zinc-850">
            <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-600 block mb-1.5 uppercase">Switch Outlet Workspace</label>
            <select
              value={selectedOutletId}
              onChange={(e) => handleOutletChange(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-border-base dark:border-zinc-800 rounded-lg text-xs font-semibold text-on-surface dark:text-zinc-200 focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              {outlets.map(o => (
                <option key={o._id} value={o._id}>{o.name} ({o.code})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Mapping Overview Card */}
        <div className="bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-455 dark:text-zinc-550 flex items-center gap-2">
                <HiOutlineClipboardDocumentList className="text-sm" />
                Aggregator Mapping Overview
              </h3>
              <button
                onClick={handleValidateMappings}
                disabled={actionLoading}
                className="text-[11px] font-bold text-primary dark:text-primary-fixed-dim hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                Validate Mappings
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div className="bg-zinc-50/50 dark:bg-zinc-950/20 rounded-xl p-3 border border-border-base/30 dark:border-zinc-855">
                <span className="text-[10px] text-zinc-405 dark:text-zinc-555 block font-bold uppercase">Coverage</span>
                <span className="text-2xl font-black text-primary dark:text-primary-fixed-dim block mt-0.5">
                  {config?.mappings?.menuItems?.length > 0 ? '100%' : '0%'}
                </span>
              </div>
              <div className="bg-zinc-50/50 dark:bg-zinc-950/20 rounded-xl p-3 border border-border-base/30 dark:border-zinc-855">
                <span className="text-[10px] text-zinc-405 dark:text-zinc-555 block font-bold uppercase">Total Mapped</span>
                <span className="text-2xl font-black text-on-surface dark:text-zinc-100 block mt-0.5">
                  {(config?.mappings?.menuItems?.length || 0) + (config?.mappings?.outlets?.length || 0)}
                </span>
              </div>
              <div className="bg-zinc-50/50 dark:bg-zinc-950/20 rounded-xl p-3 border border-border-base/30 dark:border-zinc-855">
                <span className="text-[10px] text-zinc-405 dark:text-zinc-555 block font-bold uppercase">Broken / Unmapped</span>
                <span className="text-2xl font-black text-rose-500 block mt-0.5">0</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-border-base/50 dark:border-zinc-850">
            <div>
              <div className="flex justify-between text-[11px] font-bold text-on-surface dark:text-zinc-300 mb-1">
                <span>Swiggy & Zomato Item Mappings</span>
                <span>{config?.mappings?.menuItems?.length || 0} Entities</span>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5">
                <div 
                  className="bg-primary dark:bg-primary-fixed-dim h-1.5 rounded-full transition-all" 
                  style={{ width: config?.mappings?.menuItems?.length > 0 ? '100%' : '0%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Catalog Overview (Clickable Bento Cards) */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3.5">
          Sandbox Catalog Seeding (Real / Sandbox Data Counts)
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Categories', icon: <HiOutlineSquares2X2 className="text-indigo-500" />, key: 'categories' },
            { label: 'Menu Items', icon: <HiOutlineRectangleStack className="text-blue-500" />, key: 'menuItems' },
            { label: 'Variants', icon: <HiOutlineTag className="text-teal-500" />, key: 'variants' },
            { label: 'Addons', icon: <HiOutlineTag className="text-amber-500" />, key: 'addons' },
            { label: 'Inventory', icon: <HiOutlineCube className="text-rose-500" />, key: 'inventory' }
          ].map((card) => {
            const counts = config?.catalog?.[card.key] || { real: 0, sandbox: 0 };
            return (
              <div 
                key={card.label}
                className="bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl p-4 shadow-xs hover:border-primary/45 transition cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider block">
                    {card.label}
                  </span>
                  <span className="text-lg shrink-0">{card.icon}</span>
                </div>
                <div className="mt-2.5 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-on-surface dark:text-zinc-100 leading-none">
                    {counts.sandbox}
                  </span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-650 font-bold">
                    ({counts.real} Production)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Simulation Console & Tracking Panel */}
      {activeSessionId || simulationMetrics ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Live Metrics Aggregator Panel */}
          <div className="xl:col-span-2 bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5 border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-200">
                      Live Simulation Dashboard
                    </h3>
                    <span className="text-[10px] text-zinc-500 font-mono">Session ID: {activeSessionId || simulationMetrics?.sessionId}</span>
                  </div>
                </div>
                {activeSessionId && (
                  <button
                    onClick={handleStopSimulation}
                    disabled={actionLoading}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <HiOutlineStop className="text-sm" />
                    Stop Simulation
                  </button>
                )}
              </div>

              {/* KPI metrics cards grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
                  <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wide">Processed Orders</span>
                  <span className="text-2xl font-black text-zinc-100 block mt-1">
                    {simulationMetrics?.totalOrders || 0}
                  </span>
                  <span className="text-[9px] text-zinc-600 block mt-1">
                    ({simulationMetrics?.successCount || 0} Successful)
                  </span>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
                  <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wide">Avg Latency</span>
                  <span className="text-2xl font-black text-zinc-100 block mt-1">
                    {simulationMetrics?.averageLatencyMs || 0} <span className="text-[11px] font-normal text-zinc-500">ms</span>
                  </span>
                  <span className="text-[9px] text-zinc-650 block mt-1">Ingest normalizer</span>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
                  <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wide">Throughput</span>
                  <span className="text-2xl font-black text-primary block mt-1">
                    {simulationMetrics?.throughput || 0} <span className="text-[11px] font-normal text-zinc-500">o/s</span>
                  </span>
                  <span className="text-[9px] text-zinc-650 block mt-1">
                    {simulationMetrics?.syncThroughput || 0} sync/s outbound
                  </span>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
                  <span className="text-[9px] text-rose-500 uppercase font-bold tracking-wide">Failures & Retries</span>
                  <span className="text-2xl font-black text-rose-500 block mt-1">
                    {simulationMetrics?.failedCount || 0}
                  </span>
                  <span className="text-[9px] text-zinc-600 block mt-1">
                    ({simulationMetrics?.retries || 0} Queue Retries)
                  </span>
                </div>
              </div>

              {/* Progress and secondary metrics bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6 text-xs border-t border-zinc-800 pt-4">
                <div>
                  <div className="flex justify-between font-bold text-zinc-300 mb-1.5">
                    <span>Order Placement Success Rate</span>
                    <span>{simulationMetrics?.successRate || 0}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${simulationMetrics?.successRate || 0}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-col justify-center text-zinc-400 space-y-1.5">
                  <div className="flex justify-between">
                    <span>Active Queue Depth (Pending outbox/syncs):</span>
                    <span className="font-bold text-zinc-200">{simulationMetrics?.queueDepth || 0} Jobs</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Catalog Mappings Validation Errors:</span>
                    <span className="font-bold text-rose-500">{simulationMetrics?.mappingFailures || 0} Mappings</span>
                  </div>
                  <div className="flex justify-between">
                    <span>JSON Schema Validation Failures:</span>
                    <span className="font-bold text-amber-500">{simulationMetrics?.validationFailures || 0} Formats</span>
                  </div>
                </div>
              </div>

              {/* Visual Timeline Stepper section */}
              {simulatedOrderIds.length > 0 && (
                <div className="border-t border-zinc-800 pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold text-zinc-350 uppercase tracking-wider flex items-center gap-1.5">
                      <HiOutlineQueueList className="text-sm" />
                      Visual Order Tracking Timeline
                    </h4>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-550 block font-bold uppercase">Select Trace Target:</span>
                      <select
                        value={selectedTraceOrderId}
                        onChange={(e) => setSelectedTraceOrderId(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-[11px] font-semibold text-zinc-200 focus:outline-hidden"
                      >
                        {simulatedOrderIds.map(id => (
                          <option key={id} value={id}>{id}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Horizontal progress timeline steps stepper */}
                  <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800/80">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 relative">
                      {timelineSteps.map((step, idx) => (
                        <div key={step.id} className="flex-1 flex md:flex-col items-start md:items-center relative z-10">
                          {/* Circle status indicator */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            step.status === 'success'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500'
                              : step.status === 'failed'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500 animate-pulse'
                              : step.status === 'active'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500 animate-pulse'
                              : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                          }`}>
                            {step.status === 'success' ? '✓' : step.status === 'failed' ? '✗' : step.id}
                          </div>
                          
                          {/* Label */}
                          <div className="ml-3 md:ml-0 md:mt-2 text-left md:text-center">
                            <span className="text-[11px] font-bold text-zinc-200 block">{step.name}</span>
                            {step.notes && (
                              <span className="text-[9px] text-zinc-500 block max-w-[150px] leading-tight md:mx-auto">
                                {step.notes.substring(0, 60)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Scrolling Event Stream Console */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-lg flex flex-col justify-between min-h-[400px]">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2 mb-3 border-b border-zinc-800 pb-2">
                <HiOutlineCpuChip className="text-sm text-indigo-400" />
                Live Simulation Event Stream
              </h3>
              
              {/* Scrolling terminal view */}
              <div ref={consoleContainerRef} className="bg-zinc-900 border border-zinc-850 rounded-lg p-3 font-mono text-[10px] h-[340px] overflow-y-auto space-y-2 text-zinc-300">
                {simulationEvents.length === 0 ? (
                  <div className="text-zinc-600 italic py-12 text-center">Awaiting simulation events...</div>
                ) : (
                  simulationEvents.map((evt, i) => {
                    let typeColor = 'text-blue-400';
                    if (evt.eventType.includes('ACCEPTED') || evt.eventType.includes('STARTED') || evt.eventType.includes('COMPLETED')) typeColor = 'text-emerald-400';
                    if (evt.eventType.includes('FAILED')) typeColor = 'text-rose-400';
                    if (evt.eventType.includes('OUTBOX')) typeColor = 'text-purple-400';
                    if (evt.eventType.includes('SYNCJOB')) typeColor = 'text-amber-400';

                    return (
                      <div key={evt._id || i} className="border-b border-zinc-850/50 pb-1.5 last:border-0 leading-relaxed">
                        <span className="text-zinc-650 font-semibold select-none">[{new Date(evt.timestamp).toLocaleTimeString()}] </span>
                        <span className={`font-black ${typeColor}`}>{evt.eventType}</span>
                        {evt.externalOrderId && (
                          <span className="text-zinc-450 block mt-0.5">↳ Order: {evt.externalOrderId}</span>
                        )}
                        {evt.details && Object.keys(evt.details).length > 0 && (
                          <span className="text-zinc-550 block mt-0.5 truncate" title={JSON.stringify(evt.details)}>
                            Details: {JSON.stringify(evt.details)}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={consoleEndRef} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Development Actions Card */}
          <div className="bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-455 dark:text-zinc-550 flex items-center gap-2 mb-4.5">
                <HiOutlinePlay className="text-sm" />
                Development Environment Controls
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <button
                  onClick={handleLoadDemoCatalog}
                  disabled={actionLoading}
                  className="w-full px-4 py-3 bg-primary dark:bg-primary-fixed-dim text-white dark:text-zinc-950 text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-1.5 font-bold"
                >
                  {activeAction === 'catalog' && <span className="animate-spin text-sm">🔄</span>}
                  Load Demo Catalog
                </button>
                
                <button
                  onClick={handleGenerateMappings}
                  disabled={actionLoading}
                  className="w-full px-4 py-3 bg-indigo-500/12 hover:bg-indigo-500/20 text-indigo-500 text-xs font-bold rounded-lg disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {activeAction === 'mapping' && <span className="animate-spin text-sm">🔄</span>}
                  Generate Mappings
                </button>

                <button
                  onClick={handleValidateMappings}
                  disabled={actionLoading}
                  className="w-full px-4 py-3 bg-teal-500/12 hover:bg-teal-500/20 text-teal-500 text-xs font-bold rounded-lg disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {activeAction === 'validate' && <span className="animate-spin text-sm">🔄</span>}
                  Validate Mappings
                </button>

                <button
                  onClick={handleRunSmokeTest}
                  disabled={actionLoading}
                  className="w-full px-4 py-3 bg-emerald-500/12 hover:bg-emerald-500/20 text-emerald-500 text-xs font-bold rounded-lg disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {activeAction === 'smoke' && <span className="animate-spin text-sm">🔄</span>}
                  Run Smoke Test Pipeline
                </button>
              </div>
            </div>

            <div className="pt-5 mt-5 border-t border-border-base/50 dark:border-zinc-850">
              <button
                onClick={handleResetSandbox}
                disabled={actionLoading}
                className="w-full px-4 py-3 bg-rose-500/12 hover:bg-rose-500/20 text-rose-500 text-xs font-bold rounded-lg disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-1.5 border border-rose-500/20"
              >
                <HiOutlineTrash className="text-sm" />
                {activeAction === 'reset' && <span className="animate-spin text-sm">🔄</span>}
                Purge Dev Sandbox Data
              </button>
            </div>
          </div>

          {/* Dine-In Order Simulator Card */}
          <div className="bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-455 dark:text-zinc-550 flex items-center gap-2 mb-4">
              <HiOutlineSquares2X2 className="text-sm text-primary" />
              Simulate Dine-In Table Order
            </h3>
            
            {!guestSession ? (
              <div className="space-y-3.5 text-xs font-semibold">
                <div>
                  <label className="text-[10px] font-bold text-zinc-405 dark:text-zinc-650 block mb-1 uppercase">Target Table</label>
                  <select
                    value={selectedDineInTableId}
                    onChange={(e) => setSelectedDineInTableId(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-border-base dark:border-zinc-800 rounded-lg font-semibold text-on-surface dark:text-zinc-200 focus:outline-hidden"
                  >
                    <option value="">Select Table...</option>
                    {tables.map((t) => (
                      <option key={t._id} value={t._id}>
                        Table {t.tableNumber} (Seats: {t.seatCount}) - [{t.operationalStatus}]
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSimulateDineInOrder}
                    disabled={simulatingDineIn || !selectedDineInTableId}
                    className="flex-1 px-3 py-2.5 bg-primary hover:bg-primary/90 text-white text-[11px] font-bold rounded-lg disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    {simulatingDineIn ? (
                      <span className="animate-spin text-sm">🔄</span>
                    ) : (
                      <HiOutlinePlay className="text-sm" />
                    )}
                    Quick Order
                  </button>

                  <button
                    onClick={handleInitializeGuestSession}
                    disabled={guestLoading || !selectedDineInTableId}
                    className="flex-1 px-3 py-2.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 text-white text-[11px] font-bold rounded-lg disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    {guestLoading ? (
                      <span className="animate-spin text-sm">🔄</span>
                    ) : (
                      <span>📱 QR Scan</span>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-400 mt-2 italic leading-relaxed font-normal">
                  * Quick Order runs an instant mock dine-in session. QR Scan initiates a live guest micro-app session to test seat selection, menu browsing, cart updates and checkout using production customer APIs.
                </p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Active Session details header */}
                <div className="bg-zinc-50 dark:bg-zinc-950 border border-border-base dark:border-zinc-850 rounded-lg p-3 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-primary uppercase font-bold tracking-wider">Active Guest QR Session</span>
                    <h4 className="text-[13px] font-bold text-on-background mt-0.5">Table {guestSession.tableNumber}</h4>
                    <p className="text-[9px] text-zinc-400 font-mono mt-0.5">SESS: {guestSession.sessionToken.substring(0, 14)}...</p>
                  </div>
                  <button
                    onClick={handleClearGuestSession}
                    className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[10px] font-bold rounded border border-rose-500/20"
                  >
                    Clear Sim
                  </button>
                </div>

                {/* Seat Selector checklist */}
                <div>
                  <label className="text-[10px] font-bold text-zinc-405 dark:text-zinc-650 block mb-1.5 uppercase">Select Seated Guests</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {(() => {
                      const selectedTableObj = tables.find(t => t._id === selectedDineInTableId);
                      const totalSeats = selectedTableObj?.seatCount || 4;
                      return Array.from({ length: totalSeats }, (_, i) => `Seat ${i + 1}`).map(seat => {
                        const isSelected = selectedSeats.includes(seat);
                        return (
                          <button
                            type="button"
                            key={seat}
                            onClick={() => handleToggleSeat(seat)}
                            className={`px-2.5 py-1 rounded text-[10px] font-bold border transition ${
                              isSelected 
                                ? 'bg-primary text-white border-primary shadow-xs' 
                                : 'bg-white border-border-base text-on-surface hover:bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-800'
                            }`}
                          >
                            {seat}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Guest Cart details */}
                <div className="border border-border-base dark:border-zinc-850 rounded-lg p-3 space-y-2 bg-zinc-50/50 dark:bg-zinc-900/30">
                  <div className="flex justify-between items-center border-b border-border-base/50 dark:border-zinc-850 pb-1.5">
                    <span className="text-[10px] uppercase font-bold text-zinc-455">Guest Shopping Cart</span>
                    <span className="text-[10px] font-bold text-on-surface bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                      {guestCart?.items?.length || 0} items
                    </span>
                  </div>
                  {(!guestCart?.items || guestCart.items.length === 0) ? (
                    <p className="text-[10px] text-zinc-400 italic">Cart is empty. Add menu items below.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                      {guestCart.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[10px]">
                          <span className="truncate max-w-[140px] text-on-surface-variant">{item.menuItemId?.name || 'Item'}</span>
                          <span className="font-semibold">{item.quantity} x ₹{item.menuItemId?.price || 0}</span>
                        </div>
                      ))}
                      <div className="pt-1.5 mt-1.5 border-t border-border-base/30 flex justify-between items-center font-bold text-[11px]">
                        <span>Total (inc. tax):</span>
                        <span>₹{(guestCart.subtotal * 1.05).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  {guestCart?.items?.length > 0 && (
                    <button
                      type="button"
                      onClick={handleCheckoutGuestOrder}
                      disabled={guestLoading}
                      className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-bold rounded-lg transition"
                    >
                      {guestLoading ? 'Placing Order...' : 'Place Guest Order (Dine-In)'}
                    </button>
                  )}
                </div>

                {/* Browse Menu List */}
                <div className="space-y-2 border-t border-border-base/50 dark:border-zinc-850 pt-3">
                  <label className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider block">Browse Outlet Menu</label>
                  <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {guestMenu?.menuItems?.slice(0, 12).map((item) => (
                      <div key={item._id} className="flex justify-between items-center bg-white dark:bg-zinc-950 p-2 rounded-lg border border-border-base/50 dark:border-zinc-800 text-[11px]">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-bold text-on-surface truncate">{item.name}</p>
                          <p className="text-[10px] text-zinc-400">₹{item.price}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleGuestAddToCart(item)}
                          disabled={guestLoading}
                          className="px-2.5 py-1 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded text-[10px] font-bold border border-primary/25 transition cursor-pointer"
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Traffic Simulator Form Card */}
          <div className="bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-455 dark:text-zinc-550 flex items-center gap-2 mb-4">
              <HiOutlineCpuChip className="text-sm" />
              Centralized Traffic Simulator
            </h3>

            <form onSubmit={handleStartSimulation} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] font-bold text-zinc-405 dark:text-zinc-650 block mb-1 uppercase">Provider Simulator</label>
                  <select
                    value={simProvider}
                    onChange={(e) => setSimProvider(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-border-base dark:border-zinc-800 rounded-lg font-semibold text-on-surface dark:text-zinc-200 focus:outline-hidden"
                  >
                    <option value="">Select Adapter</option>
                    {config?.providers?.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-405 dark:text-zinc-650 block mb-1 uppercase">Execution Mode</label>
                  <select
                    value={simMode}
                    onChange={(e) => setSimMode(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-border-base dark:border-zinc-800 rounded-lg font-semibold text-on-surface dark:text-zinc-200 focus:outline-hidden"
                  >
                    <option value="BURST">BURST (Order Limit)</option>
                    <option value="CONTINUOUS">CONTINUOUS (Time Limit)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                {simMode === 'BURST' ? (
                  <div>
                    <label className="text-[10px] font-bold text-zinc-405 dark:text-zinc-650 block mb-1 uppercase">Burst Order Count (Max 500)</label>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={simOrderCount}
                      onChange={(e) => setSimOrderCount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-border-base dark:border-zinc-800 rounded-lg font-semibold text-on-surface dark:text-zinc-200 focus:outline-hidden"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-bold text-zinc-405 dark:text-zinc-650 block mb-1 uppercase">Duration (Minutes, Max 30)</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={simDurationMinutes}
                      onChange={(e) => setSimDurationMinutes(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-border-base dark:border-zinc-800 rounded-lg font-semibold text-on-surface dark:text-zinc-200 focus:outline-hidden"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold text-zinc-405 dark:text-zinc-655 block mb-1 uppercase">Fulfillment Speed</label>
                  <select
                    value={simSpeed}
                    onChange={(e) => setSimSpeed(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-border-base dark:border-zinc-800 rounded-lg font-semibold text-on-surface dark:text-zinc-200 focus:outline-hidden"
                  >
                    <option value="REALTIME">REALTIME (2s delay)</option>
                    <option value="FAST">FAST (300ms delay)</option>
                    <option value="STRESS_TEST">STRESS_TEST (No delay)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1.5">
                <div>
                  <label className="text-[10px] font-bold text-zinc-405 dark:text-zinc-655 block mb-1 uppercase">Seeded Random (Optional)</label>
                  <input
                    type="number"
                    placeholder="Enter seed e.g. 12345"
                    value={simSeed}
                    onChange={(e) => setSimSeed(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-border-base dark:border-zinc-800 rounded-lg font-semibold text-on-surface dark:text-zinc-200 focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center gap-2 sm:mt-6">
                  <input
                    type="checkbox"
                    id="chaosCheckbox"
                    checked={simChaosMode}
                    onChange={(e) => setSimChaosMode(e.target.checked)}
                    className="w-4 h-4 text-primary bg-zinc-50 dark:bg-zinc-950 border-zinc-300 rounded focus:ring-primary focus:outline-hidden cursor-pointer"
                  />
                  <label htmlFor="chaosCheckbox" className="font-bold text-on-surface dark:text-zinc-200 cursor-pointer select-none">
                    Inject Chaos Failures (5%)
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 mt-4 bg-primary dark:bg-primary-fixed-dim text-white dark:text-zinc-950 font-bold rounded-lg hover:opacity-95 transition cursor-pointer flex justify-center items-center gap-1.5 text-xs uppercase tracking-wider"
              >
                <HiOutlinePlay className="text-sm" />
                Launch Simulation Run
              </button>
            </form>
          </div>
        </div>
      )}

      {/* n8n Payloads Exporter Section */}
      {!activeSessionId && (
        <div className="bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl p-5 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2 mb-4">
            <HiOutlineCpuChip className="text-sm text-primary" />
            n8n Payloads Exporter
          </h3>
          <p className="text-xs text-on-surface-variant dark:text-zinc-400 mb-4">
            Copy-paste these dynamically generated payloads into n8n or any API client (e.g. Postman) to ingest simulated Swiggy and Zomato orders. Mappings are resolved automatically based on your active sandbox catalog.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Swiggy Card */}
            <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-border-base dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-500 uppercase">Mock Swiggy (Webhook Ingestion)</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(config?.dynamicN8nPayloads?.swiggy?.payload, null, 2));
                    addToast('Swiggy mock payload copied to clipboard', 'success');
                  }}
                  className="px-2.5 py-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-[10px] font-bold rounded cursor-pointer transition text-on-surface dark:text-zinc-300"
                >
                  Copy Payload
                </button>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase block">Webhook Target URL</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={config?.dynamicN8nPayloads?.swiggy?.url || ''}
                    className="w-full px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-900 border border-border-base dark:border-zinc-850 rounded-md font-mono text-[10px] text-zinc-650 dark:text-zinc-300"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(config?.dynamicN8nPayloads?.swiggy?.url || '');
                      addToast('Webhook URL copied to clipboard', 'success');
                    }}
                    className="px-2 py-1.5 bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold rounded hover:bg-zinc-300 dark:hover:bg-zinc-750"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-405 dark:text-zinc-655 uppercase block">Example JSON Payload</label>
                <pre className="bg-zinc-100 dark:bg-zinc-900 p-3 rounded-lg font-mono text-[9px] text-zinc-600 dark:text-zinc-300 overflow-x-auto max-h-48 border border-border-base/50 dark:border-zinc-850">
                  {JSON.stringify(config?.dynamicN8nPayloads?.swiggy?.payload, null, 2)}
                </pre>
              </div>
            </div>

            {/* Zomato Card */}
            <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-border-base dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-rose-500 uppercase">Mock Zomato (Webhook Ingestion)</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(config?.dynamicN8nPayloads?.zomato?.payload, null, 2));
                    addToast('Zomato mock payload copied to clipboard', 'success');
                  }}
                  className="px-2.5 py-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-[10px] font-bold rounded cursor-pointer transition text-on-surface dark:text-zinc-300"
                >
                  Copy Payload
                </button>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase block">Webhook Target URL</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={config?.dynamicN8nPayloads?.zomato?.url || ''}
                    className="w-full px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-900 border border-border-base dark:border-zinc-850 rounded-md font-mono text-[10px] text-zinc-650 dark:text-zinc-300"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(config?.dynamicN8nPayloads?.zomato?.url || '');
                      addToast('Webhook URL copied to clipboard', 'success');
                    }}
                    className="px-2 py-1.5 bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold rounded hover:bg-zinc-300 dark:hover:bg-zinc-750"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-405 dark:text-zinc-655 uppercase block">Example JSON Payload</label>
                <pre className="bg-zinc-100 dark:bg-zinc-900 p-3 rounded-lg font-mono text-[9px] text-zinc-600 dark:text-zinc-300 overflow-x-auto max-h-48 border border-border-base/50 dark:border-zinc-850">
                  {JSON.stringify(config?.dynamicN8nPayloads?.zomato?.payload, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simulator Execution History Table */}
      {!activeSessionId && simulatorSessions.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl p-5 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3 flex items-center gap-1.5">
            <HiOutlineQueueList className="text-sm" />
            Recent Simulation Run History
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-base dark:border-zinc-800 text-zinc-400 dark:text-zinc-555 font-bold uppercase text-[10px]">
                  <th className="py-2.5">Date & Time</th>
                  <th className="py-2.5">Provider</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5">Orders Processed</th>
                  <th className="py-2.5">Avg Latency</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-base/50 dark:divide-zinc-850">
                {simulatorSessions.map((sess) => (
                  <tr key={sess._id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-950/10">
                    <td className="py-3 font-medium text-on-surface dark:text-zinc-350">
                      {new Date(sess.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 font-bold text-primary dark:text-primary-fixed-dim">{sess.provider}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide border ${
                        sess.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/30'
                          : sess.status === 'RUNNING'
                          ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-450 dark:border-blue-900/30 animate-pulse'
                          : 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-850 dark:text-zinc-400 dark:border-zinc-800'
                      }`}>
                        {sess.status}
                      </span>
                    </td>
                    <td className="py-3 font-semibold">
                      {sess.totalOrders} / {sess.jobs?.[0]?.totalIterations || 0}
                    </td>
                    <td className="py-3 font-medium">{sess.averageLatency || 0} ms</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => {
                          setSimulationMetrics(sess);
                          setActiveSessionId(sess.status === 'RUNNING' ? sess._id : null);
                        }}
                        className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-[10px] font-bold rounded text-on-surface dark:text-zinc-200 cursor-pointer"
                      >
                        Inspect Session
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Row 5: Live Feed Panel */}
      <div className="bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4.5">
          <h3 className="text-sm font-bold text-on-surface dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
            Live Ingestion Feed & Outbox Logs
          </h3>
          
          {/* List Tabs */}
          <div className="flex bg-zinc-50 dark:bg-zinc-950 p-1 rounded-lg border border-border-base/55 dark:border-zinc-855 gap-0.5 max-w-full overflow-x-auto">
            {[
              { id: 'orders', label: 'Recent Orders' },
              { id: 'external', label: 'External Inbound' },
              { id: 'events', label: 'Events Outbox' },
              { id: 'jobs', label: 'Sync Jobs' },
              { id: 'replay', label: `Replay Queue (${replayOrdersList.length})` },
              { id: 'dlq', label: `DLQ Quarantine (${dlqEventsList.length})` }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setLiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition whitespace-nowrap cursor-pointer ${
                  liveTab === tab.id
                    ? 'bg-white dark:bg-zinc-900 text-primary dark:text-primary-fixed-dim shadow-xs font-bold'
                    : 'text-zinc-450 dark:text-zinc-400 hover:text-on-surface'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Renderers */}
        <div className="overflow-x-auto">
          {liveTab === 'orders' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-base dark:border-zinc-800 text-zinc-400 dark:text-zinc-555 font-bold uppercase text-[10px]">
                  <th className="py-2.5">Order Number</th>
                  <th className="py-2.5">Fulfillment / Source</th>
                  <th className="py-2.5">Order Status</th>
                  <th className="py-2.5">Total Amount</th>
                  <th className="py-2.5 text-right">Placed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-base/50 dark:divide-zinc-850">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-zinc-400 dark:text-zinc-555">No orders recorded in sandbox database.</td>
                  </tr>
                ) : (
                  recentOrders.map((ord) => (
                    <tr key={ord._id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-950/10">
                      <td className="py-3 font-semibold text-on-surface dark:text-zinc-200">{ord.externalOrderId}</td>
                      <td className="py-3 font-bold text-primary dark:text-primary-fixed-dim">{ord.provider}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/30 uppercase tracking-wide">
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-3 font-semibold">₹{(ord.rawPayload?.pricing?.total_amount || ord.rawPayload?.billDetails?.totalBill || 0).toFixed(2)}</td>
                      <td className="py-3 text-right text-zinc-455 dark:text-zinc-500 font-medium">
                        {new Date(ord.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {liveTab === 'external' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-base dark:border-zinc-800 text-zinc-400 dark:text-zinc-555 font-bold uppercase text-[10px]">
                  <th className="py-2.5">Inbound Ref ID</th>
                  <th className="py-2.5">Provider</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5">Ingestion Details</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-base/50 dark:divide-zinc-850">
                {externalOrders.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-zinc-400 dark:text-zinc-555">No webhook ingestions recorded.</td>
                  </tr>
                ) : (
                  externalOrders.map((ord) => (
                    <tr key={ord._id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-950/10">
                      <td className="py-3 font-semibold text-on-surface dark:text-zinc-200">{ord.externalOrderId}</td>
                      <td className="py-3 font-bold text-primary dark:text-primary-fixed-dim">{ord.provider}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                          ord.status === 'PLACED' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/30'
                            : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-455 dark:border-rose-900/30'
                        }`}>
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-3 font-medium text-zinc-500 max-w-[280px] truncate" title={ord.failureReason || 'Ingested successfully'}>
                        {ord.failureReason || 'Ingested successfully'}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleReplayOrder(ord._id)}
                          disabled={actionLoading}
                          className="px-2 py-1 bg-zinc-150 dark:bg-zinc-800 text-on-surface dark:text-zinc-350 text-[10px] font-bold rounded border border-border-base dark:border-zinc-700 hover:bg-zinc-200 cursor-pointer disabled:opacity-50"
                        >
                          Replay Inbound
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {liveTab === 'events' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-base dark:border-zinc-800 text-zinc-400 dark:text-zinc-555 font-bold uppercase text-[10px]">
                  <th className="py-2.5">Event Type</th>
                  <th className="py-2.5">Aggregate</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5">Correlation ID</th>
                  <th className="py-2.5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-base/50 dark:divide-zinc-850">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-zinc-400 dark:text-zinc-555">No outbox event logs recorded.</td>
                  </tr>
                ) : (
                  events.map((ev) => (
                    <tr key={ev._id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-950/10">
                      <td className="py-3 font-bold text-on-surface dark:text-zinc-200">{ev.eventType}</td>
                      <td className="py-3 font-medium text-zinc-455 dark:text-zinc-500">{ev.aggregateType}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                          ev.status === 'SUCCESS' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/30'
                            : ev.status === 'PENDING'
                            ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-450 dark:border-blue-900/30'
                            : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-455 dark:border-rose-900/30'
                        }`}>
                          {ev.status}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-zinc-400 tracking-tight">{ev.correlationId}</td>
                      <td className="py-3 text-right text-zinc-455 dark:text-zinc-500 font-medium">
                        {new Date(ev.queuedAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {liveTab === 'jobs' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-base dark:border-zinc-800 text-zinc-400 dark:text-zinc-555 font-bold uppercase text-[10px]">
                  <th className="py-2.5">Job Type</th>
                  <th className="py-2.5">Channel Provider</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5">Sync Details</th>
                  <th className="py-2.5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-base/50 dark:divide-zinc-850">
                {syncJobs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-zinc-400 dark:text-zinc-555">No outbound sync traces found.</td>
                  </tr>
                ) : (
                  syncJobs.map((job) => (
                    <tr key={job._id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-950/10">
                      <td className="py-3 font-bold text-on-surface dark:text-zinc-200">{job.type}</td>
                      <td className="py-3 font-bold text-primary dark:text-primary-fixed-dim">{job.provider}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                          job.status === 'SUCCESS' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/30'
                            : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-455 dark:border-rose-900/30'
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="py-3 font-medium text-zinc-500 max-w-[200px] truncate" title={job.errorMessage || 'Sync completed successfully'}>
                        {job.errorMessage || 'Sync completed successfully'}
                      </td>
                      <td className="py-3 text-right text-zinc-455 dark:text-zinc-500 font-medium">
                        {new Date(job.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {liveTab === 'replay' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-base dark:border-zinc-800 text-zinc-400 dark:text-zinc-555 font-bold uppercase text-[10px]">
                  <th className="py-2.5">Inbound Ref ID</th>
                  <th className="py-2.5">Channel</th>
                  <th className="py-2.5">Failure Reason</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-base/50 dark:divide-zinc-850">
                {replayOrdersList.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-zinc-400 dark:text-zinc-555">No orders in mapping review queue.</td>
                  </tr>
                ) : (
                  replayOrdersList.map((ord) => (
                    <tr key={ord._id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-950/10">
                      <td className="py-3 font-semibold text-on-surface dark:text-zinc-200">{ord.externalOrderId}</td>
                      <td className="py-3 font-bold text-primary dark:text-primary-fixed-dim">{ord.provider}</td>
                      <td className="py-3 font-mono text-rose-500 max-w-[340px] truncate" title={ord.failureReason || ''}>
                        {ord.failureReason}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleReplayOrder(ord._id)}
                          disabled={actionLoading}
                          className="px-2.5 py-1 bg-primary text-white dark:text-zinc-950 text-[10px] font-bold rounded hover:opacity-90 cursor-pointer disabled:opacity-50 flex items-center gap-1 ml-auto"
                        >
                          <HiOutlinePlay className="text-[10px]" />
                          Replay Ingest
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {liveTab === 'dlq' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-base dark:border-zinc-800 text-zinc-400 dark:text-zinc-555 font-bold uppercase text-[10px]">
                  <th className="py-2.5">Event Type</th>
                  <th className="py-2.5">Correlation ID</th>
                  <th className="py-2.5">Failure Reason</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-base/50 dark:divide-zinc-850">
                {dlqEventsList.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-zinc-400 dark:text-zinc-555">No events quarantined in DLQ.</td>
                  </tr>
                ) : (
                  dlqEventsList.map((ev) => (
                    <tr key={ev._id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-950/10">
                      <td className="py-3 font-bold text-on-surface dark:text-zinc-200">{ev.eventType}</td>
                      <td className="py-3 font-mono text-zinc-450 dark:text-zinc-500">{ev.correlationId}</td>
                      <td className="py-3 font-mono text-rose-500 max-w-[340px] truncate" title={ev.failureReason || ''}>
                        {ev.failureReason}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleReplayEvent(ev._id)}
                          disabled={actionLoading}
                          className="px-2.5 py-1 bg-primary text-white dark:text-zinc-950 text-[10px] font-bold rounded hover:opacity-90 cursor-pointer disabled:opacity-50 flex items-center gap-1 ml-auto"
                        >
                          <HiOutlinePlay className="text-[10px]" />
                          Replay Event
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
