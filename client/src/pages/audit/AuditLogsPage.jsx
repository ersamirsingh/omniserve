import { useState, useEffect } from 'react';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { listAuditLogsApi } from '../../api/models/auditLog.api';

export default function AuditLogsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { listAuditLogsApi().then((r) => setData(Array.isArray(r.data?.data) ? r.data.data : [])).catch(() => {}).finally(() => setLoading(false)); }, []);

  const av = { CREATE: 'success', UPDATE: 'info', DELETE: 'danger', LOGIN: 'info', LOGOUT: 'neutral', STATUS_CHANGE: 'warning' };
  const columns = [
    { key: 'action', label: 'Action', render: (r) => <Badge variant={av[r.action] || 'neutral'}>{r.action}</Badge> },
    { key: 'entity', label: 'Entity', render: (r) => r.entity || r.entityType || '—' },
    { key: 'performedBy', label: 'User', render: (r) => r.performedBy?.email || r.userId || '—' },
    { key: 'description', label: 'Description', render: (r) => r.description || r.details || '—' },
    { key: 'createdAt', label: 'Timestamp', render: (r) => new Date(r.createdAt).toLocaleString() },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6"><h1 className="text-xl font-bold text-slate-100">Audit Logs</h1></div>
      <Table columns={columns} data={data} loading={loading} emptyMessage="No audit logs" />
    </div>
  );
}
