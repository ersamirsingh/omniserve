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
import { listMenuItemsApi } from '../../api/models/menuItem.api';
import { listVariantsApi, createVariantApi, updateVariantApi, deleteVariantApi } from '../../api/models/variant.api';
import { getEntityId, getList, getRefId } from '../../utils/apiData';

const emptyForm = {
  menuItemId: '',
  name: '',
  price: '',
  isAvailable: true,
};

const menuTabs = [
  { to: '/categories', label: 'Categories' },
  { to: '/menu-items', label: 'Menu Items' },
  { to: '/variants', label: 'Variants' },
  { to: '/addons', label: 'Addons' },
];

export default function VariantsPage({ isEmbedded = false, selectedOutletId }) {
  const [data, setData] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [modal, setModal] = useState({ open: false, mode: 'create', item: null });
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  const filteredMenuItems = selectedOutletId && selectedOutletId !== 'all'
    ? menuItems.filter((item) => getRefId(item.outletId) === selectedOutletId)
    : menuItems;

  const fetchVariants = async (menuItemId) => {
    if (!menuItemId) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await listVariantsApi({ menuItemId, limit: 1000 });
      setData(getList(response, 'variants'));
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPage = async () => {
    setLoading(true);
    try {
      const menuItemResponse = await listMenuItemsApi({ limit: 1000 });
      const items = getList(menuItemResponse, 'menuItems');
      const initialMenuItemId = selectedMenuItemId || getEntityId(items[0]);

      setMenuItems(items);
      setSelectedMenuItemId(initialMenuItemId);

      if (initialMenuItemId) {
        const variantResponse = await listVariantsApi({ menuItemId: initialMenuItemId, limit: 1000 });
        setData(getList(variantResponse, 'variants'));
      } else {
        setData([]);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPage(); }, []);

  useEffect(() => {
    if (menuItems.length > 0) {
      const filtered = selectedOutletId && selectedOutletId !== 'all'
        ? menuItems.filter((item) => getRefId(item.outletId) === selectedOutletId)
        : menuItems;
      
      const currentInFiltered = filtered.some(item => getEntityId(item) === selectedMenuItemId);
      if (!currentInFiltered) {
        const newId = getEntityId(filtered[0]) || '';
        setSelectedMenuItemId(newId);
        fetchVariants(newId);
      }
    }
  }, [selectedOutletId, menuItems]);

  const menuItemName = (menuItemId) => {
    const id = getRefId(menuItemId);
    return menuItems.find((item) => getEntityId(item) === id)?.name || 'Unknown';
  };

  const handleSelectedMenuItem = (menuItemId) => {
    setSelectedMenuItemId(menuItemId);
    fetchVariants(menuItemId);
  };

  const openCreate = () => {
    const initialMenuItem = selectedMenuItemId || getEntityId(filteredMenuItems[0]);
    setForm({ ...emptyForm, menuItemId: initialMenuItem });
    setModal({ open: true, mode: 'create', item: null });
  };

  const openEdit = (item) => {
    setForm({
      menuItemId: getRefId(item.menuItemId),
      name: item.name || '',
      price: item.price ?? '',
      isAvailable: item.isAvailable !== false,
    });
    setModal({ open: true, mode: 'edit', item });
  };

  const closeModal = () => setModal({ open: false, mode: 'create', item: null });

  const buildPayload = () => ({
    menuItemId: form.menuItemId,
    name: form.name.trim(),
    price: Number(form.price),
    isAvailable: form.isAvailable,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = buildPayload();
      if (modal.mode === 'create') {
        await createVariantApi(payload);
        addToast('Created', 'success');
      } else {
        await updateVariantApi(getEntityId(modal.item), payload);
        addToast('Updated', 'success');
      }
      closeModal();
      setSelectedMenuItemId(payload.menuItemId);
      fetchVariants(payload.menuItemId);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (row) => {
    if (submitting) return;
    if (!confirm('Delete?')) return;
    setSubmitting(true);
    try {
      await deleteVariantApi(getEntityId(row));
      addToast('Deleted', 'success');
      fetchVariants(selectedMenuItemId);
    } catch {
      addToast('Failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Name', render: (r) => <span className="font-bold text-on-surface dark:text-zinc-200">{r.name}</span> },
    { key: 'menuItemId', label: 'Menu Item', render: (r) => menuItemName(r.menuItemId) },
    { 
      key: 'price', 
      label: 'Price', 
      render: (r) => (
        <span className="font-mono font-semibold text-on-surface dark:text-zinc-300">
          ₹{Number(r.price || 0).toFixed(2)}
        </span>
      ) 
    },
    { key: 'isAvailable', label: 'Status', render: (r) => <Badge variant={r.isAvailable !== false ? 'success' : 'neutral'}>{r.isAvailable !== false ? 'Available' : 'Unavailable'}</Badge> },
    { key: 'actions', label: 'Actions', render: (r) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(r)} disabled={submitting}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(r)} disabled={submitting}>Delete</Button>
      </div>
    ) },
  ];

  const actions = (
    <Button onClick={openCreate} disabled={submitting || !filteredMenuItems.length} className="flex items-center gap-1 font-bold shadow-sm">
      <HiPlus /> Add Variant
    </Button>
  );

  return (
    <div className={isEmbedded ? '' : 'space-y-6'}>
      {!isEmbedded && (
        <PageHeader 
          section="Operations"
          title="Variants"
          description="Manage item variations (e.g. sizes, portions)."
          actions={actions}
          tabs={menuTabs}
        />
      )}

      {/* Menu Item Selector Filter and Action button */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div className="flex items-center gap-4 bg-surface-subtle dark:bg-zinc-900/40 p-3 rounded-2xl border border-border-base dark:border-zinc-900 shadow-xs max-w-xs flex-1">
            <div className="w-full">
              <Select 
                id="variant-filter-item" 
                label="Filter by Menu Item" 
                value={selectedMenuItemId} 
                onChange={(e) => handleSelectedMenuItem(e.target.value)} 
                disabled={!filteredMenuItems.length}
              >
                <option value="" disabled>Select menu item</option>
                {filteredMenuItems.map((item) => (
                  <option key={getEntityId(item)} value={getEntityId(item)}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
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
            <span className="font-bold text-on-surface dark:text-zinc-200 block mb-0.5">Variants Section Info</span>
            <p className="leading-relaxed">
              Create variations of a menu item, such as different sizes (Small, Medium, Large) or quantities (Single, Double). Variants let you charge different prices for different choices.
            </p>
          </div>
        </div>
      )}

      <Table columns={columns} data={data} loading={loading} />

      <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'create' ? 'New Variant' : 'Edit Variant'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Select id="var-menu-item" label="Menu Item" value={form.menuItemId} onChange={(e) => setForm({ ...form, menuItemId: e.target.value })} required>
            <option value="" disabled>Select menu item</option>
            {filteredMenuItems.map((item) => <option key={getEntityId(item)} value={getEntityId(item)}>{item.name}</option>)}
          </Select>
          <Input id="var-name" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input id="var-price" label="Price (INR)" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <label className="flex items-center gap-3 text-sm font-semibold text-on-surface-variant dark:text-zinc-400">
            <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} className="checkbox checkbox-sm checkbox-primary h-4 w-4 cursor-pointer" />
            Available
          </label>
          <div className="flex justify-end gap-2 pt-4 border-t border-border-base dark:border-zinc-850">
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting} loading={submitting}>{modal.mode === 'create' ? 'Create' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

