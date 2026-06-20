import { useState, useEffect } from 'react';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { HiPlus } from 'react-icons/hi2';
import { listRestaurantsApi, createRestaurantApi, updateRestaurantApi, deleteRestaurantApi } from '../../api/models/restaurant.api';

export default function RestaurantsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'create', item: null });
  const [form, setForm] = useState({ name: '', description: '' });
  const { addToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try { 
      const r = await listRestaurantsApi(); 
      setData(Array.isArray(r.data?.restaurants) ? r.data.restaurants : []); 
    } catch { 
      addToast('Failed to load restaurants', 'error'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  const openCreate = () => { 
    setForm({ name: '', description: '' }); 
    setModal({ open: true, mode: 'create', item: null }); 
  };

  const openEdit = (item) => { 
    setForm({ name: item.name || '', description: item.description || '' }); 
    setModal({ open: true, mode: 'edit', item }); 
  };

  const closeModal = () => setModal({ open: false, mode: 'create', item: null });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modal.mode === 'create') { 
        await createRestaurantApi(form); 
        addToast('Restaurant created successfully', 'success'); 
      } else { 
        await updateRestaurantApi(modal.item._id, form); 
        addToast('Restaurant updated successfully', 'success'); 
      }
      closeModal(); 
      fetchData();
    } catch (err) { 
      addToast(err.response?.data?.message || 'Operation failed', 'error'); 
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this restaurant?')) return;
    try { 
      await deleteRestaurantApi(id); 
      addToast('Restaurant deleted', 'success'); 
      fetchData(); 
    } catch { 
      addToast('Failed to delete restaurant', 'error'); 
    }
  };

  const columns = [
    { key: 'name', label: 'Name', render: (r) => <span className="font-bold text-on-surface dark:text-zinc-200">{r.name}</span> },
    { key: 'description', label: 'Description', render: (r) => r.description || '—' },
    { 
      key: 'isActive', 
      label: 'Status', 
      render: (r) => (
        <Badge variant={r.isActive !== false ? 'success' : 'neutral'}>
          {r.isActive !== false ? 'Active' : 'Inactive'}
        </Badge>
      ) 
    },
    { key: 'createdAt', label: 'Created', render: (r) => new Date(r.createdAt).toLocaleDateString() },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (r) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(r._id)}>Delete</Button>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-on-surface dark:text-zinc-100 text-[24px] font-bold tracking-tight">
            Restaurants
          </h2>
          <p className="text-body-md text-on-surface-variant dark:text-zinc-400 text-[14px]">
            Manage system restaurant tenant nodes.
          </p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-1 font-bold">
          <HiPlus /> Add Restaurant
        </Button>
      </div>

      <Table columns={columns} data={data} loading={loading} />

      <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'create' ? 'New Restaurant' : 'Edit Restaurant'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input 
            id="rest-name" 
            label="Name" 
            value={form.name} 
            onChange={(e) => setForm({ ...form, name: e.target.value })} 
            required 
            placeholder="e.g. Olive Garden"
          />
          <Input 
            id="rest-desc" 
            label="Description" 
            value={form.description} 
            onChange={(e) => setForm({ ...form, description: e.target.value })} 
            placeholder="e.g. Italian casual dining"
          />
          <div className="flex justify-end gap-2 pt-4 border-t border-border-base dark:border-zinc-850">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit">{modal.mode === 'create' ? 'Create' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
