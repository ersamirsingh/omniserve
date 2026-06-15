import { useState, useEffect } from 'react';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { HiPlus } from 'react-icons/hi2';
import { listInventoryApi, createInventoryApi, updateInventoryApi, deleteInventoryApi } from '../../api/models/inventory.api';

export default function InventoryPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'create', item: null });
  const [form, setForm] = useState({ name: '', quantity: '', unit: '', lowStockThreshold: '' });
  const { addToast } = useToast();

  const fetchData = async () => { setLoading(true); try { const r = await listInventoryApi(); setData(Array.isArray(r.data?.data) ? r.data.data : []); } catch { addToast('Failed', 'error'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, []);

  const openCreate = () => { setForm({ name: '', quantity: '', unit: '', lowStockThreshold: '' }); setModal({ open: true, mode: 'create', item: null }); };
  const openEdit = (item) => { setForm({ name: item.name || item.itemName || '', quantity: item.quantity || '', unit: item.unit || '', lowStockThreshold: item.lowStockThreshold || '' }); setModal({ open: true, mode: 'edit', item }); };
  const closeModal = () => setModal({ open: false, mode: 'create', item: null });

  const handleSubmit = async (e) => { e.preventDefault(); try { const p = { ...form, quantity: Number(form.quantity), lowStockThreshold: Number(form.lowStockThreshold) || 10 }; if (modal.mode === 'create') { await createInventoryApi(p); addToast('Created', 'success'); } else { await updateInventoryApi(modal.item._id, p); addToast('Updated', 'success'); } closeModal(); fetchData(); } catch (err) { addToast(err.response?.data?.message || 'Failed', 'error'); } };
  const handleDelete = async (id) => { if (!confirm('Delete?')) return; try { await deleteInventoryApi(id); addToast('Deleted', 'success'); fetchData(); } catch { addToast('Failed', 'error'); } };

  const columns = [
    { key: 'name', label: 'Item', render: (r) => r.name || r.itemName || '—' },
    { key: 'quantity', label: 'Qty', render: (r) => <Badge variant={r.quantity <= (r.lowStockThreshold || 10) ? 'danger' : 'success'}>{r.quantity} {r.unit || ''}</Badge> },
    { key: 'lowStockThreshold', label: 'Low Threshold', render: (r) => r.lowStockThreshold || 10 },
    { key: 'updatedAt', label: 'Updated', render: (r) => new Date(r.updatedAt || r.createdAt).toLocaleDateString() },
    { key: 'actions', label: 'Actions', render: (r) => (<div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button><Button size="sm" variant="danger" onClick={() => handleDelete(r._id)}>Delete</Button></div>) },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4"><h1 className="text-xl font-bold text-slate-100">Inventory</h1><Button onClick={openCreate}><HiPlus /> Add Item</Button></div>
      <Table columns={columns} data={data} loading={loading} />
      <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'create' ? 'New Inventory Item' : 'Edit Item'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input id="inv-name" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Input id="inv-qty" label="Quantity" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
            <Input id="inv-unit" label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="kg, pcs, L" />
          </div>
          <Input id="inv-thresh" label="Low Stock Threshold" type="number" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} />
          <div className="flex justify-end gap-2 pt-4 border-t border-[rgba(99,102,241,0.15)]"><Button variant="secondary" onClick={closeModal}>Cancel</Button><Button type="submit">{modal.mode === 'create' ? 'Create' : 'Save'}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
