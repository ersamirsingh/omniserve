import { useState, useEffect } from 'react';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { HiPlus } from 'react-icons/hi2';
import { listOutletsApi, createOutletApi, updateOutletApi, toggleOutletStatusApi, deleteOutletApi } from '../../api/models/outlet.api';

export default function OutletsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'create', item: null });
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const { addToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try { const r = await listOutletsApi(); setData(Array.isArray(r.data?.data) ? r.data.data : []); }
    catch { addToast('Failed to load outlets', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const openCreate = () => { setForm({ name: '', phone: '', email: '' }); setModal({ open: true, mode: 'create', item: null }); };
  const openEdit = (item) => { setForm({ name: item.name || '', phone: item.phone || '', email: item.email || '' }); setModal({ open: true, mode: 'edit', item }); };
  const closeModal = () => setModal({ open: false, mode: 'create', item: null });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modal.mode === 'create') { await createOutletApi(form); addToast('Outlet created', 'success'); }
      else { await updateOutletApi(modal.item._id, form); addToast('Outlet updated', 'success'); }
      closeModal(); fetchData();
    } catch (err) { addToast(err.response?.data?.message || 'Failed', 'error'); }
  };

  const handleToggle = async (id) => { try { await toggleOutletStatusApi(id); addToast('Status toggled', 'success'); fetchData(); } catch { addToast('Failed', 'error'); } };
  const handleDelete = async (id) => { if (!confirm('Delete this outlet?')) return; try { await deleteOutletApi(id); addToast('Deleted', 'success'); fetchData(); } catch { addToast('Failed', 'error'); } };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone', render: (r) => r.phone || '—' },
    { key: 'isActive', label: 'Status', render: (r) => <Badge variant={r.isActive ? 'success' : 'neutral'} className="cursor-pointer" onClick={() => handleToggle(r._id)}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
    { key: 'createdAt', label: 'Created', render: (r) => new Date(r.createdAt).toLocaleDateString() },
    { key: 'actions', label: 'Actions', render: (r) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(r._id)}>Delete</Button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4"><h1 className="text-xl font-bold text-slate-100">Outlets</h1><Button onClick={openCreate}><HiPlus /> Add Outlet</Button></div>
      <Table columns={columns} data={data} loading={loading} />
      <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'create' ? 'New Outlet' : 'Edit Outlet'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input id="out-name" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input id="out-phone" label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input id="out-email" label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div className="flex justify-end gap-2 pt-4 border-t border-[rgba(99,102,241,0.15)]"><Button variant="secondary" onClick={closeModal}>Cancel</Button><Button type="submit">{modal.mode === 'create' ? 'Create' : 'Save'}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
