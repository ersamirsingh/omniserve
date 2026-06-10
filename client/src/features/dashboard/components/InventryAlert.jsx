// InventoryAlerts.jsx — FoodMesh OS
// Stack: React + Tailwind CSS

import { useState, useEffect, useCallback } from "react";
import {
  X, RefreshCw, ExternalLink,
  ShoppingCart, Check, PackageX,
} from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export const SEVERITY = {
  out: {
    label: "Out of stock",
    order: 0,
    accent: "#E24B4A",
    badge: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
    bar:   "bg-red-500",
    btn:   "bg-red-500 hover:bg-red-600 text-white",
  },
  critical: {
    label: "Critical",
    order: 1,
    accent: "#EF9F27",
    badge: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    bar:   "bg-amber-400",
    btn:   "bg-amber-500 hover:bg-amber-600 text-white",
  },
  expiring: {
    label: "Expiring soon",
    order: 2,
    accent: "#7F77DD",
    badge: "bg-violet-50 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
    bar:   "bg-violet-500",
    btn:   "bg-violet-600 hover:bg-violet-700 text-white",
  },
  low: {
    label: "Low stock",
    order: 3,
    accent: "#378ADD",
    badge: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
    bar:   "bg-blue-500",
    btn:   "bg-blue-600 hover:bg-blue-700 text-white",
  },
};

// ─── Mock data ────────────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export const MOCK_ALERTS = [
  { id:1,  name:"Chicken breast",  category:"Protein",    unit:"kg",  current:0,    min:15, reorder:50, type:"out"      },
  { id:2,  name:"Tomato sauce",    category:"Sauces",     unit:"L",   current:1.5,  min:10, reorder:30, type:"out"      },
  { id:3,  name:"Basmati rice",    category:"Grains",     unit:"kg",  current:4,    min:20, reorder:80, type:"critical" },
  { id:4,  name:"Olive oil",       category:"Oils",       unit:"L",   current:3,    min:12, reorder:24, type:"critical" },
  { id:5,  name:"Cumin seeds",     category:"Spices",     unit:"kg",  current:0.5,  min:2,  reorder:5,  type:"critical" },
  { id:6,  name:"Mozzarella",      category:"Dairy",      unit:"kg",  current:2.5,  min:8,  reorder:20, type:"expiring", expiry:"2 days" },
  { id:7,  name:"Fresh cream",     category:"Dairy",      unit:"L",   current:4,    min:10, reorder:15, type:"expiring", expiry:"1 day"  },
  { id:8,  name:"Garlic paste",    category:"Condiments", unit:"kg",  current:1.8,  min:5,  reorder:10, type:"low"      },
  { id:9,  name:"Paneer",          category:"Dairy",      unit:"kg",  current:3,    min:8,  reorder:16, type:"low"      },
  { id:10, name:"Onions",          category:"Produce",    unit:"kg",  current:6,    min:25, reorder:60, type:"low"      },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const stockPct  = (a) => Math.min(100, Math.round((a.current / a.min) * 100));
const sortAlerts = (data, key) => [...data].sort((a, b) => {
  if (key === "severity") return SEVERITY[a.type].order - SEVERITY[b.type].order;
  if (key === "name")     return a.name.localeCompare(b.name);
  if (key === "stock")    return stockPct(a) - stockPct(b);
  return 0;
});

// ─── Sub-components ───────────────────────────────────────────────────────────
function SummaryCard({ label, value, color }) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-xl p-3.5">
      <p className="text-[11px] text-zinc-400 mb-1">{label}</p>
      <p className="text-2xl font-semibold leading-none" style={{ color }}>{value}</p>
    </div>
  );
}

