
import { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  NAMES, CH_COLORS, CH_SRC, ITEMS_POOL, COL_META,
  KITCHEN_LOAD, AI_RECS, STAFF, INVENTORY_RISK,
  CHANNELS, HOUR_DATA, PIE_DATA
} from "../../../data/data";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import StatsCards from "./StateCard";


// ─── HELPERS ──────────────────────────────────────────────────────────────────

let _id = 1000;
function makeOrder(col, priorityBias = 0.2) {
  const name  = NAMES[Math.floor(Math.random() * NAMES.length)];
  const ch    = CH_SRC[Math.floor(Math.random() * CH_SRC.length)];
  const items = ITEMS_POOL[Math.floor(Math.random() * ITEMS_POOL.length)].map(itemName => ({
    name: itemName,
    qty: Math.floor(Math.random() * 3) + 1,
    price: Math.floor(200 + Math.random() * 600)
  }));
  const val   = Math.floor(800 + Math.random() * 2400);
  const pr    = Math.random() < priorityBias ? "high" : Math.random() < 0.4 ? "med" : "low";
  const mins  = Math.floor(2 + Math.random() * 45);
  const sla   = Math.floor(30 + Math.random() * 70);
  return { id: `ORD-${++_id}`, col, name, ch, items, val, pr, mins, sla, paid: Math.random() > 0.2, delivery: Math.random() > 0.4 ? "Delivery" : "Pickup" };
}

function makeOrders(col, count, bias) {
  return Array.from({ length: count }, () => makeOrder(col, bias));
}

const INITIAL_ORDERS = {
  new:       makeOrders("new",       4, 0.4),
  accepted:  makeOrders("accepted",  3, 0.3),
  preparing: makeOrders("preparing", 5, 0.2),
  ready:     makeOrders("ready",     2, 0.1),
  completed: makeOrders("completed", 7, 0.0),
  cancelled: makeOrders("cancelled", 2, 0.0),
};

// ─── ICON PRIMITIVES ─────────────────────────────────────────────────────────



const IClose    = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IFilter   = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>;
const IRefresh  = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;


// ─── TOOLTIP STYLE ───────────────────────────────────────────────────────────

// const TOOLTIP_STYLE = {
//   contentStyle: {
//     background: "var(--bg3)", border: "1px solid var(--border)",
//     borderRadius: 6, fontSize: 11, color: "var(--text)",
//   },
//   labelStyle: { color: "var(--text2)" },
// };

// ─── BADGE ───────────────────────────────────────────────────────────────────

const Badge = ({ children, variant = "gray" }) => (
  <span className={`badge badge-${variant}`}>{children}</span>
);




function OrderCard({ order, onSelect }) {
  const slaColor = order.sla > 70 ? "var(--green)" : order.sla > 40 ? "var(--amber)" : "var(--red)";
  const chVariant = CH_COLORS[order.ch] || "gray";

  return (
    <div
      className={`order-card priority-${order.pr}`}
      onClick={() => onSelect(order)}
    >
      <div className="oc-top">
        <span className="oc-id">{order.id}</span>
        <span className="oc-time">{order.mins}m ago</span>
      </div>
      <div className="oc-customer">{order.name}</div>
      <div className="oc-meta">
        <Badge variant={chVariant}>{order.ch}</Badge>
        <Badge variant="gray">{order.delivery}</Badge>
        {order.pr === "high" && <Badge variant="red">Urgent</Badge>}
      </div>
      <div className="oc-value">₹{order.val.toLocaleString()}</div>
      <div className="sla-bar">
        <div className="sla-fill" style={{ width: `${order.sla}%`, background: slaColor }} />
      </div>
      {order.col === "new" && (
        <div className="oc-actions">
          <button className="oc-btn accept">Accept</button>
          <button className="oc-btn reject">Reject</button>
        </div>
      )}
    </div>
  );
}

