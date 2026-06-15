import { useState, useEffect } from 'react';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { HiPlus } from 'react-icons/hi2';
import { listRestaurantsApi, createRestaurantApi, updateRestaurantApi, deleteRestaurantApi } from '../../api/models/restaurant.api';

export default function RestaurantsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'create', item: null });
  const [form, setForm] = useState({ name: '', description: '' });
  const { addToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try { const r = await listRestaurantsApi(); setData(Array.isArray(r.data?.data) ? r.data.data : []); }
    catch { addToast('Failed to load restaurants', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => { setForm({ name: '', description: '' }); setModal({ open: true, mode: 'create', item: null }); };
  const openEdit = (item) => { setForm({ name: item.name || '', description: item.description || '' }); setModal({ open: true, mode: 'edit', item }); };
  const closeModal = () => setModal({ open: false, mode: 'create', item: null });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modal.mode === 'create') { await createRestaurantApi(form); addToast('Restaurant created', 'success'); }
      else { await updateRestaurantApi(modal.item._id, form); addToast('Restaurant updated', 'success'); }
      closeModal(); fetchData();
    } catch (err) { addToast(err.response?.data?.message || 'Operation failed', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this restaurant?')) return;
    try { await deleteRestaurantApi(id); addToast('Deleted', 'success'); fetchData(); }
    catch { addToast('Delete failed', 'error'); }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description', render: (r) => r.description || '—' },
    { key: 'isActive', label: 'Status', render: (r) => <Badge variant={r.isActive !== false ? 'success' : 'neutral'}>{r.isActive !== false ? 'Active' : 'Inactive'}</Badge> },
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
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-xl font-bold text-slate-100">Restaurants</h1>
        <Button onClick={openCreate}><HiPlus /> Add Restaurant</Button>
      </div>
      <Table columns={columns} data={data} loading={loading} />
      <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'create' ? 'New Restaurant' : 'Edit Restaurant'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input id="rest-name" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input id="rest-desc" label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex justify-end gap-2 pt-4 border-t border-[rgba(99,102,241,0.15)]">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit">{modal.mode === 'create' ? 'Create' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
