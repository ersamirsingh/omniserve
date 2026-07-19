import { useState, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import PageHeader from '../../components/ui/PageHeader';
import { listOutletsApi } from '../../api/models/outlet.api';
import { getList, getEntityId, getRefId } from '../../utils/apiData';
import {
  getMySubscriptionApi,
  getUsageApi,
  getInvoiceHistoryApi,
  upgradeSubscriptionApi,
  cancelSubscriptionApi,
  resumeSubscriptionApi,
  renewSubscriptionApi,
  listPlansApi,
  createPlanApi,
  updatePlanApi,
  deletePlanApi,
  listAllSubscriptionsApi,
  listAllInvoicesApi,
  getSubscriptionAnalyticsApi,
  validateSubscriptionCouponApi
} from '../../api/models/subscription.api';
import {
  HiOutlineShieldCheck,
  HiOutlineCreditCard,
  HiOutlineClock,
  HiOutlineChartBar,
  HiOutlineUserGroup,
  HiOutlineBuildingStorefront,
  HiOutlineReceiptPercent,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiPlus,
  HiOutlineCalendar,
  HiOutlineTrash,
  HiOutlinePencilSquare,
  HiOutlineCheck,
  HiOutlineInformationCircle,
  HiChevronLeft,
  HiChevronRight
} from 'react-icons/hi2';

// High-fidelity fallback plans in case API list is temporarily empty
const FALLBACK_PLANS = [
  {
    _id: "6a3c17666bb70afe757e2221",
    name: "Free Trial Plan",
    slug: "free",
    description: "1 Outlet, 5 Employees, 100 Orders/mo, QR ordering, basic support.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: "INR",
    trialDays: 14,
    features: { inventory: false, crm: false, analytics: false, finance: false, kitchenDisplay: false, waiterApp: false, qrOrdering: true, reports: false, apiAccess: false, whiteLabel: false },
    limits: { outlets: 1, employees: 5, monthlyOrders: 100, menuItems: 100, storageGB: 1 }
  },
  {
    _id: "6a3c17666bb70afe757e2222",
    name: "Pro Plan",
    slug: "pro",
    description: "2 Outlets, 15 Employees, Unlimited QR Orders, CRM, Analytics, Inventory, KDS.",
    monthlyPrice: 999,
    yearlyPrice: 9990,
    currency: "INR",
    trialDays: 0,
    features: { inventory: true, crm: true, analytics: true, finance: false, kitchenDisplay: true, waiterApp: true, qrOrdering: true, reports: false, apiAccess: false, whiteLabel: false },
    limits: { outlets: 2, employees: 15, monthlyOrders: 1000000, menuItems: 500, storageGB: 5 }
  },
  {
    _id: "6a3c17666bb70afe757e2223",
    name: "Super Plan",
    slug: "super",
    description: "105 Outlets, Unlimited Employees/Orders, Dedicated Account Manager, API Access, White-Label.",
    monthlyPrice: 2999,
    yearlyPrice: 29990,
    currency: "INR",
    trialDays: 0,
    features: { inventory: true, crm: true, analytics: true, finance: true, kitchenDisplay: true, waiterApp: true, qrOrdering: true, reports: true, apiAccess: true, whiteLabel: true },
    limits: { outlets: 105, employees: 10000, monthlyOrders: 10000000, menuItems: 10000, storageGB: 100 }
  }
];

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const isSuperAdmin = user?.role === 'SYSTEM_ADMIN'; // SYSTEM_ADMIN accesses the global SaaS plan configuration and analytics dashboard.

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('current');

  // --- Outlet Scoping States ---
  const [outlets, setOutlets] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [loadingOutlets, setLoadingOutlets] = useState(true);

  // --- Common States ---
  const [plans, setPlans] = useState([]);

  // --- Restaurant Owner States ---
  const [mySubscription, setMySubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [billingCycleToggle, setBillingCycleToggle] = useState('MONTHLY'); // MONTHLY / YEARLY
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentProvider, setPaymentProvider] = useState('stripe');
  
  // Interactive mock payment inputs
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Coupon codes integration states
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState(null);

  // --- Super Admin States ---
  const [analytics, setAnalytics] = useState(null);
  const [allSubscriptions, setAllSubscriptions] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [planForm, setPlanForm] = useState({
    name: '',
    slug: '',
    description: '',
    monthlyPrice: 0,
    yearlyPrice: 0,
    trialDays: 14,
    features: {
      inventory: false,
      crm: false,
      analytics: false,
      finance: false,
      kitchenDisplay: false,
      waiterApp: false,
      qrOrdering: true,
      reports: false,
      apiAccess: false,
      whiteLabel: false,
    },
    limits: {
      outlets: 1,
      employees: 5,
      monthlyOrders: 100,
      menuItems: 100,
      storageGB: 1,
    }
  });

  useEffect(() => {
    const loadOutlets = async () => {
      setLoadingOutlets(true);
      try {
        const res = await listOutletsApi();
        const list = getList(res, 'outlets');
        setOutlets(list);
        if (list.length > 0 && !selectedOutletId) {
          const userOutlet = getRefId(user?.outletId || (user?.outletIds && user.outletIds[0]));
          setSelectedOutletId(userOutlet || getEntityId(list[0]));
        }
      } catch (err) {
        console.error('Failed to load outlets for SubscriptionsPage:', err);
      } finally {
        setLoadingOutlets(false);
      }
    };
    loadOutlets();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isSuperAdmin) {
        const [plansRes, analyticsRes, subsRes, invoicesRes] = await Promise.all([
          listPlansApi(),
          getSubscriptionAnalyticsApi(),
          listAllSubscriptionsApi(selectedOutletId ? { outletId: selectedOutletId } : {}),
          listAllInvoicesApi()
        ]);
        setPlans(plansRes.data?.data?.plans?.length ? plansRes.data.data.plans : FALLBACK_PLANS);
        setAnalytics(analyticsRes.data?.data || null);
        setAllSubscriptions(subsRes.data?.data?.subscriptions || []);
        setAllInvoices(invoicesRes.data?.data?.invoices || []);
      } else {
        const [subRes, usageRes, invoiceRes, plansRes] = await Promise.all([
          getMySubscriptionApi(selectedOutletId ? { outletId: selectedOutletId } : {}),
          getUsageApi(),
          getInvoiceHistoryApi(),
          listPlansApi()
        ]);
        setMySubscription(subRes.data?.data?.subscription || null);
        setUsage(usageRes.data?.data?.usage || null);
        setInvoices(invoiceRes.data?.data?.invoices || []);
        setPlans(plansRes.data?.data?.plans?.length ? plansRes.data.data.plans : FALLBACK_PLANS);
      }
    } catch (err) {
      console.error(err);
      // Populate fallback plans so page never renders blank
      setPlans(FALLBACK_PLANS);
      addToast('Failed to load subscription info from server. Displaying local cache.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isSuperAdmin, selectedOutletId]);

  // --- Owner Operations ---
  const handleCancelAutoRenew = async () => {
    if (!window.confirm('Are you sure you want to cancel auto-renewal? Your plan features will remain active until the billing date.')) return;
    try {
      await cancelSubscriptionApi();
      addToast('Auto-renewal cancelled successfully', 'success');
      fetchData();
    } catch {
      addToast('Failed to cancel auto-renewal', 'error');
    }
  };

  const handleResumeAutoRenew = async () => {
    try {
      await resumeSubscriptionApi();
      addToast('Auto-renewal resumed successfully', 'success');
      fetchData();
    } catch {
      addToast('Failed to resume auto-renewal', 'error');
    }
  };

  const handleRenewManual = async () => {
    const couponCodeInput = window.prompt("Enter coupon code for discount (optional):");
    try {
      await renewSubscriptionApi(couponCodeInput ? { couponCode: couponCodeInput.trim().toUpperCase() } : {});
      addToast('Subscription manual renewal processed successfully', 'success');
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to process renewal', 'error');
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }
    setValidatingCoupon(true);
    setCouponError(null);
    try {
      const basePrice = billingCycleToggle === 'MONTHLY' ? selectedPlan?.monthlyPrice : selectedPlan?.yearlyPrice;
      const res = await validateSubscriptionCouponApi(couponCode.trim().toUpperCase(), basePrice);
      if (res.data?.data?.isValid) {
        setAppliedCoupon(res.data.data.code);
        setCouponDiscount(res.data.data.discount);
        addToast('Coupon applied successfully!', 'success');
      } else {
        setCouponError(res.data?.data?.reason || 'Invalid coupon code');
      }
    } catch (err) {
      setCouponError(err.response?.data?.message || 'Failed to validate coupon');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponError(null);
  };

  const triggerUpgrade = (plan) => {
    setSelectedPlan(plan);
    setCheckoutStep(1); // Start at step 1 (Overview / Fixed Details)
    setPaymentModalOpen(true);
    // Reset inputs
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    setCardName('');
    // Reset coupon inputs
    setCouponCode('');
    setCouponDiscount(0);
    setAppliedCoupon(null);
    setCouponError(null);
  };

  const handleProcessUpgrade = async () => {
    if (paymentProvider === 'stripe' && (!cardNumber || !cardExpiry || !cardCvv || !cardName)) {
      addToast('Please fill out card checkout details', 'warning');
      return;
    }

    setPaymentProcessing(true);
    try {
      // Simulate network request delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await upgradeSubscriptionApi({
        planId: selectedPlan._id,
        billingCycle: billingCycleToggle,
        paymentProvider,
        couponCode: appliedCoupon || undefined,
        outletId: selectedOutletId || undefined,
      });
      addToast(`Payment Succeeded! Successfully subscribed to ${selectedPlan.name}`, 'success');
      setPaymentModalOpen(false);
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Payment simulation failed', 'error');
    } finally {
      setPaymentProcessing(false);
    }
  };

  // --- Super Admin Plan CRUD Operations ---
  const handleSavePlan = async (e) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        await updatePlanApi(editingPlan._id, planForm);
        addToast('Plan updated successfully', 'success');
      } else {
        await createPlanApi(planForm);
        addToast('Plan created successfully', 'success');
      }
      setPlanFormOpen(false);
      setEditingPlan(null);
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save plan', 'error');
    }
  };

  const handleCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm({
      name: '',
      slug: 'free',
      description: '',
      monthlyPrice: 0,
      yearlyPrice: 0,
      trialDays: 14,
      features: {
        inventory: false,
        crm: false,
        analytics: false,
        finance: false,
        kitchenDisplay: false,
        waiterApp: false,
        qrOrdering: true,
        reports: false,
        apiAccess: false,
        whiteLabel: false,
      },
      limits: {
        outlets: 1,
        employees: 5,
        monthlyOrders: 100,
        menuItems: 100,
        storageGB: 1,
      }
    });
    setWizardStep(1);
    setPlanFormOpen(true);
  };

  const handleEditPlan = (plan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      monthlyPrice: plan.monthlyPrice,
      yearlyPrice: plan.yearlyPrice,
      trialDays: plan.trialDays || 0,
      features: { ...plan.features },
      limits: { ...plan.limits }
    });
    setWizardStep(1);
    setPlanFormOpen(true);
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this subscription plan?')) return;
    try {
      await deletePlanApi(planId);
      addToast('Plan deleted successfully', 'success');
      fetchData();
    } catch {
      addToast('Failed to delete plan', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // ==========================================
  // VIEW RENDER: RESTAURANT OWNER DASHBOARD
  // ==========================================
  if (!isSuperAdmin) {
    const limits = mySubscription?.planId?.limits || {};
    const features = mySubscription?.planId?.features || {};

    const columns = [
      { key: 'invoiceNumber', label: 'Invoice Number', render: (r) => <span className="font-mono text-xs text-indigo-600 font-bold">{r.invoiceNumber}</span> },
      { key: 'total', label: 'Total Paid', render: (r) => <span className="font-bold text-on-background">₹{r.total.toLocaleString()}</span> },
      { key: 'status', label: 'Status', render: (r) => <Badge variant={r.status === 'PAID' ? 'success' : 'danger'}>{r.status}</Badge> },
      { key: 'paymentMethod', label: 'Method', render: (r) => <span className="text-xs uppercase font-semibold">{r.paymentMethod || 'Manual'}</span> },
      { key: 'paidAt', label: 'Paid Date', render: (r) => r.paidAt ? new Date(r.paidAt).toLocaleDateString() : 'N/A' },
      { key: 'actions', label: 'Actions', render: (r) => r.invoiceUrl ? (
        <a href={r.invoiceUrl} target="_blank" rel="noreferrer" className="no-underline">
          <Button size="sm" variant="secondary" className="text-xs">View Receipt</Button>
        </a>
      ) : <span className="text-zinc-500 text-xs">Direct payment</span> }
    ];

    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          section="Billing"
          title="Subscriptions Center"
          description="Scale your operational boundaries, verify automated recurring billing invoices, and upgrade features."
          actions={
            outlets.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-on-surface-variant dark:text-zinc-400">Outlet Scope:</span>
                <select
                  value={selectedOutletId}
                  onChange={(e) => setSelectedOutletId(e.target.value)}
                  className="px-3 py-1.5 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-xs text-on-surface dark:text-zinc-200 font-bold outline-none cursor-pointer"
                >
                  {outlets.map((o) => (
                    <option key={getEntityId(o)} value={getEntityId(o)}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            )
          }
        />

        {/* Tab Selection */}
        <div className="flex gap-2 border-b border-border-base dark:border-zinc-800 pb-px">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'current'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-on-surface-variant dark:text-zinc-500 hover:text-on-background'
            }`}
          >
            Billing Info & Usage
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'plans'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-on-surface-variant dark:text-zinc-500 hover:text-on-background'
            }`}
          >
            Upgrade Tiers
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'invoices'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-on-surface-variant dark:text-zinc-500 hover:text-on-background'
            }`}
          >
            Invoice History ({invoices.length})
          </button>
        </div>

        {/* TAB content: CURRENT BILLING AND METERS */}
        {activeTab === 'current' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Plan details card */}
            <Card className="lg:col-span-1 bg-white dark:bg-zinc-950 p-6 rounded-2xl flex flex-col justify-between border-border-base dark:border-zinc-900 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 bg-indigo-600/10 text-indigo-500 text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-bl-xl border-l border-b border-indigo-600/10">
                Current active plan
              </div>
              <div className="mt-4">
                <div className="flex justify-between items-start mb-4">
                  <Badge variant={mySubscription?.status === 'ACTIVE' ? 'success' : 'warning'} className="uppercase font-extrabold tracking-wider text-[9px]">
                    {mySubscription?.status || 'TRIAL'}
                  </Badge>
                </div>
                <h3 className="text-xl font-extrabold text-on-background">{mySubscription?.planId?.name || 'Free Trial Plan'}</h3>
                <p className="text-[11px] text-zinc-500 mt-2">{mySubscription?.planId?.description || '1 Outlet, 5 Employees, 100 Orders/mo, Basic Support'}</p>

                <div className="mt-6 space-y-3.5 border-t border-zinc-100 dark:border-zinc-900 pt-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Billing Period:</span>
                    <span className="font-bold text-on-background capitalize">{mySubscription?.billingCycle?.toLowerCase() || 'monthly'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Started on:</span>
                    <span className="font-bold text-on-background">
                      {mySubscription?.startDate ? new Date(mySubscription.startDate).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Renewal due:</span>
                    <span className="font-bold text-on-background">
                      {mySubscription?.endDate ? new Date(mySubscription.endDate).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Renewal state:</span>
                    <Badge variant={mySubscription?.renewalEnabled ? 'success' : 'danger'}>
                      {mySubscription?.renewalEnabled ? 'Auto-Renew' : 'Expires at End'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-8 space-y-2.5">
                {mySubscription?.renewalEnabled ? (
                  <Button variant="danger" size="sm" onClick={handleCancelAutoRenew} className="w-full font-bold text-xs py-2.5">
                    Cancel Subscription Auto-Renewal
                  </Button>
                ) : (
                  <Button variant="success" size="sm" onClick={handleResumeAutoRenew} className="w-full font-bold text-xs py-2.5">
                    Resume Auto-Renewal
                  </Button>
                )}

                {mySubscription?.status === 'GRACE_PERIOD' && (
                  <Button variant="primary" size="sm" onClick={handleRenewManual} className="w-full font-extrabold shadow-lg shadow-indigo-600/35 py-2.5">
                    Settle Pending Balance & Renew
                  </Button>
                )}
              </div>
            </Card>

            {/* Resource Limit meters */}
            <Card className="lg:col-span-2 bg-white dark:bg-zinc-950 p-6 rounded-2xl border-border-base dark:border-zinc-900 shadow-xl flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-on-background flex items-center gap-1.5 mb-6">
                  <HiOutlineChartBar className="text-indigo-500 w-5 h-5" /> Resource Usage Indicators
                </h4>

                <div className="space-y-6">
                  {/* Outlets Meter */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-2">
                      <span className="text-zinc-500 flex items-center gap-1"><HiOutlineBuildingStorefront /> Outlets Allocated</span>
                      <span className="text-on-background font-bold">{usage?.outletsUsed || 0} / {limits.outlets || 1}</span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-900 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, ((usage?.outletsUsed || 0) / (limits.outlets || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Employees Meter */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-2">
                      <span className="text-zinc-500 flex items-center gap-1"><HiOutlineUserGroup /> Employees Added</span>
                      <span className="text-on-background font-bold">{usage?.employeesUsed || 0} / {limits.employees || 5}</span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-900 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-teal-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, ((usage?.employeesUsed || 0) / (limits.employees || 5)) * 105)}%` }}
                      />
                    </div>
                  </div>

                  {/* Orders Meter */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-2">
                      <span className="text-zinc-500 flex items-center gap-1"><HiOutlineReceiptPercent /> Monthly Orders Placed</span>
                      <span className="text-on-background font-bold">{usage?.ordersUsed || 0} / {limits.monthlyOrders >= 1000000 ? 'Unlimited' : limits.monthlyOrders || 100}</span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-900 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, ((usage?.ordersUsed || 0) / (limits.monthlyOrders || 100)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Alert context */}
              {mySubscription?.status === 'GRACE_PERIOD' && (
                <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-xl text-xs flex gap-2.5 items-start">
                  <span className="text-lg">⚠️</span>
                  <div>
                    <span className="font-extrabold uppercase block mb-1">Grace Period Warning</span>
                    Your subscription expired. Settle your billing balance by {new Date(mySubscription.graceEndsAt).toLocaleDateString()} to prevent your platform access from switching to Read-Only mode.
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* TAB content: UPGRADE AND PLANS */}
        {activeTab === 'plans' && (
          <div className="space-y-6">
            <div className="flex justify-center mb-6">
              <div className="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1 border border-zinc-200 dark:border-zinc-800">
                <button
                  onClick={() => setBillingCycleToggle('MONTHLY')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition ${
                    billingCycleToggle === 'MONTHLY' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Monthly Billing
                </button>
                <button
                  onClick={() => setBillingCycleToggle('YEARLY')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition ${
                    billingCycleToggle === 'YEARLY' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Yearly Billing (Save 15%)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((p) => {
                const isActivePlan = mySubscription?.planId?.slug === p.slug;
                const isFree = p.slug === 'free';
                const price = billingCycleToggle === 'MONTHLY' ? p.monthlyPrice : p.yearlyPrice;

                return (
                  <Card key={p._id} className={`bg-white dark:bg-zinc-950 p-6 rounded-2xl border flex flex-col justify-between shadow-lg transition duration-300 hover:translate-y-[-4px] ${
                    isActivePlan ? 'border-indigo-600 shadow-indigo-600/5 ring-2 ring-indigo-600' : 'border-border-base dark:border-zinc-900'
                  }`}>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="font-extrabold text-[15px] text-on-background">{p.name}</h3>
                        {p.slug === 'pro' && <span className="bg-indigo-500/10 text-indigo-500 text-[8px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full">POPULAR</span>}
                      </div>
                      <div className="flex items-baseline gap-1 my-3">
                        <span className="text-2xl font-black text-on-background">₹{price.toLocaleString()}</span>
                        <span className="text-zinc-500 text-xs font-semibold capitalize">/{billingCycleToggle.toLowerCase()}</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 leading-relaxed mb-6">{p.description}</p>

                      <ul className="space-y-2.5 text-xs text-on-surface-variant dark:text-zinc-400 border-t border-zinc-150 dark:border-zinc-900 pt-4">
                        <li className="flex items-center gap-2"><HiOutlineCheckCircle className="text-indigo-500 w-4 h-4" /> Max {p.limits.outlets} Outlets</li>
                        <li className="flex items-center gap-2"><HiOutlineCheckCircle className="text-indigo-500 w-4 h-4" /> Max {p.limits.employees} Staff members</li>
                        <li className="flex items-center gap-2"><HiOutlineCheckCircle className="text-indigo-500 w-4 h-4" /> {p.limits.monthlyOrders >= 1000000 ? 'Unlimited' : `${p.limits.monthlyOrders} Orders/mo`}</li>
                        {p.features.inventory ? (
                          <li className="flex items-center gap-2 text-on-surface-variant dark:text-zinc-300"><HiOutlineCheck className="text-indigo-500 w-4 h-4" /> Stock/Inventory Sync</li>
                        ) : (
                          <li className="flex items-center gap-2 text-zinc-550"><HiOutlineXCircle className="text-zinc-650 w-4 h-4" /> Inventory locked</li>
                        )}
                        {p.features.crm ? (
                          <li className="flex items-center gap-2 text-on-surface-variant dark:text-zinc-300"><HiOutlineCheck className="text-indigo-500 w-4 h-4" /> Customer CRM</li>
                        ) : (
                          <li className="flex items-center gap-2 text-zinc-550"><HiOutlineXCircle className="text-zinc-650 w-4 h-4" /> CRM locked</li>
                        )}
                        {p.features.kitchenDisplay ? (
                          <li className="flex items-center gap-2 text-on-surface-variant dark:text-zinc-300"><HiOutlineCheck className="text-indigo-500 w-4 h-4" /> Kitchen Displays</li>
                        ) : (
                          <li className="flex items-center gap-2 text-zinc-550"><HiOutlineXCircle className="text-zinc-650 w-4 h-4" /> KDS locked</li>
                        )}
                        {p.features.apiAccess ? (
                          <li className="flex items-center gap-2 text-on-surface-variant dark:text-zinc-300"><HiOutlineCheck className="text-indigo-500 w-4 h-4" /> API Access</li>
                        ) : (
                          <li className="flex items-center gap-2 text-zinc-550"><HiOutlineXCircle className="text-zinc-650 w-4 h-4" /> API Access locked</li>
                        )}
                      </ul>
                    </div>

                    <div className="mt-8">
                      {isActivePlan ? (
                        <div className="w-full py-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 rounded-lg text-xs font-extrabold text-center">
                          Active Plan
                        </div>
                      ) : (
                        <Button
                          variant="primary"
                          disabled={isFree}
                          onClick={() => triggerUpgrade(p)}
                          className="w-full text-xs font-bold cursor-pointer"
                        >
                          {isFree ? 'Cannot select Free Trial' : 'Subscribe Plan'}
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB content: INVOICES LIST */}
        {activeTab === 'invoices' && (
          <Table columns={columns} data={invoices} emptyMessage="No subscription billing receipts available" />
        )}

        {/* HIGH FIDELITY MOCK PAYMENT MODAL (2-STEP WIZARD) */}        <Modal isOpen={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="Checkout Subscription" size="sm">
          {/* STEP 1: CONFIRM DETAILS (DATES & AMOUNT FIXED) */}
          {checkoutStep === 1 && (
            <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1 animate-fade-in">
              {/* Plan Summary Card */}
              <div className="p-3 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl">
                <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider block">Selected Plan</span>
                <h4 className="text-sm font-black text-on-background mt-0.5">{selectedPlan?.name}</h4>
                <p className="text-[10px] text-zinc-500 mt-0.5">{selectedPlan?.description}</p>
              </div>

              {/* Details Grid */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-border-base dark:border-zinc-900 rounded-xl space-y-2 text-xs font-semibold">
                <h5 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Duration & Period</h5>
                
                <div className="flex justify-between">
                  <span className="text-zinc-500">Billing Cycle:</span>
                  <span className="text-on-background capitalize">{billingCycleToggle.toLowerCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Subscription Period:</span>
                  <span className="text-on-background">{billingCycleToggle === 'MONTHLY' ? '1 Month' : '1 Year'}</span>
                </div>
                {selectedPlan?.trialDays > 0 ? (
                  <div className="flex justify-between text-green-600">
                    <span>Free Trial Period:</span>
                    <span>{selectedPlan.trialDays} Days</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-zinc-500">
                    <span>Free Trial Period:</span>
                    <span>None</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-zinc-100 dark:border-zinc-900 pt-2 text-[11px]">
                  <span className="text-zinc-500">Start Date:</span>
                  <span className="text-on-background">{new Date().toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-500">First Billing Date:</span>
                  <span className="text-on-background">
                    {(() => {
                      const d = new Date();
                      if (selectedPlan?.trialDays > 0) {
                        d.setDate(d.getDate() + selectedPlan.trialDays);
                      } else if (billingCycleToggle === 'MONTHLY') {
                        d.setMonth(d.getMonth() + 1);
                      } else {
                        d.setFullYear(d.getFullYear() + 1);
                      }
                      return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
                    })()}
                  </span>
                </div>
              </div>

              {/* Promo Coupon Entry */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-border-base dark:border-zinc-900 rounded-xl space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Promo Coupon</label>
                {appliedCoupon ? (
                  <div className="flex justify-between items-center bg-green-500/10 border border-green-500/35 rounded-lg px-3 py-2 text-xs font-bold text-green-600 dark:text-green-400">
                    <span>Voucher Applied: {appliedCoupon}</span>
                    <button type="button" onClick={handleRemoveCoupon} className="text-xs font-extrabold underline cursor-pointer text-red-500 hover:text-red-700 bg-transparent border-none">Remove</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. SOFTWARE50"
                      className="flex-1 px-3 py-2 bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-xs outline-none focus:border-indigo-500 font-mono uppercase text-on-background"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    />
                    <Button variant="secondary" size="sm" onClick={handleApplyCoupon} loading={validatingCoupon} className="text-xs font-bold py-1 px-3">
                      Apply
                    </Button>
                  </div>
                )}
                {couponError && <p className="text-[10px] text-red-500 font-semibold">{couponError}</p>}
              </div>

              {/* Financials details */}
              {(() => {
                const basePrice = billingCycleToggle === 'MONTHLY' ? selectedPlan?.monthlyPrice : selectedPlan?.yearlyPrice;
                const netPrice = Math.max(0, basePrice - couponDiscount);
                const gst = Number((netPrice * 0.18).toFixed(2));
                const totalPayable = netPrice + gst;
                return (
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-border-base dark:border-zinc-900 rounded-xl space-y-2 text-xs font-semibold">
                    <h5 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Billing Summary</h5>
                    
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Base Price:</span>
                      <span className="text-on-background">₹{basePrice?.toLocaleString()}</span>
                    </div>

                    {appliedCoupon && (
                      <div className="flex justify-between text-green-600 dark:text-green-400 font-bold">
                        <span>Coupon Discount ({appliedCoupon}):</span>
                        <span>-₹{couponDiscount?.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-zinc-500">GST (18%):</span>
                      <span className="text-on-background">₹{gst.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between border-t border-zinc-150 dark:border-zinc-900 pt-2.5 text-sm font-black text-indigo-500">
                      <span>Total Payable:</span>
                      <span>₹{totalPayable.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Footer buttons */}
              <div className="pt-4 border-t border-border-base dark:border-zinc-900 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setPaymentModalOpen(false)} className="text-xs font-bold">Cancel</Button>
                <Button variant="primary" onClick={() => setCheckoutStep(2)} className="text-xs font-bold flex items-center gap-1.5">
                  Next <HiChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: CHOOSE PAYMENT METHOD & INPUTS */}
          {checkoutStep === 2 && (
            <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1 animate-fade-in">
              {/* Plan Total Sticky Header */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-150 dark:border-zinc-900 rounded-xl flex justify-between items-center text-xs font-bold">
                <span className="text-zinc-500">Amount to pay:</span>
                <span className="text-indigo-500 text-sm font-black">
                  {(() => {
                    const basePrice = billingCycleToggle === 'MONTHLY' ? selectedPlan?.monthlyPrice : selectedPlan?.yearlyPrice;
                    const netPrice = Math.max(0, basePrice - couponDiscount);
                    const gst = Number((netPrice * 0.18).toFixed(2));
                    return `₹${(netPrice + gst).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
                  })()}
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Choose Payment Method</label>
                <div className="flex flex-col gap-3.5">
                  {['stripe', 'razorpay', 'manual'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPaymentProvider(p)}
                      className={`py-2 text-[10px] font-bold uppercase tracking-wider border rounded-xl transition cursor-pointer ${
                        paymentProvider === p
                          ? 'border-indigo-600 bg-indigo-600/5 text-indigo-500 font-extrabold ring-1 ring-indigo-500'
                          : 'border-border-base dark:border-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-450'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* STRIPE PAYMENT CARD INPUT MOCK */}
              {paymentProvider === 'stripe' && (
                <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-950 border border-border-base dark:border-zinc-900 rounded-xl animate-fade-in font-sans">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1"><HiOutlineCreditCard /> Card Details</span>
                  <input
                    type="text"
                    placeholder="Card Number (e.g. 4111 2222 3333 4444)"
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-xs outline-none focus:border-indigo-500 font-mono"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.replace(/[^0-9 ]/g, ''))}
                    required
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Expiry (MM/YY)"
                      className="px-3 py-2 bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-xs outline-none focus:border-indigo-500 font-mono"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      required
                    />
                    <input
                      type="password"
                      placeholder="CVV"
                      maxLength={3}
                      className="px-3 py-2 bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-xs outline-none focus:border-indigo-500 font-mono"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, ''))}
                      required
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Cardholder Name"
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-xs outline-none focus:border-indigo-500"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* RAZORPAY UPI MOCK */}
              {paymentProvider === 'razorpay' && (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-border-base dark:border-zinc-900 rounded-xl flex flex-col items-center justify-center space-y-3 animate-fade-in text-center">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Razorpay UPI Checkout</span>
                  <div className="w-24 h-24 bg-white p-2 border border-zinc-200 rounded-lg flex items-center justify-center shadow-inner select-none">
                    <span className="text-lg font-sans">📱 UPI QR</span>
                  </div>
                  <span className="text-[10px] text-zinc-500">Scan QR Code using PhonePe, GPay, or UPI app to pay</span>
                </div>
              )}

              {/* MANUAL CODE PANEL */}
              {paymentProvider === 'manual' && (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-border-base dark:border-zinc-900 rounded-xl space-y-3 animate-fade-in">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Offline Manual Code</span>
                  <input
                    type="text"
                    placeholder="Activation voucher code (e.g. OFF-REN-XXXX)"
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-xs outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                </div>
              )}

              {/* Footer buttons */}
              <div className="pt-4 border-t border-border-base dark:border-zinc-900 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setCheckoutStep(1)} disabled={paymentProcessing} className="text-xs font-bold flex items-center gap-1"><HiChevronLeft className="w-4 h-4" /> Back</Button>
                <Button variant="primary" onClick={handleProcessUpgrade} disabled={paymentProcessing} className="text-xs font-extrabold shadow-lg shadow-indigo-600/25 flex items-center gap-1.5 py-2">
                  {paymentProcessing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-b-2 border-white rounded-full animate-spin"></div>
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <span>Simulate Payment & Activate</span>
                  )}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    );
  }

  // ==========================================
  // VIEW RENDER: SUPER ADMIN SUBSCRIPTION PANEL
  // ==========================================
  const activeSubsColumns = [
    { key: 'tenantId', label: 'Tenant ID', render: (r) => <span className="font-mono text-xs text-on-surface-variant">{r.tenantId}</span> },
    { key: 'plan', label: 'Plan', render: (r) => <Badge variant="info">{r.planId?.name || 'N/A'}</Badge> },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={r.status === 'ACTIVE' ? 'success' : 'warning'}>{r.status}</Badge> },
    { key: 'billingCycle', label: 'Billing Cycle', render: (r) => <span className="capitalize text-xs font-semibold">{r.billingCycle?.toLowerCase()}</span> },
    { key: 'endDate', label: 'Next Renewal', render: (r) => r.endDate ? new Date(r.endDate).toLocaleDateString() : 'N/A' },
  ];

  const allInvoicesColumns = [
    { key: 'tenantId', label: 'Tenant ID', render: (r) => <span className="font-mono text-xs">{r.tenantId}</span> },
    { key: 'invoiceNumber', label: 'Invoice No.', render: (r) => <span className="font-mono text-xs font-bold text-indigo-500">{r.invoiceNumber}</span> },
    { key: 'total', label: 'Total', render: (r) => <span className="font-bold">₹{r.total.toLocaleString()}</span> },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={r.status === 'PAID' ? 'success' : 'danger'}>{r.status}</Badge> },
    { key: 'paymentMethod', label: 'Method', render: (r) => <span className="text-xs uppercase font-semibold">{r.paymentMethod}</span> },
    { key: 'paidAt', label: 'Paid At', render: (r) => r.paidAt ? new Date(r.paidAt).toLocaleDateString() : '—' }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        section="SaaS Platform"
        title="Subscription Console"
        description="Monitor tenant allocations, compile ARR/MRR statistics, and configure core feature-guard tier models."
        actions={
          <Button onClick={handleCreatePlan} className="flex items-center gap-1.5 font-bold cursor-pointer hover:scale-105 transition-all">
            <HiPlus /> Add Billing Plan
          </Button>
        }
      />

      {/* Tab Selectors */}
      <div className="flex gap-2 border-b border-border-base dark:border-zinc-800 pb-px">
        {['analytics', 'plans', 'subscriptions', 'invoices'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === tab
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-on-surface-variant dark:text-zinc-500 hover:text-on-background'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* SUPER ADMIN ANALYTICS TAB */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-border-base dark:border-zinc-900 shadow">
              <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Monthly Recurring Revenue (MRR)</span>
              <h3 className="text-2xl font-black text-indigo-500 mt-2">₹{analytics.mrr.toLocaleString()}</h3>
            </Card>
            <Card className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-border-base dark:border-zinc-900 shadow">
              <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Annual Recurring Revenue (ARR)</span>
              <h3 className="text-2xl font-black text-teal-500 mt-2">₹{analytics.arr.toLocaleString()}</h3>
            </Card>
            <Card className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-border-base dark:border-zinc-900 shadow">
              <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Active Paid Tenants</span>
              <h3 className="text-2xl font-black text-on-background mt-2">{analytics.paidUsers}</h3>
            </Card>
            <Card className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-border-base dark:border-zinc-900 shadow">
              <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Total Platform Revenue</span>
              <h3 className="text-2xl font-black text-purple-500 mt-2">₹{analytics.revenue.toLocaleString()}</h3>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 bg-white dark:bg-zinc-950 p-5 rounded-xl border border-border-base dark:border-zinc-900 shadow">
              <h4 className="font-bold text-xs text-zinc-500 uppercase tracking-wider mb-4">Plan Popularity Breakdown</h4>
              <div className="space-y-3">
                {analytics.planStats?.map((stat) => (
                  <div key={stat.name} className="flex justify-between text-xs font-semibold">
                    <span className="text-on-surface-variant dark:text-zinc-400">{stat.name}</span>
                    <span className="text-on-background">{stat.count} accounts</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="lg:col-span-2 bg-white dark:bg-zinc-950 p-5 rounded-xl border border-border-base dark:border-zinc-900 shadow">
              <h4 className="font-bold text-xs text-zinc-500 uppercase tracking-wider mb-4">Platform Growth Health indicators</h4>
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <span className="text-zinc-500 block mb-1">Active Trial Users</span>
                  <span className="text-base text-on-background">{analytics.trialUsers}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-1">Subscriptions Expiring Soon (T-7)</span>
                  <span className="text-base text-on-background">{analytics.expiringSoon}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-1">Average Revenue Per User (ARPU)</span>
                  <span className="text-base text-on-background">₹{analytics.arpu.toLocaleString()}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* SUPER ADMIN PLANS LIST TAB */}
      {activeTab === 'plans' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-center mb-6">
            <div className="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1 border border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setBillingCycleToggle('MONTHLY')}
                className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition ${
                  billingCycleToggle === 'MONTHLY' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycleToggle('YEARLY')}
                className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition ${
                  billingCycleToggle === 'YEARLY' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Yearly Billing (Save 15%)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((p) => {
              const price = billingCycleToggle === 'MONTHLY' ? p.monthlyPrice : p.yearlyPrice;
              return (
                <Card 
                  key={p._id} 
                  className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-border-base dark:border-zinc-900 flex flex-col justify-between shadow-lg hover:shadow-xl transition duration-300"
                >
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-extrabold text-[15px] text-on-background">{p.name}</h3>
                      {p.slug === 'pro' && <span className="bg-indigo-500/10 text-indigo-500 text-[8px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full">POPULAR</span>}
                    </div>
                    <div className="flex items-baseline gap-1 my-3">
                      <span className="text-2xl font-black text-on-background">₹{price.toLocaleString()}</span>
                      <span className="text-zinc-500 text-xs font-semibold capitalize">/{billingCycleToggle.toLowerCase()}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed mb-6">{p.description}</p>

                    <ul className="space-y-2.5 text-xs text-on-surface-variant dark:text-zinc-400 border-t border-zinc-150 dark:border-zinc-900 pt-4">
                      <li className="flex items-center gap-2"><HiOutlineCheckCircle className="text-indigo-500 w-4 h-4" /> Max {p.limits.outlets} Outlets</li>
                      <li className="flex items-center gap-2"><HiOutlineCheckCircle className="text-indigo-500 w-4 h-4" /> Max {p.limits.employees} Staff members</li>
                      <li className="flex items-center gap-2"><HiOutlineCheckCircle className="text-indigo-500 w-4 h-4" /> {p.limits.monthlyOrders >= 1000000 ? 'Unlimited' : `${p.limits.monthlyOrders} Orders/mo`}</li>
                      {p.features.inventory ? (
                        <li className="flex items-center gap-2 text-on-surface-variant dark:text-zinc-300"><HiOutlineCheck className="text-indigo-500 w-4 h-4" /> Stock/Inventory Sync</li>
                      ) : (
                        <li className="flex items-center gap-2 text-zinc-550"><HiOutlineXCircle className="text-zinc-650 w-4 h-4" /> Inventory locked</li>
                      )}
                      {p.features.crm ? (
                        <li className="flex items-center gap-2 text-on-surface-variant dark:text-zinc-300"><HiOutlineCheck className="text-indigo-500 w-4 h-4" /> Customer CRM</li>
                      ) : (
                        <li className="flex items-center gap-2 text-zinc-550"><HiOutlineXCircle className="text-zinc-650 w-4 h-4" /> CRM locked</li>
                      )}
                      {p.features.kitchenDisplay ? (
                        <li className="flex items-center gap-2 text-on-surface-variant dark:text-zinc-300"><HiOutlineCheck className="text-indigo-500 w-4 h-4" /> Kitchen Displays</li>
                      ) : (
                        <li className="flex items-center gap-2 text-zinc-550"><HiOutlineXCircle className="text-zinc-650 w-4 h-4" /> KDS locked</li>
                      )}
                      {p.features.apiAccess ? (
                        <li className="flex items-center gap-2 text-on-surface-variant dark:text-zinc-300"><HiOutlineCheck className="text-indigo-500 w-4 h-4" /> API Access</li>
                      ) : (
                        <li className="flex items-center gap-2 text-zinc-550"><HiOutlineXCircle className="text-zinc-650 w-4 h-4" /> API Access locked</li>
                      )}
                    </ul>
                  </div>

                  <div className="mt-8 flex gap-2">
                    <Button
                      variant="primary"
                      onClick={() => handleEditPlan(p)}
                      className="flex-1 text-xs font-bold cursor-pointer"
                    >
                      Configure Plan
                    </Button>
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeletePlan(p._id); }} 
                      className="p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-red-500 hover:text-white dark:hover:bg-red-600 hover:border-transparent rounded-lg text-zinc-450 dark:text-zinc-500 transition-all duration-200 cursor-pointer shadow-sm"
                      title="Delete Plan"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* SUPER ADMIN ACTIVE CLIENT SUBSCRIPTIONS */}
      {activeTab === 'subscriptions' && (
        <Table columns={activeSubsColumns} data={allSubscriptions} emptyMessage="No client active subscriptions" />
      )}

      {/* SUPER ADMIN FINANCIAL INVOICES */}
      {activeTab === 'invoices' && (
        <Table columns={allInvoicesColumns} data={allInvoices} emptyMessage="No client financial logs" />
      )}

      {/* PLAN CREATE / EDIT MODAL (MULTI-STEP WIZARD) */}
      <Modal isOpen={planFormOpen} onClose={() => setPlanFormOpen(false)} title={editingPlan ? `Configure Billing Plan: ${planForm.name || ''}` : 'Add New Billing Plan'} size="lg">
        {/* Step Indicator Progress Bar */}
        <div className="mb-6 px-1">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-zinc-200 dark:bg-zinc-800 z-0"></div>
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-indigo-600 z-0 transition-all duration-300"
              style={{ width: `${((wizardStep - 1) / 3) * 100}%` }}
            ></div>

            {[
              { step: 1, label: "Overview" },
              { step: 2, label: "Basic Info" },
              { step: 3, label: "Limits" },
              { step: 4, label: "Features" }
            ].map((s) => {
              const isActive = wizardStep === s.step;
              const isCompleted = wizardStep > s.step;
              return (
                <div key={s.step} className="flex flex-col items-center z-10 relative">
                  <div 
                    onClick={() => setWizardStep(s.step)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 cursor-pointer ${
                      isCompleted 
                        ? 'bg-green-600 text-white shadow-md shadow-green-600/20' 
                        : isActive 
                           ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border-2 border-indigo-400' 
                           : 'bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500'
                    }`}
                  >
                    {isCompleted ? <HiOutlineCheck className="w-3.5 h-3.5" /> : s.step}
                  </div>
                  <span className={`text-[9px] font-bold mt-1.5 uppercase tracking-wider ${
                    isActive ? 'text-indigo-500' : isCompleted ? 'text-green-500' : 'text-zinc-400 dark:text-zinc-500'
                  }`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSavePlan} className="space-y-4 px-1">
          {/* STEP 1: READ-ONLY PLAN SUMMARY */}
          {wizardStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] uppercase font-black tracking-widest px-3 py-1 rounded-bl-xl shadow">
                  {planForm.slug || 'custom'}
                </div>
                <h4 className="text-base font-black text-on-background tracking-tight">{planForm.name || 'Untitled Plan'}</h4>
                <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">{planForm.description || 'No description configured.'}</p>
                
                <div className="mt-3 flex gap-6">
                  <div>
                    <span className="text-[9px] text-zinc-400 font-bold block uppercase tracking-wider">Monthly Price</span>
                    <span className="text-sm font-black text-on-background">₹{planForm.monthlyPrice.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-400 font-bold block uppercase tracking-wider">Yearly Price</span>
                    <span className="text-sm font-black text-on-background">₹{planForm.yearlyPrice.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-400 font-bold block uppercase tracking-wider">Trial Days</span>
                    <span className="text-sm font-black text-on-background">{planForm.trialDays} days</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Resource Limits List */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-border-base dark:border-zinc-900/85 rounded-xl space-y-2.5">
                  <h5 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <HiOutlineChartBar className="text-indigo-500 w-4 h-4" /> Allocated Limits
                  </h5>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between font-semibold"><span className="text-zinc-500">Outlets:</span><span className="text-on-background">{planForm.limits.outlets}</span></div>
                    <div className="flex justify-between font-semibold"><span className="text-zinc-500">Staff members:</span><span className="text-on-background">{planForm.limits.employees}</span></div>
                    <div className="flex justify-between font-semibold"><span className="text-zinc-500">Monthly Orders:</span><span className="text-on-background">{planForm.limits.monthlyOrders >= 1000000 ? 'Unlimited' : planForm.limits.monthlyOrders}</span></div>
                    <div className="flex justify-between font-semibold"><span className="text-zinc-500">Menu Items:</span><span className="text-on-background">{planForm.limits.menuItems}</span></div>
                    <div className="flex justify-between font-semibold"><span className="text-zinc-500">Storage Size:</span><span className="text-on-background">{planForm.limits.storageGB} GB</span></div>
                  </div>
                </div>

                {/* Features Checklist */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-border-base dark:border-zinc-900/85 rounded-xl">
                  <h5 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                    <HiOutlineShieldCheck className="text-indigo-500 w-4 h-4" /> Enabled Features
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(planForm.features).map(([feat, enabled]) => (
                      <div key={feat} className="flex items-center gap-2 text-xs font-semibold">
                        {enabled ? (
                          <HiOutlineCheckCircle className="text-green-500 w-4 h-4 shrink-0" />
                        ) : (
                          <HiOutlineXCircle className="text-zinc-400 dark:text-zinc-650 w-4 h-4 shrink-0" />
                        )}
                        <span className={`capitalize ${enabled ? 'text-on-surface' : 'text-zinc-500'}`}>
                          {feat.replace(/([A-Z])/g, ' $1')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border-base dark:border-zinc-900 flex justify-end">
                <Button type="button" onClick={() => setWizardStep(2)} className="text-xs font-bold flex items-center gap-1.5">
                  Next <HiChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: EDIT PLAN BASIC DETAILS & PRICING */}
          {wizardStep === 2 && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="flex flex-col gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Plan Name</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-on-surface dark:text-zinc-200 text-sm outline-none focus:border-indigo-500 transition-all"
                     value={planForm.name}
                     onChange={(e) => setPlanForm(prev => ({ ...prev, name: e.target.value }))}
                     required
                   />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Plan Slug (Unique Key)</label>
                    <input
                      type="text"
                      disabled={!!editingPlan}
                      placeholder="e.g. starter, enterprise, professional"
                      className="w-full px-4 py-2.5 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-on-surface dark:text-zinc-200 text-sm outline-none focus:border-indigo-500 disabled:bg-zinc-200 dark:disabled:bg-zinc-950 transition-all"
                      value={planForm.slug}
                      onChange={(e) => setPlanForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                      required
                    />
                  </div>
               </div>
 
               <div className="space-y-1.5">
                 <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Description</label>
                 <textarea
                   className="w-full px-4 py-2.5 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-on-surface dark:text-zinc-200 text-sm outline-none resize-none h-16 focus:border-indigo-500 transition-all"
                   value={planForm.description}
                   onChange={(e) => setPlanForm(prev => ({ ...prev, description: e.target.value }))}
                 />
               </div>
 
               <div className="flex flex-col gap-3.5">
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Monthly Price (INR)</label>
                   <input
                     type="number"
                     min="0"
                     className="w-full px-4 py-2.5 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-on-surface dark:text-zinc-200 text-sm outline-none focus:border-indigo-500 transition-all"
                     value={planForm.monthlyPrice}
                     onChange={(e) => setPlanForm(prev => ({ ...prev, monthlyPrice: Number(e.target.value) }))}
                     required
                   />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Yearly Price (INR)</label>
                   <input
                     type="number"
                     min="0"
                     className="w-full px-4 py-2.5 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-on-surface dark:text-zinc-200 text-sm outline-none focus:border-indigo-500 transition-all"
                     value={planForm.yearlyPrice}
                     onChange={(e) => setPlanForm(prev => ({ ...prev, yearlyPrice: Number(e.target.value) }))}
                     required
                   />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Trial Days</label>
                   <input
                     type="number"
                     min="0"
                     className="w-full px-4 py-2.5 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-on-surface dark:text-zinc-200 text-sm outline-none focus:border-indigo-500 transition-all"
                     value={planForm.trialDays}
                     onChange={(e) => setPlanForm(prev => ({ ...prev, trialDays: Number(e.target.value) }))}
                     required
                   />
                 </div>
               </div>
 
               <div className="pt-4 border-t border-border-base dark:border-zinc-900 flex justify-end gap-2">
                 <Button type="button" variant="secondary" onClick={() => setWizardStep(1)} className="text-xs font-bold flex items-center gap-1"><HiChevronLeft className="w-4 h-4" /> Back</Button>
                 <Button type="button" onClick={() => setWizardStep(3)} className="text-xs font-bold flex items-center gap-1">Next <HiChevronRight className="w-4 h-4" /></Button>
               </div>
             </div>
           )}
 
           {/* STEP 3: EDIT HARD LIMITS */}
           {wizardStep === 3 && (
             <div className="space-y-3.5 animate-fade-in">
               <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-900 rounded-xl mb-1">
                 <h5 className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest mb-0.5">Limits Configuration</h5>
                 <p className="text-[10px] text-zinc-500 leading-normal">Specify the maximum operational resource count allowed for tenants active on this billing tier.</p>
               </div>
 
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Outlets Limit</label>
                   <input
                     type="number"
                     min="1"
                     className="w-full px-4 py-2.5 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-on-surface dark:text-zinc-200 text-sm outline-none focus:border-indigo-500 transition-all"
                     value={planForm.limits.outlets}
                     onChange={(e) => setPlanForm(prev => ({ ...prev, limits: { ...prev.limits, outlets: Number(e.target.value) } }))}
                     required
                   />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Employees (Staff) Limit</label>
                   <input
                     type="number"
                     min="1"
                     className="w-full px-4 py-2.5 bg-surface-subtle dark:bg-zinc-950 border border-border-base dark:border-zinc-900 rounded-lg text-on-surface dark:text-zinc-200 text-sm outline-none focus:border-indigo-500 transition-all"
                     value={planForm.limits.employees}
                     onChange={(e) => setPlanForm(prev => ({ ...prev, limits: { ...prev.limits, employees: Number(e.target.value) } }))}
                     required
                   />
                 </div>
               </div>
 
               <div className="grid grid-cols-3 gap-4">
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Monthly Orders Limit</label>
                   <input
                     type="number"
                     min="0"
                     className="w-full px-4 py-2.5 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-on-surface dark:text-zinc-200 text-sm outline-none focus:border-indigo-500 transition-all"
                     value={planForm.limits.monthlyOrders}
                     onChange={(e) => setPlanForm(prev => ({ ...prev, limits: { ...prev.limits, monthlyOrders: Number(e.target.value) } }))}
                     required
                   />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider block">Menu Items Limit</label>
                   <input
                     type="number"
                     min="0"
                     className="w-full px-4 py-2.5 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-on-surface dark:text-zinc-200 text-sm outline-none focus:border-indigo-500 transition-all"
                     value={planForm.limits.menuItems}
                     onChange={(e) => setPlanForm(prev => ({ ...prev, limits: { ...prev.limits, menuItems: Number(e.target.value) } }))}
                     required
                   />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Storage Limit (GB)</label>
                   <input
                     type="number"
                     min="0"
                     className="w-full px-4 py-2.5 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-on-surface dark:text-zinc-200 text-sm outline-none focus:border-indigo-500 transition-all"
                     value={planForm.limits.storageGB}
                     onChange={(e) => setPlanForm(prev => ({ ...prev, limits: { ...prev.limits, storageGB: Number(e.target.value) } }))}
                     required
                   />
                 </div>
               </div>
 
               <div className="pt-4 border-t border-border-base dark:border-zinc-900 flex justify-end gap-2">
                 <Button type="button" variant="secondary" onClick={() => setWizardStep(2)} className="text-xs font-bold flex items-center gap-1"><HiChevronLeft className="w-4 h-4" /> Back</Button>
                 <Button type="button" onClick={() => setWizardStep(4)} className="text-xs font-bold flex items-center gap-1">Next <HiChevronRight className="w-4 h-4" /></Button>
               </div>
             </div>
           )}
 
           {/* STEP 4: EDIT ENABLED FEATURES */}
           {wizardStep === 4 && (
             <div className="space-y-3.5 animate-fade-in">
               <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-900 rounded-xl mb-1">
                 <h5 className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest mb-0.5">Feature Gates</h5>
                 <p className="text-[10px] text-zinc-500 leading-normal">Select which modules are accessible to restaurants active on this billing tier.</p>
               </div>
 
               <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                 {Object.keys(planForm.features).map((feat) => (
                   <label 
                     key={feat} 
                     className="flex items-center justify-between p-2.5 bg-white dark:bg-zinc-900/40 border border-border-base dark:border-zinc-800/80 rounded-xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 select-none transition-colors duration-150"
                   >
                     <span className="text-xs font-semibold text-on-surface dark:text-zinc-300 capitalize">
                       {feat.replace(/([A-Z])/g, ' $1')}
                     </span>
                     <input
                       type="checkbox"
                       className="w-4.5 h-4.5 rounded text-indigo-650 border-zinc-300 focus:ring-indigo-500 cursor-pointer"
                       checked={planForm.features[feat]}
                       onChange={(e) => setPlanForm(prev => ({
                         ...prev,
                         features: { ...prev.features, [feat]: e.target.checked }
                       }))}
                     />
                   </label>
                 ))}
               </div>
 
               <div className="pt-4 border-t border-border-base dark:border-zinc-900 flex justify-end gap-2">
                 <Button type="button" variant="secondary" onClick={() => setWizardStep(3)} className="text-xs font-bold flex items-center gap-1"><HiChevronLeft className="w-4 h-4" /> Back</Button>
                 <Button type="submit" className="text-xs font-bold shadow-lg shadow-indigo-650/20">
                   {editingPlan ? 'Save Changes' : 'Create Billing Plan'}
                 </Button>
               </div>
             </div>
           )}
         </form>
       </Modal>
    </div>
  );
}
