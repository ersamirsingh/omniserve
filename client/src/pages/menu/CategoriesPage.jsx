import { useState, useEffect } from 'react';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { HiPlus } from 'react-icons/hi2';
import { listCategoriesApi, createCategoryApi, updateCategoryApi, deleteCategoryApi } from '../../api/models/category.api';

export default function CategoriesPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'create', item: null });
  const [form, setForm] = useState({ name: '', description: '', displayOrder: 0 });
  const { addToast } = useToast();

  const fetchData = async () => { setLoading(true); try { const r = await listCategoriesApi(); setData(Array.isArray(r.data?.data) ? r.data.data : []); } catch { addToast('Failed to load categories', 'error'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, []);

  const openCreate = () => { setForm({ name: '', description: '', displayOrder: 0 }); setModal({ open: true, mode: 'create', item: null }); };
  const openEdit = (item) => { setForm({ name: item.name || '', description: item.description || '', displayOrder: item.displayOrder || 0 }); setModal({ open: true, mode: 'edit', item }); };
  const closeModal = () => setModal({ open: false, mode: 'create', item: null });

  const handleSubmit = async (e) => { e.preventDefault(); try { if (modal.mode === 'create') { await createCategoryApi(form); addToast('Created', 'success'); } else { await updateCategoryApi(modal.item._id, form); addToast('Updated', 'success'); } closeModal(); fetchData(); } catch (err) { addToast(err.response?.data?.message || 'Failed', 'error'); } };
  const handleDelete = async (id) => { if (!confirm('Delete?')) return; try { await deleteCategoryApi(id); addToast('Deleted', 'success'); fetchData(); } catch { addToast('Failed', 'error'); } };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description', render: (r) => r.description || '—' },
    { key: 'displayOrder', label: 'Order', render: (r) => r.displayOrder ?? '—' },
    { key: 'actions', label: 'Actions', render: (r) => (<div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button><Button size="sm" variant="danger" onClick={() => handleDelete(r._id)}>Delete</Button></div>) },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4"><h1 className="text-xl font-bold text-slate-100">Categories</h1><Button onClick={openCreate}><HiPlus /> Add Category</Button></div>
      <Table columns={columns} data={data} loading={loading} />
      <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'create' ? 'New Category' : 'Edit Category'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input id="cat-name" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input id="cat-desc" label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input id="cat-order" label="Display Order" type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} />
          <div className="flex justify-end gap-2 pt-4 border-t border-[rgba(99,102,241,0.15)]"><Button variant="secondary" onClick={closeModal}>Cancel</Button><Button type="submit">{modal.mode === 'create' ? 'Create' : 'Save'}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
