import { useState, useEffect } from 'react';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { HiPlus } from 'react-icons/hi2';
import { listOutletsApi } from '../../api/models/outlet.api';
import { listCategoriesApi, createCategoryApi, updateCategoryApi, deleteCategoryApi } from '../../api/models/category.api';
import { getEntityId, getList, getRefId } from '../../utils/apiData';

const emptyForm = {
  outletId: '',
  name: '',
  displayOrder: 0,
  isActive: true,
};

export default function CategoriesPage() {
  const [data, setData] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'create', item: null });
  const [form, setForm] = useState(emptyForm);
  const { addToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [categoryResponse, outletResponse] = await Promise.all([
        listCategoriesApi(),
        listOutletsApi(),
      ]);
      setData(getList(categoryResponse, 'categories'));
      setOutlets(getList(outletResponse, 'outlets'));
    } catch {
      addToast('Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const outletName = (outletId) => {
    const id = getRefId(outletId);
    return outlets.find((outlet) => getEntityId(outlet) === id)?.name || 'Unknown';
  };

  const openCreate = () => {
    setForm({ ...emptyForm, outletId: getEntityId(outlets[0]) });
    setModal({ open: true, mode: 'create', item: null });
  };

  const openEdit = (item) => {
    setForm({
      outletId: getRefId(item.outletId),
      name: item.name || '',
      displayOrder: item.displayOrder ?? 0,
      isActive: item.isActive !== false,
    });
    setModal({ open: true, mode: 'edit', item });
  };

  const closeModal = () => setModal({ open: false, mode: 'create', item: null });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modal.mode === 'create') {
        await createCategoryApi({
          outletId: form.outletId,
          name: form.name.trim(),
          displayOrder: Number(form.displayOrder),
        });
        addToast('Created', 'success');
      } else {
        await updateCategoryApi(getEntityId(modal.item), {
          name: form.name.trim(),
          displayOrder: Number(form.displayOrder),
          isActive: form.isActive,
        });
        addToast('Updated', 'success');
      }
      closeModal();
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed', 'error');
    }
  };

  const handleDelete = async (row) => {
    if (!confirm('Delete?')) return;
    try {
      await deleteCategoryApi(getEntityId(row));
      addToast('Deleted', 'success');
      fetchData();
    } catch {
      addToast('Failed', 'error');
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'outletId', label: 'Outlet', render: (r) => outletName(r.outletId) },
    { key: 'displayOrder', label: 'Order', render: (r) => r.displayOrder ?? '-' },
    { key: 'isActive', label: 'Status', render: (r) => <Badge variant={r.isActive !== false ? 'success' : 'neutral'}>{r.isActive !== false ? 'Active' : 'Inactive'}</Badge> },
    { key: 'actions', label: 'Actions', render: (r) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(r)}>Delete</Button>
      </div>
    ) },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-xl font-bold text-slate-100">Categories</h1>
        <Button onClick={openCreate} disabled={!outlets.length}><HiPlus /> Add Category</Button>
      </div>
      <Table columns={columns} data={data} loading={loading} />
      <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'create' ? 'New Category' : 'Edit Category'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Select id="cat-outlet" label="Outlet" value={form.outletId} onChange={(e) => setForm({ ...form, outletId: e.target.value })} disabled={modal.mode === 'edit'} required>
            <option value="" disabled>Select outlet</option>
            {outlets.map((outlet) => <option key={getEntityId(outlet)} value={getEntityId(outlet)}>{outlet.name}</option>)}
          </Select>
          <Input id="cat-name" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input id="cat-order" label="Display Order" type="number" min="0" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: e.target.value })} required />
          {modal.mode === 'edit' && (
            <label className="flex items-center gap-3 text-sm font-medium text-slate-300">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 accent-indigo-500" />
              Active
            </label>
          )}
          <div className="flex justify-end gap-2 pt-4 border-t border-[rgba(99,102,241,0.15)]">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit">{modal.mode === 'create' ? 'Create' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
