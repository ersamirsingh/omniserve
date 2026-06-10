
// StatsCards.jsx — FoodMesh OS · optimized, no cn()

import { useState } from "react";
import {
  DollarSign, ShoppingBag, Users,
  Package, Activity, TrendingUp,
  ArrowUp, ArrowDown,
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export const STATS = [
  {
    id: "revenue",
    label: "Total Revenue",
    value: "$48,295",
    trend: 12.4,
    note: "vs $42,951 last week",
    accent: "#635bff",
    accentBg: "rgba(99,91,255,.12)",
    Icon: DollarSign,
  },
  {
    id: "orders",
    label: "Total Orders",
    value: "1,847",
    trend: 8.1,
    note: "vs 1,708 last week",
    accent: "#f59e0b",
    accentBg: "rgba(245,158,11,.12)",
    Icon: ShoppingBag,
  },
  {
    id: "customers",
    label: "Active Customers",
    value: "924",
    trend: -3.2,
    note: "vs 955 last week",
    accent: "#06b6d4",
    accentBg: "rgba(6,182,212,.12)",
    Icon: Users,
  },
  {
    id: "inventory",
    label: "Inventory Value",
    value: "$12,450",
    trend: 5.7,
    note: "vs $11,779 last month",
    accent: "#10b981",
    accentBg: "rgba(16,185,129,.12)",
    Icon: Package,
  },
  {
    id: "staff",
    label: "Staff Online",
    value: "18",
    trend: 0,
    note: "of 22 scheduled today",
    accent: "#f43f5e",
    accentBg: "rgba(244,63,94,.12)",
    Icon: Activity,
  },
  {
    id: "aov",
    label: "Avg Order Value",
    value: "$26.14",
    trend: 2.9,
    note: "vs $25.41 last week",
    accent: "#a78bfa",
    accentBg: "rgba(167,139,250,.12)",
    Icon: TrendingUp,
  },
];

// ─── Styles (static objects, zero runtime cost) ───────────────────────────────
const S = {
  grid: {
    display: "grid",
    // Responsive via inline CSS custom property trick; use Tailwind classes instead if preferred:
    // "grid-cols-1 sm:grid-cols-3 xl:grid-cols-6 gap-3.5"
  },
  card: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 14,
    padding: "22px 24px",
    background: "linear-gradient(135deg, #141417, #111114)",
    border: "1px solid #27272a",
    cursor: "default",
    transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
  },
  shimmer: {
    position: "absolute",
    inset: "0 0 auto",
    height: 1,
    background: "linear-gradient(90deg, transparent, rgba(255,255,255,.05), transparent)",
  },
  iconWrap: (accentBg) => ({
    width: 40, height: 40,
    borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: accentBg,
    flexShrink: 0,
  }),
  value: {
    fontSize: 28, fontWeight: 800,
    color: "#f4f4f5",
    letterSpacing: "-0.5px",
    lineHeight: 1.1,
    margin: "0 0 5px",
  },
  label: {
    fontSize: 11, fontWeight: 600,
    color: "#52525b",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    margin: "0 0 5px",
  },
  note: { fontSize: 11, color: "#3f3f46", margin: 0 },
  accentBar: (accent) => ({
    position: "absolute",
    bottom: 0, left: 24, right: 24,
    height: 2, borderRadius: 2,
    background: `linear-gradient(90deg, ${accent}50, ${accent}10)`,
  }),
  skeletonBase: {
    borderRadius: 14,
    padding: "22px 24px",
    background: "#111114",
    border: "1px solid #1c1c1f",
    minHeight: 148,
  },
  emptyCard: {
    borderRadius: 14,
    padding: "22px 24px",
    minHeight: 148,
    background: "#0d0d10",
    border: "1px dashed #27272a",
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    gap: 6,
  },
};

