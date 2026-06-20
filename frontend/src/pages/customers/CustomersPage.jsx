import { useState, useEffect } from 'react';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import PageHeader from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import useAuth from '../../hooks/useAuth';
import { HiPlus, HiChevronLeft, HiChevronRight, HiOutlineTrash, HiOutlinePencilSquare } from 'react-icons/hi2';
import { listCustomersApi, createCustomerApi, updateCustomerApi, deleteCustomerApi } from '../../api/models/customer.api';
import { USER_ROLES } from '../../utils/constants';
import { getEntityId, getList } from '../../utils/apiData';

const canDeleteCustomer = (role) => [
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.RESTAURANT_OWNER,
  USER_ROLES.OUTLET_MANAGER,
].includes(role);

export default function CustomersPage() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);
  
  // Modal & Form state
  const [modal, setModal] = useState({ open: false, mode: 'create', item: null });
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  
  const { addToast } = useToast();
  const mayDelete = canDeleteCustomer(user?.role);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: pageSize,
      };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      
      const response = await listCustomersApi(params);
      const payload = response?.data?.data || response?.data || {};
      
      setData(getList(response, 'customers'));
      
      if (payload.pagination) {
        setTotalPages(payload.pagination.pages || 1);
      } else {
        setTotalPages(1);
      }
    } catch {
      addToast('Failed to load customer list', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Debounce API calls for search query changes to prevent request spam
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, currentPage]);

  const getFullName = (item) => {
    if (!item) return '';
    if (item.fullName) return item.fullName;
    return `${item.firstName || ''} ${item.lastName || ''}`.trim();
  };

  const openCreate = () => {
    setForm({ name: '', email: '', phone: '' });
    setModal({ open: true, mode: 'create', item: null });
  };

  const openEdit = (item) => {
    setForm({
      name: getFullName(item),
      email: item.email || '',
      phone: item.phone || '',
    });
    setModal({ open: true, mode: 'edit', item });
  };

  const closeModal = () => setModal({ open: false, mode: 'create', item: null });

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Transform single full name input into firstName and lastName before API submission
    const nameStr = form.name.trim();
    const tokens = nameStr.split(/\s+/);
    const firstName = tokens[0] || '';
    const lastName = tokens.slice(1).join(' ') || undefined;

    if (!firstName) {
      addToast('First name is required', 'error');
      return;
    }

    const payload = {
      firstName,
      lastName,
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
    };

    try {
      if (modal.mode === 'create') {
        await createCustomerApi(payload);
        addToast('Customer created successfully', 'success');
      } else {
        // Edit modal uses PUT request as verified by the backend updateCustomerApi wrapper
        await updateCustomerApi(getEntityId(modal.item), payload);
        addToast('Customer updated successfully', 'success');
      }
      closeModal();
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save customer details', 'error');
    }
  };

  const handleDelete = async (row) => {
    const name = getFullName(row);
    if (!confirm(`Are you sure you want to soft-delete customer "${name}"?`)) {
      return;
    }
    
    try {
      // Refresh list only after successful API delete confirmation (no optimistic removal)
      await deleteCustomerApi(getEntityId(row));
      addToast('Customer deleted successfully', 'success');
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete customer', 'error');
    }
  };

  const columns = [
    {
      key: 'fullName',
      label: 'Name',
      render: (r) => (
        <span className="font-bold text-on-surface dark:text-zinc-200">
          {getFullName(r)}
        </span>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (r) => (
        <span className="text-on-surface-variant dark:text-zinc-400">
          {r.email || '—'}
        </span>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (r) => (
        <span className="text-on-surface-variant dark:text-zinc-400">
          {r.phone || '—'}
        </span>
      ),
    },
    {
      key: 'totalOrders',
      label: 'Orders Count',
      render: (r) => (
        <span className="font-mono text-on-surface dark:text-zinc-300">
          {r.totalOrders ?? 0}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Customer Since',
      render: (r) => (
        <span className="text-on-surface-variant dark:text-zinc-400">
          {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={() => openEdit(r)}
            className="flex items-center gap-1 transition-all duration-200 hover:scale-105 active:scale-95 font-semibold"
          >
            <HiOutlinePencilSquare className="w-3.5 h-3.5" /> Edit
          </Button>
          {mayDelete && (
            <Button 
              size="sm" 
              variant="danger" 
              onClick={() => handleDelete(r)}
              className="flex items-center gap-1 transition-all duration-200 hover:scale-105 active:scale-95 font-semibold"
            >
              <HiOutlineTrash className="w-3.5 h-3.5" /> Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  const actions = (
    <Button 
      onClick={openCreate} 
      className="flex items-center gap-1 font-bold shadow-md transition-all duration-200 hover:scale-105 active:scale-95"
    >
      <HiPlus /> Add Customer
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader 
        section="CRM"
        title="Customers"
        description="View customer order stats and manage profile contact directories."
        actions={actions}
      />

      {/* Filter and Search Bar Card */}
      <div className="bg-surface dark:bg-zinc-900/40 p-4 rounded-2xl border border-border-base dark:border-zinc-900 shadow-sm max-w-xl">
        <Input 
          id="cust-search" 
          placeholder="Search by name, email, or phone number..." 
          value={searchQuery}
          onChange={handleSearchChange}
          icon="search"
        />
      </div>

      {/* Table Section */}
      <div className="overflow-hidden">
        <Table columns={columns} data={data} loading={loading} />
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

      {/* Create/Edit Modal */}
      <Modal 
        isOpen={modal.open} 
        onClose={closeModal} 
        title={modal.mode === 'create' ? 'New Customer Profile' : 'Edit Customer Profile'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
          <Input 
            id="cust-name" 
            label="Full Name" 
            value={form.name} 
            onChange={(e) => setForm({ ...form, name: e.target.value })} 
            required 
            placeholder="e.g. John Michael Doe"
          />
          <Input 
            id="cust-email" 
            label="Email Address" 
            type="email" 
            value={form.email} 
            onChange={(e) => setForm({ ...form, email: e.target.value })} 
            placeholder="e.g. john@example.com"
          />
          <Input 
            id="cust-phone" 
            label="Phone Number" 
            value={form.phone} 
            onChange={(e) => setForm({ ...form, phone: e.target.value })} 
            required 
            placeholder="e.g. +1234567890"
          />
          
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
