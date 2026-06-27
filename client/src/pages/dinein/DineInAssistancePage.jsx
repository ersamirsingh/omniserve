import { useCallback, useEffect, useState } from 'react';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';
import DineInPageShell from './DineInPageShell';
import { useDineInScope } from './useDineInScope';
import {
  createDineInAssistanceApi,
  extractApiData,
  listDineInAssistanceApi,
  listDineInSessionsApi,
  resolveDineInAssistanceApi,
} from '../../api/models/dinein.api';
import { ASSISTANCE_TYPES } from './dinein.constants';
import { formatDateTime, statusBadge } from './dinein.utils';

const INITIAL_FORM = { sessionId: '', tableId: '', guestId: '', seatId: '', type: 'CALL_WAITER', customMessage: '' };

export default function DineInAssistancePage() {
  const scopeState = useDineInScope();
  const { scope, isReady } = scopeState;
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [createModal, setCreateModal] = useState(false);
  const [resolveModal, setResolveModal] = useState({ open: false, requestId: '', assignedWaiterId: '' });
  const [form, setForm] = useState(INITIAL_FORM);

  const loadAssistance = useCallback(async () => {
    if (!isReady) return;
    setLoading(true);
    try {
      const [requestsRes, sessionsRes] = await Promise.all([
        listDineInAssistanceApi(scope),
        listDineInSessionsApi(scope),
      ]);
      setRequests(extractApiData(requestsRes) || []);
      setSessions(extractApiData(sessionsRes) || []);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to load assistance queue', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, isReady, scope]);

  useEffect(() => {
    void loadAssistance();
  }, [loadAssistance]);

  const handleSessionChange = (sessionId) => {
    const session = sessions.find((item) => String(item._id || item.id) === String(sessionId));
    setForm((current) => ({
      ...current,
      sessionId,
      tableId: String(session?.tableId || ''),
    }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    try {
      await createDineInAssistanceApi(scope, {
        ...form,
        guestId: form.guestId || undefined,
        seatId: form.seatId || undefined,
        customMessage: form.customMessage || undefined,
      });
      addToast('Assistance request created', 'success');
      setForm(INITIAL_FORM);
      setCreateModal(false);
      await loadAssistance();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to create assistance request', 'error');
    }
  };

  const handleResolve = async (event) => {
    event.preventDefault();
    try {
      await resolveDineInAssistanceApi(scope, resolveModal.requestId, {
        assignedWaiterId: resolveModal.assignedWaiterId || undefined,
      });
      addToast('Assistance request resolved', 'success');
      setResolveModal({ open: false, requestId: '', assignedWaiterId: '' });
      await loadAssistance();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to resolve request', 'error');
    }
  };

  return (
    <DineInPageShell
      title="Assistance"
      description="Track live guest service requests and clear the waiter help queue."
      scopeState={scopeState}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => void loadAssistance()} loading={loading}>Refresh</Button>
          <Button onClick={() => setCreateModal(true)}>New Request</Button>
        </div>
      }
    >
      <Table
        loading={loading}
        data={requests}
        emptyMessage="No assistance requests"
        columns={[
          { key: 'type', label: 'Request', render: (request) => <div><div className="font-semibold">{request.type?.replaceAll('_', ' ')}</div><div className="text-xs text-on-surface-variant dark:text-zinc-400">{request.customMessage || 'Standard request'}</div></div> },
          { key: 'sessionId', label: 'Session', render: (request) => sessions.find((session) => String(session._id || session.id) === String(request.sessionId))?.sessionCode || request.sessionId },
          { key: 'tableId', label: 'Table', render: (request) => request.tableId },
          { key: 'status', label: 'Status', render: (request) => statusBadge(request.status) },
          { key: 'createdAt', label: 'Raised', render: (request) => formatDateTime(request.createdAt) },
          {
            key: 'actions',
            label: 'Actions',
            render: (request) =>
              request.status === 'RESOLVED' ? (
                <span className="text-xs text-on-surface-variant dark:text-zinc-500">Resolved</span>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => setResolveModal({ open: true, requestId: request._id || request.id, assignedWaiterId: String(request.assignedWaiterId || '') })}>
                  Resolve
                </Button>
              ),
          },
        ]}
      />

      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Create Assistance Request">
        <form className="space-y-4" onSubmit={handleCreate}>
          <Select label="Session" value={form.sessionId} onChange={(event) => handleSessionChange(event.target.value)} required>
            <option value="">Select session</option>
            {sessions.map((session) => (
              <option key={session._id || session.id} value={session._id || session.id}>{session.sessionCode}</option>
            ))}
          </Select>
          <Select label="Request Type" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
            {ASSISTANCE_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}
          </Select>
          <Input label="Guest ID" value={form.guestId} onChange={(event) => setForm((current) => ({ ...current, guestId: event.target.value }))} />
          <Input label="Seat ID" value={form.seatId} onChange={(event) => setForm((current) => ({ ...current, seatId: event.target.value }))} />
          <Input label="Message" value={form.customMessage} onChange={(event) => setForm((current) => ({ ...current, customMessage: event.target.value }))} />
          <Button type="submit">Create Request</Button>
        </form>
      </Modal>

      <Modal isOpen={resolveModal.open} onClose={() => setResolveModal({ open: false, requestId: '', assignedWaiterId: '' })} title="Resolve Assistance Request">
        <form className="space-y-4" onSubmit={handleResolve}>
          <Input label="Assigned Waiter ID" value={resolveModal.assignedWaiterId} onChange={(event) => setResolveModal((current) => ({ ...current, assignedWaiterId: event.target.value }))} />
          <Button type="submit">Resolve Request</Button>
        </form>
      </Modal>
    </DineInPageShell>
  );
}
