// OrdersChart.jsx — FoodMesh OS
// Stack: React + Recharts + Tailwind CSS

import { useState, useEffect, useCallback, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";
import { Download, TrendingUp, TrendingDown, BarChart2 } from "lucide-react";

// ─── Config ──────────────────────────────────────────────────────────────────
const SERIES = [
  { key: "online",  label: "Online",  color: "#4F6EF7", fill: "rgba(79,110,247,0.12)"  },
  { key: "offline", label: "Offline", color: "#10B981", fill: "rgba(16,185,129,0.10)"  },
  { key: "swiggy",  label: "Swiggy",  color: "#F97316", fill: "rgba(249,115,22,0.10)"  },
  { key: "zomato",  label: "Zomato",  color: "#EF4444", fill: "rgba(239,68,68,0.10)"   },
  { key: "direct",  label: "Direct",  color: "#A855F7", fill: "rgba(168,85,247,0.10)"  },
];

const RANGES = [
  { label: "7D",  days: 7  },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];

// ─── Mock data generator ──────────────────────────────────────────────────────
function seededRandom(s) {
  const x = Math.sin(s + 1) * 10000;
  return x - Math.floor(x);
}

function generateData(days) {
  const BASE  = { online: 120, offline: 80,  swiggy: 95,  zomato: 110, direct: 40  };
  const TREND = { online: 0.8, offline: 0.3, swiggy: 1.1, zomato: 0.9, direct: 0.5 };
  const now = new Date(); now.setHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (days - 1 - i));
    const date = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    const row = { date };
    SERIES.forEach(({ key }, si) => {
      const val = BASE[key] + TREND[key] * (i + 1) + seededRandom(i * 7 + si) * 40 - 5;
      row[key] = Math.max(Math.round(val), 0);
    });
    return row;
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sum  = (arr) => arr.reduce((a, b) => a + b, 0);
const fmt  = (n)   => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

function pctDelta(arr) {
  const half = Math.floor(arr.length / 2);
  const prev = sum(arr.slice(0, half));
  const curr = sum(arr.slice(half));
  if (!prev) return 0;
  return Math.round(((curr - prev) / prev) * 100);
}

function exportCSV(data, days) {
  const headers = ["Date", ...SERIES.map((s) => s.label)].join(",");
  const rows = data.map((row) =>
    [row.date, ...SERIES.map((s) => row[s.key])].join(",")
  );
  const blob = new Blob([[headers, ...rows].join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `foodmesh_orders_${days}d.csv`;
  a.click();
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700
                    rounded-xl p-3 text-xs shadow-lg min-w-37.5">
      <p className="text-zinc-400 font-medium mb-2">{label}</p>
      {payload.map(({ name, value, color }) => (
        <div key={name} className="flex items-center gap-2 mb-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
          <span className="text-zinc-400 w-14">{name}</span>
          <span className="font-semibold text-zinc-800 dark:text-zinc-100 ml-auto">
            {value.toLocaleString("en-IN")}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({ series, data }) {
  const vals  = data.map((r) => r[series.key]);
  const total = sum(vals);
  const delta = pctDelta(vals);
  const up    = delta >= 0;

  return (
    <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-xl p-3.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="w-2 h-2 rounded-full" style={{ background: series.color }} />
        <span className="text-[11px] text-zinc-400 font-medium uppercase tracking-wide">
          {series.label}
        </span>
      </div>
      <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 leading-none mb-1">
        {total.toLocaleString("en-IN")}
      </p>
      <span className={`text-[11px] font-medium flex items-center gap-0.5
                        ${up ? "text-emerald-500" : "text-rose-500"}`}>
        {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
        {Math.abs(delta)}%
      </span>
    </div>
  );
}

// ─── Legend Item ──────────────────────────────────────────────────────────────
function LegendItem({ series, hidden, onToggle }) {
  return (
    <button
      onClick={() => onToggle(series.key)}
      className={`flex items-center gap-1.5 text-xs transition-opacity cursor-pointer
                  ${hidden ? "opacity-30" : "opacity-100"}`}
    >
      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: series.color }} />
      <span className="text-zinc-500 dark:text-zinc-400">{series.label}</span>
    </button>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-5 gap-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        ))}
      </div>
      <div className="h-56 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-56 gap-2">
      <BarChart2 size={32} className="text-zinc-300 dark:text-zinc-600" />
      <p className="text-sm text-zinc-500">No orders in this range</p>
      <p className="text-xs text-zinc-400">Try a wider time window</p>
    </div>
  );
}

// ─── OrdersChart ──────────────────────────────────────────────────────────────
export default function OrdersChart() {
  const [range,    setRange]    = useState(30);
  const [data,     setData]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [hidden,   setHidden]   = useState(new Set());
  const [exported, setExported] = useState(false);
  const toastTimer = useRef(null);

  // Simulate async API fetch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const t = setTimeout(() => {
      setData(generateData(range));
      setLoading(false);
    }, 600);
    return () => clearTimeout(t);
  }, [range]);

  const toggleSeries = useCallback((key) => {
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const handleExport = () => {
    exportCSV(data, range);
    setExported(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setExported(false), 2200);
  };

  // X-axis label skip for readability
  const skip = range > 30 ? Math.ceil(range / 12) : 1;
  const visibleSeries = SERIES.filter((s) => !hidden.has(s.key));
  const isEmpty = !loading && data.length === 0;

  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800
                    rounded-2xl p-5 w-full">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50 m-0">
            Order Volume
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">All channels · updated just now</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Time range filter */}
          <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
            {RANGES.map(({ label, days }) => (
              <button
                key={days}
                onClick={() => setRange(days)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all
                  ${range === days
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Export */}
          <button
            onClick={handleExport}
            disabled={loading || isEmpty}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                       border border-zinc-200 dark:border-zinc-700
                       text-zinc-600 dark:text-zinc-400
                       hover:bg-zinc-50 dark:hover:bg-zinc-800
                       disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Download size={13} />
            {exported ? "Exported ✓" : "Export"}
          </button>
        </div>
      </div>

      {loading ? (
        <Skeleton />
      ) : isEmpty ? (
        <EmptyState />
      ) : (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-5">
            {SERIES.map((s) => (
              <MetricCard key={s.key} series={s} data={data} />
            ))}
          </div>

          {/* Interactive legend */}
          <div className="flex flex-wrap gap-4 mb-4">
            {SERIES.map((s) => (
              <LegendItem
                key={s.key}
                series={s}
                hidden={hidden.has(s.key)}
                onToggle={toggleSeries}
              />
            ))}
          </div>

          {/* Chart */}
          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  {visibleSeries.map((s) => (
                    <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={s.color} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={s.color} stopOpacity={0.01} />
                    </linearGradient>
                  ))}
                </defs>

                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke="currentColor"
                  className="text-zinc-100 dark:text-zinc-800"
                  vertical={false}
                />

                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  interval={skip - 1}
                />

                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={fmt}
                />

                <Tooltip content={<CustomTooltip />} cursor={false} />

                {visibleSeries.map((s) => (
                  <Area
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2}
                    fill={`url(#grad-${s.key})`}
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}