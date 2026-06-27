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
  cancelDineInReservationApi,
  confirmDineInReservationApi,
  createDineInReservationApi,
  extractApiData,
  listDineInReservationsApi,
  listDineInTablesApi,
} from '../../api/models/dinein.api';
import { formatDateTime, statusBadge } from './dinein.utils';

const INITIAL_FORM = {
  tableId: '',
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  partySize: 2,
  reservedFor: '',
  notes: '',
  specialRequests: '',
};

export default function DineInReservationsPage() {
  const scopeState = useDineInScope();
  const { scope, isReady } = scopeState;
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [tables, setTables] = useState([]);
  const [createModal, setCreateModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, reservationId: '', tableId: '' });
  const [cancelModal, setCancelModal] = useState({ open: false, reservationId: '', reason: '' });
  const [form, setForm] = useState(INITIAL_FORM);

  const loadReservations = useCallback(async () => {
    if (!isReady) return;
    setLoading(true);
    try {
      const [reservationsRes, tablesRes] = await Promise.all([
        listDineInReservationsApi(scope),
        listDineInTablesApi(scope),
      ]);
      setReservations(extractApiData(reservationsRes) || []);
      setTables(extractApiData(tablesRes) || []);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to load reservations', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, isReady, scope]);

  useEffect(() => {
    void loadReservations();
  }, [loadReservations]);

  const handleCreate = async (event) => {
    event.preventDefault();
    try {
      await createDineInReservationApi(scope, {
        ...form,
        tableId: form.tableId || undefined,
        partySize: Number(form.partySize),
        reservedFor: form.reservedFor,
      });
      addToast('Reservation created', 'success');
      setForm(INITIAL_FORM);
      setCreateModal(false);
      await loadReservations();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to create reservation', 'error');
    }
  };

  const handleConfirm = async (event) => {
    event.preventDefault();
    try {
      await confirmDineInReservationApi(scope, confirmModal.reservationId, {
        tableId: confirmModal.tableId || undefined,
      });
      addToast('Reservation confirmed', 'success');
      setConfirmModal({ open: false, reservationId: '', tableId: '' });
      await loadReservations();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to confirm reservation', 'error');
    }
  };

  const handleCancel = async (event) => {
    event.preventDefault();
    try {
      await cancelDineInReservationApi(scope, cancelModal.reservationId, { reason: cancelModal.reason });
      addToast('Reservation cancelled', 'success');
      setCancelModal({ open: false, reservationId: '', reason: '' });
      await loadReservations();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to cancel reservation', 'error');
    }
  };

  return (
    <DineInPageShell
      title="Reservations"
      description="Manage guest arrivals, party sizing, and table confirmation before seating."
      scopeState={scopeState}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => void loadReservations()} loading={loading}>Refresh</Button>
          <Button onClick={() => setCreateModal(true)}>New Reservation</Button>
        </div>
      }
    >
      <Table
        loading={loading}
        data={reservations}
        emptyMessage="No reservations found"
        columns={[
          { key: 'reservationCode', label: 'Code', render: (reservation) => <span className="font-semibold">{reservation.reservationCode}</span> },
          { key: 'customerName', label: 'Guest', render: (reservation) => <div><div className="font-semibold">{reservation.customerName}</div><div className="text-xs text-on-surface-variant dark:text-zinc-400">{reservation.customerPhone}</div></div> },
          { key: 'partySize', label: 'Party', render: (reservation) => reservation.partySize },
          { key: 'reservedFor', label: 'Reserved For', render: (reservation) => formatDateTime(reservation.reservedFor) },
          { key: 'status', label: 'Status', render: (reservation) => statusBadge(reservation.status) },
          {
            key: 'actions',
            label: 'Actions',
            render: (reservation) => (
              <div className="flex gap-2 justify-end">
                {!['CONFIRMED', 'SEATED', 'CANCELLED', 'COMPLETED'].includes(reservation.status) && (
                  <Button size="sm" variant="secondary" onClick={() => setConfirmModal({ open: true, reservationId: reservation._id || reservation.id, tableId: reservation.tableId || '' })}>
                    Confirm
                  </Button>
                )}
                {!['CANCELLED', 'COMPLETED'].includes(reservation.status) && (
                  <Button size="sm" variant="danger" onClick={() => setCancelModal({ open: true, reservationId: reservation._id || reservation.id, reason: '' })}>
                    Cancel
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />

      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Create Reservation" size="lg">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
          <Input label="Guest Name" value={form.customerName} onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))} required />
          <Input label="Phone" value={form.customerPhone} onChange={(event) => setForm((current) => ({ ...current, customerPhone: event.target.value }))} required />
          <Input label="Email" value={form.customerEmail} onChange={(event) => setForm((current) => ({ ...current, customerEmail: event.target.value }))} />
          <Input label="Party Size" type="number" value={form.partySize} onChange={(event) => setForm((current) => ({ ...current, partySize: event.target.value }))} required />
          <Input label="Reserved For" type="datetime-local" value={form.reservedFor} onChange={(event) => setForm((current) => ({ ...current, reservedFor: event.target.value }))} required />
          <Select label="Preferred Table" value={form.tableId} onChange={(event) => setForm((current) => ({ ...current, tableId: event.target.value }))}>
            <option value="">Auto assign later</option>
            {tables.map((table) => (
              <option key={table._id || table.id} value={table._id || table.id}>{table.displayName || table.tableNumber}</option>
            ))}
          </Select>
          <Input label="Notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
          <Input label="Special Requests" value={form.specialRequests} onChange={(event) => setForm((current) => ({ ...current, specialRequests: event.target.value }))} />
          <div className="md:col-span-2">
            <Button type="submit">Create Reservation</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={confirmModal.open} onClose={() => setConfirmModal({ open: false, reservationId: '', tableId: '' })} title="Confirm Reservation">
        <form className="space-y-4" onSubmit={handleConfirm}>
          <Select label="Table Assignment" value={confirmModal.tableId} onChange={(event) => setConfirmModal((current) => ({ ...current, tableId: event.target.value }))}>
            <option value="">Keep unassigned</option>
            {tables.map((table) => (
              <option key={table._id || table.id} value={table._id || table.id}>{table.displayName || table.tableNumber}</option>
            ))}
          </Select>
          <Button type="submit">Confirm Reservation</Button>
        </form>
      </Modal>

      <Modal isOpen={cancelModal.open} onClose={() => setCancelModal({ open: false, reservationId: '', reason: '' })} title="Cancel Reservation">
        <form className="space-y-4" onSubmit={handleCancel}>
          <Input label="Reason" value={cancelModal.reason} onChange={(event) => setCancelModal((current) => ({ ...current, reason: event.target.value }))} required />
          <Button type="submit" variant="danger">Cancel Reservation</Button>
        </form>
      </Modal>
    </DineInPageShell>
  );
}
