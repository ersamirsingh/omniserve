import { useState, useEffect } from 'react';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import PageHeader from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { HiPlus, HiOutlineTag, HiOutlineCheckCircle, HiOutlineXCircle } from 'react-icons/hi2';
import { listCouponsApi, createCouponApi, updateCouponApi, deleteCouponApi } from '../../api/models/coupon.api';
import { listOutletsApi } from '../../api/models/outlet.api';
import useAuth from '../../hooks/useAuth';
import { getEntityId, getList } from '../../utils/apiData';

const emptyForm = {
  code: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  minAmount: '',
  maxDiscountAmount: '',
  expirationDate: '',
  isActive: true,
  outletId: '',
};

export default function CouponsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState({ open: false, mode: 'create', item: null });
  const [form, setForm] = useState(emptyForm);
  const [outlets, setOutlets] = useState([]);
  const { addToast } = useToast();
  const { user } = useAuth();

  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';

  const fetchData = async () => {
    setLoading(true);
    try {
      const couponsResponse = await listCouponsApi();
      setData(getList(couponsResponse, 'coupons') || couponsResponse?.data || []);
    } catch {
      addToast('Failed to load coupons data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchOutlets = async () => {
    try {
      const res = await listOutletsApi();
      setOutlets(getList(res, 'outlets') || res.data || []);
    } catch (err) {
      console.error('Failed to load outlets', err);
    }
  };

  useEffect(() => {
    fetchData();
    if (!isSystemAdmin) {
      fetchOutlets();
    }
  }, [user]);

  const openCreate = () => {
    setForm({ ...emptyForm });
    setModal({ open: true, mode: 'create', item: null });
  };

  const openEdit = (item) => {
    setForm({
      code: item.code || '',
      discountType: item.discountType || 'PERCENTAGE',
      discountValue: item.discountValue ?? '',
      minAmount: item.minAmount ?? item.minOrderAmount ?? '',
      maxDiscountAmount: item.maxDiscountAmount ?? '',
      expirationDate: item.expirationDate ? new Date(item.expirationDate).toISOString().substring(0, 10) : '',
      isActive: item.isActive !== false,
      outletId: item.outletId || '',
    });
    setModal({ open: true, mode: 'edit', item });
  };

  const closeModal = () => {
    setModal({ open: false, mode: 'create', item: null });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minAmount: Number(form.minAmount || 0),
        maxDiscountAmount: form.discountType === 'PERCENTAGE' && form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
        expirationDate: form.expirationDate ? new Date(form.expirationDate) : null,
        isActive: form.isActive,
      };

      if (!isSystemAdmin) {
        payload.outletId = form.outletId || null;
      }

      if (modal.mode === 'create') {
        await createCouponApi(payload);
        addToast('Coupon created successfully', 'success');
      } else {
        await updateCouponApi(getEntityId(modal.item), payload);
        addToast('Coupon updated successfully', 'success');
      }
      closeModal();
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete coupon "${item.code}"?`)) return;
    try {
      await deleteCouponApi(getEntityId(item));
      addToast('Coupon deleted successfully', 'success');
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete coupon', 'error');
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      await updateCouponApi(getEntityId(item), { isActive: !item.isActive });
      addToast(`Coupon ${!item.isActive ? 'activated' : 'deactivated'} successfully`, 'success');
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to change status', 'error');
    }
  };

  const columns = [
    {
      key: 'code',
      label: 'Coupon Code',
      render: (r) => (
        <div className="flex items-center gap-2">
          <HiOutlineTag className="text-primary dark:text-primary-fixed-dim text-base" />
          <span className="font-bold text-on-surface dark:text-zinc-200 tracking-wider font-mono">{r.code}</span>
        </div>
      ),
    },
    {
      key: 'discountType',
      label: 'Discount Type',
      render: (r) => (
        <Badge variant={r.discountType === 'PERCENTAGE' ? 'warning' : 'success'}>
          {r.discountType}
        </Badge>
      ),
    },
    {
      key: 'discountValue',
      label: 'Discount Value',
      render: (r) => (
        <span className="font-bold text-on-surface dark:text-zinc-200">
          {r.discountType === 'PERCENTAGE' ? `${r.discountValue}%` : `₹${r.discountValue}`}
        </span>
      ),
    },
    {
      key: 'minAmount',
      label: isSystemAdmin ? 'Min Subscription Price' : 'Min Order Price',
      render: (r) => <span className="font-semibold text-zinc-550 dark:text-zinc-400">₹{r.minAmount ?? r.minOrderAmount ?? 0}</span>,
    },
    ...(!isSystemAdmin ? [{
      key: 'outletId',
      label: 'Outlet Scope',
      render: (r) => {
        const out = outlets.find(o => getEntityId(o) === r.outletId);
        return (
          <span className="font-semibold text-zinc-650 dark:text-zinc-350">
            {out ? out.name : 'All Outlets'}
          </span>
        );
      }
    }] : []),
    {
      key: 'expirationDate',
      label: 'Expires On',
      render: (r) => (
        <span className="text-zinc-500 font-medium">
          {r.expirationDate ? new Date(r.expirationDate).toLocaleDateString() : 'Never Expires'}
        </span>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (r) => (
        <button
          onClick={() => handleToggleStatus(r)}
          className="flex items-center gap-1 cursor-pointer select-none focus:outline-none bg-transparent border-none text-left p-0"
          title="Click to toggle status"
        >
          {r.isActive ? (
            <Badge variant="success" className="gap-1"><HiOutlineCheckCircle /> Active</Badge>
          ) : (
            <Badge variant="neutral" className="gap-1"><HiOutlineXCircle /> Inactive</Badge>
          )}
        </button>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(r)}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        section={isSystemAdmin ? "System Admin" : "Marketing"}
        title={isSystemAdmin ? "Subscription Coupons" : "Coupons Management"}
        description={
          isSystemAdmin
            ? "Generate software subscription discount coupons, define flat or percentage values, and establish minimum purchase amounts."
            : "Create and manage promo discount coupons for your customers. Define percentage/flat discounts and restrict them outlet-wise."
        }
        actions={
          <Button onClick={openCreate} className="flex items-center gap-1.5 font-bold">
            <HiPlus /> Add Coupon
          </Button>
        }
      />

      <div className="bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-900 rounded-2xl p-2 shadow-xs transition-all duration-300">
        <Table
          columns={columns}
          data={data}
          loading={loading}
          emptyMessage={
            isSystemAdmin
              ? "No subscription coupons created yet. Click 'Add Coupon' to create your first discount code."
              : "No customer coupons created yet. Click 'Add Coupon' to create your first discount code."
          }
        />
      </div>

      <Modal
        isOpen={modal.open}
        onClose={submitting ? () => {} : closeModal}
        title={
          modal.mode === 'create'
            ? (isSystemAdmin ? 'Create Subscription Coupon' : 'Create Customer Coupon')
            : 'Edit Coupon Details'
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="c-code"
              label="Coupon Code"
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder={isSystemAdmin ? "e.g. SOFTWARE50" : "e.g. WELCOME10"}
            />
            <Select
              id="c-type"
              label="Discount Type"
              value={form.discountType}
              onChange={(e) => setForm({ ...form, discountType: e.target.value })}
              required
            >
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FLAT">Flat Rate (₹)</option>
            </Select>
          </div>

          {!isSystemAdmin && user?.role !== 'OUTLET_MANAGER' && (
            <Select
              id="c-outlet"
              label="Applicable Outlet Scope"
              value={form.outletId}
              onChange={(e) => setForm({ ...form, outletId: e.target.value })}
            >
              <option value="">All Outlets (Storewide)</option>
              {outlets.map((o) => (
                <option key={getEntityId(o)} value={getEntityId(o)}>
                  {o.name}
                </option>
              ))}
            </Select>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="c-value"
              label={form.discountType === 'PERCENTAGE' ? 'Discount Percentage (%)' : 'Discount Amount (₹)'}
              type="number"
              required
              min="0"
              value={form.discountValue}
              onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
              placeholder={form.discountType === 'PERCENTAGE' ? 'e.g. 10' : 'e.g. 100'}
            />
            <Input
              id="c-min-amt"
              label={isSystemAdmin ? "Minimum Subscription Amount (₹)" : "Minimum Order Amount (₹)"}
              type="number"
              min="0"
              value={form.minAmount}
              onChange={(e) => setForm({ ...form, minAmount: e.target.value })}
              placeholder={isSystemAdmin ? "e.g. 2999" : "e.g. 500"}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {form.discountType === 'PERCENTAGE' && (
              <Input
                id="c-max-discount"
                label="Maximum Discount Cap (₹, Optional)"
                type="number"
                min="0"
                value={form.maxDiscountAmount}
                onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })}
                placeholder="e.g. 1500"
              />
            )}
            <Input
              id="c-expiry"
              label="Expiration Date (Optional)"
              type="date"
              value={form.expirationDate}
              onChange={(e) => setForm({ ...form, expirationDate: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2 py-2">
            <input
              id="c-active"
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="checkbox checkbox-primary rounded border-border-base text-primary accent-primary cursor-pointer"
            />
            <label htmlFor="c-active" className="text-xs font-semibold text-on-surface-variant dark:text-zinc-350 cursor-pointer select-none">
              Mark as Active immediately
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border-base dark:border-zinc-850">
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>Cancel</Button>
            <Button type="submit" loading={submitting}>{modal.mode === 'create' ? 'Create Coupon' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