function CommandCenter({ orders, onSelect }) {
  return (
    <div className="command-center">
      <div className="cc-header">
        <div>
          <div className="cc-title">Live Orders Command Center</div>
          <div className="cc-subtitle">Real-time across all channels · Auto-refresh every 30s</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn"><IFilter /> Filter</button>
          <button className="btn primary"><IRefresh /> Refresh</button>
        </div>
      </div>

      <div className="cc-cols">
        {COL_META.map((col) => (
          <div key={col.key} className="cc-col">
            <div className="cc-col-header">
              <span className="cc-col-name" style={{ color: col.color }}>{col.label}</span>
              <span className="cc-count">{orders[col.key]?.length || 0}</span>
            </div>
            <div className="cc-cards">
              {orders[col.key]?.length ? (
                orders[col.key].map((o, i) => (
                  <OrderCard key={o.id + i} order={o} onSelect={onSelect} />
                ))
              ) : (
                <div className="empty-col">
                  <span style={{ fontSize: 20 }}>—</span>
                  <span>No orders</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── INTEL PANEL ─────────────────────────────────────────────────────────────

function IntelPanel() {
  return (
    <div className="intel-panel">
      <div className="intel-header">
        <div className="section-title">Operational Intelligence</div>
        <div className="section-sub">AI-powered real-time insights</div>
      </div>

      <div className="intel-sections">
        {/* Kitchen Load */}
        <div className="intel-block">
          <div className="ib-title">Kitchen Load</div>
          {KITCHEN_LOAD.map(({ name, pct, color }) => (
            <div key={name}>
              <div className="load-label">
                <span>{name}</span>
                <span style={{ color }}>{pct}%</span>
              </div>
              <div className="load-bar">
                <div className="load-fill" style={{ width: `${pct}%`, background: color }} />
              </div>
            </div>
          ))}
        </div>

        {/* AI Recommendations */}
        <div className="intel-block">
          <div className="ib-title">AI Recommendations</div>
          {AI_RECS.map((r, i) => (
            <div key={i} className="ai-rec">
              <div className={`ai-icon ${r.type}`}>{r.icon}</div>
              <div className="ai-text">{r.text}</div>
            </div>
          ))}
        </div>

        {/* Staff Utilization */}
        <div className="intel-block">
          <div className="ib-title">Staff Utilization</div>
          {STAFF.map(({ name, role, util, color }) => (
            <div key={name} className="staff-row">
              <div className="staff-avatar">{name[0]}</div>
              <div className="staff-info">
                <div className="staff-name">{name}</div>
                <div className="staff-role">{role}</div>
              </div>
              <div className="staff-util" style={{ color }}>{util}</div>
            </div>
          ))}
        </div>

        {/* Inventory Risk */}
        <div className="intel-block">
          <div className="ib-title">Inventory Risk</div>
          {INVENTORY_RISK.map(({ item, pct, color }) => (
            <div key={item}>
              <div className="load-label">
                <span>{item}</span>
                <span style={{ color }}>{pct}%</span>
              </div>
              <div className="load-bar">
                <div className="load-fill" style={{ width: `${pct}%`, background: color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ORDER DRAWER ─────────────────────────────────────────────────────────────

function OrderDrawer({ order, onClose }) {
  if (!order) return null;

  const timeline = [
    { color: "var(--green)", time: "12:04", text: `Order placed via ${order.ch}` },
    { color: "var(--accent)", time: "12:05", text: "Assigned to kitchen" },
    { color: "var(--amber)", time: "12:08", text: "Preparation started" },
    ...(order.col === "ready" ? [{ color: "var(--teal)", time: "12:22", text: "Ready for pickup/delivery" }] : []),
  ];

  return (
    <div className="drawer-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="drawer">
        {/* Header */}
        <div className="drawer-header">
          <div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 2 }}>{order.id}</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{order.name}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Badge variant={order.paid ? "green" : "amber"}>{order.paid ? "Paid" : "Pending"}</Badge>
            <button className="icon-btn" onClick={onClose}><IClose /></button>
          </div>
        </div>

        {/* Customer Info */}
        <div className="drawer-section">
          <div className="ds-title">Customer Info</div>
          {[
            ["Name", order.name],
            ["Channel", order.ch],
            ["Order Type", order.delivery],
            ["Priority", order.pr.toUpperCase()],
            ["Time", `${order.mins} minutes ago`],
          ].map(([l, v]) => (
            <div key={l} className="ds-row">
              <span className="ds-label">{l}</span>
              <span className="ds-value">{v}</span>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="drawer-section">
          <div className="ds-title">Order Timeline</div>
          {timeline.map((t, i) => (
            <div key={i} className="timeline-item">
              <div className="tl-dot" style={{ background: t.color }} />
              <span className="tl-time">{t.time}</span>
              <span className="tl-text">{t.text}</span>
            </div>
          ))}
        </div>

        {/* Items */}
        <div className="drawer-section">
          <div className="ds-title">Items Ordered</div>
          {order.items.map((item, i) => (
            <div key={i} className="item-row">
              <div>
                <div className="item-name">{item.name}</div>
                <div className="item-qty">Qty: {item.qty}</div>
              </div>
              <div className="item-price">₹{item.price}</div>
            </div>
          ))}
          <div className="item-total">
            <span>Total</span>
            <span>₹{order.val.toLocaleString()}</span>
          </div>
        </div>

        {/* Payment */}
        <div className="drawer-section">
          <div className="ds-title">Payment Details</div>
          {[
            ["Method", "UPI – PhonePe"],
            ["Status", order.paid ? "Paid" : "Pending"],
            // eslint-disable-next-line react-hooks/purity
            ["Transaction ID", "TXN" + Math.random().toString(36).slice(2, 10).toUpperCase()],
            ["Amount", `₹${order.val.toLocaleString()}`],
          ].map(([l, v]) => (
            <div key={l} className="ds-row">
              <span className="ds-label">{l}</span>
              <span className="ds-value" style={{ color: l === "Status" && order.paid ? "var(--green)" : undefined }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="drawer-section">
          <div className="ds-title">Actions</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Accept Order", "Mark Ready", "Add Note", "Print KOT", "Assign Rider"].map((a) => (
              <button key={a} className={`btn${a === "Accept Order" ? " primary" : ""}`}>{a}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CHARTS ───────────────────────────────────────────────────────────────────

function Charts() {
  const axisProps = {
    style: { fontSize: 10, fill: "var(--text3)" },
    axisLine: false,
    tickLine: false,
  };

  const tooltipStyle = {
    contentStyle: {
      background: "var(--bg3)", border: "1px solid var(--border)",
      borderRadius: 6, fontSize: 11, color: "var(--text)",
    },
    labelStyle: { color: "var(--text2)" },
  };

  return (
    <div className="charts-grid">
      {/* Orders by Hour */}
      <div className="chart-card">
        <div className="section-header">
          <div className="section-title">Orders by Hour</div>
          <div style={{ fontSize: 11, color: "var(--green)" }}>+18% vs yesterday</div>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={HOUR_DATA} margin={{ top: 5, right: 0, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="h" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip {...tooltipStyle} />
            <Area type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={1.5} fill="url(#ordersGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Status Donut */}
      <div className="chart-card">
        <div className="section-header">
          <div className="section-title">Order Status</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <ResponsiveContainer width={120} height={120}>
            <PieChart>
              <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={2} dataKey="value">
                {PIE_DATA.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {PIE_DATA.map((d) => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
                <span style={{ color: "var(--text2)", minWidth: 70 }}>{d.name}</span>
                <span style={{ fontWeight: 600 }}>{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue by Channel */}
      <div className="chart-card">
        <div className="section-header">
          <div className="section-title">Revenue by Channel</div>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart
            data={CHANNELS.map((c) => ({ name: c.name.slice(0, 3), rev: parseFloat(c.rev.replace(/[₹L]/g, "")) }))}
            margin={{ top: 5, right: 0, bottom: 0, left: -20 }}
          >
            <XAxis dataKey="name" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="rev" fill="#3b82f6" opacity={0.8} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [collapsed, setCollapsed]       = useState(false);
  const [orders, setOrders]             = useState(INITIAL_ORDERS);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeTab, setActiveTab]       = useState("all");

  // Simulate live incoming orders
  useEffect(() => {
    const t = setInterval(() => {
      if (Math.random() > 0.6) {
        const newOrder = makeOrder("new", 0.3);
        setOrders((o) => ({ ...o, new: [newOrder, ...o.new].slice(0, 8) }));
      }
    }, 8000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      {/* ── GLOBAL STYLES ── */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:     #0a0b0d;
          --bg2:    #111318;
          --bg3:    #16191f;
          --bg4:    #1d2026;
          --border: #2a2d35;
          --border2:#363a45;
          --text:   #e8eaf0;
          --text2:  #9aa0b0;
          --text3:  #5c6270;
          --accent: #3b82f6;
          --accent2:#1d4ed8;
          --green:  #10b981;
          --red:    #ef4444;
          --amber:  #f59e0b;
          --purple: #8b5cf6;
          --teal:   #06b6d4;
          --radius: 10px;
          --radius2: 6px;
        }

        html, body, #root { height: 100%; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; font-size: 13px; background: var(--bg); color: var(--text); }

        /* ── LAYOUT ── */
        .app { display: flex; height: 100vh; overflow: hidden; }
        .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .content { flex: 1; overflow-y: auto; padding: 20px 24px; background: var(--bg); scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
        .content::-webkit-scrollbar { width: 4px; }
        .content::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

        /* ── SIDEBAR ── */
        .sidebar { width: 220px; min-width: 220px; background: var(--bg2); border-right: 1px solid var(--border); display: flex; flex-direction: column; transition: width .2s, min-width .2s; overflow: hidden; }
        .sidebar.collapsed { width: 56px; min-width: 56px; }
        .logo { padding: 16px 14px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--border); }
        .logo-mark { width: 28px; height: 28px; background: linear-gradient(135deg,#3b82f6,#8b5cf6); border-radius: 7px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; color: #fff; flex-shrink: 0; }
        .logo-text-wrap { overflow: hidden; }
        .logo-text { font-weight: 700; font-size: 15px; letter-spacing: -.3px; white-space: nowrap; }
        .logo-sub  { font-size: 10px; color: var(--text3); white-space: nowrap; }
        .sidebar.collapsed .logo-text-wrap { display: none; }
        .nav { flex: 1; padding: 8px 6px; overflow-y: auto; }
        .nav-item { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: var(--radius2); cursor: pointer; transition: all .15s; color: var(--text2); margin-bottom: 1px; white-space: nowrap; overflow: hidden; }
        .nav-item:hover { background: var(--bg3); color: var(--text); }
        .nav-item.active { background: rgba(59,130,246,.15); color: var(--accent); }
        .nav-label { font-size: 12.5px; font-weight: 500; }
        .sidebar.collapsed .nav-label { display: none; }
        .nav-badge { margin-left: auto; background: var(--red); color: #fff; font-size: 10px; padding: 1px 6px; border-radius: 20px; font-weight: 600; }
        .sidebar.collapsed .nav-badge { display: none; }
        .collapse-btn { padding: 10px 14px; border-top: 1px solid var(--border); cursor: pointer; color: var(--text3); display: flex; align-items: center; gap: 8px; font-size: 12px; }
        .collapse-btn:hover { color: var(--text2); }
        .collapse-label { white-space: nowrap; }
        .sidebar.collapsed .collapse-label { display: none; }

        /* ── TOPBAR ── */
        .topbar { height: 52px; background: var(--bg2); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 20px; gap: 12px; flex-shrink: 0; }
        .search-box { display: flex; align-items: center; gap: 8px; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius2); padding: 6px 12px; flex: 1; max-width: 280px; }
        .search-box input { background: none; border: none; outline: none; color: var(--text); font-size: 12px; width: 100%; }
        .search-box input::placeholder { color: var(--text3); }
        .kbd { font-size: 10px; color: var(--text3); background: var(--bg4); padding: 1px 5px; border-radius: 3px; border: 1px solid var(--border); white-space: nowrap; }
        .selector { display: flex; align-items: center; gap: 6px; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius2); padding: 6px 10px; cursor: pointer; font-size: 12px; color: var(--text2); }
        .selector:hover { border-color: var(--border2); }
        .topbar-spacer { flex: 1; }
        .topbar-actions { display: flex; align-items: center; gap: 8px; }
        .status-chip { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text2); }
        .status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); box-shadow: 0 0 6px var(--green); flex-shrink: 0; }
        .icon-btn { width: 32px; height: 32px; border-radius: var(--radius2); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text2); background: var(--bg3); border: 1px solid var(--border); transition: all .15s; }
        .icon-btn:hover { background: var(--bg4); color: var(--text); }
        .notif-dot { position: relative; }
        .notif-dot::after { content: ''; position: absolute; top: 4px; right: 4px; width: 7px; height: 7px; background: var(--red); border-radius: 50%; border: 1.5px solid var(--bg2); }
        .avatar { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg,#3b82f6,#8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #fff; cursor: pointer; flex-shrink: 0; }

        /* ── PAGE HEADER ── */
        .page-header { margin-bottom: 20px; }
        .header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
        .page-title { font-size: 20px; font-weight: 700; letter-spacing: -.4px; }
        .page-sub   { font-size: 12.5px; color: var(--text2); margin-top: 3px; }
        .header-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

        /* ── BUTTONS ── */
        .btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: var(--radius2); font-size: 12px; font-weight: 500; cursor: pointer; border: 1px solid var(--border); background: var(--bg3); color: var(--text2); transition: all .15s; }
        .btn:hover { background: var(--bg4); color: var(--text); }
        .btn.primary { background: var(--accent); border-color: var(--accent2); color: #fff; }
        .btn.primary:hover { background: var(--accent2); }

        /* ── TABS ── */
        .tabs { display: flex; gap: 2px; margin-bottom: 20px; background: var(--bg2); padding: 4px; border-radius: var(--radius2); border: 1px solid var(--border); width: fit-content; }
        .tab { padding: 5px 14px; border-radius: 4px; font-size: 12px; font-weight: 500; cursor: pointer; color: var(--text2); transition: all .15s; border: 1px solid transparent; }
        .tab:hover { color: var(--text); }
        .tab.active { background: var(--bg3); color: var(--text); border-color: var(--border); }

        /* ── KPI GRID ── */
        .kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 20px; }
        .kpi-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; transition: border-color .15s; }
        .kpi-card:hover { border-color: var(--border2); }
        .kpi-label { font-size: 11px; color: var(--text3); font-weight: 500; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; }
        .kpi-value { font-size: 22px; font-weight: 700; letter-spacing: -.5px; line-height: 1; }
        .kpi-trend { font-size: 11px; margin-top: 6px; }
        .kpi-trend.up     { color: var(--green); }
        .kpi-trend.down   { color: var(--red); }
        .kpi-trend.neutral{ color: var(--text3); }
        .kpi-sub { font-size: 10.5px; color: var(--text3); margin-top: 2px; }

        /* ── CHANNEL GRID ── */
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .section-title  { font-size: 13.5px; font-weight: 600; }
        .section-sub    { font-size: 11.5px; color: var(--text3); }
        .channel-grid   { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; margin-bottom: 20px; }
        .channel-card   { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 14px; transition: all .15s; cursor: pointer; }
        .channel-card:hover { border-color: var(--border2); transform: translateY(-1px); }
        .channel-top    { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .channel-name   { font-size: 12px; font-weight: 600; }
        .live-dot    { width: 6px; height: 6px; border-radius: 50%; background: var(--green); box-shadow: 0 0 5px var(--green); animation: pulse 2s infinite; flex-shrink: 0; }
        .offline-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border2); flex-shrink: 0; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        .channel-orders { font-size: 18px; font-weight: 700; line-height: 1; margin-bottom: 2px; }
        .channel-rev    { font-size: 11px; color: var(--text2); }
        .channel-growth { font-size: 10.5px; margin-top: 4px; }
        .channel-avg    { font-size: 10.5px; color: var(--text3); }

        /* ── TWO-COL ── */
        .two-col { display: grid; grid-template-columns: 1fr 340px; gap: 16px; margin-bottom: 20px; }

        /* ── COMMAND CENTER ── */
        .command-center { background: var(--bg2); width: 1170px; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
        .cc-header   { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid var(--border); gap: 12px; }
        .cc-title    { font-size: 13.5px; font-weight: 600; }
        .cc-subtitle { font-size: 11px; color: var(--text3); margin-top: 2px; }
        .cc-cols     { display: flex; overflow-x: auto; height: 480px; }
        .cc-col      { flex: 0 0 185px; border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
        .cc-col:last-child { border-right: none; }
        .cc-col-header { padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; background: var(--bg3); border-bottom: 1px solid var(--border); flex-shrink: 0; }
        .cc-col-name { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
        .cc-count    { font-size: 10px; background: var(--bg4); border: 1px solid var(--border); border-radius: 20px; padding: 1px 7px; color: var(--text3); }
        .cc-cards    { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 6px; scrollbar-width: thin; scrollbar-color: var(--border2) transparent; }
        .empty-col   { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text3); font-size: 11.5px; gap: 6px; }

        /* ── ORDER CARD ── */
        .order-card { background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius2); padding: 10px; cursor: pointer; transition: all .15s; }
        .order-card:hover { border-color: var(--border2); background: var(--bg4); }
        .order-card.priority-high { border-left: 2px solid var(--red); }
        .order-card.priority-med  { border-left: 2px solid var(--amber); }
        .oc-top      { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        .oc-id       { font-size: 10.5px; font-weight: 700; color: var(--text2); }
        .oc-time     { font-size: 10px; color: var(--text3); }
        .oc-customer { font-size: 12px; font-weight: 600; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .oc-meta     { display: flex; flex-wrap: wrap; gap: 3px; margin-bottom: 6px; }
        .oc-value    { font-size: 13px; font-weight: 700; }
        .oc-actions  { display: flex; gap: 4px; margin-top: 6px; }
        .oc-btn      { flex: 1; padding: 4px 2px; font-size: 9.5px; border-radius: 4px; border: 1px solid var(--border); background: transparent; color: var(--text2); cursor: pointer; text-align: center; transition: all .15s; }
        .oc-btn.accept { border-color: var(--green); color: var(--green); }
        .oc-btn.accept:hover { background: rgba(16,185,129,.1); }
        .oc-btn.reject { border-color: var(--red); color: var(--red); }
        .oc-btn.reject:hover { background: rgba(239,68,68,.1); }
        .sla-bar  { height: 2px; background: var(--border); border-radius: 2px; margin-top: 6px; overflow: hidden; }
        .sla-fill { height: 100%; border-radius: 2px; transition: width .3s; }

        /* ── BADGE ── */
        .badge        { display: inline-flex; align-items: center; font-size: 9.5px; padding: 1px 6px; border-radius: 20px; font-weight: 500; white-space: nowrap; }
        .badge-blue   { background: rgba(59,130,246,.15);  color: #60a5fa; }
        .badge-green  { background: rgba(16,185,129,.15);  color: #34d399; }
        .badge-amber  { background: rgba(245,158,11,.15);  color: #fbbf24; }
        .badge-red    { background: rgba(239,68,68,.15);   color: #f87171; }
        .badge-purple { background: rgba(139,92,246,.15);  color: #a78bfa; }
        .badge-gray   { background: rgba(100,116,139,.15); color: #94a3b8; }

        /* ── INTEL PANEL ── */
        .intel-panel    { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
        .intel-header   { padding: 14px 16px; border-bottom: 1px solid var(--border); }
        .intel-sections { overflow-y: auto; max-height: 480px; scrollbar-width: thin; scrollbar-color: var(--border2) transparent; }
        .intel-block    { padding: 14px 16px; border-bottom: 1px solid var(--border); }
        .intel-block:last-child { border-bottom: none; }
        .ib-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--text3); margin-bottom: 10px; }
        .load-bar   { height: 6px; background: var(--bg4); border-radius: 6px; overflow: hidden; margin-bottom: 6px; }
        .load-fill  { height: 100%; border-radius: 6px; transition: width .6s; }
        .load-label { display: flex; justify-content: space-between; font-size: 11px; color: var(--text2); margin-bottom: 4px; }
        .ai-rec  { display: flex; gap: 8px; padding: 8px 10px; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius2); margin-bottom: 6px; }
        .ai-icon { width: 22px; height: 22px; border-radius: 5px; display: flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; }
        .ai-icon.warn  { background: rgba(245,158,11,.15); }
        .ai-icon.info  { background: rgba(59,130,246,.15); }
        .ai-icon.alert { background: rgba(239,68,68,.15); }
        .ai-text { font-size: 11.5px; color: var(--text2); line-height: 1.4; }
        .staff-row    { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .staff-avatar { width: 26px; height: 26px; border-radius: 50%; background: var(--bg4); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; flex-shrink: 0; }
        .staff-info   { flex: 1; }
        .staff-name   { font-size: 12px; font-weight: 500; }
        .staff-role   { font-size: 10px; color: var(--text3); }
        .staff-util   { font-size: 11px; font-weight: 600; }

        /* ── DRAWER ── */
        .drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.55); z-index: 200; display: flex; justify-content: flex-end; }
        .drawer { width: 420px; background: var(--bg2); border-left: 1px solid var(--border); height: 100%; overflow-y: auto; animation: slideIn .2s ease; scrollbar-width: thin; }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .drawer-header  { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; background: var(--bg2); z-index: 1; }
        .drawer-section { padding: 16px 20px; border-bottom: 1px solid var(--border); }
        .ds-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--text3); margin-bottom: 10px; }
        .ds-row   { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; font-size: 12.5px; }
        .ds-label { color: var(--text3); }
        .ds-value { font-weight: 500; text-align: right; max-width: 220px; }
        .timeline-item { display: flex; gap: 10px; margin-bottom: 10px; align-items: flex-start; }
        .tl-dot  { width: 8px; height: 8px; border-radius: 50%; margin-top: 3px; flex-shrink: 0; }
        .tl-time { font-size: 11px; color: var(--text3); min-width: 50px; }
        .tl-text { font-size: 12px; color: var(--text2); line-height: 1.4; }
        .item-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border); }
        .item-row:last-child { border-bottom: none; }
        .item-name  { font-size: 12.5px; }
        .item-qty   { font-size: 11px; color: var(--text3); }
        .item-price { font-size: 12.5px; font-weight: 600; }
        .item-total { display: flex; justify-content: space-between; padding-top: 10px; margin-top: 4px; border-top: 1px solid var(--border); font-weight: 700; font-size: 14px; }

        /* ── CHARTS ── */
        .charts-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 20px; }
        .chart-card  { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; }

        /* ── RESPONSIVE ── */
        @media (max-width: 1300px) {
          .kpi-grid     { grid-template-columns: repeat(3, 1fr); }
          .channel-grid { grid-template-columns: repeat(4, 1fr); }
          .charts-grid  { grid-template-columns: 1fr 1fr; }
          .two-col      { grid-template-columns: 1fr; }
        }
        @media (max-width: 900px) {
          .intel-panel { display: none; }
        }
      `}</style>

      <div className="app">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

        <div className="main">
          <Topbar />

          <div className="content">
            {/* Page Header */}
            <div className="page-header">
              <div className="header-row">
                <div>
                  <div className="page-title">Order Aggregation</div>
                  <div className="page-sub">Monitor and manage all restaurant orders from every channel in one place.</div>
                </div>
                <div className="header-actions">
                  <button className="btn">Export</button>
                  <button className="btn">Multi-Outlet View</button>
                  <button className="btn primary">+ New Order</button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
              {[
                { key: "all",       label: "All Channels"    },
                { key: "live",      label: "Live Orders"     },
                { key: "pending",   label: "Pending Action"  },
                { key: "completed", label: "Completed"       },
              ].map((t) => (
                <div
                  key={t.key}
                  className={`tab${activeTab === t.key ? " active" : ""}`}
                  onClick={() => setActiveTab(t.key)}
                >
                  {t.label}
                </div>
              ))}
            </div>

            {/* KPI Cards */}
            <div style={{ marginBottom: 20 }}>
              <StatsCards />
            </div>

            {/* Command Center + Intel Panel */}
            <div className="two-col">
              <CommandCenter orders={orders} onSelect={setSelectedOrder} />
              <IntelPanel />
            </div>

            {/* Charts */}
            <div style={{ marginTop: 20 }}>
              <Charts />
            </div>
          </div>
        </div>

        {/* Order Drawer */}
        {selectedOrder && (
          <OrderDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />
        )}
      </div>
    </>
  );
}