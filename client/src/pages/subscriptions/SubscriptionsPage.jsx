import { useState, useEffect, useMemo } from 'react';
import useAuth from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
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
  HiChevronRight,
  HiOutlineBuildingOffice2,
  HiOutlineSparkles,
  HiOutlineBolt,
  HiOutlineCircleStack,
  HiOutlineGift
} from 'react-icons/hi2';

// Standardized fallback plans with 'basic' slug (Part A3)
const FALLBACK_PLANS = [
  {
    _id: "6a3c17666bb70afe757e2221",
    name: "Basic Plan",
    slug: "basic",
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

  // Role hierarchy definitions (Part A2)
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isRestaurantOwner = user?.role === 'RESTAURANT_OWNER';
  const isOutletManager = user?.role === 'OUTLET_MANAGER' || (!isSystemAdmin && !isSuperAdmin && !isRestaurantOwner);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(isSystemAdmin ? 'analytics' : 'current');

  // --- Outlet Scoping States ---
  const [outlets, setOutlets] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [loadingOutlets, setLoadingOutlets] = useState(true);

  // --- Common States ---
  const [plans, setPlans] = useState([]);

  // --- Owner & Tenant States ---
  const [mySubscription, setMySubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [billingCycleToggle, setBillingCycleToggle] = useState('MONTHLY');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentProvider, setPaymentProvider] = useState('stripe');
  
  // Payment mock inputs
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Coupon states
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState(null);

  // --- System Admin States ---
  const [analytics, setAnalytics] = useState(null);
  const [allSubscriptions, setAllSubscriptions] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    slug: 'basic',
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

  // Load outlets according to server-side role scoping (Part A2)
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

  // Fetch data forwarding selectedOutletId parameter (Part A1)
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = selectedOutletId ? { outletId: selectedOutletId } : {};

      if (isSystemAdmin) {
        const [plansRes, analyticsRes, subsRes, invoicesRes] = await Promise.all([
          listPlansApi(),
          getSubscriptionAnalyticsApi(),
          listAllSubscriptionsApi(params),
          listAllInvoicesApi()
        ]);
        setPlans(plansRes.data?.data?.plans?.length ? plansRes.data.data.plans : FALLBACK_PLANS);
        setAnalytics(analyticsRes.data?.data || null);
        setAllSubscriptions(subsRes.data?.data?.subscriptions || []);
        setAllInvoices(invoicesRes.data?.data?.invoices || []);
      } else {
        const [subRes, usageRes, invoiceRes, plansRes] = await Promise.all([
          getMySubscriptionApi(params),
          getUsageApi(params),
          getInvoiceHistoryApi(params),
          listPlansApi()
        ]);
        setMySubscription(subRes.data?.data?.subscription || null);
        setUsage(usageRes.data?.data?.usage || null);
        setInvoices(invoiceRes.data?.data?.invoices || []);
        setPlans(plansRes.data?.data?.plans?.length ? plansRes.data.data.plans : FALLBACK_PLANS);
      }
    } catch (err) {
      console.error(err);
      setPlans(FALLBACK_PLANS);
      addToast('Displaying cached plans.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isSystemAdmin, selectedOutletId]);

  // Dynamic max yearly discount calculation (Part A4)
  const maxYearlyDiscountPercent = useMemo(() => {
    if (!plans.length) return 15;
    let maxDisc = 0;
    plans.forEach(p => {
      if (p.monthlyPrice > 0 && p.yearlyPrice > 0) {
        const fullYearMonthly = p.monthlyPrice * 12;
        const savings = fullYearMonthly - p.yearlyPrice;
        const percent = Math.round((savings / fullYearMonthly) * 100);
        if (percent > maxDisc) maxDisc = percent;
      }
    });
    return maxDisc > 0 ? maxDisc : 15;
  }, [plans]);

  // Calculate discount per plan (Part A4)
  const getPlanDiscountPercent = (plan) => {
    if (!plan.monthlyPrice || !plan.yearlyPrice) return 0;
    const fullYearMonthly = plan.monthlyPrice * 12;
    const savings = fullYearMonthly - plan.yearlyPrice;
    return Math.max(0, Math.round((savings / fullYearMonthly) * 100));
  };

  // Actions
  const handleCancelAutoRenew = async () => {
    if (!window.confirm('Are you sure you want to cancel auto-renewal? Features will stay active until current billing period ends.')) return;
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

  // Selectable Basic / Upgrade Trigger (Part A3)
  const triggerUpgrade = (plan) => {
    setSelectedPlan(plan);
    setCheckoutStep(1);
    setPaymentModalOpen(true);
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    setCardName('');
    setCouponCode('');
    setCouponDiscount(0);
    setAppliedCoupon(null);
    setCouponError(null);
  };

  const handleProcessUpgrade = async () => {
    const basePrice = billingCycleToggle === 'MONTHLY' ? selectedPlan?.monthlyPrice : selectedPlan?.yearlyPrice;
    const isZeroCost = (basePrice === 0 || selectedPlan?.slug === 'basic');

    if (!isZeroCost && paymentProvider === 'stripe' && (!cardNumber || !cardExpiry || !cardCvv || !cardName)) {
      addToast('Please complete card checkout details', 'warning');
      return;
    }

    setPaymentProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1200));
      await upgradeSubscriptionApi({
        planId: selectedPlan._id,
        billingCycle: billingCycleToggle,
        paymentProvider: isZeroCost ? 'free_trial' : paymentProvider,
        couponCode: appliedCoupon || undefined,
        outletId: selectedOutletId || undefined,
      });
      addToast(isZeroCost ? `Activated ${selectedPlan.name}!` : `Subscribed to ${selectedPlan.name}!`, 'success');
      setPaymentModalOpen(false);
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Subscription process failed', 'error');
    } finally {
      setPaymentProcessing(false);
    }
  };

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
      slug: 'basic',
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Active selected outlet object
  const activeOutletObj = outlets.find(o => getEntityId(o) === selectedOutletId) || outlets[0];

  // Header Outlet Selector with Role-Appropriate Scope (Part A2)
  const headerActions = (
    <div className="flex items-center gap-3">
      {/* For Outlet Manager: Static locked scope badge */}
      {isOutletManager ? (
        <div className="flex items-center gap-2 bg-surface-container-high dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg px-3 py-1.5 shadow-xs">
          <HiOutlineBuildingOffice2 className="text-secondary text-sm shrink-0" />
          <span className="text-xs font-semibold text-on-surface-variant dark:text-zinc-400">Assigned Outlet:</span>
          <span className="text-xs font-bold text-on-surface dark:text-zinc-100">{activeOutletObj?.name || 'My Outlet'}</span>
        </div>
      ) : outlets.length > 0 ? (
        /* For Super Admin and Restaurant Owner: Dropdown selector */
        <div className="flex items-center gap-2 bg-surface-container-high dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg px-3 py-1.5 shadow-xs focus-within:ring-2 focus-within:ring-primary/40">
          <HiOutlineBuildingOffice2 className="text-primary text-sm shrink-0" />
          <span className="text-xs font-bold text-on-surface-variant dark:text-zinc-400">
            {isSuperAdmin ? "Tenant Outlet:" : "Restaurant Outlet:"}
          </span>
          <select
            value={selectedOutletId}
            onChange={(e) => setSelectedOutletId(e.target.value)}
            className="bg-transparent border-none text-xs font-bold text-on-surface dark:text-zinc-100 outline-none cursor-pointer p-0 focus:ring-0"
          >
            {outlets.map((o) => (
              <option key={getEntityId(o)} value={getEntityId(o)} className="bg-white dark:bg-zinc-950 text-on-surface dark:text-zinc-200">
                {o.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );

  // Tabs for System Admin vs Option 2 Tenant Roles (A2)
  // Billing Plans ('plans') placed at the end for System Admin
  const systemAdminTabs = [
    { id: 'analytics', label: '📊 Platform Analytics' },
    { id: 'subscriptions', label: '🏢 Active Subscriptions' },
    { id: 'invoices', label: '📜 Financial Invoices' },
    { id: 'plans', label: '💎 Billing Plans' },
  ];

  const tenantTabs = [
    { id: 'current', label: '⚡ Plan Overview & Usage' },
    { id: 'plans', label: '🚀 Upgrade Tiers' },
    { id: 'invoices', label: `🧾 Invoices (${invoices.length})` },
  ];

  const currentTabs = isSystemAdmin ? systemAdminTabs : tenantTabs;

  const invoiceColumns = [
    { key: 'invoiceNumber', label: 'Invoice No.', render: (r) => <span className="font-mono text-xs text-primary font-bold">{r.invoiceNumber}</span> },
    { key: 'total', label: 'Total Paid', render: (r) => <span className="font-bold text-on-surface dark:text-zinc-100">₹{(r.total || 0).toLocaleString()}</span> },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={r.status === 'PAID' ? 'success' : 'danger'}>{r.status}</Badge> },
    { key: 'paymentMethod', label: 'Method', render: (r) => <span className="text-xs uppercase font-semibold">{r.paymentMethod || 'Manual'}</span> },
    { key: 'paidAt', label: 'Paid Date', render: (r) => r.paidAt ? new Date(r.paidAt).toLocaleDateString() : 'N/A' },
    { key: 'actions', label: 'Receipt', render: (r) => r.invoiceUrl ? (
      <a href={r.invoiceUrl} target="_blank" rel="noreferrer" className="no-underline">
        <Button size="sm" variant="secondary" className="text-xs py-1 px-2.5">Receipt 📄</Button>
      </a>
    ) : <span className="text-zinc-500 text-xs">Direct payment</span> }
  ];

  const activeSubsColumns = [
    { key: 'tenantId', label: 'Tenant ID', render: (r) => <span className="font-mono text-xs text-on-surface-variant">{r.tenantId}</span> },
    { key: 'plan', label: 'Plan Tier', render: (r) => <Badge variant="info">{r.planId?.name || 'Standard Tier'}</Badge> },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={r.status === 'ACTIVE' ? 'success' : 'warning'}>{r.status}</Badge> },
    { key: 'billingCycle', label: 'Cycle', render: (r) => <span className="capitalize text-xs font-semibold">{r.billingCycle?.toLowerCase()}</span> },
    { key: 'endDate', label: 'Next Renewal', render: (r) => r.endDate ? new Date(r.endDate).toLocaleDateString() : 'N/A' },
  ];

  const allInvoicesColumns = [
    { key: 'tenantId', label: 'Tenant ID', render: (r) => <span className="font-mono text-xs">{r.tenantId}</span> },
    { key: 'invoiceNumber', label: 'Invoice No.', render: (r) => <span className="font-mono text-xs font-bold text-primary">{r.invoiceNumber}</span> },
    { key: 'total', label: 'Total Amount', render: (r) => <span className="font-bold">₹{(r.total || 0).toLocaleString()}</span> },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={r.status === 'PAID' ? 'success' : 'danger'}>{r.status}</Badge> },
    { key: 'paymentMethod', label: 'Method', render: (r) => <span className="text-xs uppercase font-semibold">{r.paymentMethod}</span> },
    { key: 'paidAt', label: 'Paid At', render: (r) => r.paidAt ? new Date(r.paidAt).toLocaleDateString() : '—' }
  ];

  // Feature labels lookup
  const featureLabels = {
    inventory: 'Inventory & Stock Sync',
    crm: 'Customer CRM',
    analytics: 'Advanced Analytics',
    finance: 'Financial Management',
    kitchenDisplay: 'Kitchen Display (KDS)',
    waiterApp: 'Waiter App',
    qrOrdering: 'Dine-In QR Ordering',
    reports: 'Custom Reports',
    apiAccess: 'API Access',
    whiteLabel: 'White-Label Branding',
  };

  return (
    <div className="space-y-6 animate-fade-in text-on-surface dark:text-zinc-100">
      {/* Page Header */}
      <PageHeader
        section={isSystemAdmin ? "SaaS Administration Console" : "Billing & Licensing"}
        title={isSystemAdmin ? "Subscription Management" : "Subscriptions Center"}
        description={
          isSystemAdmin
            ? "Configure global platform plan tiers, feature flags, and MRR/ARR analytics."
            : `Managing active capabilities and resource limits for ${activeOutletObj?.name || 'Selected Outlet'}.`
        }
        actions={headerActions}
      />

      {/* Tab Navigation Controls */}
      <div className="flex gap-2 border-b border-border-base dark:border-zinc-800/80 pb-px overflow-x-auto scrollbar-none">
        {currentTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              activeTab === tab.id
                ? 'border-primary text-primary dark:text-primary-fixed-dim bg-primary/5 rounded-t-lg'
                : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ==================== CURRENT PLAN & USAGE TAB ==================== */}
      {!isSystemAdmin && activeTab === 'current' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Signature Visual Element: Active Tier Hero Card */}
            <Card className="lg:col-span-1 bg-white dark:bg-zinc-950 p-6 rounded-2xl flex flex-col justify-between border border-border-base dark:border-zinc-900 shadow-sm ring-2 ring-primary/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary/10 text-primary dark:text-primary-fixed-dim text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-bl-xl border-l border-b border-primary/20 flex items-center gap-1">
                <HiOutlineSparkles size={12} /> Active Tier
              </div>

              <div className="mt-2">
                <div className="flex justify-between items-start mb-3">
                  <Badge variant={mySubscription?.status === 'ACTIVE' ? 'success' : 'warning'} className="uppercase font-bold tracking-wider text-[10px]">
                    {mySubscription?.status || 'TRIAL'}
                  </Badge>
                </div>

                <h3 className="text-2xl font-black text-on-surface dark:text-zinc-100">{mySubscription?.planId?.name || 'Basic Plan'}</h3>
                <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1.5 leading-relaxed">{mySubscription?.planId?.description || '1 Outlet, 5 Employees, 100 Orders/mo, QR Ordering'}</p>

                <div className="mt-5 space-y-3 border-t border-border-base/60 dark:border-zinc-900 pt-4 text-xs font-medium">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant dark:text-zinc-400">Billing Cycle:</span>
                    <span className="font-bold text-on-surface dark:text-zinc-200 capitalize">{mySubscription?.billingCycle?.toLowerCase() || 'monthly'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant dark:text-zinc-400">Started On:</span>
                    <span className="font-bold text-on-surface dark:text-zinc-200">
                      {mySubscription?.startDate ? new Date(mySubscription.startDate).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant dark:text-zinc-400">Next Renewal:</span>
                    <span className="font-bold text-on-surface dark:text-zinc-200">
                      {mySubscription?.endDate ? new Date(mySubscription.endDate).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant dark:text-zinc-400">Auto-Renewal:</span>
                    <Badge variant={mySubscription?.renewalEnabled ? 'success' : 'danger'}>
                      {mySubscription?.renewalEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                {mySubscription?.renewalEnabled ? (
                  <Button variant="danger" size="sm" onClick={handleCancelAutoRenew} className="w-full font-bold text-xs py-2">
                    Cancel Auto-Renewal
                  </Button>
                ) : (
                  <Button variant="success" size="sm" onClick={handleResumeAutoRenew} className="w-full font-bold text-xs py-2">
                    Resume Auto-Renewal
                  </Button>
                )}
              </div>
            </Card>

            {/* Resource Usage Indicators Card */}
            <Card className="lg:col-span-2 bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-border-base dark:border-zinc-900 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-on-surface dark:text-zinc-100 flex items-center gap-2 mb-5">
                  <HiOutlineChartBar className="text-primary w-5 h-5" /> Live Operational Resource Consumption
                </h4>

                <div className="space-y-5">
                  {/* Outlets Meter */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span className="text-on-surface-variant dark:text-zinc-400 flex items-center gap-1.5"><HiOutlineBuildingStorefront /> Outlets Allocated</span>
                      <span className="text-on-surface dark:text-zinc-200 font-bold">{usage?.outletsUsed || 0} / {mySubscription?.planId?.limits?.outlets || 1}</span>
                    </div>
                    <div className="w-full bg-surface-subtle dark:bg-zinc-900 h-2.5 rounded-full overflow-hidden border border-border-base/40 dark:border-zinc-800">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, ((usage?.outletsUsed || 0) / (mySubscription?.planId?.limits?.outlets || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Employees Meter */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span className="text-on-surface-variant dark:text-zinc-400 flex items-center gap-1.5"><HiOutlineUserGroup /> Staff Members Registered</span>
                      <span className="text-on-surface dark:text-zinc-200 font-bold">{usage?.employeesUsed || 0} / {mySubscription?.planId?.limits?.employees || 5}</span>
                    </div>
                    <div className="w-full bg-surface-subtle dark:bg-zinc-900 h-2.5 rounded-full overflow-hidden border border-border-base/40 dark:border-zinc-800">
                      <div
                        className="bg-teal-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, ((usage?.employeesUsed || 0) / (mySubscription?.planId?.limits?.employees || 5)) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Orders Meter */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span className="text-on-surface-variant dark:text-zinc-400 flex items-center gap-1.5"><HiOutlineReceiptPercent /> Monthly Orders Processed</span>
                      <span className="text-on-surface dark:text-zinc-200 font-bold">
                        {usage?.ordersUsed || 0} / {mySubscription?.planId?.limits?.monthlyOrders >= 1000000 ? 'Unlimited' : (mySubscription?.planId?.limits?.monthlyOrders || 100)}
                      </span>
                    </div>
                    <div className="w-full bg-surface-subtle dark:bg-zinc-900 h-2.5 rounded-full overflow-hidden border border-border-base/40 dark:border-zinc-800">
                      <div
                        className="bg-purple-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, ((usage?.ordersUsed || 0) / (mySubscription?.planId?.limits?.monthlyOrders || 100)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border-base/60 dark:border-zinc-900 flex justify-between items-center text-xs">
                <span className="text-on-surface-variant dark:text-zinc-400">Need higher operational thresholds?</span>
                <Button size="sm" variant="outline" onClick={() => setActiveTab('plans')} className="font-bold flex items-center gap-1">
                  Explore Tier Upgrades <HiChevronRight size={14} />
                </Button>
              </div>
            </Card>
          </div>

          {/* Full Feature Access Grid per Active Plan (Part A3) */}
          <Card className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-border-base dark:border-zinc-900 shadow-sm">
            <h4 className="font-bold text-sm text-on-surface dark:text-zinc-100 flex items-center gap-2 mb-4">
              <HiOutlineBolt className="text-secondary w-5 h-5" /> Module Capabilities & Feature Gate Status
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {Object.entries(featureLabels).map(([key, label]) => {
                const isEnabled = mySubscription?.planId?.features?.[key] ?? false;
                return (
                  <div
                    key={key}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold transition-colors ${
                      isEnabled
                        ? 'bg-primary/5 border-primary/20 text-on-surface dark:text-zinc-100'
                        : 'bg-surface-subtle dark:bg-zinc-900/50 border-border-base/40 dark:border-zinc-800/60 text-zinc-400 dark:text-zinc-550'
                    }`}
                  >
                    {isEnabled ? (
                      <HiOutlineCheckCircle className="text-primary w-4 h-4 shrink-0" />
                    ) : (
                      <HiOutlineXCircle className="text-zinc-400 dark:text-zinc-650 w-4 h-4 shrink-0" />
                    )}
                    <span className="truncate">{label}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ==================== PLAN TIERS GRID (FEATURE-FIRST, A3 + A4) ==================== */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          {/* System Admin Section Header */}
          {isSystemAdmin && (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-950 p-4.5 rounded-2xl border border-border-base dark:border-zinc-900 shadow-xs">
              <div>
                <h3 className="font-extrabold text-sm text-on-surface dark:text-zinc-100 flex items-center gap-1.5">
                  <HiOutlineSparkles className="text-primary" /> Subscription Plan Tiers & Limits
                </h3>
                <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-0.5">
                  Configure global SaaS pricing plans, resource limits, and feature access gates.
                </p>
              </div>
              <Button onClick={handleCreatePlan} className="flex items-center gap-1.5 font-bold cursor-pointer text-xs py-2 px-3 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-transform shrink-0">
                <HiPlus /> Add Billing Plan
              </Button>
            </div>
          )}

          {/* Monthly / Yearly Billing Toggle with Computed Discount (A4) */}
          <div className="flex justify-center mb-4">
            <div className="inline-flex rounded-xl bg-surface-subtle dark:bg-zinc-900 p-1 border border-border-base dark:border-zinc-800 shadow-xs">
              <button
                type="button"
                onClick={() => setBillingCycleToggle('MONTHLY')}
                className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  billingCycleToggle === 'MONTHLY' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant dark:text-zinc-400 hover:text-on-surface'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycleToggle('YEARLY')}
                className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  billingCycleToggle === 'YEARLY' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant dark:text-zinc-400 hover:text-on-surface'
                }`}
              >
                Yearly Billing (Save up to {maxYearlyDiscountPercent}%)
              </button>
            </div>
          </div>

          {/* Feature-First Plan Cards Grid (A3) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p) => {
              const isActivePlan = mySubscription?.planId?.slug === p.slug;
              const isBasic = p.slug === 'basic' || p.monthlyPrice === 0;
              const price = billingCycleToggle === 'MONTHLY' ? p.monthlyPrice : p.yearlyPrice;
              const discount = getPlanDiscountPercent(p);

              return (
                <Card
                  key={p._id}
                  className={`bg-white dark:bg-zinc-950 p-6 rounded-2xl border flex flex-col justify-between shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${
                    isActivePlan
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-border-base dark:border-zinc-900'
                  }`}
                >
                  <div>
                    {/* Header: Name & Badges */}
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-extrabold text-lg text-on-surface dark:text-zinc-100">{p.name}</h3>
                      <div className="flex items-center gap-1.5">
                        {p.slug === 'pro' && (
                          <span className="bg-primary/10 text-primary dark:text-primary-fixed-dim text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border border-primary/20">
                            POPULAR
                          </span>
                        )}
                        {billingCycleToggle === 'YEARLY' && discount > 0 && (
                          <span className="bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border border-teal-500/20">
                            {discount}% OFF
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price Display */}
                    <div className="flex items-baseline gap-1 my-3">
                      <span className="text-3xl font-black text-on-surface dark:text-zinc-100">
                        {price === 0 ? 'Free' : `₹${price.toLocaleString()}`}
                      </span>
                      {price > 0 && (
                        <span className="text-on-surface-variant dark:text-zinc-500 text-xs font-semibold capitalize">
                          /{billingCycleToggle.toLowerCase()}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-on-surface-variant dark:text-zinc-400 leading-relaxed mb-5">{p.description}</p>

                    {/* Feature-First Module List (A3) */}
                    <div className="border-t border-border-base/60 dark:border-zinc-900 pt-4">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant dark:text-zinc-400 block mb-2.5">
                        Included Features & Modules:
                      </span>
                      <ul className="space-y-2 text-xs">
                        {Object.entries(featureLabels).map(([key, label]) => {
                          const isEnabled = p.features?.[key] ?? false;
                          return (
                            <li
                              key={key}
                              className={`flex items-center gap-2 ${
                                isEnabled
                                  ? 'text-on-surface dark:text-zinc-200 font-semibold'
                                  : 'text-zinc-400 dark:text-zinc-650'
                              }`}
                            >
                              {isEnabled ? (
                                <HiOutlineCheck className="text-primary w-4 h-4 shrink-0" />
                              ) : (
                                <HiOutlineXCircle className="text-zinc-400 dark:text-zinc-650 w-4 h-4 shrink-0" />
                              )}
                              <span>{label}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    {/* Limits Section (Secondary) */}
                    <div className="mt-4 pt-3 border-t border-border-base/40 dark:border-zinc-900 text-xs text-on-surface-variant dark:text-zinc-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Max Outlets:</span>
                        <span className="font-bold text-on-surface dark:text-zinc-200">{p.limits?.outlets || 1}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Staff Members:</span>
                        <span className="font-bold text-on-surface dark:text-zinc-200">{p.limits?.employees || 5}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Monthly Orders:</span>
                        <span className="font-bold text-on-surface dark:text-zinc-200">
                          {p.limits?.monthlyOrders >= 1000000 ? 'Unlimited' : p.limits?.monthlyOrders || 100}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions (Selectable Basic - A3) */}
                  <div className="mt-6 pt-4 border-t border-border-base/40 dark:border-zinc-900">
                    {isSystemAdmin ? (
                      <div className="flex gap-2">
                        <Button variant="primary" onClick={() => handleEditPlan(p)} className="flex-1 text-xs font-bold py-2">
                          Edit Plan
                        </Button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeletePlan(p._id); }}
                          className="p-2 border border-border-base dark:border-zinc-800 hover:bg-red-500 hover:text-white rounded-lg text-zinc-450 transition-all cursor-pointer"
                          title="Delete Plan"
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>
                    ) : isActivePlan ? (
                      <div className="w-full py-2 bg-primary/10 text-primary dark:text-primary-fixed-dim border border-primary/20 rounded-lg text-xs font-bold text-center">
                        Active Subscription Tier
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={() => triggerUpgrade(p)}
                        className="w-full text-xs font-bold py-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {isBasic ? 'Start 14-Day Free Trial' : 'Subscribe / Upgrade'}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== SYSTEM ADMIN: ANALYTICS TAB ==================== */}
      {isSystemAdmin && activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-border-base dark:border-zinc-900 shadow-xs">
              <span className="text-on-surface-variant dark:text-zinc-400 text-[10px] uppercase font-bold tracking-wider">Monthly Recurring Revenue (MRR)</span>
              <h3 className="text-2xl font-black text-primary mt-1.5">₹{(analytics.mrr || 0).toLocaleString()}</h3>
            </Card>
            <Card className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-border-base dark:border-zinc-900 shadow-xs">
              <span className="text-on-surface-variant dark:text-zinc-400 text-[10px] uppercase font-bold tracking-wider">Annual Recurring Revenue (ARR)</span>
              <h3 className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1.5">₹{(analytics.arr || 0).toLocaleString()}</h3>
            </Card>
            <Card className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-border-base dark:border-zinc-900 shadow-xs">
              <span className="text-on-surface-variant dark:text-zinc-400 text-[10px] uppercase font-bold tracking-wider">Active Paid Tenants</span>
              <h3 className="text-2xl font-black text-on-surface dark:text-zinc-100 mt-1.5">{analytics.paidUsers || 0}</h3>
            </Card>
            <Card className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-border-base dark:border-zinc-900 shadow-xs">
              <span className="text-on-surface-variant dark:text-zinc-400 text-[10px] uppercase font-bold tracking-wider">Total Cumulative Revenue</span>
              <h3 className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1.5">₹{(analytics.revenue || 0).toLocaleString()}</h3>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 bg-white dark:bg-zinc-950 p-5 rounded-xl border border-border-base dark:border-zinc-900 shadow-xs">
              <h4 className="font-bold text-xs text-on-surface-variant dark:text-zinc-400 uppercase tracking-wider mb-4">Plan Distribution</h4>
              <div className="space-y-3">
                {analytics.planStats?.map((stat) => (
                  <div key={stat.name} className="flex justify-between text-xs font-semibold">
                    <span className="text-on-surface dark:text-zinc-300">{stat.name}</span>
                    <span className="text-primary font-bold">{stat.count} accounts</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="lg:col-span-2 bg-white dark:bg-zinc-950 p-5 rounded-xl border border-border-base dark:border-zinc-900 shadow-xs">
              <h4 className="font-bold text-xs text-on-surface-variant dark:text-zinc-400 uppercase tracking-wider mb-4">Platform Health Indicators</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-semibold">
                <div className="p-3 bg-surface-subtle dark:bg-zinc-900/60 rounded-lg border border-border-base/40 dark:border-zinc-800">
                  <span className="text-on-surface-variant dark:text-zinc-400 block text-[10px] uppercase tracking-wider mb-1">Active Trial Users</span>
                  <span className="text-lg font-black text-on-surface dark:text-zinc-100">{analytics.trialUsers || 0}</span>
                </div>
                <div className="p-3 bg-surface-subtle dark:bg-zinc-900/60 rounded-lg border border-border-base/40 dark:border-zinc-800">
                  <span className="text-on-surface-variant dark:text-zinc-400 block text-[10px] uppercase tracking-wider mb-1">Expiring Soon (T-7)</span>
                  <span className="text-lg font-black text-amber-500">{analytics.expiringSoon || 0}</span>
                </div>
                <div className="p-3 bg-surface-subtle dark:bg-zinc-900/60 rounded-lg border border-border-base/40 dark:border-zinc-800">
                  <span className="text-on-surface-variant dark:text-zinc-400 block text-[10px] uppercase tracking-wider mb-1">ARPU</span>
                  <span className="text-lg font-black text-indigo-500">₹{(analytics.arpu || 0).toLocaleString()}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ==================== TABLES: INVOICES & SUBSCRIPTIONS ==================== */}
      {activeTab === 'subscriptions' && (
        <Table columns={activeSubsColumns} data={allSubscriptions} emptyMessage="No active client subscriptions" />
      )}

      {activeTab === 'invoices' && (
        <Table columns={isSystemAdmin ? allInvoicesColumns : invoiceColumns} data={isSystemAdmin ? allInvoices : invoices} emptyMessage="No billing receipts available" />
      )}

      {/* SYSTEM ADMIN PLAN CREATE / EDIT MODAL */}
      <Modal isOpen={planFormOpen} onClose={() => setPlanFormOpen(false)} title={editingPlan ? 'Edit Billing Plan' : 'Add New Billing Plan'} size="md">
        <form onSubmit={handleSavePlan} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Plan Name"
              required
              value={planForm.name}
              onChange={(e) => setPlanForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Basic Plan, Pro Plan"
            />
            <Input
              label="Plan Slug (Unique Key)"
              required
              disabled={!!editingPlan}
              value={planForm.slug}
              onChange={(e) => setPlanForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
              placeholder="e.g. basic, pro, super"
            />
          </div>

          <Input
            label="Description"
            value={planForm.description}
            onChange={(e) => setPlanForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Brief plan tier overview..."
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Monthly Price (₹)"
              type="number"
              min="0"
              required
              value={planForm.monthlyPrice}
              onChange={(e) => setPlanForm(prev => ({ ...prev, monthlyPrice: Number(e.target.value) }))}
            />
            <Input
              label="Yearly Price (₹)"
              type="number"
              min="0"
              required
              value={planForm.yearlyPrice}
              onChange={(e) => setPlanForm(prev => ({ ...prev, yearlyPrice: Number(e.target.value) }))}
            />
            <Input
              label="Trial Days"
              type="number"
              min="0"
              required
              value={planForm.trialDays}
              onChange={(e) => setPlanForm(prev => ({ ...prev, trialDays: Number(e.target.value) }))}
            />
          </div>

          <div className="border-t border-border-base dark:border-zinc-850 pt-3">
            <h4 className="text-xs font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wider mb-3">
              Resource Allocations (Limits)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Outlets Limit"
                type="number"
                min="1"
                required
                value={planForm.limits.outlets}
                onChange={(e) => setPlanForm(prev => ({ ...prev, limits: { ...prev.limits, outlets: Number(e.target.value) } }))}
              />
              <Input
                label="Staff Members Limit"
                type="number"
                min="1"
                required
                value={planForm.limits.employees}
                onChange={(e) => setPlanForm(prev => ({ ...prev, limits: { ...prev.limits, employees: Number(e.target.value) } }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
              <Input
                label="Monthly Orders Limit"
                type="number"
                min="0"
                required
                value={planForm.limits.monthlyOrders}
                onChange={(e) => setPlanForm(prev => ({ ...prev, limits: { ...prev.limits, monthlyOrders: Number(e.target.value) } }))}
              />
              <Input
                label="Menu Items Limit"
                type="number"
                min="0"
                required
                value={planForm.limits.menuItems}
                onChange={(e) => setPlanForm(prev => ({ ...prev, limits: { ...prev.limits, menuItems: Number(e.target.value) } }))}
              />
              <Input
                label="Storage Limit (GB)"
                type="number"
                min="0"
                required
                value={planForm.limits.storageGB}
                onChange={(e) => setPlanForm(prev => ({ ...prev, limits: { ...prev.limits, storageGB: Number(e.target.value) } }))}
              />
            </div>
          </div>

          <div className="border-t border-border-base dark:border-zinc-850 pt-3">
            <h4 className="text-xs font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wider mb-3">
              Feature Access Controls
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {Object.keys(planForm.features).map((feat) => (
                <label key={feat} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary checkbox-xs rounded border-border-base text-primary accent-primary cursor-pointer"
                    checked={planForm.features[feat]}
                    onChange={(e) => setPlanForm(prev => ({
                      ...prev,
                      features: { ...prev.features, [feat]: e.target.checked }
                    }))}
                  />
                  <span className="text-xs font-semibold text-on-surface dark:text-zinc-300 capitalize">
                    {feat.replace(/([A-Z])/g, ' $1')}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border-base dark:border-zinc-850">
            <Button variant="secondary" onClick={() => setPlanFormOpen(false)} type="button">Cancel</Button>
            <Button type="submit">{editingPlan ? 'Save Changes' : 'Create Plan'}</Button>
          </div>
        </form>
      </Modal>

      {/* USER CHECKOUT / BASIC SELECTION MODAL */}
      <Modal isOpen={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="Checkout Subscription" size="sm">
        {(() => {
          const basePrice = billingCycleToggle === 'MONTHLY' ? selectedPlan?.monthlyPrice : selectedPlan?.yearlyPrice;
          const isZeroCost = (basePrice === 0 || selectedPlan?.slug === 'basic');

          return (
            <div className="space-y-4 animate-fade-in">
              {/* Step 1: Summary */}
              {checkoutStep === 1 && (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl">
                    <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">Selected Plan</span>
                    <h4 className="text-sm font-black text-on-surface dark:text-zinc-100 mt-0.5">{selectedPlan?.name}</h4>
                    <p className="text-[10px] text-on-surface-variant dark:text-zinc-400 mt-0.5">{selectedPlan?.description}</p>
                  </div>

                  <div className="p-3 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl space-y-2 text-xs font-semibold">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant dark:text-zinc-400">Billing Cycle:</span>
                      <span className="text-on-surface dark:text-zinc-200 capitalize">{billingCycleToggle.toLowerCase()}</span>
                    </div>
                    <div className="flex justify-between border-t border-border-base/40 dark:border-zinc-800 pt-2">
                      <span className="text-on-surface-variant dark:text-zinc-400">Base Price:</span>
                      <span className="text-on-surface dark:text-zinc-200 font-bold">
                        {isZeroCost ? 'Free' : `₹${basePrice?.toLocaleString()}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-border-base dark:border-zinc-850">
                    <Button variant="secondary" onClick={() => setPaymentModalOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={() => isZeroCost ? handleProcessUpgrade() : setCheckoutStep(2)} loading={isZeroCost && paymentProcessing}>
                      {isZeroCost ? 'Confirm & Start Trial' : 'Next'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Payment Details (Skipped for Free/Basic) */}
              {checkoutStep === 2 && !isZeroCost && (
                <div className="space-y-3">
                  <div className="p-3 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl space-y-3">
                    <Input
                      label="Card Number"
                      placeholder="4111 2222 3333 4444"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      required
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="Expiry"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        required
                      />
                      <Input
                        label="CVV"
                        placeholder="123"
                        type="password"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        required
                      />
                    </div>
                    <Input
                      label="Cardholder Name"
                      placeholder="Card Owner"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-border-base dark:border-zinc-850">
                    <Button variant="secondary" onClick={() => setCheckoutStep(1)} disabled={paymentProcessing}>Back</Button>
                    <Button variant="primary" onClick={handleProcessUpgrade} loading={paymentProcessing}>
                      Confirm & Subscribe
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
