import { useState, useEffect } from 'react';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { HiPlus } from 'react-icons/hi2';
import { listVariantsApi, createVariantApi, updateVariantApi, deleteVariantApi } from '../../api/models/variant.api';

export default function VariantsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'create', item: null });
  const [form, setForm] = useState({ name: '', price: '' });
  const { addToast } = useToast();

  const fetchData = async () => { setLoading(true); try { const r = await listVariantsApi(); setData(Array.isArray(r.data?.data) ? r.data.data : []); } catch { addToast('Failed', 'error'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, []);

  const openCreate = () => { setForm({ name: '', price: '' }); setModal({ open: true, mode: 'create', item: null }); };
  const openEdit = (item) => { setForm({ name: item.name || '', price: item.price || '' }); setModal({ open: true, mode: 'edit', item }); };
  const closeModal = () => setModal({ open: false, mode: 'create', item: null });

  const handleSubmit = async (e) => { e.preventDefault(); try { const p = { ...form, price: Number(form.price) }; if (modal.mode === 'create') { await createVariantApi(p); addToast('Created', 'success'); } else { await updateVariantApi(modal.item._id, p); addToast('Updated', 'success'); } closeModal(); fetchData(); } catch (err) { addToast(err.response?.data?.message || 'Failed', 'error'); } };
  const handleDelete = async (id) => { if (!confirm('Delete?')) return; try { await deleteVariantApi(id); addToast('Deleted', 'success'); fetchData(); } catch { addToast('Failed', 'error'); } };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'price', label: 'Price', render: (r) => `₹${r.price || 0}` },
    { key: 'createdAt', label: 'Created', render: (r) => new Date(r.createdAt).toLocaleDateString() },
    { key: 'actions', label: 'Actions', render: (r) => (<div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button><Button size="sm" variant="danger" onClick={() => handleDelete(r._id)}>Delete</Button></div>) },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4"><h1 className="text-xl font-bold text-slate-100">Variants</h1><Button onClick={openCreate}><HiPlus /> Add Variant</Button></div>
      <Table columns={columns} data={data} loading={loading} />
      <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'create' ? 'New Variant' : 'Edit Variant'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input id="var-name" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input id="var-price" label="Price (₹)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <div className="flex justify-end gap-2 pt-4 border-t border-[rgba(99,102,241,0.15)]"><Button variant="secondary" onClick={closeModal}>Cancel</Button><Button type="submit">{modal.mode === 'create' ? 'Create' : 'Save'}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
