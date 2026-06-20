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
import { listAddonsApi, createAddonApi, updateAddonApi, deleteAddonApi } from '../../api/models/addon.api';
import { getEntityId, getList, getRefId } from '../../utils/apiData';

const emptyForm = {
  menuItemId: '',
  name: '',
  price: '',
  isAvailable: true,
};

const menuTabs = [
  { to: '/menu-items', label: 'Menu Items' },
  { to: '/categories', label: 'Categories' },
  { to: '/variants', label: 'Variants' },
  { to: '/addons', label: 'Addons' },
];

export default function AddonsPage() {
  const [data, setData] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'create', item: null });
  const [form, setForm] = useState(emptyForm);
  const { addToast } = useToast();

  const fetchAddons = async (menuItemId) => {
    if (!menuItemId) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await listAddonsApi({ menuItemId });
      setData(getList(response, 'addons'));
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPage = async () => {
    setLoading(true);
    try {
      const menuItemResponse = await listMenuItemsApi();
      const items = getList(menuItemResponse, 'menuItems');
      const initialMenuItemId = selectedMenuItemId || getEntityId(items[0]);

      setMenuItems(items);
      setSelectedMenuItemId(initialMenuItemId);

      if (initialMenuItemId) {
        const addonResponse = await listAddonsApi({ menuItemId: initialMenuItemId });
        setData(getList(addonResponse, 'addons'));
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

  const menuItemName = (menuItemId) => {
    const id = getRefId(menuItemId);
    return menuItems.find((item) => getEntityId(item) === id)?.name || 'Unknown';
  };

  const handleSelectedMenuItem = (menuItemId) => {
    setSelectedMenuItemId(menuItemId);
    fetchAddons(menuItemId);
  };

  const openCreate = () => {
    setForm({ ...emptyForm, menuItemId: selectedMenuItemId || getEntityId(menuItems[0]) });
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
    try {
      const payload = buildPayload();
      if (modal.mode === 'create') {
        await createAddonApi(payload);
        addToast('Created', 'success');
      } else {
        await updateAddonApi(getEntityId(modal.item), payload);
        addToast('Updated', 'success');
      }
      closeModal();
      setSelectedMenuItemId(payload.menuItemId);
      fetchAddons(payload.menuItemId);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed', 'error');
    }
  };

  const handleDelete = async (row) => {
    if (!confirm('Delete?')) return;
    try {
      await deleteAddonApi(getEntityId(row));
      addToast('Deleted', 'success');
      fetchAddons(selectedMenuItemId);
    } catch {
      addToast('Failed', 'error');
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
        <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(r)}>Delete</Button>
      </div>
    ) },
  ];

  const actions = (
    <Button onClick={openCreate} disabled={!menuItems.length} className="flex items-center gap-1 font-bold shadow-sm">
      <HiPlus /> Add Addon
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader 
        section="Operations"
        title="Addons"
        description="Manage optional item add-ons and toppings."
        actions={actions}
        tabs={menuTabs}
      />

      {/* Menu Item Selector Filter */}
      <div className="flex items-center gap-4 bg-surface-subtle dark:bg-zinc-900/40 p-3 rounded-2xl border border-border-base dark:border-zinc-900 shadow-xs max-w-xs">
        <div className="w-full">
          <Select 
            id="addon-filter-item" 
            label="Filter by Menu Item" 
            value={selectedMenuItemId} 
            onChange={(e) => handleSelectedMenuItem(e.target.value)} 
            disabled={!menuItems.length}
          >
            <option value="" disabled>Select menu item</option>
            {menuItems.map((item) => (
              <option key={getEntityId(item)} value={getEntityId(item)}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Table columns={columns} data={data} loading={loading} />

      <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'create' ? 'New Addon' : 'Edit Addon'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Select id="add-menu-item" label="Menu Item" value={form.menuItemId} onChange={(e) => setForm({ ...form, menuItemId: e.target.value })} required>
            <option value="" disabled>Select menu item</option>
            {menuItems.map((item) => <option key={getEntityId(item)} value={getEntityId(item)}>{item.name}</option>)}
          </Select>
          <Input id="add-name" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input id="add-price" label="Price (INR)" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <label className="flex items-center gap-3 text-sm font-semibold text-on-surface-variant dark:text-zinc-400">
            <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} className="h-4 w-4 accent-primary rounded cursor-pointer" />
            Available
          </label>
          <div className="flex justify-end gap-2 pt-4 border-t border-border-base dark:border-zinc-850">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit">{modal.mode === 'create' ? 'Create' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
