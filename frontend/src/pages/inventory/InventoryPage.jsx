import { useState, useEffect } from 'react';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import PageHeader from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import useAuth from '../../hooks/useAuth';
import { HiPlus, HiChevronLeft, HiChevronRight } from 'react-icons/hi2';
import { listInventoryApi, createInventoryApi, updateInventoryQuantityApi } from '../../api/models/inventory.api';
import { listOutletsApi } from '../../api/models/outlet.api';
import { listMenuItemsApi } from '../../api/models/menuItem.api';
import { USER_ROLES } from '../../utils/constants';
import { getEntityId, getList, getRefId } from '../../utils/apiData';

const canCreateInventory = (role) => [
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.RESTAURANT_OWNER,
  USER_ROLES.OUTLET_MANAGER,
].includes(role);

export default function InventoryPage() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOutletFilter, setSelectedOutletFilter] = useState('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);
  
  // Modal & Form state
  const [modal, setModal] = useState({ open: false, mode: 'quantity', item: null });
  const [form, setForm] = useState({ outletId: '', menuItemId: '', quantity: '', threshold: '' });
  
  const { addToast } = useToast();
  const mayCreate = canCreateInventory(user?.role);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: pageSize,
      };
      
      if (selectedOutletFilter !== 'all') {
        params.outletId = selectedOutletFilter;
      }
      
      const [invResponse, outletResponse, itemResponse] = await Promise.all([
        listInventoryApi(params),
        listOutletsApi(),
        listMenuItemsApi(),
      ]);
      
      const payload = invResponse?.data?.data || invResponse?.data || {};
      setData(getList(invResponse, 'inventory'));
      setOutlets(getList(outletResponse, 'outlets'));
      setMenuItems(getList(itemResponse, 'menuItems'));
      
      if (payload.pagination) {
        setTotalPages(payload.pagination.pages || 1);
      } else {
        setTotalPages(1);
      }
    } catch {
      addToast('Failed to load inventory data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, selectedOutletFilter]);

  const openCreate = () => {
    const defaultOutletId = getEntityId(outlets[0]) || '';
    const filteredItems = menuItems.filter(item => getRefId(item.outletId) === defaultOutletId);
    setForm({ 
      outletId: defaultOutletId, 
      menuItemId: getEntityId(filteredItems[0]) || '', 
      quantity: '0', 
      threshold: '10' 
    });
    setModal({ open: true, mode: 'create', item: null });
  };

  const openQuantity = (item) => {
    setForm({ 
      outletId: '', 
      menuItemId: '', 
      quantity: item.quantity !== undefined ? item.quantity.toString() : '0', 
      threshold: '' 
    });
    setModal({ open: true, mode: 'quantity', item });
  };

  const closeModal = () => setModal({ open: false, mode: 'quantity', item: null });

  const handleOutletChange = (outletId) => {
    const filteredItems = menuItems.filter(item => getRefId(item.outletId) === outletId);
    setForm({
      ...form,
      outletId,
      menuItemId: getEntityId(filteredItems[0]) || '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modal.mode === 'create') {
        await createInventoryApi({
          outletId: form.outletId,
          menuItemId: form.menuItemId,
          quantity: Number(form.quantity),
          threshold: Number(form.threshold) || 10,
        });
        addToast('Inventory record created', 'success');
      } else {
        await updateInventoryQuantityApi(getEntityId(modal.item), Number(form.quantity));
        addToast('Stock quantity updated', 'success');
      }
      closeModal();
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update inventory', 'error');
    }
  };

  const handleOutletFilterChange = (e) => {
    setSelectedOutletFilter(e.target.value);
    setCurrentPage(1);
  };

  // Perform search filtering client-side only
  const filteredData = data.filter((item) => {
    const itemName = item.menuItemId?.name || item.name || item.itemName || '';
    const outletName = item.outletId?.name || '';
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return itemName.toLowerCase().includes(query) || outletName.toLowerCase().includes(query);
  });

  const columns = [
    { 
      key: 'menuItemId', 
      label: 'Item Name', 
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-bold text-on-surface dark:text-zinc-200">
            {r.menuItemId?.name || r.name || r.itemName || getEntityId(r.menuItemId) || '-'}
          </span>
          {r.menuItemId?.sku && (
            <span className="text-[11px] text-on-surface-variant/70 dark:text-zinc-500 font-mono">
              SKU: {r.menuItemId.sku}
            </span>
          )}
        </div>
      )
    },
    { 
      key: 'outletId', 
      label: 'Outlet', 
      render: (r) => (
        <span className="text-on-surface dark:text-zinc-350">
          {r.outletId?.name || getEntityId(r.outletId) || '-'}
        </span>
      )
    },
    { 
      key: 'quantity', 
      label: 'Stock Quantity', 
      render: (r) => (
        <Badge variant={r.isLowStock ? 'danger' : 'success'}>
          {r.quantity}
        </Badge>
      )
    },
    { 
      key: 'threshold', 
      label: 'Low Stock Alert Threshold', 
      render: (r) => (
        <span className="font-mono text-on-surface-variant dark:text-zinc-400">
          {r.threshold ?? '-'}
        </span>
      )
    },
    { 
      key: 'updatedAt', 
      label: 'Last Updated', 
      render: (r) => (
        <span className="text-on-surface-variant dark:text-zinc-400">
          {r.updatedAt || r.createdAt ? new Date(r.updatedAt || r.createdAt).toLocaleDateString() : '-'}
        </span>
      )
    },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (r) => (
        <Button 
          size="sm" 
          variant="secondary" 
          onClick={() => openQuantity(r)}
          className="transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm font-semibold"
        >
          Update Qty
        </Button>
      ) 
    },
  ];

  const actions = mayCreate && (
    <Button 
      onClick={openCreate} 
      className="flex items-center gap-1 font-bold shadow-md transition-all duration-200 hover:scale-105 active:scale-95"
    >
      <HiPlus /> Add Item
    </Button>
  );

  const availableMenuItems = menuItems.filter(item => getRefId(item.outletId) === form.outletId);

  return (
    <div className="space-y-6">
      <PageHeader 
        section="Stock"
        title="Inventory"
        description="Monitor and adjust stock quantities and configure alert thresholds."
        actions={actions}
      />

      {/* Filter and Search Bar Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-surface dark:bg-zinc-900/40 p-4 rounded-2xl border border-border-base dark:border-zinc-900 shadow-sm">
        <div className="md:col-span-2">
          <Input 
            id="inv-search" 
            placeholder="Search stock by item or outlet name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon="search"
          />
        </div>
        <div>
          <Select 
            id="inv-outlet-filter" 
            value={selectedOutletFilter} 
            onChange={handleOutletFilterChange}
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

      {/* Table Section */}
      <div className="overflow-hidden">
        <Table columns={columns} data={filteredData} loading={loading} />
      </div>

      {/* Pagination Footer */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between bg-surface dark:bg-zinc-900/30 p-4 rounded-xl border border-border-base dark:border-zinc-900 shadow-xs">
          <span className="text-sm text-on-surface-variant dark:text-zinc-400">
            Page <span className="font-semibold text-on-surface dark:text-zinc-200">{currentPage}</span> of <span className="font-semibold text-on-surface dark:text-zinc-200">{totalPages}</span>
          </span>
          <div className="flex items-center gap-2">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
              disabled={currentPage === 1}
              className="flex items-center gap-0.5"
            >
              <HiChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
              disabled={currentPage === totalPages}
              className="flex items-center gap-0.5"
            >
              Next <HiChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <Modal 
        isOpen={modal.open} 
        onClose={closeModal} 
        title={modal.mode === 'create' ? 'New Inventory Record' : 'Update Quantity'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-2">
          {modal.mode === 'create' ? (
            <>
              <Select 
                id="inv-outlet" 
                label="Outlet" 
                value={form.outletId} 
                onChange={(e) => handleOutletChange(e.target.value)} 
                required
              >
                <option value="" disabled>Select outlet</option>
                {outlets.map((outlet) => (
                  <option key={getEntityId(outlet)} value={getEntityId(outlet)}>{outlet.name}</option>
                ))}
              </Select>
              <Select 
                id="inv-menu-item" 
                label="Menu Item" 
                value={form.menuItemId} 
                onChange={(e) => setForm({ ...form, menuItemId: e.target.value })} 
                disabled={!form.outletId}
                required
              >
                <option value="" disabled>Select menu item</option>
                {availableMenuItems.map((item) => (
                  <option key={getEntityId(item)} value={getEntityId(item)}>{item.name}</option>
                ))}
              </Select>
              <Input 
                id="inv-qty" 
                label="Initial Quantity" 
                type="number" 
                min="0" 
                value={form.quantity} 
                onChange={(e) => setForm({ ...form, quantity: e.target.value })} 
                required 
              />
              <Input 
                id="inv-threshold" 
                label="Low Stock Alert Threshold" 
                type="number" 
                min="0" 
                value={form.threshold} 
                onChange={(e) => setForm({ ...form, threshold: e.target.value })} 
                required
              />
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-surface-subtle dark:bg-zinc-900/60 p-3 rounded-xl border border-border-base dark:border-zinc-850">
                <span className="text-[11px] uppercase tracking-wider text-on-surface-variant/70 dark:text-zinc-500 font-bold block mb-1">
                  Item Name
                </span>
                <span className="font-bold text-on-surface dark:text-zinc-200">
                  {modal.item?.menuItemId?.name || modal.item?.name || modal.item?.itemName || '-'}
                </span>
              </div>

              {/* Quantity input with increment & decrement controls */}
              <div className="flex flex-col gap-1.5 w-full">
                <label className="block font-label-sm text-label-sm text-on-surface-variant dark:text-zinc-400 text-[12px] font-semibold">
                  Quantity <span className="text-error">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => setForm(f => ({ ...f, quantity: Math.max(0, Number(f.quantity) - 1).toString() }))}
                    className="h-10 w-12 text-lg font-bold flex items-center justify-center transition-all duration-200 hover:scale-105"
                  >
                    -
                  </Button>
                  <div className="flex-1">
                    <input
                      id="inv-qty-input"
                      type="number"
                      min="0"
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                      className="block w-full py-2 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-center font-bold text-on-surface dark:text-zinc-150 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all duration-200"
                      required
                    />
                  </div>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => setForm(f => ({ ...f, quantity: (Number(f.quantity) + 1).toString() }))}
                    className="h-10 w-12 text-lg font-bold flex items-center justify-center transition-all duration-200 hover:scale-105"
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-4 border-t border-border-base dark:border-zinc-850">
            <Button variant="secondary" onClick={closeModal} className="transition-all duration-200">
              Cancel
            </Button>
            <Button type="submit" className="transition-all duration-200 hover:scale-105 active:scale-95 shadow-md font-bold">
              {modal.mode === 'create' ? 'Create' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
