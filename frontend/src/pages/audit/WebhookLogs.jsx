import { useState, useEffect } from 'react';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { listWebhooksApi, retryWebhookApi } from '../../api/models/webhook.api';
import { HiOutlineDocumentText, HiOutlineArrowPath } from 'react-icons/hi2';

export default function WebhookLogs() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterProvider, setFilterProvider] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const { addToast } = useToast();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterProvider) params.provider = filterProvider;
      if (filterStatus) params.status = filterStatus;
      const response = await listWebhooksApi(params);
      setData(Array.isArray(response.data?.data?.logs) ? response.data.data.logs : []);
    } catch {
      addToast('Failed to load webhook intake logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filterProvider, filterStatus]);

  const handleRetry = async (id) => {
    try {
      await retryWebhookApi(id);
      addToast('Webhook retry triggered successfully', 'success');
      fetchLogs();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to trigger retry', 'error');
    }
  };

  const statusVariants = {
    PENDING: 'warning',
    PROCESSING: 'info',
    SUCCESS: 'success',
    FAILED: 'danger',
  };

  const columns = [
    { 
      key: 'provider', 
      label: 'Provider', 
      render: (r) => <Badge variant="info">{r.provider}</Badge> 
    },
    { 
      key: 'eventType', 
      label: 'Event Type', 
      render: (r) => <span className="font-semibold text-on-surface dark:text-zinc-300">{r.eventType}</span> 
    },
    { 
      key: 'status', 
      label: 'Status', 
      render: (r) => <Badge variant={statusVariants[r.status] || 'neutral'}>{r.status}</Badge> 
    },
    { 
      key: 'externalEventId', 
      label: 'External ID', 
      render: (r) => <span className="font-mono text-xs text-on-surface-variant dark:text-zinc-500">{r.externalEventId || '—'}</span> 
    },
    { 
      key: 'retryCount', 
      label: 'Retries', 
      render: (r) => <span className="font-semibold text-on-surface dark:text-zinc-300">{r.retryCount ?? 0}</span> 
    },
    { 
      key: 'httpStatusCode', 
      label: 'HTTP Status', 
      render: (r) => (
        <span className={`font-mono text-xs font-bold ${r.httpStatusCode === 200 ? 'text-success-green' : 'text-red-500'}`}>
          {r.httpStatusCode || '—'}
        </span>
      ) 
    },
    { 
      key: 'createdAt', 
      label: 'Timestamp', 
      render: (r) => <span className="text-xs text-on-surface-variant dark:text-zinc-400">{new Date(r.createdAt).toLocaleString()}</span> 
    },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (r) => (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="secondary" onClick={() => setSelectedLog(r)} title="Inspect Payload" className="!p-2">
            <HiOutlineDocumentText className="text-base" />
          </Button>
          {r.status === 'FAILED' && (
            <Button size="sm" variant="primary" onClick={() => handleRetry(r._id || r.id)} title="Retry Processing" className="!p-2">
              <HiOutlineArrowPath className="text-base" />
            </Button>
          )}
        </div>
      ) 
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        section="Insights"
        title="Webhook Logs" 
        description="Monitor system webhook intake callbacks, examine delivery payloads, and retry failed transaction states."
      />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select 
          className="px-4 py-2.5 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-on-surface dark:text-zinc-200 text-sm outline-none cursor-pointer focus:border-primary transition-all duration-200" 
          value={filterProvider} 
          onChange={(e) => setFilterProvider(e.target.value)}
        >
          <option value="">All Providers</option>
          <option value="RAZORPAY">Razorpay</option>
          <option value="STRIPE">Stripe</option>
          <option value="ZOMATO">Zomato</option>
          <option value="SWIGGY">Swiggy</option>
          <option value="DUNZO">Dunzo</option>
          <option value="PORTER">Porter</option>
          <option value="CUSTOM">Custom</option>
        </select>

        <select 
          className="px-4 py-2.5 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-on-surface dark:text-zinc-200 text-sm outline-none cursor-pointer focus:border-primary transition-all duration-200" 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      <Table columns={columns} data={data} loading={loading} emptyMessage="No webhook intake logs recorded" />

      {/* Webhook Payload Detail Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`Webhook Event Payload - ${selectedLog?.provider} ${selectedLog?.eventType}`}
        size="md"
      >
        {selectedLog && (
          <div className="space-y-4 text-sm text-on-surface dark:text-zinc-300">
            <div className="grid grid-cols-2 gap-4 bg-surface-subtle dark:bg-zinc-900/50 p-4 rounded-xl">
              <div>
                <span className="text-xs text-on-surface-variant dark:text-zinc-500 font-bold uppercase tracking-wider block mb-1">Log Parameters</span>
                <p className="text-xs"><strong>Status:</strong> {selectedLog.status}</p>
                <p className="text-xs"><strong>Retries:</strong> {selectedLog.retryCount ?? 0}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-on-surface-variant dark:text-zinc-500 font-bold uppercase tracking-wider block mb-1">Handoff Info</span>
                <p className="text-xs"><strong>HTTP Code:</strong> {selectedLog.httpStatusCode || '—'}</p>
                <p className="text-xs"><strong>Processed:</strong> {selectedLog.processed ? 'Yes' : 'No'}</p>
              </div>
            </div>

            {selectedLog.errorMessage && (
              <div className="bg-red-500/10 text-red-500 p-3 rounded-lg text-xs font-semibold">
                <span className="font-bold block mb-0.5">Error Message:</span>
                "{selectedLog.errorMessage}"
              </div>
            )}

            <div className="space-y-1.5">
              <span className="text-xs text-on-surface-variant dark:text-zinc-550 font-bold uppercase tracking-wider block">Raw Payload JSON</span>
              <pre className="p-4 bg-[#232640] dark:bg-zinc-950 border border-border-base dark:border-zinc-900 rounded-xl text-xs font-mono text-zinc-200 overflow-auto max-h-80 select-all">
                {JSON.stringify(selectedLog.payload, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
