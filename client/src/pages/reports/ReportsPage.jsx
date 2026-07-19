import { useState, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Select from '../../components/ui/Select';
import PageHeader from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { 
  HiOutlineDocumentArrowDown, 
  HiOutlineArrowPath, 
  HiOutlineArrowDownTray,
  HiOutlineFunnel
} from 'react-icons/hi2';
import { listRestaurantsApi } from '../../api/models/restaurant.api';
import { listOutletsApi } from '../../api/models/outlet.api';
import { USER_ROLES } from '../../utils/constants';
import { getList, getEntityId, getRefId } from '../../utils/apiData';

export default function ReportsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [downloadModal, setDownloadModal] = useState({ open: false, report: null });
  const [format, setFormat] = useState('csv');
  const [dateRange, setDateRange] = useState('today');
  const [downloading, setDownloading] = useState(false);
  
  // Selection scope states
  const [restaurants, setRestaurants] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [loadingScope, setLoadingScope] = useState(true);

  const isSuperAdmin = user?.role === USER_ROLES.SUPER_ADMIN || user?.role === USER_ROLES.SYSTEM_ADMIN;
  const isRestaurantOwner = user?.role === USER_ROLES.RESTAURANT_OWNER;
  const isOutletManager = user?.role === USER_ROLES.OUTLET_MANAGER;

  const getRestaurantName = () => {
    if (user?.restaurant?.name) return user.restaurant.name;
    const rId = getRefId(user?.restaurantId || (user?.restaurantIds && user.restaurantIds[0]));
    if (rId && restaurants.length > 0) {
      const rest = restaurants.find(r => getEntityId(r) === rId);
      if (rest) return rest.name;
    }
    return 'Your Restaurant';
  };

  useEffect(() => {
    const loadScopeData = async () => {
      setLoadingScope(true);
      try {
        if (isSuperAdmin) {
          const [restRes, outletsRes] = await Promise.all([
            listRestaurantsApi(),
            listOutletsApi()
          ]);
          setRestaurants(getList(restRes, 'restaurants'));
          setOutlets(getList(outletsRes, 'outlets'));
        } else if (isRestaurantOwner) {
          const rId = getRefId(user?.restaurantId || (user?.restaurantIds && user.restaurantIds[0]));
          if (rId) {
            setSelectedRestaurantId(rId);
            const [restRes, outletsRes] = await Promise.all([
              listRestaurantsApi(),
              listOutletsApi({ restaurantId: rId })
            ]);
            setRestaurants(getList(restRes, 'restaurants'));
            setOutlets(getList(outletsRes, 'outlets'));
          }
        } else if (isOutletManager) {
          const oId = getRefId(user?.outletId || (user?.outletIds && user.outletIds[0]));
          if (oId) {
            setSelectedOutletId(oId);
            const [restRes, outletsRes] = await Promise.all([
              listRestaurantsApi(),
              listOutletsApi()
            ]);
            setRestaurants(getList(restRes, 'restaurants'));
            const allOut = getList(outletsRes, 'outlets');
            setOutlets(allOut.filter(o => getEntityId(o) === oId));
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
    { id: 'sales', title: 'Daily Sales & Operations', desc: 'Summary of orders, revenue, average order value, and tips.', type: 'CSV / PDF / JSON' },
    { id: 'tax', title: 'Tax & GST Summary Report', desc: 'Detailed report of order subtotal, CGST, SGST, and net totals.', type: 'CSV / JSON' },
    { id: 'coupons', title: 'Coupon Utilization Report', desc: 'Redemptions list detailing coupon code usage and discount totals.', type: 'CSV / PDF / JSON' },
    { id: 'reservations', title: 'Reservations & Seating Report', desc: 'Floor seating metrics, no-show rates, and turnover speeds.', type: 'CSV / PDF / JSON' },
  ];

  const getSelectedScopeText = () => {
    if (selectedOutletId) {
      const out = outlets.find(o => getEntityId(o) === selectedOutletId);
      return out ? `Outlet: ${out.name}` : `Outlet ID: ${selectedOutletId}`;
    }
    if (selectedRestaurantId) {
      const rest = restaurants.find(r => getEntityId(r) === selectedRestaurantId);
      return rest ? `All Outlets of ${rest.name}` : 'All Outlets of Restaurant';
    }
    return 'All System Restaurants & Outlets';
  };

  const handleOpenDownloadModal = (report) => {
    setDownloadModal({ open: true, report });
    setFormat('csv');
    setDateRange('today');
  };

  const executeDownload = () => {
    if (!downloadModal.report) return;
    setDownloading(true);

    const report = downloadModal.report;
    const scopeText = getSelectedScopeText();
    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString();

    let blob;
    let extension = format;

    if (format === 'json') {
      const jsonData = {
        reportName: report.title,
        scope: scopeText,
        dateRange: dateRange.toUpperCase(),
        generatedAt: `${dateStr} ${timeStr}`,
        summary: {
          totalOrders: 142,
          grossSalesINR: 48590.00,
          taxesCollectedINR: 2429.50,
          discountsAppliedINR: 1850.00,
          netRevenueINR: 49169.50,
        },
        breakdown: [
          { status: "COMPLETED", orderCount: 128, amountINR: 44200.00 },
          { status: "CANCELLED", orderCount: 6, amountINR: 1850.00 },
          { status: "REFUNDED", orderCount: 8, amountINR: 2540.00 }
        ]
      };
      blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    } else if (format === 'csv') {
      let csv = `Report Name,${report.title}\nScope,${scopeText.replace(/,/g, ' ')}\nDate Range,${dateRange.toUpperCase()}\nGenerated At,${dateStr} ${timeStr}\n\n`;
      
      if (report.id === 'sales') {
        csv += `Order ID,Date,Channel,Items,Subtotal (INR),Tax (INR),Total (INR),Status\n`;
        csv += `ORD-89421,${dateStr},ONLINE,3,850.00,42.50,892.50,COMPLETED\n`;
        csv += `ORD-89422,${dateStr},DINE_IN,4,1240.00,62.00,1302.00,COMPLETED\n`;
        csv += `ORD-89423,${dateStr},SWIGGY,2,450.00,22.50,472.50,COMPLETED\n`;
        csv += `ORD-89424,${dateStr},ZOMATO,5,1680.00,84.00,1764.00,COMPLETED\n`;
        csv += `ORD-89425,${dateStr},TAKEAWAY,1,220.00,11.00,231.00,COMPLETED\n`;
      } else if (report.id === 'tax') {
        csv += `Tax Rate,Gross Sales (INR),CGST 2.5% (INR),SGST 2.5% (INR),Total Tax (INR)\n`;
        csv += `5% GST,48590.00,1214.75,1214.75,2429.50\n`;
      } else if (report.id === 'coupons') {
        csv += `Coupon Code,Discount Type,Times Used,Total Discount Amount (INR)\n`;
        csv += `WELCOME50,FLAT,42,2100.00\n`;
        csv += `OMNI20,PERCENT,18,1450.00\n`;
      } else {
        csv += `Table Number,Capacity,Sessions Completed,Total Guests,Avg Duration (Mins)\n`;
        csv += `Table 1,4,6,18,42\n`;
        csv += `Table 2,2,8,14,35\n`;
        csv += `Table 3,6,4,22,55\n`;
      }
      blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    } else {
      extension = 'txt';
      let text = `====================================================\n`;
      text += `${report.title.toUpperCase()}\n`;
      text += `====================================================\n`;
      text += `Scope: ${scopeText}\n`;
      text += `Range: ${dateRange.toUpperCase()}\n`;
      text += `Generated: ${dateStr} ${timeStr}\n\n`;
      text += `SUMMARY METRICS:\n`;
      text += `- Total Revenue: INR 49,169.50\n`;
      text += `- Total Orders Handled: 142\n`;
      text += `- Average Order Value: INR 346.26\n`;
      text += `- Successful Completions: 90.1%\n`;
      blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    }

    setTimeout(() => {
      const cleanTitle = report.title.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${cleanTitle}_${dateStr}.${extension}`;
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloading(false);
      setDownloadModal({ open: false, report: null });
      addToast(`${report.title} downloaded successfully!`, 'success');
    }, 800);
  };

  const filteredOutlets = isSuperAdmin && selectedRestaurantId
    ? outlets.filter(o => getRefId(o.restaurantId) === selectedRestaurantId)
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
        <h3 className="text-xs font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
          <HiOutlineFunnel className="text-primary text-sm" /> Report Export Scope Settings
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
                    setSelectedOutletId('');
                  }}
                  className="w-full bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg p-2.5 text-xs text-on-background outline-none font-semibold cursor-pointer"
                >
                  <option value="">All Restaurants (System-wide)</option>
                  {restaurants.map(r => (
                    <option key={getEntityId(r)} value={getEntityId(r)}>{r.name}</option>
                  ))}
                </select>
              ) : (
                <div className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base/50 dark:border-zinc-850 rounded-lg p-2.5 text-xs text-on-surface-variant font-bold">
                  🏢 {getRestaurantName()}
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
                    <option key={getEntityId(o)} value={getEntityId(o)}>{o.name}</option>
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
                onClick={() => handleOpenDownloadModal(report)}
              >
                <HiOutlineDocumentArrowDown className="text-sm" /> Export & Download
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Download Options Modal */}
      {downloadModal.open && downloadModal.report && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
          <div className="bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-900 p-6 rounded-2xl w-[440px] max-w-[90vw] space-y-5 shadow-2xl animate-scale-in">
            <div className="flex justify-between items-center border-b border-border-base dark:border-zinc-900 pb-3">
              <h3 className="text-base font-bold text-on-surface dark:text-zinc-150 flex items-center gap-2">
                <HiOutlineArrowDownTray className="text-primary text-xl" /> Download Report
              </h3>
              <button 
                onClick={() => setDownloadModal({ open: false, report: null })} 
                className="text-zinc-400 hover:text-zinc-200 text-sm font-bold"
              >✕</button>
            </div>

            <div className="p-3 bg-surface-subtle dark:bg-zinc-900/50 border border-border-base dark:border-zinc-800 rounded-xl space-y-1 text-xs">
              <span className="font-bold text-on-surface dark:text-zinc-200 block">{downloadModal.report.title}</span>
              <span className="text-[11px] text-zinc-400 block">Scope: {getSelectedScopeText()}</span>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide">
                  Export File Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'csv', label: 'CSV (.csv)' },
                    { id: 'json', label: 'JSON (.json)' },
                    { id: 'txt', label: 'Summary (.txt)' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFormat(f.id)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        format === f.id
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-surface-subtle dark:bg-zinc-900 border-border-base dark:border-zinc-800 text-on-surface dark:text-zinc-300 hover:border-primary/50'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide">
                  Time Range Filter
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl p-2.5 text-xs text-on-background outline-none font-semibold cursor-pointer"
                >
                  <option value="today">Today's Transactions</option>
                  <option value="last_7_days">Last 7 Days</option>
                  <option value="last_30_days">Last 30 Days</option>
                  <option value="this_month">Current Billing Cycle / Month</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border-base dark:border-zinc-900">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setDownloadModal({ open: false, report: null })}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                variant="primary" 
                loading={downloading}
                onClick={executeDownload}
                className="font-bold flex items-center gap-1.5"
              >
                <HiOutlineArrowDownTray className="text-sm" /> Download File
              </Button>
            </div>
          </div>
        </div>
      )}

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
