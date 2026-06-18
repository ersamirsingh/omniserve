import { useState, useEffect } from 'react';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { HiPlus } from 'react-icons/hi2';
import { listRestaurantsApi } from '../../api/models/restaurant.api';
import { listOutletsApi, createOutletApi, updateOutletApi, toggleOutletStatusApi, deleteOutletApi } from '../../api/models/outlet.api';
import { getEntityId, getList, getRefId } from '../../utils/apiData';

const emptyForm = {
  restaurantId: '',
  name: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
  email: '',
};

export default function OutletsPage() {
  const [data, setData] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'create', item: null });
  const [form, setForm] = useState(emptyForm);
  const { addToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [outletResponse, restaurantResponse] = await Promise.all([
        listOutletsApi(),
        listRestaurantsApi(),
      ]);
      setData(getList(outletResponse, 'outlets'));
      setRestaurants(getList(restaurantResponse, 'restaurants'));
    } catch {
      addToast('Failed to load outlets', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const restaurantName = (restaurantId) => {
    const id = getRefId(restaurantId);
    return restaurants.find((restaurant) => getEntityId(restaurant) === id)?.name || 'Unknown';
  };

  const openCreate = () => {
    setForm({ ...emptyForm, restaurantId: getEntityId(restaurants[0]) });
    setModal({ open: true, mode: 'create', item: null });
  };

  const openEdit = (item) => {
    setForm({
      restaurantId: getRefId(item.restaurantId),
      name: item.name || '',
      address: item.address || '',
      city: item.city || '',
      state: item.state || '',
      pincode: item.pincode || '',
      phone: item.phone || '',
      email: item.email || '',
    });
    setModal({ open: true, mode: 'edit', item });
  };

  const closeModal = () => setModal({ open: false, mode: 'create', item: null });

  const buildPayload = () => ({
    restaurantId: form.restaurantId,
    name: form.name.trim(),
    address: form.address.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    pincode: form.pincode.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = buildPayload();
      if (modal.mode === 'create') {
        await createOutletApi(payload);
        addToast('Outlet created', 'success');
      } else {
        await updateOutletApi(getEntityId(modal.item), payload);
        addToast('Outlet updated', 'success');
      }
      closeModal();
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed', 'error');
    }
  };

  const handleToggle = async (row) => {
    try {
      const isActive = row.status ? row.status === 'ACTIVE' : row.isActive !== false;
      await toggleOutletStatusApi(getEntityId(row), isActive ? 'INACTIVE' : 'ACTIVE');
      addToast('Status toggled', 'success');
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed', 'error');
    }
  };

  const handleDelete = async (row) => {
    if (!confirm('Delete this outlet?')) return;
    try {
      await deleteOutletApi(getEntityId(row));
      addToast('Deleted', 'success');
      fetchData();
    } catch {
      addToast('Failed', 'error');
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'restaurantId', label: 'Restaurant', render: (r) => restaurantName(r.restaurantId) },
    { key: 'city', label: 'City', render: (r) => r.city || '-' },
    { key: 'phone', label: 'Phone', render: (r) => r.phone || '-' },
    {
      key: 'status',
      label: 'Status',
      render: (r) => {
        const isActive = r.status ? r.status === 'ACTIVE' : r.isActive !== false;
        return (
          <Badge variant={isActive ? 'success' : 'neutral'} className="cursor-pointer" onClick={() => handleToggle(r)}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
    },
    { key: 'createdAt', label: 'Created', render: (r) => r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-' },
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
        <h1 className="text-xl font-bold text-slate-100">Outlets</h1>
        <Button onClick={openCreate} disabled={!restaurants.length}><HiPlus /> Add Outlet</Button>
      </div>
      <Table columns={columns} data={data} loading={loading} />
      <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'create' ? 'New Outlet' : 'Edit Outlet'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Select id="out-restaurant" label="Restaurant" value={form.restaurantId} onChange={(e) => setForm({ ...form, restaurantId: e.target.value })} required>
            <option value="" disabled>Select restaurant</option>
            {restaurants.map((restaurant) => <option key={getEntityId(restaurant)} value={getEntityId(restaurant)}>{restaurant.name}</option>)}
          </Select>
          <Input id="out-name" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input id="out-address" label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="out-city" label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
            <Input id="out-state" label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required />
          </div>
          <Input id="out-pincode" label="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} maxLength="6" required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="out-phone" label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input id="out-email" label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-[rgba(99,102,241,0.15)]">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit">{modal.mode === 'create' ? 'Create' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
