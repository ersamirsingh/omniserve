import { useState, useEffect } from 'react';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import PageHeader from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { HiPlus, HiArrowUpTray } from 'react-icons/hi2';
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
  image: '',
};

const menuTabs = [
  { to: '/categories', label: 'Categories' },
  { to: '/menu-items', label: 'Menu Items' },
  { to: '/variants', label: 'Variants' },
  { to: '/addons', label: 'Addons' },
];

export default function MenuItemsPage({ isEmbedded = false, selectedOutletId, globalOutletActive }) {
  const [data, setData] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedOutletFilter, setSelectedOutletFilter] = useState('all');
  const [showInfo, setShowInfo] = useState(false);
  const [modal, setModal] = useState({ open: false, mode: 'create', item: null });
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { limit: 1000 };
      if (globalOutletActive && selectedOutletId && selectedOutletId !== 'all') {
        params.outletId = selectedOutletId;
      }
      const [menuItemResponse, outletResponse, categoryResponse] = await Promise.all([
        listMenuItemsApi(params),
        listOutletsApi(),
        listCategoriesApi(params),
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
  }, [selectedOutletId, globalOutletActive]);

  useEffect(() => {
    if (globalOutletActive && selectedOutletId !== undefined) {
      setSelectedOutletFilter(selectedOutletId);
      setSelectedCategoryFilter('all');
    }
  }, [selectedOutletId, globalOutletActive]);

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
    const outletId = globalOutletActive && selectedOutletId && selectedOutletId !== 'all'
      ? selectedOutletId
      : getEntityId(outlets[0]);
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
      image: item.image || '',
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

  const handleMenuItemFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      addToast('File size must be under 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({ ...prev, image: reader.result }));
    };
    reader.readAsDataURL(file);
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
    image: form.image || undefined,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
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
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (row) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await toggleAvailabilityApi(getEntityId(row), row.isAvailable === false);
      addToast('Toggled', 'success');
      fetchData();
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
      await deleteMenuItemApi(getEntityId(row));
      addToast('Deleted', 'success');
      fetchData();
    } catch {
      addToast('Failed', 'error');
    } finally {
      setSubmitting(false);
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
        <div className="flex items-center gap-3">
          {r.image ? (
            <img src={r.image} alt={r.name} className="w-10 h-10 rounded-lg object-cover bg-zinc-100 border border-border-base shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-surface-subtle dark:bg-zinc-800 border border-border-base flex items-center justify-center text-on-surface-variant/40 text-xs font-bold shrink-0">
              No Img
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-on-surface dark:text-zinc-200">{r.name}</span>
            {r.description && <span className="text-[11px] text-on-surface-variant dark:text-zinc-455 truncate max-w-xs">{r.description}</span>}
          </div>
        </div>
      ) 
    },
    { key: 'outletId', label: 'Outlet', render: (r) => outletName(r.outletId) },
    { key: 'categoryId', label: 'Category', render: (r) => categoryName(r.categoryId) },
    { key: 'price', label: 'Price', render: (r) => `₹${r.price}` },

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
          className={`font-bold select-none active:scale-95 transition-all ${submitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`} 
          onClick={() => !submitting && handleToggle(r)}
        >
          {r.isAvailable !== false ? 'Yes' : 'No'}
        </Badge>
      ) 
    },
    { key: 'actions', label: 'Actions', render: (r) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(r)} disabled={submitting}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(r)} disabled={submitting}>Delete</Button>
      </div>
    ) },
  ];

  const actions = (
    <Button onClick={openCreate} disabled={submitting || !outlets.length || !categories.length} className="flex items-center gap-1 font-bold shadow-sm">
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
          {!globalOutletActive && (
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
          )}
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
      </div>

      {showInfo && (
        <div className="bg-surface-subtle dark:bg-zinc-900/60 border border-border-base dark:border-zinc-800 rounded-xl p-4 text-xs font-medium text-on-surface-variant dark:text-zinc-350 transition-all flex items-start gap-2.5 mb-4 animate-fadeIn">
          <span className="material-symbols-outlined text-[20px] text-primary shrink-0">info</span>
          <div>
            <span className="font-bold text-on-surface dark:text-zinc-200 block mb-0.5">Menu Items Section Info</span>
            <p className="leading-relaxed">
              Manage your main dishes, drinks, or combos. You can set prices, assign categories, tag them as Veg/Non-Veg, and toggle availability. Outlets can be specified for each item.
            </p>
          </div>
        </div>
      )}


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
          <Input id="mi-price" label="Price" type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <div>
            <Input id="mi-order" label="Display Order" type="number" min="0" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: e.target.value })} required />
          </div>

          {/* Image Uploader */}
          <div className="flex flex-col gap-1 w-full">
            <label className="block font-label-sm text-label-sm text-on-surface-variant dark:text-zinc-400 text-[12px] font-semibold mb-1">
              Item Image (Optional)
            </label>
            {form.image ? (
              <div className="relative group border border-border-base dark:border-zinc-850 rounded-2xl overflow-hidden aspect-video bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center p-2">
                <img src={form.image} alt="Menu Item" className="max-w-full max-h-full object-contain rounded-lg" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-all duration-200">
                  <label className="bg-primary hover:bg-primary/95 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all flex items-center gap-1 shadow-sm">
                    <HiArrowUpTray className="text-xs" /> Upload New
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleMenuItemFileChange(e)}
                      className="hidden"
                    />
                  </label>
                  <Button size="sm" variant="danger" type="button" onClick={() => setForm({ ...form, image: '' })}>
                    Remove Image
                  </Button>
                </div>
              </div>
            ) : (
              <label className="border-2 border-dashed border-border-base dark:border-zinc-850 hover:border-primary dark:hover:border-primary-fixed-dim rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-surface-subtle/20 dark:bg-zinc-900/10 group">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant/40 group-hover:text-primary transition-colors mb-2">
                  upload_file
                </span>
                <h5 className="text-xs font-bold text-on-surface dark:text-zinc-250">Click to upload item image</h5>
                <p className="text-[10px] text-on-surface-variant dark:text-zinc-455 mt-1 max-w-[240px]">
                  PNG or JPG under 2MB.
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleMenuItemFileChange(e)}
                  className="hidden"
                />
              </label>
            )}
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
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting} loading={submitting}>{modal.mode === 'create' ? 'Create' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
