// ─── MOCK DATA ────────────────────────────────────────────────────────────────

export const CHANNELS = [
  { id: "swiggy",   name: "Swiggy",   orders: 142, rev: "₹1.84L", avg: "₹1,295", growth: "+12%", up: true,  live: true  },
  { id: "zomato",   name: "Zomato",   orders: 198, rev: "₹2.31L", avg: "₹1,167", growth: "+8%",  up: true,  live: true  },
  { id: "ondc",     name: "ONDC",     orders: 67,  rev: "₹0.82L", avg: "₹1,224", growth: "+24%", up: true,  live: true  },
  { id: "website",  name: "Website",  orders: 89,  rev: "₹1.47L", avg: "₹1,652", growth: "+32%", up: true,  live: true  },
  { id: "app",      name: "App",      orders: 114, rev: "₹1.92L", avg: "₹1,684", growth: "+18%", up: true,  live: true  },
  { id: "whatsapp", name: "WhatsApp", orders: 43,  rev: "₹0.63L", avg: "₹1,465", growth: "+41%", up: true,  live: true  },
  { id: "call",     name: "Call",     orders: 31,  rev: "₹0.45L", avg: "₹1,452", growth: "-3%",  up: false, live: false },
];

export const NAMES = [
  "Arjun Mehta", "Priya Sharma", "Vikram Singh", "Ananya Gupta",
  "Rohan Patel", "Sneha Iyer", "Karan Malhotra", "Deepa Nair",
  "Amit Verma", "Pooja Joshi", "Raj Kumar", "Sunita Rao",
];

export const ITEMS_POOL = [
  ["Paneer Tikka Masala", "Garlic Naan", "Mango Lassi"],
  ["Chicken Biryani", "Raita", "Gulab Jamun"],
  ["Dal Makhani", "Butter Naan", "Masala Chai"],
  ["Veg Thali", "Papad", "Kheer"],
  ["Mutton Curry", "Tandoori Roti", "Rose Lassi"],
];

export const CH_SRC = ["Swiggy", "Zomato", "ONDC", "Website", "App", "WhatsApp", "Call"];
export const CH_COLORS = {
  Swiggy: "amber", Zomato: "red", ONDC: "purple",
  Website: "blue", App: "blue", WhatsApp: "green", Call: "gray",
};

export const HOUR_DATA = [
  { h: "8AM",  orders: 12,  rev: 18  }, { h: "9AM",  orders: 28,  rev: 42  },
  { h: "10AM", orders: 19,  rev: 29  }, { h: "11AM", orders: 34,  rev: 52  },
  { h: "12PM", orders: 89,  rev: 134 }, { h: "1PM",  orders: 112, rev: 168 },
  { h: "2PM",  orders: 78,  rev: 117 }, { h: "3PM",  orders: 42,  rev: 63  },
  { h: "4PM",  orders: 31,  rev: 47  }, { h: "5PM",  orders: 38,  rev: 57  },
  { h: "6PM",  orders: 67,  rev: 101 }, { h: "7PM",  orders: 95,  rev: 143 },
  { h: "8PM",  orders: 121, rev: 182 }, { h: "9PM",  orders: 88,  rev: 132 },
  { h: "10PM", orders: 47,  rev: 71  },
];

export const PIE_DATA = [
  { name: "Completed", value: 62, color: "#10b981" },
  { name: "Preparing", value: 18, color: "#f59e0b" },
  { name: "New",       value: 11, color: "#3b82f6" },
  { name: "Cancelled", value: 9,  color: "#ef4444" },
];

export const AI_RECS = [
  { type: "alert", icon: "⚠",  text: "Paneer inventory likely to run out in ~2 hours. Place order now." },
  { type: "warn",  icon: "👥", text: "Additional kitchen staff recommended. Order volume up 28% vs last Thursday." },
  { type: "info",  icon: "📈", text: "Website orders increased 32% today. Review packaging stock." },
  { type: "warn",  icon: "⏱", text: "Avg prep time for Zomato orders is 4 min above SLA. Prioritize kitchen flow." },
  { type: "info",  icon: "💡", text: "Peak hour predicted at 8PM. Load expected 18% above capacity." },
];

