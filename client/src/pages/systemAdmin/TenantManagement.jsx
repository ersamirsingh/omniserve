import { useState, useEffect } from 'react';
import { 
  HiOutlineMagnifyingGlass, 
  HiOutlineChevronLeft, 
  HiOutlineChevronRight, 
  HiOutlineShieldCheck, 
  HiOutlineXMark, 
  HiOutlineCreditCard, 
  HiOutlineClock, 
  HiOutlineExclamationTriangle 
} from 'react-icons/hi2';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { 
  listTenantsApi, 
  getTenantDetailApi, 
  updateTenantStatusApi, 
  overrideSubscriptionApi, 
  deleteTenantApi 
} from '../../api/models/systemAdmin.api';
import { listPlansApi } from '../../api/models/subscription.api';
import { USER_STATUS_VARIANT, ROLE_BADGE_VARIANT } from '../../utils/constants';

export default function TenantManagement() {
  const [tenants, setTenants] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  
  // Filters state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [subscriptionPlan, setSubscriptionPlan] = useState('');
  const [loading, setLoading] = useState(true);

  // Detail panel state
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  // Available plans list (for subscription override)
  const [availablePlans, setAvailablePlans] = useState([]);

  // Action states & Modals
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deletingTenant, setDeletingTenant] = useState(false);

  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    planId: '',
    status: 'ACTIVE',
    billingCycle: 'MONTHLY',
    amount: '',
    trialEndsAt: '',
    endDate: '',
  });
  const [overridingSub, setOverridingSub] = useState(false);

  const fetchTenants = () => {
    setLoading(true);
    const params = {
      page,
      limit,
    };
    if (search) params.search = search;
    if (status) params.status = status;
    if (subscriptionPlan) params.subscriptionPlan = subscriptionPlan;

    listTenantsApi(params)
      .then((res) => {
        setTenants(res.data?.data?.tenants || []);
        setTotal(res.data?.data?.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTenants();
  }, [page, status, subscriptionPlan]);

  // Fetch subscription plans once
  useEffect(() => {
    listPlansApi()
      .then((res) => {
        setAvailablePlans(res.data?.data?.plans || []);
      })
      .catch(() => {});
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTenants();
  };

  const handleViewDetails = (tenantId) => {
    setLoadingDetail(true);
    setPanelOpen(true);
    getTenantDetailApi(tenantId)
      .then((res) => {
        setSelectedTenant(res.data?.data);
      })
      .catch((err) => {
        alert(err.response?.data?.message || 'Failed to fetch tenant details');
        setPanelOpen(false);
      })
      .finally(() => {
        setLoadingDetail(false);
      });
  };

  const handleOpenStatusModal = (newStatus) => {
    setTargetStatus(newStatus);
    setStatusReason('');
    setShowStatusModal(true);
  };

  const handleConfirmStatusUpdate = () => {
    if (!statusReason || statusReason.trim().length < 5) {
      alert('A reason of at least 5 characters is required.');
      return;
    }

    setUpdatingStatus(true);
    updateTenantStatusApi(selectedTenant.tenant.id || selectedTenant.tenant._id, targetStatus, statusReason)
      .then(() => {
        setShowStatusModal(false);
        // Refresh details & list
        handleViewDetails(selectedTenant.tenant.id || selectedTenant.tenant._id);
        fetchTenants();
      })
      .catch((err) => {
        alert(err.response?.data?.message || 'Failed to update tenant status');
      })
      .finally(() => {
        setUpdatingStatus(false);
      });
  };

  const handleOpenDeleteModal = () => {
    setDeleteReason('');
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (!deleteReason || deleteReason.trim().length < 5) {
      alert('A deletion reason of at least 5 characters is required.');
      return;
    }

    setDeletingTenant(true);
    deleteTenantApi(selectedTenant.tenant.id || selectedTenant.tenant._id, deleteReason)
      .then(() => {
        setShowDeleteModal(false);
        setPanelOpen(false);
        setSelectedTenant(null);
        fetchTenants();
      })
      .catch((err) => {
        alert(err.response?.data?.message || 'Failed to delete tenant');
      })
      .finally(() => {
        setDeletingTenant(false);
      });
  };

  const handleOpenOverrideModal = () => {
    // Pre-populate override form
    const sub = selectedTenant?.activeSubscription;
    setOverrideForm({
      planId: sub?.planId || availablePlans[0]?._id || '',
      status: sub?.status || 'ACTIVE',
      billingCycle: sub?.billingCycle || 'MONTHLY',
      amount: sub?.amount !== undefined ? sub.amount.toString() : '',
      trialEndsAt: sub?.trialEndsAt ? new Date(sub.trialEndsAt).toISOString().split('T')[0] : '',
      endDate: sub?.endDate ? new Date(sub.endDate).toISOString().split('T')[0] : '',
    });
    setShowOverrideModal(true);
  };

  const handleConfirmOverride = (e) => {
    e.preventDefault();
    
    // Build payload
    const payload = {
      planId: overrideForm.planId,
      status: overrideForm.status,
      billingCycle: overrideForm.billingCycle,
      trialEndsAt: overrideForm.trialEndsAt ? new Date(overrideForm.trialEndsAt).toISOString() : null,
      endDate: overrideForm.endDate ? new Date(overrideForm.endDate).toISOString() : null,
    };
    if (overrideForm.amount) {
      payload.amount = parseFloat(overrideForm.amount);
    }

    setOverridingSub(true);
    overrideSubscriptionApi(selectedTenant.tenant.id || selectedTenant.tenant._id, payload)
      .then(() => {
        setShowOverrideModal(false);
        handleViewDetails(selectedTenant.tenant.id || selectedTenant.tenant._id);
        fetchTenants();
      })
      .catch((err) => {
        alert(err.response?.data?.message || 'Failed to override subscription');
      })
      .finally(() => {
        setOverridingSub(false);
      });
  };

  const totalPages = Math.ceil(total / limit);

  const columns = [
    { key: 'name', label: 'Tenant Name', render: (r) => <span className="font-semibold text-on-surface dark:text-zinc-200">{r.name}</span> },
    { key: 'slug', label: 'Slug', render: (r) => <span className="font-mono text-xs">{r.slug}</span> },
    { 
      key: 'subscriptionPlan', 
      label: 'Subscription', 
      render: (r) => <Badge variant={r.subscriptionPlan === 'SUPER' ? 'primary' : r.subscriptionPlan === 'PRO' ? 'success' : 'neutral'}>{r.subscriptionPlan}</Badge> 
    },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={USER_STATUS_VARIANT[r.status] || 'neutral'}>{r.status}</Badge> },
    { key: 'createdAt', label: 'Registered On', render: (r) => new Date(r.createdAt).toLocaleDateString() },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <button 
          onClick={() => handleViewDetails(r.id || r._id)}
          className="text-xs text-primary font-bold hover:underline cursor-pointer"
        >
          Manage Cockpit
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 relative h-full">
      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <h2 className="text-headline-lg font-headline-lg text-on-surface dark:text-zinc-100 text-[24px] font-bold tracking-tight">
          Tenant Operations Management
        </h2>
        <p className="text-body-md text-on-surface-variant dark:text-zinc-400 text-[14px]">
          Inspect tenants, manage subscription plans, update statuses, and perform override triggers.
        </p>
      </div>

      {/* Filters Card */}
      <Card className="p-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="relative">
            <Input
              label="Search Tenants"
              placeholder="Search by name or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
            <button type="submit" className="absolute right-3 bottom-3 text-on-surface-variant/70 cursor-pointer">
              <HiOutlineMagnifyingGlass className="text-lg" />
            </button>
          </div>
          <Select
            label="Filter Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
            ]}
          />
          <Select
            label="Subscription Plan"
            value={subscriptionPlan}
            onChange={(e) => setSubscriptionPlan(e.target.value)}
            options={[
              { value: '', label: 'All Plans' },
              { value: 'FREE', label: 'Free' },
              { value: 'PRO', label: 'Pro' },
              { value: 'SUPER', label: 'Super' },
            ]}
          />
          <Button type="submit" variant="primary">Apply Filters</Button>
        </form>
      </Card>

      {/* Tenants Table */}
      <Card className="flex flex-col gap-4">
        <Table columns={columns} data={tenants} loading={loading} emptyMessage="No tenants matched search criteria." />

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border-base dark:border-zinc-900 pt-4 mt-2">
            <span className="text-xs text-on-surface-variant dark:text-zinc-450">
              Showing page {page} of {totalPages} ({total} total tenants)
            </span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page <= 1} 
                onClick={() => setPage(page - 1)}
              >
                <HiOutlineChevronLeft /> Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page >= totalPages} 
                onClick={() => setPage(page + 1)}
              >
                Next <HiOutlineChevronRight />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Slide-over Detail Panel */}
      {panelOpen && (
        <div className="fixed inset-y-0 right-0 w-[500px] max-w-full bg-white dark:bg-zinc-950 shadow-2xl border-l border-border-base dark:border-zinc-900 z-[200] flex flex-col transition-all duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-6 h-16 border-b border-border-base dark:border-zinc-900 shrink-0">
            <h3 className="font-bold text-lg text-on-surface dark:text-zinc-200">
              Tenant Control Panel
            </h3>
            <button 
              onClick={() => { setPanelOpen(false); setSelectedTenant(null); }}
              className="btn btn-sm btn-ghost btn-circle cursor-pointer text-xl"
            >
              <HiOutlineXMark />
            </button>
          </div>

          {/* Details Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loadingDetail ? (
              <div className="h-48 flex items-center justify-center">
                <span className="loading loading-spinner loading-md text-primary"></span>
              </div>
            ) : selectedTenant ? (
              <>
                {/* Tenant overview */}
                <div className="space-y-3">
                  <div>
                    <h4 className="text-2xl font-bold text-primary dark:text-primary-fixed-dim">
                      {selectedTenant.tenant.name}
                    </h4>
                    <span className="text-xs text-on-surface-variant font-mono">ID: {selectedTenant.tenant.id || selectedTenant.tenant._id}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Badge variant={USER_STATUS_VARIANT[selectedTenant.tenant.status] || 'neutral'}>
                      {selectedTenant.tenant.status}
                    </Badge>
                    <Badge variant={selectedTenant.tenant.subscriptionPlan === 'SUPER' ? 'primary' : selectedTenant.tenant.subscriptionPlan === 'PRO' ? 'success' : 'neutral'}>
                      {selectedTenant.tenant.subscriptionPlan} Plan
                    </Badge>
                  </div>
                </div>

                {/* Owner Information */}
                <div className="space-y-2 border-t border-border-base dark:border-zinc-900 pt-4">
                  <h5 className="font-bold text-[14px] uppercase tracking-wider text-on-surface-variant">Owner Contact</h5>
                  {selectedTenant.owner ? (
                    <div className="text-xs space-y-1">
                      <p><strong>Name:</strong> {selectedTenant.owner.firstName} {selectedTenant.owner.lastName}</p>
                      <p><strong>Email:</strong> {selectedTenant.owner.email}</p>
                      <p><strong>Phone:</strong> {selectedTenant.owner.phone || 'N/A'}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-error font-semibold flex items-center gap-1">
                      <HiOutlineExclamationTriangle /> Owner profile not found!
                    </p>
                  )}
                </div>

                {/* Subscription Details */}
                <div className="space-y-2 border-t border-border-base dark:border-zinc-900 pt-4">
                  <div className="flex justify-between items-center">
                    <h5 className="font-bold text-[14px] uppercase tracking-wider text-on-surface-variant">Subscription Billing</h5>
                    <button 
                      onClick={handleOpenOverrideModal} 
                      className="text-xs text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <HiOutlineCreditCard /> Override Plan
                    </button>
                  </div>
                  {selectedTenant.activeSubscription ? (
                    <div className="text-xs space-y-1 bg-surface-container-low dark:bg-zinc-900/40 p-3 rounded-lg border border-border-base dark:border-zinc-900">
                      <p><strong>Plan Name:</strong> {selectedTenant.activeSubscription.planId?.name || selectedTenant.activeSubscription.plan || 'Free'}</p>
                      <p><strong>Billing Cycle:</strong> {selectedTenant.activeSubscription.billingCycle}</p>
                      <p><strong>Billing Status:</strong> <span className="font-bold text-emerald-500">{selectedTenant.activeSubscription.status}</span></p>
                      <p><strong>Price Amount:</strong> ₹{(selectedTenant.activeSubscription.amount || 0).toLocaleString()}</p>
                      <p><strong>End Date:</strong> {new Date(selectedTenant.activeSubscription.endDate).toLocaleDateString()}</p>
                      {selectedTenant.activeSubscription.trialEndsAt && (
                        <p className="text-orange-500 font-semibold flex items-center gap-1 mt-1">
                          <HiOutlineClock /> Trial ends: {new Date(selectedTenant.activeSubscription.trialEndsAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-on-surface-variant italic">No active subscription found. Plan details defaults to Free.</p>
                  )}
                </div>

                {/* Operations & Usage Metrics */}
                <div className="space-y-2 border-t border-border-base dark:border-zinc-900 pt-4">
                  <h5 className="font-bold text-[14px] uppercase tracking-wider text-on-surface-variant">Operations & Usage Metrics</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-container-low dark:bg-zinc-900/40 p-3 rounded-lg border border-border-base dark:border-zinc-900 text-center">
                      <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-semibold mb-1">Total Users</span>
                      <span className="text-xl font-bold text-primary dark:text-primary-fixed-dim">{selectedTenant.userCount || 0}</span>
                    </div>
                    <div className="bg-surface-container-low dark:bg-zinc-900/40 p-3 rounded-lg border border-border-base dark:border-zinc-900 text-center">
                      <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-semibold mb-1">Order Volume</span>
                      <span className="text-xl font-bold text-primary dark:text-primary-fixed-dim">{selectedTenant.orderVolume || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Outlets List */}
                <div className="space-y-2 border-t border-border-base dark:border-zinc-900 pt-4">
                  <h5 className="font-bold text-[14px] uppercase tracking-wider text-on-surface-variant">Outlets ({selectedTenant.outlets?.length || 0})</h5>
                  {selectedTenant.outlets?.length > 0 ? (
                    <div className="space-y-2">
                      {selectedTenant.outlets.map((outlet) => (
                        <div key={outlet._id} className="text-xs p-2.5 rounded-lg border border-border-base dark:border-zinc-900 flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-on-surface dark:text-zinc-200">{outlet.name}</p>
                            <p className="text-[10px] text-on-surface-variant font-mono">{outlet.city}, {outlet.state}</p>
                          </div>
                          <Badge variant={USER_STATUS_VARIANT[outlet.status] || 'neutral'}>{outlet.status}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-on-surface-variant italic">No outlets registered under this tenant.</p>
                  )}
                </div>

                {/* Platform Danger Actions */}
                <div className="space-y-3 border-t border-border-base dark:border-zinc-900 pt-6">
                  <h5 className="font-bold text-[14px] uppercase tracking-wider text-red-500">Platform Actions</h5>
                  <div className="flex gap-2.5">
                    {selectedTenant.tenant.status === 'ACTIVE' ? (
                      <Button 
                        onClick={() => handleOpenStatusModal('INACTIVE')} 
                        variant="danger" 
                        size="sm"
                        className="flex-1"
                      >
                        Suspend Tenant
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => handleOpenStatusModal('ACTIVE')} 
                        variant="primary" 
                        size="sm"
                        className="flex-1"
                      >
                        Activate Tenant
                      </Button>
                    )}
                    <Button 
                      onClick={handleOpenDeleteModal} 
                      variant="danger" 
                      size="sm"
                      className="flex-1"
                    >
                      Delete Tenant
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Suspend/Activate Modal */}
      <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} title={`${targetStatus === 'ACTIVE' ? 'Activate' : 'Suspend'} Tenant`}>
        <div className="space-y-4">
          <p className="text-xs text-on-surface-variant">
            Updating the status will cascade to all outlets registered under this tenant. Please provide a clear audit reason.
          </p>
          <Input
            label="Reason for status change"
            placeholder="e.g. Violation of subscription terms / Billing updated"
            value={statusReason}
            onChange={(e) => setStatusReason(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setShowStatusModal(false)}>Cancel</Button>
            <Button 
              variant={targetStatus === 'ACTIVE' ? 'primary' : 'danger'} 
              size="sm" 
              loading={updatingStatus}
              onClick={handleConfirmStatusUpdate}
              disabled={statusReason.trim().length < 5}
            >
              Confirm Update
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Tenant (Critical Trigger)">
        <div className="space-y-4">
          <div className="alert alert-error text-xs rounded-lg flex items-start gap-2 shadow-xs">
            <HiOutlineExclamationTriangle className="text-xl shrink-0 mt-0.5" />
            <div>
              <strong className="block">CRITICAL WARNING</strong>
              Soft deleting this tenant will flag all active users, outlets, and subscription billing entries as deleted in the database.
            </div>
          </div>
          <Input
            label="Provide deletion reason"
            placeholder="e.g. Account onboarding cancellation request"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button 
              variant="danger" 
              size="sm" 
              loading={deletingTenant}
              onClick={handleConfirmDelete}
              disabled={deleteReason.trim().length < 5}
            >
              Permanently Soft Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Subscription Override Modal */}
      <Modal isOpen={showOverrideModal} onClose={() => setShowOverrideModal(false)} title="Override Tenant Subscription">
        <form onSubmit={handleConfirmOverride} className="space-y-4">
          <Select
            label="Target Plan"
            value={overrideForm.planId}
            onChange={(e) => setOverrideForm({ ...overrideForm, planId: e.target.value })}
            options={availablePlans.map(p => ({ value: p._id, label: `${p.name} (${p.slug})` }))}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Billing Cycle"
              value={overrideForm.billingCycle}
              onChange={(e) => setOverrideForm({ ...overrideForm, billingCycle: e.target.value })}
              options={[
                { value: 'MONTHLY', label: 'Monthly' },
                { value: 'YEARLY', label: 'Yearly' },
              ]}
              required
            />
            <Select
              label="Subscription Status"
              value={overrideForm.status}
              onChange={(e) => setOverrideForm({ ...overrideForm, status: e.target.value })}
              options={[
                { value: 'ACTIVE', label: 'ACTIVE' },
                { value: 'INACTIVE', label: 'INACTIVE' },
                { value: 'CANCELLED', label: 'CANCELLED' },
                { value: 'TRIAL', label: 'TRIAL' },
                { value: 'GRACE_PERIOD', label: 'GRACE_PERIOD' },
              ]}
              required
            />
          </div>
          <Input
            label="Override Price (Amount INR)"
            type="number"
            placeholder="Leave empty to use plan default price"
            value={overrideForm.amount}
            onChange={(e) => setOverrideForm({ ...overrideForm, amount: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Trial Ends At"
              type="date"
              value={overrideForm.trialEndsAt}
              onChange={(e) => setOverrideForm({ ...overrideForm, trialEndsAt: e.target.value })}
            />
            <Input
              label="Subscription End Date"
              type="date"
              value={overrideForm.endDate}
              onChange={(e) => setOverrideForm({ ...overrideForm, endDate: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowOverrideModal(false)}>Cancel</Button>
            <Button 
              type="submit" 
              variant="primary" 
              size="sm" 
              loading={overridingSub}
            >
              Save Subscription Override
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