// ─── TrendBadge ───────────────────────────────────────────────────────────────
function TrendBadge({ trend }) {
  if (trend === 0) {
    return (
      <span style={{
        fontSize: 11, fontWeight: 600,
        padding: "3px 9px", borderRadius: 20,
        background: "rgba(63,63,70,.5)", color: "#71717a",
      }}>—</span>
    );
  }

  const up = trend > 0;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      fontSize: 11, fontWeight: 600,
      padding: "3px 9px", borderRadius: 20,
      background: up ? "rgba(34,197,94,.1)" : "rgba(244,63,94,.1)",
      color: up ? "#22c55e" : "#f43f5e",
    }}>
      {up
        ? <ArrowUp size={11} strokeWidth={3} />
        : <ArrowDown size={11} strokeWidth={3} />}
      {up ? "+" : ""}{trend}%
    </span>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, trend, note, accent, accentBg, Icon }) {
  const [hovered, setHovered] = useState(false);

  const cardStyle = {
    ...S.card,
    ...(hovered && {
      transform: "translateY(-3px)",
      boxShadow: "0 20px 48px rgba(0,0,0,.55)",
      borderColor: "#3f3f46",
    }),
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={S.shimmer} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div style={S.iconWrap(accentBg)}>
          <Icon size={18} color={accent} />
        </div>
        <TrendBadge trend={trend} />
      </div>

      <p style={S.value}>{value}</p>
      <p style={S.label}>{label}</p>
      <p style={S.note}>{note}</p>

      <div style={S.accentBar(accent)} />
    </div>
  );
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────
const skeletonBlock = (w, h, extra = {}) => (
  <div style={{
    width: w, height: h, borderRadius: 6,
    background: "linear-gradient(90deg,#18181b 25%,#27272a 50%,#18181b 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.6s infinite",
    ...extra,
  }} />
);

function SkeletonCard() {
  return (
    <div style={S.skeletonBase}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
        {skeletonBlock(40, 40, { borderRadius: 10 })}
        {skeletonBlock(52, 20)}
      </div>
      {skeletonBlock("55%", 32, { marginBottom: 10 })}
      {skeletonBlock("80%", 12, { marginBottom: 6 })}
      {skeletonBlock("60%", 12)}
    </div>
  );
}

// ─── EmptyCard ────────────────────────────────────────────────────────────────
function EmptyCard({ label }) {
  return (
    <div style={S.emptyCard}>
      <span style={{ fontSize: 28, color: "#3f3f46", fontWeight: 300 }}>—</span>
      <span style={{ fontSize: 10, color: "#3f3f46", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </span>
    </div>
  );
}

// ─── StatsCards (main export) ─────────────────────────────────────────────────
export default function StatsCards({ stats = STATS, loading = false, empty = false }) {
  return (
    // Tailwind responsive grid — no cn() needed, just plain class string
    <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-6 gap-3.5">
      {loading
        ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        : empty
        ? stats.map((s) => <EmptyCard key={s.id} label={s.label} />)
        : stats.map((s) => <StatCard key={s.id} {...s} />)}
    </div>
  );
}

// ─── Demo wrapper ─────────────────────────────────────────────────────────────
export function StatsCardsDemo() {
  const [mode, setMode] = useState("live");

  return (
    <div style={{ padding: 28, background: "#09090b", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 600, color: "#635bff", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 4px" }}>
            FoodMesh OS
          </p>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#f4f4f5", margin: 0, letterSpacing: "-0.3px" }}>
            Operations Overview
          </h1>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          {["live", "loading", "empty"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: "6px 14px", borderRadius: 8,
                fontSize: 11, fontWeight: 600,
                cursor: "pointer", border: "none",
                textTransform: "capitalize",
                background: mode === m ? "#635bff" : "#18181b",
                color: mode === m ? "#fff" : "#71717a",
                transition: "all .15s",
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <StatsCards loading={mode === "loading"} empty={mode === "empty"} />

      <p style={{ marginTop: 14, textAlign: "right", fontSize: 11, color: "#27272a" }}>
        Updated just now · Auto-refreshes every 30s
      </p>
    </div>
  );
}