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
import { listCategoriesApi } from '../../api/models/category.api';
import { listMenuItemsApi, createMenuItemApi, updateMenuItemApi, toggleAvailabilityApi, deleteMenuItemApi } from '../../api/models/menuItem.api';
import { getEntityId, getList, getRefId } from '../../utils/apiData';

const emptyForm = {
  outletId: '',
  categoryId: '',
  name: '',
  description: '',
  price: '',
  displayOrder: 0,
  isVeg: true,
  isAvailable: true,
};

const menuTabs = [
  { to: '/menu-items', label: 'Menu Items' },
  { to: '/categories', label: 'Categories' },
  { to: '/variants', label: 'Variants' },
  { to: '/addons', label: 'Addons' },
];

export default function MenuItemsPage({ isEmbedded = false }) {
  const [data, setData] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedOutletFilter, setSelectedOutletFilter] = useState('all');
  const [modal, setModal] = useState({ open: false, mode: 'create', item: null });
  const [form, setForm] = useState(emptyForm);
  const { addToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [menuItemResponse, outletResponse, categoryResponse] = await Promise.all([
        listMenuItemsApi(),
        listOutletsApi(),
        listCategoriesApi(),
      ]);
      setData(getList(menuItemResponse, 'menuItems'));
      setOutlets(getList(outletResponse, 'outlets'));
      setCategories(getList(categoryResponse, 'categories'));
    } catch {
      addToast('Failed to load menu data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  const outletName = (outletId) => {
    const id = getRefId(outletId);
    return outlets.find((outlet) => getEntityId(outlet) === id)?.name || 'Unknown';
  };

  const categoryName = (categoryId) => {
    const id = getRefId(categoryId);
    return categories.find((category) => getEntityId(category) === id)?.name || 'Unknown';
  };

  const categoriesForOutlet = (outletId) => categories.filter((category) => getRefId(category.outletId) === outletId);

  const firstCategoryForOutlet = (outletId) => getEntityId(categoriesForOutlet(outletId)[0]) || '';

  const openCreate = () => {
    const outletId = getEntityId(outlets[0]);
    setForm({
      ...emptyForm,
      outletId,
      categoryId: firstCategoryForOutlet(outletId),
    });
    setModal({ open: true, mode: 'create', item: null });
  };

  const openEdit = (item) => {
    setForm({
      outletId: getRefId(item.outletId),
      categoryId: getRefId(item.categoryId),
      name: item.name || '',
      description: item.description || '',
      price: item.price ?? '',
      displayOrder: item.displayOrder ?? 0,
      isVeg: item.isVeg !== false,
      isAvailable: item.isAvailable !== false,
    });
    setModal({ open: true, mode: 'edit', item });
  };

  const closeModal = () => setModal({ open: false, mode: 'create', item: null });

  const updateOutlet = (outletId) => {
    setForm({
      ...form,
      outletId,
      categoryId: firstCategoryForOutlet(outletId),
    });
  };

  const buildPayload = () => ({
    outletId: form.outletId,
    categoryId: form.categoryId,
    name: form.name.trim(),
    price: Number(form.price),
    description: form.description.trim(),
    displayOrder: Number(form.displayOrder),
    isVeg: form.isVeg,
    isAvailable: form.isAvailable,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = buildPayload();
      if (modal.mode === 'create') {
        await createMenuItemApi(payload);
        addToast('Created', 'success');
      } else {
        await updateMenuItemApi(getEntityId(modal.item), payload);
        addToast('Updated', 'success');
      }
      closeModal();
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed', 'error');
    }
  };

  const handleToggle = async (row) => {
    try {
      await toggleAvailabilityApi(getEntityId(row), row.isAvailable === false);
      addToast('Toggled', 'success');
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed', 'error');
    }
  };

  const handleDelete = async (row) => {
    if (!confirm('Delete?')) return;
    try {
      await deleteMenuItemApi(getEntityId(row));
      addToast('Deleted', 'success');
      fetchData();
    } catch {
      addToast('Failed', 'error');
    }
  };

  const filteredCategories = categoriesForOutlet(form.outletId);

  const categoriesForFilter = selectedOutletFilter === 'all' 
    ? categories 
    : categories.filter((c) => getRefId(c.outletId) === selectedOutletFilter);

  const filteredData = data.filter((item) => {
    // Outlet Filter
    if (selectedOutletFilter !== 'all' && getRefId(item.outletId) !== selectedOutletFilter) {
      return false;
    }
    // Category Filter
    if (selectedCategoryFilter !== 'all' && getRefId(item.categoryId) !== selectedCategoryFilter) {
      return false;
    }
    // Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const name = (item.name || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      return name.includes(query) || desc.includes(query);
    }
    return true;
  });

  const columns = [
    { 
      key: 'name', 
      label: 'Name', 
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-on-surface dark:text-zinc-200">{r.name}</span>
          {r.description && <span className="text-[11px] text-on-surface-variant dark:text-zinc-455 truncate max-w-xs">{r.description}</span>}
        </div>
      ) 
    },
    { key: 'outletId', label: 'Outlet', render: (r) => outletName(r.outletId) },
    { key: 'categoryId', label: 'Category', render: (r) => categoryName(r.categoryId) },
    { 
      key: 'price', 
      label: 'Price', 
      render: (r) => (
        <span className="font-mono font-semibold text-on-surface dark:text-zinc-300">
          ₹{Number(r.price || 0).toFixed(2)}
        </span>
      ) 
    },
    { 
      key: 'isVeg', 
      label: 'Diet', 
      render: (r) => (
        <Badge variant={r.isVeg !== false ? 'success' : 'danger'}>
          {r.isVeg !== false ? 'Veg' : 'Non-Veg'}
        </Badge>
      ) 
    },
    { 
      key: 'isAvailable', 
      label: 'Available', 
      render: (r) => (
        <Badge 
          variant={r.isAvailable !== false ? 'success' : 'neutral'} 
          className="cursor-pointer font-bold select-none active:scale-95 transition-all" 
          onClick={() => handleToggle(r)}
        >
          {r.isAvailable !== false ? 'Yes' : 'No'}
        </Badge>
      ) 
    },
    { key: 'actions', label: 'Actions', render: (r) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(r)}>Delete</Button>
      </div>
    ) },
  ];

  const actions = (
    <Button onClick={openCreate} disabled={!outlets.length || !categories.length} className="flex items-center gap-1 font-bold shadow-sm">
      <HiPlus /> Add Item
    </Button>
  );

  return (
    <div className={isEmbedded ? '' : 'space-y-6'}>
      {!isEmbedded && (
        <PageHeader 
          section="Operations"
          title="Menu Items"
          description="Manage and configure your outlet menu items."
          actions={actions}
          tabs={menuTabs}
        />
      )}

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-surface-subtle dark:bg-zinc-900/40 p-3 rounded-2xl border border-border-base dark:border-zinc-900 shadow-xs mb-4">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 dark:text-zinc-500 text-[20px]">
            search
          </span>
          <input
            type="text"
            className="w-full bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-850 rounded-xl py-2 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-on-surface-variant/40 text-on-surface dark:text-zinc-200"
            placeholder="Search by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-40 max-w-full">
            <Select 
              id="mi-outlet-filter" 
              label="Outlet" 
              value={selectedOutletFilter} 
              onChange={(e) => {
                setSelectedOutletFilter(e.target.value);
                setSelectedCategoryFilter('all'); 
              }}
            >
              <option value="all">All Outlets</option>
              {outlets.map((outlet) => (
                <option key={getEntityId(outlet)} value={getEntityId(outlet)}>
                  {outlet.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-40 max-w-full">
            <Select 
              id="mi-category-filter" 
              label="Category" 
              value={selectedCategoryFilter} 
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categoriesForFilter.map((category) => (
                <option key={getEntityId(category)} value={getEntityId(category)}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
          {isEmbedded && actions}
        </div>
      </div>

      <Table columns={columns} data={filteredData} loading={loading} />

      <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'create' ? 'New Menu Item' : 'Edit Menu Item'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Select id="mi-outlet" label="Outlet" value={form.outletId} onChange={(e) => updateOutlet(e.target.value)} required>
            <option value="" disabled>Select outlet</option>
            {outlets.map((outlet) => <option key={getEntityId(outlet)} value={getEntityId(outlet)}>{outlet.name}</option>)}
          </Select>
          <Select id="mi-category" label="Category" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
            <option value="" disabled>Select category</option>
            {filteredCategories.map((category) => <option key={getEntityId(category)} value={getEntityId(category)}>{category.name}</option>)}
          </Select>
          <Input id="mi-name" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input id="mi-desc" label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength="500" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="mi-price" label="Price (INR)" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            <Input id="mi-order" label="Display Order" type="number" min="0" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: e.target.value })} required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 text-sm font-semibold text-on-surface-variant dark:text-zinc-400">
              <input type="checkbox" checked={form.isVeg} onChange={(e) => setForm({ ...form, isVeg: e.target.checked })} className="checkbox checkbox-sm checkbox-primary h-4 w-4 cursor-pointer" />
              Vegetarian
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold text-on-surface-variant dark:text-zinc-400">
              <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} className="checkbox checkbox-sm checkbox-primary h-4 w-4 cursor-pointer" />
              Available
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border-base dark:border-zinc-850">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit">{modal.mode === 'create' ? 'Create' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
