import { useState, useEffect } from 'react';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import { listAuditLogsApi } from '../../api/models/auditLog.api';
import { HiOutlineDocumentMagnifyingGlass } from 'react-icons/hi2';

export default function AuditLogsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => { 
    listAuditLogsApi()
      .then((r) => {
        setData(Array.isArray(r.data?.data?.logs) ? r.data.data.logs : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false)); 
  }, []);

  const av = { 
    CREATE: 'success', 
    UPDATE: 'info', 
    DELETE: 'danger', 
    LOGIN: 'info', 
    LOGOUT: 'neutral', 
    STATUS_CHANGE: 'warning',
    RESTORE: 'success'
  };

  const columns = [
    { 
      key: 'action', 
      label: 'Action', 
      render: (r) => <Badge variant={av[r.action] || 'neutral'}>{r.action}</Badge> 
    },
    { 
      key: 'entityType', 
      label: 'Entity Type', 
      render: (r) => <span className="font-semibold text-on-surface dark:text-zinc-300">{r.entityType}</span> 
    },
    { 
      key: 'entityId', 
      label: 'Entity ID', 
      render: (r) => <span className="font-mono text-xs text-on-surface-variant dark:text-zinc-500">{r.entityId}</span> 
    },
    { 
      key: 'userId', 
      label: 'Performed By', 
      render: (r) => {
        if (!r.userId) return '—';
        const name = `${r.userId.firstName || ''} ${r.userId.lastName || ''}`.trim();
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-on-surface dark:text-zinc-200">{name || '—'}</span>
            <span className="text-[11px] text-on-surface-variant dark:text-zinc-500">{r.userId.email}</span>
          </div>
        );
      } 
    },
    { 
      key: 'ipAddress', 
      label: 'IP Address', 
      render: (r) => <span className="font-mono text-xs text-on-surface-variant dark:text-zinc-400">{r.ipAddress || '—'}</span> 
    },
    { 
      key: 'createdAt', 
      label: 'Timestamp', 
      render: (r) => <span className="text-xs text-on-surface-variant dark:text-zinc-400">{new Date(r.createdAt).toLocaleString()}</span> 
    },
    { 
      key: 'actions', 
      label: 'Details', 
      render: (r) => (
        <div className="flex justify-end">
          <Button size="sm" variant="secondary" onClick={() => setSelectedLog(r)} title="Inspect Data Changes" className="!p-2">
            <HiOutlineDocumentMagnifyingGlass className="text-base" />
          </Button>
        </div>
      ) 
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        section="Insights"
        title="Audit Logs" 
        description="Verify security activity, check user actions, and inspect entity field changes."
      />

      <Table columns={columns} data={data} loading={loading} emptyMessage="No audit logs recorded" />

      {/* Audit Detail Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`Audit Log Details - ${selectedLog?.action} ${selectedLog?.entityType}`}
        size="md"
      >
        {selectedLog && (
          <div className="space-y-4 text-sm text-on-surface dark:text-zinc-300">
            <div className="grid grid-cols-2 gap-4 bg-surface-subtle dark:bg-zinc-900/50 p-4 rounded-xl">
              <div>
                <span className="text-xs text-on-surface-variant dark:text-zinc-500 font-bold uppercase tracking-wider block mb-1">Session Info</span>
                <p className="text-xs"><strong>IP:</strong> {selectedLog.ipAddress || '—'}</p>
                <p className="text-xs truncate max-w-xs" title={selectedLog.userAgent}><strong>Agent:</strong> {selectedLog.userAgent || '—'}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-on-surface-variant dark:text-zinc-500 font-bold uppercase tracking-wider block mb-1">Time & Target</span>
                <p className="text-xs"><strong>Date:</strong> {new Date(selectedLog.createdAt).toLocaleString()}</p>
                <p className="text-xs"><strong>ID:</strong> {selectedLog.entityId}</p>
              </div>
            </div>

            {/* Side-by-side or stack JSON diff views */}
            <div className="space-y-3">
              <span className="text-xs text-on-surface-variant dark:text-zinc-550 font-bold uppercase tracking-wider block">Field Value Changes</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-red-500 uppercase tracking-wide">Previous Data</span>
                  <pre className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg text-xs font-mono overflow-auto max-h-56 dark:text-red-300">
                    {selectedLog.oldData ? JSON.stringify(selectedLog.oldData, null, 2) : 'No previous values'}
                  </pre>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wide">Updated Data</span>
                  <pre className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg text-xs font-mono overflow-auto max-h-56 dark:text-emerald-300">
                    {selectedLog.newData ? JSON.stringify(selectedLog.newData, null, 2) : 'No updated values'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
