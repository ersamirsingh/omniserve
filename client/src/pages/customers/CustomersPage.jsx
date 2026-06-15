import { useState, useEffect } from 'react';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { HiPlus } from 'react-icons/hi2';
import { listCustomersApi, createCustomerApi, updateCustomerApi } from '../../api/models/customer.api';

export default function CustomersPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'create', item: null });
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const { addToast } = useToast();

  const fetchData = async () => { setLoading(true); try { const r = await listCustomersApi(); setData(Array.isArray(r.data?.data) ? r.data.data : []); } catch { addToast('Failed', 'error'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, []);

  const openCreate = () => { setForm({ name: '', email: '', phone: '' }); setModal({ open: true, mode: 'create', item: null }); };
  const openEdit = (item) => { setForm({ name: item.name || '', email: item.email || '', phone: item.phone || '' }); setModal({ open: true, mode: 'edit', item }); };
  const closeModal = () => setModal({ open: false, mode: 'create', item: null });

  const handleSubmit = async (e) => { e.preventDefault(); try { if (modal.mode === 'create') { await createCustomerApi(form); addToast('Created', 'success'); } else { await updateCustomerApi(modal.item._id, form); addToast('Updated', 'success'); } closeModal(); fetchData(); } catch (err) { addToast(err.response?.data?.message || 'Failed', 'error'); } };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email', render: (r) => r.email || '—' },
    { key: 'phone', label: 'Phone', render: (r) => r.phone || '—' },
    { key: 'totalOrders', label: 'Orders', render: (r) => r.totalOrders ?? '—' },
    { key: 'createdAt', label: 'Since', render: (r) => new Date(r.createdAt).toLocaleDateString() },
    { key: 'actions', label: 'Actions', render: (r) => <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button> },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4"><h1 className="text-xl font-bold text-slate-100">Customers</h1><Button onClick={openCreate}><HiPlus /> Add Customer</Button></div>
      <Table columns={columns} data={data} loading={loading} />
      <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'create' ? 'New Customer' : 'Edit Customer'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input id="cust-name" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input id="cust-email" label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input id="cust-phone" label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <div className="flex justify-end gap-2 pt-4 border-t border-[rgba(99,102,241,0.15)]"><Button variant="secondary" onClick={closeModal}>Cancel</Button><Button type="submit">{modal.mode === 'create' ? 'Create' : 'Save'}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
