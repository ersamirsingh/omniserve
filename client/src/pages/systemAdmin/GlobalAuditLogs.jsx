import { useState, useEffect } from 'react';
import { 
  HiOutlineChevronLeft, 
  HiOutlineChevronRight, 
  HiOutlineMagnifyingGlass, 
  HiOutlineEye 
} from 'react-icons/hi2';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import PageHeader from '../../components/ui/PageHeader';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { getAuditLogsApi } from '../../api/models/systemAdmin.api';

export default function GlobalAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(true);

  // Filter parameters
  const [tenantId, setTenantId] = useState('');
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Details modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchLogs = () => {
    setLoading(true);
    const params = {
      page,
      limit,
    };
    if (tenantId) params.tenantId = tenantId;
    if (userId) params.userId = userId;
    if (action) params.action = action;
    if (entityType) params.entityType = entityType;
    if (from) params.from = new Date(from).toISOString();
    if (to) params.to = new Date(to).toISOString();

    getAuditLogsApi(params)
      .then((res) => {
        setLogs(res.data?.data?.logs || []);
        setTotal(res.data?.data?.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleResetFilters = () => {
    setTenantId('');
    setUserId('');
    setAction('');
    setEntityType('');
    setFrom('');
    setTo('');
    setPage(1);
    // Directly fetch logs with cleared params
    setLoading(true);
    getAuditLogsApi({ page: 1, limit })
      .then((res) => {
        setLogs(res.data?.data?.logs || []);
        setTotal(res.data?.data?.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const totalPages = Math.ceil(total / limit);

  const columns = [
    { key: 'createdAt', label: 'Timestamp', render: (r) => new Date(r.createdAt).toLocaleString() },
    { 
      key: 'tenantId', 
      label: 'Tenant ID', 
      render: (r) => {
        if (!r.tenantId) return <span className="font-semibold text-xs text-zinc-400">Platform</span>;
        if (typeof r.tenantId === 'object') {
          return <span className="font-semibold text-xs" title={r.tenantId._id}>{r.tenantId.name || r.tenantId.slug || r.tenantId._id}</span>;
        }
        return <span className="font-mono text-xs text-zinc-500">{r.tenantId}</span>;
      }
    },
    { 
      key: 'userId', 
      label: 'Actor (User)', 
      render: (r) => {
        if (!r.userId) return <span className="text-zinc-400">System</span>;
        if (typeof r.userId === 'object') {
          return <span className="font-semibold text-xs" title={r.userId._id}>{r.userId.firstName || ''} {r.userId.lastName || ''} ({r.userId.email})</span>;
        }
        return <span className="font-mono text-xs">{r.userId}</span>;
      }
    },
    { 
      key: 'action', 
      label: 'Action', 
      render: (r) => {
        let variant = 'neutral';
        if (r.action.startsWith('SYSTEM_ADMIN_')) variant = 'primary';
        if (r.action.startsWith('TENANT_')) variant = 'warning';
        if (r.action === 'TENANT_DELETE') variant = 'error';
        return <Badge variant={variant} className="text-[10px] uppercase font-mono">{r.action}</Badge>;
      } 
    },
    { key: 'entityType', label: 'Entity Type', render: (r) => <span className="font-semibold text-xs">{r.entityType}</span> },
    { key: 'entityId', label: 'Entity ID', render: (r) => <span className="font-mono text-xs text-zinc-500">{r.entityId}</span> },
    { 
      key: 'actions', 
      label: 'Inspect', 
      render: (r) => (
        <button 
          onClick={() => handleViewDetails(r)} 
          className="text-xs text-primary font-bold flex items-center gap-1 hover:underline cursor-pointer"
        >
          <HiOutlineEye /> View Data
        </button>
      ) 
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        section="System Admin"
        title="Global Audit Logs"
        description="Track user authentication, tenant status shifts, subscription manual overrides, and system changes."
      />

      {/* Filters */}
      <Card className="p-4">
        <form onSubmit={handleFilterSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              label="Tenant ID"
              placeholder="Filter by Tenant ID"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
            />
            <Input
              label="Actor User ID"
              placeholder="Filter by Actor User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
            <Select
              label="Audit Action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              options={[
                { value: '', label: 'All Actions' },
                { value: 'SYSTEM_ADMIN_INVITED', label: 'SYSTEM_ADMIN_INVITED' },
                { value: 'SYSTEM_ADMIN_INVITE_ACCEPTED', label: 'SYSTEM_ADMIN_INVITE_ACCEPTED' },
                { value: 'SYSTEM_ADMIN_INVITE_REVOKED', label: 'SYSTEM_ADMIN_INVITE_REVOKED' },
                { value: 'TENANT_SUSPEND', label: 'TENANT_SUSPEND' },
                { value: 'TENANT_ACTIVATE', label: 'TENANT_ACTIVATE' },
                { value: 'TENANT_DELETE', label: 'TENANT_DELETE' },
                { value: 'TENANT_OVERRIDE_SUBSCRIPTION', label: 'TENANT_OVERRIDE_SUBSCRIPTION' },
              ]}
            />
            <Input
              label="Entity Type"
              placeholder="e.g. Tenant, User, Subscription"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <Input
              label="From Date"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <Input
              label="To Date"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" variant="primary" className="flex-1">
                <HiOutlineMagnifyingGlass className="text-lg" /> Search Logs
              </Button>
              <Button type="button" variant="outline" onClick={handleResetFilters}>
                Reset
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Logs Table */}
      <Card className="flex flex-col gap-4">
        <Table columns={columns} data={logs} loading={loading} emptyMessage="No audit logs match these filter conditions." />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border-base dark:border-zinc-900 pt-4 mt-2">
            <span className="text-xs text-on-surface-variant dark:text-zinc-450">
              Showing page {page} of {totalPages} ({total} logs overall)
            </span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page <= 1} 
                onClick={() => setPage(page - 1)}
              >
                <HiOutlineChevronLeft /> Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page >= totalPages} 
                onClick={() => setPage(page + 1)}
              >
                Next <HiOutlineChevronRight />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Inspection Modal */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Audit Log Inspector">
        {selectedLog && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 bg-surface-container-low dark:bg-zinc-900/40 p-3 rounded-lg border border-border-base dark:border-zinc-900">
              <p><strong>Action Type:</strong> <Badge variant="primary">{selectedLog.action}</Badge></p>
              <p><strong>Timestamp:</strong> {new Date(selectedLog.createdAt).toLocaleString()}</p>
              <p><strong>Tenant:</strong> <span className="font-mono">
                {selectedLog.tenantId 
                  ? (typeof selectedLog.tenantId === 'object' 
                      ? `${selectedLog.tenantId.name || ''} (${selectedLog.tenantId._id})` 
                      : selectedLog.tenantId) 
                  : 'Platform-level'}
              </span></p>
              <p><strong>Actor User:</strong> <span className="font-mono">
                {selectedLog.userId 
                  ? (typeof selectedLog.userId === 'object' 
                      ? `${selectedLog.userId.firstName || ''} ${selectedLog.userId.lastName || ''} (${selectedLog.userId.email})` 
                      : selectedLog.userId) 
                  : 'System'}
              </span></p>
              <p><strong>IP Address:</strong> {selectedLog.ipAddress || 'N/A'}</p>
              <p><strong>User Agent:</strong> <span className="truncate block" title={selectedLog.userAgent}>{selectedLog.userAgent || 'N/A'}</span></p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="font-bold text-[11px] uppercase tracking-wider text-on-surface-variant">Old State (Before)</span>
                <pre className="bg-zinc-100 dark:bg-zinc-900 p-3 rounded-lg overflow-x-auto text-[10px] leading-tight font-mono h-48 border border-border-base dark:border-zinc-900">
                  {selectedLog.oldData ? JSON.stringify(selectedLog.oldData, null, 2) : 'null (None)'}
                </pre>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-[11px] uppercase tracking-wider text-on-surface-variant">New State (After)</span>
                <pre className="bg-zinc-100 dark:bg-zinc-900 p-3 rounded-lg overflow-x-auto text-[10px] leading-tight font-mono h-48 border border-border-base dark:border-zinc-900">
                  {selectedLog.newData ? JSON.stringify(selectedLog.newData, null, 2) : 'null (None)'}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowDetailModal(false)}>Close Inspector</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