function FilterChip({ type, label, active, onClick }) {
  const activeStyles = {
    all:      "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border-transparent",
    out:      "bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800",
    critical: "bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800",
    expiring: "bg-violet-50 dark:bg-violet-950 text-violet-800 dark:text-violet-200 border-violet-200 dark:border-violet-800",
    low:      "bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800",
  };

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-[11px] border transition-all
        ${active
          ? activeStyles[type]
          : "border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
        }`}
    >
      {label}
    </button>
  );
}

function StockBar({ alert }) {
  const pct = stockPct(alert);
  const cfg = SEVERITY[alert.type];
  return (
    <div className="h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden my-2">
      <div
        className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function AlertCard({ alert, onDismiss, onReorder, onViewItem }) {
  const [reordered, setReordered] = useState(false);
  const cfg = SEVERITY[alert.type];
  const isOut = alert.type === "out";

  const handleReorder = () => {
    setReordered(true);
    onReorder?.(alert);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800
                    rounded-xl p-4 flex gap-3 hover:border-zinc-300 dark:hover:border-zinc-700
                    transition-colors group">
      {/* Severity accent bar */}
      <div
        className="w-0.5 rounded-full self-stretch shrink-0 min-h-12"
        style={{ background: cfg.accent }}
      />

      <div className="flex-1 min-w-0">
        {/* Row 1: name + badge + dismiss */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
              {alert.name}
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">{alert.category}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${cfg.badge}`}>
              {cfg.label}
            </span>
            <button
              onClick={() => onDismiss?.(alert.id)}
              className="p-1 rounded-md text-zinc-300 dark:text-zinc-600
                         hover:text-zinc-500 dark:hover:text-zinc-400
                         hover:bg-zinc-100 dark:hover:bg-zinc-800
                         opacity-0 group-hover:opacity-100 transition-all"
              aria-label="Dismiss alert"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Row 2: meta stats */}
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-[12px] text-zinc-400">
            Stock{" "}
            <span className="text-zinc-600 dark:text-zinc-300 font-medium">
              {isOut ? `0` : alert.current} / {alert.min} {alert.unit}
            </span>
          </span>
          <span className="text-[12px] text-zinc-400">
            Min{" "}
            <span className="text-zinc-600 dark:text-zinc-300 font-medium">
              {alert.min} {alert.unit}
            </span>
          </span>
          {alert.expiry && (
            <span className="text-[12px] text-violet-500 dark:text-violet-400 font-medium">
              Expires in {alert.expiry}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <StockBar alert={alert} />

        {/* Row 3: reorder suggestion + actions */}
        <div className="flex items-center justify-between mt-1.5 flex-wrap gap-2">
          <span className="text-[12px] text-zinc-400">
            Suggest reorder{" "}
            <span className="text-zinc-600 dark:text-zinc-300 font-medium">
              {alert.reorder} {alert.unit}
            </span>
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={() => onViewItem?.(alert)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                         border border-zinc-200 dark:border-zinc-700
                         text-[12px] text-zinc-500 dark:text-zinc-400
                         hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
            >
              <ExternalLink size={12} />
              View item
            </button>
            <button
              onClick={handleReorder}
              disabled={reordered}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                          text-[12px] font-medium transition-all
                          disabled:opacity-60 disabled:cursor-not-allowed
                          ${cfg.btn}`}
            >
              {reordered
                ? <><Check size={12} /> Ordered</>
                : <><ShoppingCart size={12} /> Reorder</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard({ opacity = 1 }) {
  return (
    <div
      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800
                 rounded-xl p-4 flex gap-3 animate-pulse"
      style={{ opacity }}
    >
      <div className="w-0.5 min-h-20 rounded-full bg-zinc-200 dark:bg-zinc-700 shrink-0" />
      <div className="flex-1 flex flex-col gap-2.5">
        <div className="flex justify-between items-start">
          <div className="space-y-1.5">
            <div className="h-3.5 w-44 rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-3 w-24 rounded bg-zinc-100 dark:bg-zinc-800" />
          </div>
          <div className="h-5 w-20 rounded-full bg-zinc-100 dark:bg-zinc-800" />
        </div>
        <div className="flex gap-4">
          <div className="h-3 w-28 rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-3 w-20 rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>
        <div className="h-1 w-full rounded-full bg-zinc-100 dark:bg-zinc-800" />
        <div className="flex justify-between items-center">
          <div className="h-3 w-36 rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="flex gap-1.5">
            <div className="h-7 w-20 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-7 w-20 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onClearFilter }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3
                    bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
      <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800
                      flex items-center justify-center">
        <PackageX size={22} className="text-zinc-400" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">No alerts match this filter</p>
        <p className="text-xs text-zinc-400 mt-0.5">All items in this category are within safe levels</p>
      </div>
      <button
        onClick={onClearFilter}
        className="mt-1 text-xs px-4 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700
                   text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
      >
        View all alerts
      </button>
    </div>
  );
}

// ─── InventoryAlerts (main export) ────────────────────────────────────────────
/**
 * @param {Object}   props
 * @param {Array}    [props.alerts]      — override mock data (real-time ready)
 * @param {boolean}  [props.loading]     — skeleton state
 * @param {Function} [props.onReorder]   — callback(alert)
 * @param {Function} [props.onViewItem]  — callback(alert)
 * @param {Function} [props.onRefresh]   — callback()
 */
export default function InventoryAlerts({
  alerts    = MOCK_ALERTS,
  loading   = false,
  onReorder,
  onViewItem,
  onRefresh,
}) {
  const [filter,    setFilter]    = useState("all");
  const [sortKey,   setSortKey]   = useState("severity");
  const [dismissed, setDismissed] = useState(new Set());
  const [lastSeen,  setLastSeen]  = useState(new Date());

  // Real-time ready: re-subscribe when `alerts` prop changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastSeen(new Date());
  }, [alerts]);

  const dismiss = useCallback((id) => {
    setDismissed((prev) => new Set([...prev, id]));
  }, []);

  const handleRefresh = () => {
    setDismissed(new Set());
    setFilter("all");
    onRefresh?.();
  };

  const active  = alerts.filter((a) => !dismissed.has(a.id));
  const counts  = { out: 0, critical: 0, expiring: 0, low: 0 };
  active.forEach((a) => counts[a.type]++);

  const filtered = filter === "all" ? active : active.filter((a) => a.type === filter);
  const sorted   = sortAlerts(filtered, sortKey);

  const FILTERS = [
    { type: "all",      label: "All alerts"    },
    { type: "out",      label: "Out of stock"  },
    { type: "critical", label: "Critical"      },
    { type: "expiring", label: "Expiring soon" },
    { type: "low",      label: "Low stock"     },
  ];

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
            Inventory alerts
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            {loading
              ? "Loading…"
              : `${active.length} item${active.length !== 1 ? "s" : ""} need attention · ${
                  lastSeen.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                }`
            }
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg
                       border border-zinc-200 dark:border-zinc-700
                       bg-white dark:bg-zinc-900
                       text-zinc-600 dark:text-zinc-400
                       cursor-pointer focus:outline-none"
          >
            <option value="severity">Sort: severity</option>
            <option value="name">Sort: name</option>
            <option value="stock">Sort: stock %</option>
          </select>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg
                       border border-zinc-200 dark:border-zinc-700
                       text-zinc-500 dark:text-zinc-400
                       hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <SummaryCard label="Out of stock"  value={counts.out}      color="#E24B4A" />
          <SummaryCard label="Critical"      value={counts.critical} color="#BA7517" />
          <SummaryCard label="Expiring soon" value={counts.expiring} color="#534AB7" />
          <SummaryCard label="Low stock"     value={counts.low}      color="#185FA5" />
        </div>
      )}

      {/* Filter chips */}
      {!loading && (
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map(({ type, label }) => (
            <FilterChip
              key={type}
              type={type}
              label={label}
              active={filter === type}
              onClick={() => setFilter(type)}
            />
          ))}
        </div>
      )}

      {/* Alert list */}
      <div className="space-y-2">
        {loading ? (
          [1, 0.85, 0.7, 0.55].map((op, i) => (
            <SkeletonCard key={i} opacity={op} />
          ))
        ) : sorted.length === 0 ? (
          <EmptyState onClearFilter={() => setFilter("all")} />
        ) : (
          sorted.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onDismiss={dismiss}
              onReorder={onReorder}
              onViewItem={onViewItem}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Demo wrapper ─────────────────────────────────────────────────────────────
export function InventoryAlertsDemo() {
  const [loading, setLoading] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  };

  return (
    <div className="bg-zinc-50 dark:bg-zinc-950 min-h-screen p-6">
      <InventoryAlerts
        loading={loading}
        onReorder={(a) => console.log("Reorder:", a)}
        onViewItem={(a) => console.log("View:", a)}
        onRefresh={handleRefresh}
      />
    </div>
  );
}