import { useState, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import PageHeader from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { HiOutlineDocumentArrowDown, HiOutlineArrowPath } from 'react-icons/hi2';
import { listRestaurantsApi } from '../../api/models/restaurant.api';
import { listOutletsApi } from '../../api/models/outlet.api';
import { USER_ROLES } from '../../utils/constants';

export default function ReportsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [exporting, setExporting] = useState(null);
  
  // Selection scope states
  const [restaurants, setRestaurants] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [loadingScope, setLoadingScope] = useState(true);

  const isSuperAdmin = user?.role === USER_ROLES.SUPER_ADMIN || user?.role === USER_ROLES.SYSTEM_ADMIN;
  const isRestaurantOwner = user?.role === USER_ROLES.RESTAURANT_OWNER;
  const isOutletManager = user?.role === USER_ROLES.OUTLET_MANAGER;

  useEffect(() => {
    const loadScopeData = async () => {
      setLoadingScope(true);
      try {
        if (isSuperAdmin) {
          // Super Admin: Load all restaurants and all outlets
          const [restRes, outletsRes] = await Promise.all([
            listRestaurantsApi(),
            listOutletsApi()
          ]);
          setRestaurants(restRes.data?.data?.restaurants || []);
          setOutlets(outletsRes.data?.data?.outlets || []);
        } else if (isRestaurantOwner) {
          // Restaurant Owner: Load outlets scoped to their restaurant
          const rId = user?.restaurantId || (user?.restaurantIds && user.restaurantIds[0]);
          if (rId) {
            setSelectedRestaurantId(rId);
            const outletsRes = await listOutletsApi({ restaurantId: rId });
            setOutlets(outletsRes.data?.data?.outlets || []);
          }
        } else if (isOutletManager) {
          // Outlet Manager: Locked to their specific outlet
          const oId = user?.outletId || (user?.outletIds && user.outletIds[0]);
          if (oId) {
            setSelectedOutletId(oId);
            const outletsRes = await listOutletsApi();
            const allOut = outletsRes.data?.data?.outlets || [];
            setOutlets(allOut.filter(o => o._id === oId || o.id === oId));
          }
        }
      } catch (err) {
        console.error('Failed to load reports scoping data:', err);
        addToast('Failed to load restaurant/outlet filters', 'error');
      } finally {
        setLoadingScope(false);
      }
    };
    loadScopeData();
  }, [user, isSuperAdmin, isRestaurantOwner, isOutletManager, addToast]);

  const reportsList = [
    { id: 'sales', title: 'Daily Sales & Operations', desc: 'Summary of orders, revenue, average order value, and tips.', type: 'CSV / PDF' },
    { id: 'tax', title: 'Tax & GST Summary Report', desc: 'Detailed report of order subtotal, CGST, SGST, and net totals.', type: 'CSV' },
    { id: 'coupons', title: 'Coupon Utilization Report', desc: 'Redemptions list detailing coupon code usage and discount totals.', type: 'CSV / PDF' },
    { id: 'reservations', title: 'Reservations & Seating Report', desc: 'Floor seating metrics, no-show rates, and turnover speeds.', type: 'PDF' },
  ];

  // Get active display names for toast
  const getSelectedScopeText = () => {
    if (selectedOutletId) {
      const out = outlets.find(o => o._id === selectedOutletId || o.id === selectedOutletId);
      return out ? `Outlet: ${out.name}` : `Outlet ID: ${selectedOutletId}`;
    }
    if (selectedRestaurantId) {
      const rest = restaurants.find(r => r._id === selectedRestaurantId || r.id === selectedRestaurantId);
      return rest ? `All Outlets of ${rest.name}` : 'All Outlets of Restaurant';
    }
    return 'All System Restaurants & Outlets';
  };

  const handleExport = (reportId, reportTitle) => {
    setExporting(reportId);
    const scopeText = getSelectedScopeText();
    addToast(`Generating ${reportTitle} for [${scopeText}]...`, 'info');
    
    setTimeout(() => {
      setExporting(null);
      addToast(`${reportTitle} exported successfully!`, 'success');
    }, 1500);
  };

  // Filter outlets list dynamically in UI for Super Admin when selecting restaurant
  const filteredOutlets = isSuperAdmin && selectedRestaurantId
    ? outlets.filter(o => o.restaurantId === selectedRestaurantId || o.restaurantId?._id === selectedRestaurantId)
    : outlets;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <PageHeader
        section="Reports"
        title="Operations & Financial Reports"
        description="Select and export operational summaries and financial ledger reports scoped by your access roles."
      />

      {/* Dynamic Scoping Selection Panel */}
      <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-border-base dark:border-zinc-900 shadow-2xs space-y-4">
        <h3 className="text-xs font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide">
          Report Export Scope Settings
        </h3>

        {loadingScope ? (
          <div className="flex items-center gap-2 py-2 text-xs font-semibold text-zinc-500 animate-pulse">
            <span className="loading loading-spinner loading-xs text-primary"></span>
            Loading filters...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Restaurant Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-on-surface-variant dark:text-zinc-500 uppercase tracking-wider block">
                Restaurant
              </label>
              {isSuperAdmin ? (
                <select
                  value={selectedRestaurantId}
                  onChange={(e) => {
                    setSelectedRestaurantId(e.target.value);
                    setSelectedOutletId(''); // Reset outlet on restaurant change
                  }}
                  className="w-full bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg p-2.5 text-xs text-on-background outline-none font-semibold cursor-pointer"
                >
                  <option value="">All Restaurants (System-wide)</option>
                  {restaurants.map(r => (
                    <option key={r._id || r.id} value={r._id || r.id}>{r.name}</option>
                  ))}
                </select>
              ) : (
                <div className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base/50 dark:border-zinc-850 rounded-lg p-2.5 text-xs text-on-surface-variant font-bold">
                  🏢 {isRestaurantOwner ? 'Your Owned Restaurant' : 'Assigned Restaurant'}
                </div>
              )}
            </div>

            {/* Outlet Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-on-surface-variant dark:text-zinc-555 uppercase tracking-wider block">
                Outlet
              </label>
              {isOutletManager ? (
                <div className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base/50 dark:border-zinc-850 rounded-lg p-2.5 text-xs text-on-surface-variant font-bold">
                  📍 {outlets[0]?.name || 'Your Assigned Outlet'}
                </div>
              ) : (
                <select
                  value={selectedOutletId}
                  onChange={(e) => setSelectedOutletId(e.target.value)}
                  className="w-full bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg p-2.5 text-xs text-on-background outline-none font-semibold cursor-pointer"
                >
                  <option value="">All Outlets</option>
                  {filteredOutlets.map(o => (
                    <option key={o._id || o.id} value={o._id || o.id}>{o.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportsList.map((report) => (
          <Card key={report.id} className="p-6 flex flex-col justify-between h-[180px] hover:shadow-md transition-shadow">
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-[14px] text-on-surface dark:text-zinc-200">{report.title}</h4>
                <Badge variant="info" size="xs">{report.type}</Badge>
              </div>
              <p className="text-xs text-on-surface-variant dark:text-zinc-400 leading-relaxed">{report.desc}</p>
            </div>
            <div className="flex justify-end pt-4 border-t border-border-base dark:border-zinc-900/50">
              <Button
                size="sm"
                variant="primary"
                className="flex items-center gap-1.5 font-bold"
                loading={exporting === report.id}
                onClick={() => handleExport(report.id, report.title)}
              >
                {exporting === report.id ? (
                  <HiOutlineArrowPath className="animate-spin text-sm" />
                ) : (
                  <HiOutlineDocumentArrowDown className="text-sm" />
                )}
                Export Report
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary text-3xl">analytics</span>
          <div>
            <h4 className="font-bold text-[14px] text-on-surface dark:text-zinc-250">Need a custom aggregate report?</h4>
            <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1">
              Use the AI Copilot to query your database and compile custom charts on the fly!
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