export const KITCHEN_LOAD = [
  { name: "Grill Station", pct: 78, color: "#f59e0b" },
  { name: "Tandoor",       pct: 92, color: "#ef4444" },
  { name: "Cold Kitchen",  pct: 45, color: "#10b981" },
  { name: "Desserts",      pct: 30, color: "#10b981" },
];

export const STAFF = [
  { name: "Rajesh K.", role: "Chef",     util: "92%", color: "#ef4444" },
  { name: "Priti M.",  role: "Chef",     util: "78%", color: "#f59e0b" },
  { name: "Suresh L.", role: "Packing",  util: "65%", color: "#10b981" },
  { name: "Amit V.",   role: "Delivery", util: "40%", color: "#10b981" },
];

export const INVENTORY_RISK = [
  { item: "Paneer",    pct: 15, color: "#ef4444" },
  { item: "Chicken",   pct: 42, color: "#f59e0b" },
  { item: "Naan dough",pct: 67, color: "#10b981" },
  { item: "Butter",    pct: 23, color: "#ef4444" },
];

export const NAV_ITEMS = [
  { label: "Overview",        icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
  { label: "Online Orders",          icon: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2", badge: 12, active: true },
  { label: "Offline Orders",          icon: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2", badge: 19, active: false },
  { label: "Payment",         icon: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" },
  { label: "Inventory",       icon: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" },
  { label: "Procurement",     icon: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" },
  { label: "CRM",             icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" },
  // { label: "Loyalty",         icon: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" },
  { label: "Staff",           icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" },
  { label: "WhatsApp",        icon: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" },
  { label: "Analytics",       icon: "M18 20V10M12 20V4M6 20v-6" },
  { label: "Settings",        icon: "M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.92c.04-.34.07-.68.07-1.08s-.03-.73-.07-1.08l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.35-.07.7-.07 1.08s.03.73.07 1.07l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.58 1.69-.98l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66z" },
];

export const COL_META = [
  { key: "new",       label: "New Orders", color: "#3b82f6" },
  { key: "accepted",  label: "Accepted",   color: "#8b5cf6" },
  { key: "preparing", label: "Preparing",  color: "#f59e0b" },
  { key: "ready",     label: "Ready",      color: "#06b6d4" },
  { key: "completed", label: "Completed",  color: "#10b981" },
  { key: "cancelled", label: "Cancelled",  color: "#ef4444" },
];

let _id = 1000;
export function makeOrder(col, priorityBias = 0.2) {
  const name  = NAMES[Math.floor(Math.random() * NAMES.length)];
  const ch    = CH_SRC[Math.floor(Math.random() * CH_SRC.length)];
  const items = ITEMS_POOL[Math.floor(Math.random() * ITEMS_POOL.length)];
  const val   = Math.floor(800 + Math.random() * 2400);
  const pr    = Math.random() < priorityBias ? "high" : Math.random() < 0.4 ? "med" : "low";
  const mins  = Math.floor(2 + Math.random() * 45);
  const sla   = Math.floor(30 + Math.random() * 70);
  return { id: `ORD-${++_id}`, col, name, ch, items, val, pr, mins, sla, paid: Math.random() > 0.2, delivery: Math.random() > 0.4 ? "Delivery" : "Pickup" };
}

export function makeOrders(col, count, bias) {
  return Array.from({ length: count }, () => makeOrder(col, bias));
}

export const INITIAL_ORDERS = {
  new:       makeOrders("new",       4, 0.4),
  accepted:  makeOrders("accepted",  3, 0.3),
  preparing: makeOrders("preparing", 5, 0.2),
  ready:     makeOrders("ready",     2, 0.1),
  completed: makeOrders("completed", 7, 0.0),
  cancelled: makeOrders("cancelled", 2, 0.0),
};
