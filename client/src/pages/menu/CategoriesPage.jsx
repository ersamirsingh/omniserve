import { useState, useEffect } from 'react';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import PageHeader from '../../components/ui/PageHeader';
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

const menuTabs = [
  { to: '/categories', label: 'Categories' },
  { to: '/menu-items', label: 'Menu Items' },
  { to: '/variants', label: 'Variants' },
  { to: '/addons', label: 'Addons' },
];

export default function CategoriesPage({ isEmbedded = false, selectedOutletId, globalOutletActive }) {
  const [data, setData] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOutletFilter, setSelectedOutletFilter] = useState('all');
  const [showInfo, setShowInfo] = useState(false);
  const [modal, setModal] = useState({ open: false, mode: 'create', item: null });
  const [form, setForm] = useState(emptyForm);
  const { addToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { limit: 1000 };
      if (globalOutletActive && selectedOutletId && selectedOutletId !== 'all') {
        params.outletId = selectedOutletId;
      }
      const [categoryResponse, outletResponse] = await Promise.all([
        listCategoriesApi(params),
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

  useEffect(() => {
    fetchData();
  }, [selectedOutletId, globalOutletActive]);

  const outletName = (outletId) => {
    const id = getRefId(outletId);
    return outlets.find((outlet) => getEntityId(outlet) === id)?.name || 'Unknown';
  };

  const openCreate = () => {
    const initialOutlet = globalOutletActive && selectedOutletId && selectedOutletId !== 'all'
      ? selectedOutletId
      : getEntityId(outlets[0]);
    setForm({ ...emptyForm, outletId: initialOutlet });
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

  const sortedData = [...data].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const filteredData = sortedData.filter((cat) => {
    const activeOutletFilter = globalOutletActive ? (selectedOutletId || 'all') : selectedOutletFilter;
    if (activeOutletFilter !== 'all') {
      return getRefId(cat.outletId) === activeOutletFilter;
    }
    return true;
  });

  const columns = [
    { key: 'name', label: 'Name', render: (r) => <span className="font-bold text-on-surface dark:text-zinc-200">{r.name}</span> },
    { key: 'outletId', label: 'Outlet', render: (r) => outletName(r.outletId) },
    { key: 'displayOrder', label: 'Order', render: (r) => <span className="font-mono">{r.displayOrder ?? '-'}</span> },
    { key: 'isActive', label: 'Status', render: (r) => <Badge variant={r.isActive !== false ? 'success' : 'neutral'}>{r.isActive !== false ? 'Active' : 'Inactive'}</Badge> },
    { key: 'actions', label: 'Actions', render: (r) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(r)}>Delete</Button>
      </div>
    ) },
  ];

  const actions = (
    <Button onClick={openCreate} disabled={!outlets.length} className="flex items-center gap-1 font-bold shadow-sm">
      <HiPlus /> Add Category
    </Button>
  );

  return (
    <div className={isEmbedded ? '' : 'space-y-6'}>
      {!isEmbedded && (
        <PageHeader 
          section="Operations"
          title="Categories"
          description="Manage and organize menu categories for your outlets."
          actions={actions}
          tabs={menuTabs}
        />
      )}

      {/* Outlet Filtering Select and Action button */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          {!globalOutletActive && (
            <div className="flex items-center gap-4 bg-surface-subtle dark:bg-zinc-900/40 p-3 rounded-2xl border border-border-base dark:border-zinc-900 shadow-xs max-w-xs flex-1">
              <div className="w-full">
                <Select 
                  id="cat-outlet-filter" 
                  label="Filter by Outlet" 
                  value={selectedOutletFilter} 
                  onChange={(e) => setSelectedOutletFilter(e.target.value)}
                >
                  <option value="all">All Outlets</option>
                  {outlets.map((outlet) => (
                    <option key={getEntityId(outlet)} value={getEntityId(outlet)}>
                      {outlet.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-border-base dark:border-zinc-800 text-on-surface-variant/70 hover:bg-surface-container-low hover:text-on-surface dark:hover:bg-zinc-900 transition-all cursor-pointer bg-surface dark:bg-zinc-950 shadow-xs shrink-0"
            title="Section Info"
          >
            <span className="material-symbols-outlined text-[18px]">info</span>
          </button>
          {isEmbedded && actions}
        </div>
      </div>

      {showInfo && (
        <div className="bg-surface-subtle dark:bg-zinc-900/60 border border-border-base dark:border-zinc-800 rounded-xl p-4 text-xs font-medium text-on-surface-variant dark:text-zinc-350 transition-all flex items-start gap-2.5 mb-4 animate-fadeIn">
          <span className="material-symbols-outlined text-[20px] text-primary shrink-0">info</span>
          <div>
            <span className="font-bold text-on-surface dark:text-zinc-200 block mb-0.5">Categories Section Info</span>
            <p className="leading-relaxed">
              Use this section to organize your menu by creating categories like Starters, Mains, or Beverages. You can specify which outlet the category belongs to and define its display order.
            </p>
          </div>
        </div>
      )}

      <Table columns={columns} data={filteredData} loading={loading} />

      <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'create' ? 'New Category' : 'Edit Category'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Select id="cat-outlet" label="Outlet" value={form.outletId} onChange={(e) => setForm({ ...form, outletId: e.target.value })} disabled={modal.mode === 'edit'} required>
            <option value="" disabled>Select outlet</option>
            {outlets.map((outlet) => <option key={getEntityId(outlet)} value={getEntityId(outlet)}>{outlet.name}</option>)}
          </Select>
          <Input id="cat-name" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input id="cat-order" label="Display Order" type="number" min="0" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: e.target.value })} required />
          {modal.mode === 'edit' && (
            <label className="flex items-center gap-3 text-sm font-semibold text-on-surface-variant dark:text-zinc-400">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="checkbox checkbox-sm checkbox-primary h-4 w-4 cursor-pointer" />
              Active
            </label>
          )}
          <div className="flex justify-end gap-2 pt-4 border-t border-border-base dark:border-zinc-850">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit">{modal.mode === 'create' ? 'Create' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
