import { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';
import DineInPageShell from './DineInPageShell';
import { useDineInScope } from './useDineInScope';
import {
  closeDineInSessionApi,
  extractApiData,
  getDineInSessionApi,
  joinDineInSessionApi,
  listDineInSessionsApi,
  listDineInTablesApi,
  openDineInSessionApi,
} from '../../api/models/dinein.api';
import { formatDateTime, statusBadge } from './dinein.utils';

const INITIAL_SESSION_FORM = { tableId: '', guestCount: 2, waiterId: '', hostUserId: '', notes: '' };
const INITIAL_JOIN_FORM = { guestName: '', seatNumber: '' };

export default function DineInSessionsPage() {
  const scopeState = useDineInScope();
  const { scope, isReady } = scopeState;
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [tables, setTables] = useState([]);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [joinModal, setJoinModal] = useState(false);
  const [sessionForm, setSessionForm] = useState(INITIAL_SESSION_FORM);
  const [joinForm, setJoinForm] = useState(INITIAL_JOIN_FORM);

  const loadSessions = useCallback(async () => {
    if (!isReady) return;
    setLoading(true);
    try {
      const [sessionsRes, tablesRes] = await Promise.all([
        listDineInSessionsApi(scope),
        listDineInTablesApi(scope),
      ]);
      setSessions(extractApiData(sessionsRes) || []);
      setTables(extractApiData(tablesRes) || []);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to load sessions', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, isReady, scope]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const activeTables = useMemo(
    () => tables.filter((table) => !table.activeSessionId),
    [tables]
  );

  const loadSessionDetails = async (sessionId) => {
    try {
      const response = await getDineInSessionApi(scope, sessionId);
      setSessionDetails(extractApiData(response));
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to load session details', 'error');
    }
  };

  const handleOpenSession = async (event) => {
    event.preventDefault();
    try {
      await openDineInSessionApi(scope, {
        ...sessionForm,
        guestCount: Number(sessionForm.guestCount),
        waiterId: sessionForm.waiterId || undefined,
        hostUserId: sessionForm.hostUserId || undefined,
      });
      addToast('Session opened', 'success');
      setSessionForm(INITIAL_SESSION_FORM);
      setOpenModal(false);
      await loadSessions();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to open session', 'error');
    }
  };

  const handleJoinSession = async (event) => {
    event.preventDefault();
    if (!sessionDetails?.session?._id && !sessionDetails?.session?.id) return;

    try {
      await joinDineInSessionApi(scope, sessionDetails.session._id || sessionDetails.session.id, joinForm);
      addToast('Guest added to session', 'success');
      setJoinForm(INITIAL_JOIN_FORM);
      setJoinModal(false);
      await loadSessionDetails(sessionDetails.session._id || sessionDetails.session.id);
      await loadSessions();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to add guest', 'error');
    }
  };

  const handleCloseSession = async (sessionId) => {
    try {
      await closeDineInSessionApi(scope, sessionId, {});
      addToast('Session closed', 'success');
      setSessionDetails(null);
      await loadSessions();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to close session', 'error');
    }
  };

  return (
    <DineInPageShell
      title="Sessions"
      description="Open table sessions, attach guests and seats, and close out dining activity."
      scopeState={scopeState}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => void loadSessions()} loading={loading}>Refresh</Button>
          <Button onClick={() => setOpenModal(true)}>Open Session</Button>
        </div>
      }
    >
      <section className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card className="rounded-lg p-0 overflow-hidden">
          <Table
            loading={loading}
            data={sessions}
            emptyMessage="No active sessions"
            columns={[
              { key: 'sessionCode', label: 'Session', render: (session) => <button type="button" onClick={() => void loadSessionDetails(session._id || session.id)} className="font-semibold text-primary">{session.sessionCode}</button> },
              { key: 'tableId', label: 'Table', render: (session) => session.tableId?.slice?.(-6) || session.tableId || '—' },
              { key: 'guestCount', label: 'Guests', render: (session) => session.guestCount },
              { key: 'status', label: 'Status', render: (session) => statusBadge(session.status) },
              { key: 'openedAt', label: 'Opened', render: (session) => formatDateTime(session.openedAt) },
              { key: 'actions', label: 'Actions', render: (session) => <Button size="sm" variant="secondary" onClick={() => void handleCloseSession(session._id || session.id)}>Close</Button> },
            ]}
          />
        </Card>

        <Card className="rounded-lg p-5">
          {sessionDetails?.session ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-on-surface dark:text-zinc-100">{sessionDetails.session.sessionCode}</h3>
                  <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1">
                    Opened {formatDateTime(sessionDetails.session.openedAt)}
                  </p>
                </div>
                {statusBadge(sessionDetails.session.status)}
              </div>

              <div className="rounded-lg border border-border-base dark:border-zinc-800 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant dark:text-zinc-500">Join Link</div>
                <div className="mt-2 text-xs font-mono break-all text-on-surface dark:text-zinc-200">
                  {sessionDetails.session.qrToken}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-on-surface dark:text-zinc-100">Seats</h4>
                  <Button size="sm" variant="secondary" onClick={() => setJoinModal(true)}>Add Guest</Button>
                </div>
                <div className="mt-3 space-y-2">
                  {(sessionDetails.seats || []).length === 0 ? (
                    <div className="text-sm text-on-surface-variant dark:text-zinc-400">No guests have joined this session yet.</div>
                  ) : (
                    sessionDetails.seats.map((seat) => (
                      <div key={seat._id || seat.id} className="rounded-lg border border-border-base dark:border-zinc-800 px-3 py-2 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-on-surface dark:text-zinc-100">{seat.seatNumber}</div>
                          <div className="text-xs text-on-surface-variant dark:text-zinc-400">{seat.guestName || 'Anonymous guest'}</div>
                        </div>
                        {statusBadge(seat.status)}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-on-surface-variant dark:text-zinc-400">Select a session to inspect guest seats and QR join details.</div>
          )}
        </Card>
      </section>

      <Modal isOpen={openModal} onClose={() => setOpenModal(false)} title="Open Session">
        <form className="space-y-4" onSubmit={handleOpenSession}>
          <Select label="Table" value={sessionForm.tableId} onChange={(event) => setSessionForm((current) => ({ ...current, tableId: event.target.value }))} required>
            <option value="">Select table</option>
            {activeTables.map((table) => (
              <option key={table._id || table.id} value={table._id || table.id}>{table.displayName || table.tableNumber}</option>
            ))}
          </Select>
          <Input label="Guest Count" type="number" value={sessionForm.guestCount} onChange={(event) => setSessionForm((current) => ({ ...current, guestCount: event.target.value }))} required />
          <Input label="Waiter ID" value={sessionForm.waiterId} onChange={(event) => setSessionForm((current) => ({ ...current, waiterId: event.target.value }))} />
          <Input label="Host User ID" value={sessionForm.hostUserId} onChange={(event) => setSessionForm((current) => ({ ...current, hostUserId: event.target.value }))} />
          <Input label="Notes" value={sessionForm.notes} onChange={(event) => setSessionForm((current) => ({ ...current, notes: event.target.value }))} />
          <Button type="submit">Open Session</Button>
        </form>
      </Modal>

      <Modal isOpen={joinModal} onClose={() => setJoinModal(false)} title="Add Guest to Session">
        <form className="space-y-4" onSubmit={handleJoinSession}>
          <Input label="Guest Name" value={joinForm.guestName} onChange={(event) => setJoinForm((current) => ({ ...current, guestName: event.target.value }))} required />
          <Input label="Seat Number" value={joinForm.seatNumber} onChange={(event) => setJoinForm((current) => ({ ...current, seatNumber: event.target.value }))} />
          <Button type="submit">Add Guest</Button>
        </form>
      </Modal>
    </DineInPageShell>
  );
}
