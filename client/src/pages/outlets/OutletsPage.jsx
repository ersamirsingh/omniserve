import { useState, useEffect } from 'react';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import PageHeader from '../../components/ui/PageHeader';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { HiPlus } from 'react-icons/hi2';
import { listRestaurantsApi } from '../../api/models/restaurant.api';
import { listOutletsApi, createOutletApi, updateOutletApi, toggleOutletStatusApi, deleteOutletApi } from '../../api/models/outlet.api';
import { getEntityId, getList, getRefId } from '../../utils/apiData';
import useAuth from '../../hooks/useAuth';

const emptyForm = {
  restaurantId: '',
  name: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
  email: '',
  latitude: '',
  longitude: '',
};

export default function OutletsPage() {
  const { user } = useAuth();
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
      addToast('Failed to load outlets list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

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
      latitude: item.location?.coordinates?.[1] || '',
      longitude: item.location?.coordinates?.[0] || '',
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
    location: {
      type: 'Point',
      coordinates: [Number(form.longitude), Number(form.latitude)],
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = buildPayload();
      if (modal.mode === 'create') {
        await createOutletApi(payload);
        addToast('Outlet created successfully', 'success');
      } else {
        await updateOutletApi(getEntityId(modal.item), payload);
        addToast('Outlet updated successfully', 'success');
      }
      closeModal();
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Operation failed', 'error');
    }
  };

  const handleToggle = async (row) => {
    try {
      const isActive = row.status ? row.status === 'ACTIVE' : row.isActive !== false;
      await toggleOutletStatusApi(getEntityId(row), isActive ? 'INACTIVE' : 'ACTIVE');
      addToast('Outlet status updated', 'success');
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  const handleDelete = async (row) => {
    if (!confirm('Are you sure you want to delete this outlet?')) return;
    try {
      await deleteOutletApi(getEntityId(row));
      addToast('Outlet deleted successfully', 'success');
      fetchData();
    } catch {
      addToast('Failed to delete outlet', 'error');
    }
  };

  const columns = [
    { key: 'name', label: 'Name', render: (r) => <span className="font-bold text-on-surface dark:text-zinc-200">{r.name}</span> },
    { key: 'restaurantId', label: 'Restaurant', render: (r) => restaurantName(r.restaurantId) },
    { key: 'city', label: 'City', render: (r) => r.city || '-' },
    { key: 'phone', label: 'Phone', render: (r) => r.phone || '-' },
    {
      key: 'status',
      label: 'Status (Open/Closed)',
      render: (r) => {
        const isActive = r.status ? r.status === 'ACTIVE' : r.isActive !== false;
        return (
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={isActive} 
                onChange={() => handleToggle(r)} 
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-zinc-350 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-700 peer-checked:bg-green-600 transition-colors duration-300"></div>
              <span className={`ml-2 text-xs font-black uppercase tracking-wider ${isActive ? 'text-green-600' : 'text-zinc-400 dark:text-zinc-500'}`}>
                {isActive ? 'Open' : 'Closed'}
              </span>
            </label>
          </div>
        );
      },
    },
    { key: 'createdAt', label: 'Created', render: (r) => r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-' },
    ...(user?.role !== 'OUTLET_MANAGER' ? [{ 
      key: 'actions', 
      label: 'Actions', 
      render: (r) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(r)}>Delete</Button>
        </div>
      ) 
    }] : []),
  ];

  const actions = user?.role !== 'OUTLET_MANAGER' && (
    <Button 
      onClick={openCreate} 
      disabled={!restaurants.length} 
      className="flex items-center gap-1 font-bold shadow-md transition-all duration-200 hover:scale-105 active:scale-95"
    >
      <HiPlus /> Add Outlet
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        section="Management"
        title="Outlets"
        description="Manage physical kitchen outlet sites and locations."
        actions={actions}
      />

      <Table columns={columns} data={data} loading={loading} />

      <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'create' ? 'New Outlet' : 'Edit Outlet'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Select 
            id="out-restaurant" 
            label="Restaurant" 
            value={form.restaurantId} 
            onChange={(e) => setForm({ ...form, restaurantId: e.target.value })} 
            required
          >
            <option value="" disabled>Select restaurant</option>
            {restaurants.map((restaurant) => (
              <option key={getEntityId(restaurant)} value={getEntityId(restaurant)}>
                {restaurant.name}
              </option>
            ))}
          </Select>

          <Input 
            id="out-name" 
            label="Outlet Name" 
            value={form.name} 
            onChange={(e) => setForm({ ...form, name: e.target.value })} 
            required 
            placeholder="e.g. Downtown Kitchen"
          />
          <Input 
            id="out-address" 
            label="Address" 
            value={form.address} 
            onChange={(e) => setForm({ ...form, address: e.target.value })} 
            required 
            placeholder="e.g. 123 Main St"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input 
              id="out-city" 
              label="City" 
              value={form.city} 
              onChange={(e) => setForm({ ...form, city: e.target.value })} 
              required 
              placeholder="e.g. Mumbai"
            />
            <Input 
              id="out-state" 
              label="State" 
              value={form.state} 
              onChange={(e) => setForm({ ...form, state: e.target.value })} 
              required 
              placeholder="e.g. MH"
            />
          </div>

          <Input 
            id="out-pincode" 
            label="Pincode" 
            value={form.pincode} 
            onChange={(e) => setForm({ ...form, pincode: e.target.value })} 
            maxLength="6" 
            required 
            placeholder="e.g. 400001"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input 
              id="out-latitude" 
              label="Location Latitude" 
              type="number"
              step="any"
              value={form.latitude} 
              onChange={(e) => setForm({ ...form, latitude: e.target.value })} 
              required 
              placeholder="e.g. 19.0760"
            />
            <Input 
              id="out-longitude" 
              label="Location Longitude" 
              type="number"
              step="any"
              value={form.longitude} 
              onChange={(e) => setForm({ ...form, longitude: e.target.value })} 
              required 
              placeholder="e.g. 72.8777"
            />
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full text-xs font-bold py-2.5"
            onClick={() => {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setForm(prev => ({
                    ...prev,
                    latitude: pos.coords.latitude.toFixed(6),
                    longitude: pos.coords.longitude.toFixed(6)
                  }));
                  addToast('Current location detected successfully', 'success');
                },
                (err) => {
                  addToast('Failed to detect location. Please enter coordinates manually.', 'error');
                }
              );
            }}
          >
            📍 Autofill Current Coordinates
          </Button>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input 
              id="out-phone" 
              label="Phone Number" 
              value={form.phone} 
              onChange={(e) => setForm({ ...form, phone: e.target.value })} 
              placeholder="e.g. +919999999999"
            />
            <Input 
              id="out-email" 
              label="Email Address" 
              type="email" 
              value={form.email} 
              onChange={(e) => setForm({ ...form, email: e.target.value })} 
              placeholder="outlet@restaurant.com"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border-base dark:border-zinc-850">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit">{modal.mode === 'create' ? 'Create' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
