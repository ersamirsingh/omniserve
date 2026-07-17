import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getQrSessionBillApi } from "../../api/models/public.api";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { HiOutlineSparkles, HiOutlineBookOpen, HiOutlineChevronRight, HiOutlineUsers } from "react-icons/hi2";

const formatINR = (amount) => {
  const n = Number(amount) || 0;
  return `₹${n.toLocaleString("en-IN")}`;
};

const formatElapsed = (fromDate) => {
  const diffMs = Date.now() - new Date(fromDate).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
};

const ORDER_STATUS_LABELS = {
  PLACED: { label: "Order Placed", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  ACCEPTED: { label: "Kitchen Accepted", color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" },
  PREPARING: { label: "Preparing", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  READY: { label: "Food Ready", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  SERVED: { label: "Served", color: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20" },
  CANCELLED: { label: "Cancelled", color: "bg-red-500/10 text-red-500 border-red-500/20" }
};

export default function SessionStatusPage() {
  const { outletSlug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const sessionToken = localStorage.getItem("sessionToken");

  const fetchSessionStatus = () => {
    if (!sessionToken) {
      setError("No active table session found.");
      setLoading(false);
      return;
    }

    getQrSessionBillApi(sessionToken)
      .then((res) => {
        setData(res.data.data);
        setError(null);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load table session updates");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSessionStatus();
    const interval = setInterval(fetchSessionStatus, 8000); // refresh every 8s
    return () => clearInterval(interval);
  }, [sessionToken]);

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-6 font-sans">
        <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-[#6311f4] flex items-center justify-center text-2xl mb-5">
          🍽️
        </div>
        <h2 className="text-xl font-bold mb-2 tracking-tight">No Active Session</h2>
        <p className="text-zinc-400 text-xs mb-7 text-center max-w-xs leading-relaxed">
          {error || "We couldn't find an active dining session for your device. Please scan the QR code at your table."}
        </p>
        <Link to={`/public/w/${outletSlug}`}>
          <Button variant="primary" className="bg-[#6311f4] hover:bg-[#520fd2] text-white border-none font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-[#6311f4]/25">
            Scan Table QR Code
          </Button>
        </Link>
      </div>
    );
  }

  const { orders = [], items = [], billSession = {}, table = {} } = data;

  // Group items by their parent orderId for rendering
  const itemsByOrderId = {};
  items.forEach((item) => {
    const oid = item.orderId?.toString?.() || item.orderId;
    if (!itemsByOrderId[oid]) itemsByOrderId[oid] = [];
    itemsByOrderId[oid].push(item);
  });

  const activeOrders = orders.filter(o => o.orderStatus !== "CANCELLED");
  const hasOrders = activeOrders.length > 0;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-zinc-150/60 dark:border-zinc-900 bg-white/95 dark:bg-zinc-950/95 backdrop-blur sticky top-0 z-40 px-5 py-4 flex items-center justify-between shadow-sm">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#6311f4] dark:text-purple-300">
            Dine-In Session
          </span>
          <h1 className="font-extrabold text-base tracking-tight">
            Table {table?.tableNumber || "N/A"}
          </h1>
        </div>

        {localStorage.getItem('joinCode') && (
          <div className="bg-[#6311f4]/10 border border-[#6311f4]/15 px-3 py-1 rounded-full text-[#6311f4] dark:text-purple-300 text-[10px] font-black tracking-widest font-mono">
            PIN: {localStorage.getItem('joinCode')}
          </div>
        )}

        <button
          type="button"
          onClick={fetchSessionStatus}
          className="text-[10px] font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 transition-all"
        >
          ↻ Refresh
        </button>
      </header>

      {/* Main Container */}
      <div className="flex-grow max-w-lg w-full mx-auto p-5 space-y-5 pb-24">
        {/* Session Status Overview */}
        <Card className="bg-white dark:bg-zinc-900/60 border border-zinc-150/60 dark:border-zinc-900 p-5 rounded-[2rem] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Table Status</span>
              <span className="inline-flex items-center gap-1.5 mt-1">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-red-500">
                  {table?.operationalStatus || "OCCUPIED"}
                </span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Active Orders</span>
              <span className="text-lg font-black block mt-0.5 tabular-nums text-zinc-800 dark:text-zinc-100">
                {activeOrders.length}
              </span>
            </div>
            {billSession?.outstandingBalance !== undefined && (
              <div className="text-right">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Total Bill</span>
                <span className="text-lg font-black text-[#6311f4] dark:text-purple-300 block mt-0.5 tabular-nums">
                  {formatINR(billSession.outstandingBalance)}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Orders status list */}
        <div className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400 px-1">
            Order Tracking & Timeline
          </h2>

          {!hasOrders ? (
            <Card className="bg-white dark:bg-zinc-900/40 border border-zinc-150/60 dark:border-zinc-900 p-8 rounded-[2rem] text-center space-y-3">
              <div className="text-3xl">📝</div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold leading-relaxed">
                No active orders placed yet. Choose some delicious dishes and place your first order!
              </p>
              <Link to={`/public/w/${outletSlug}/menu`} className="block pt-1">
                <Button variant="primary" className="bg-[#6311f4] hover:bg-[#520fd2] text-white border-none font-extrabold text-xs uppercase tracking-wider py-3 px-6 rounded-xl shadow-md">
                  Browse Menu
                </Button>
              </Link>
            </Card>
          ) : (
            activeOrders.map((order, idx) => {
              const statusCfg = ORDER_STATUS_LABELS[order.orderStatus] || { label: order.orderStatus, color: "bg-zinc-500/10 text-zinc-500" };
              const orderId = order._id?.toString?.() || order._id;
              const orderItems = itemsByOrderId[orderId] || [];
              return (
                <Card
                  key={order._id}
                  className="bg-white dark:bg-zinc-900/60 border border-zinc-150/60 dark:border-zinc-900 p-5 rounded-[2rem] shadow-sm space-y-4 hover:border-zinc-200 dark:hover:border-zinc-800 transition-all"
                >
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">
                        Order #{orders.length - idx}
                      </span>
                      <span className="text-[10px] text-zinc-500 block">
                        Placed {formatElapsed(order.createdAt)}
                      </span>
                    </div>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl border uppercase tracking-wider ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2">
                    {orderItems.map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-zinc-450 dark:text-zinc-555 tabular-nums">
                            {item.quantity}x
                          </span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {item.name}
                          </span>
                        </div>
                        <span className="font-bold text-zinc-500 dark:text-zinc-400 tabular-nums">
                          {formatINR(item.totalPrice)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Horizontal progress bar */}
                  {order.orderStatus !== "CANCELLED" && (
                    <div className="pt-2">
                      <div className="w-full bg-zinc-100 dark:bg-zinc-800/80 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#6311f4] to-[#8b5cf6] transition-all duration-700"
                          style={{
                            width:
                              order.orderStatus === "SERVED"
                                ? "100%"
                                : order.orderStatus === "READY"
                                ? "80%"
                                : order.orderStatus === "PREPARING"
                                ? "55%"
                                : order.orderStatus === "ACCEPTED"
                                ? "30%"
                                : "10%"
                          }}
                        />
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Floating Bottom Sticky Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-zinc-950 dark:via-zinc-950/95 dark:to-transparent z-40 border-t border-zinc-100 dark:border-zinc-900/60 flex gap-4 max-w-lg mx-auto animate-fade-in">
        <Link to={`/public/w/${outletSlug}/menu`} className="flex-1">
          <button
            type="button"
            className="w-full bg-[#6311f4] hover:bg-[#520fd2] text-white font-black text-xs uppercase tracking-wider py-4 rounded-2xl shadow-lg shadow-[#6311f4]/15 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none"
          >
            🍔 Add More Items
          </button>
        </Link>
        <Link to={`/public/w/${outletSlug}/table-session`} className="flex-1">
          <button
            type="button"
            className="w-full bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 font-black text-xs uppercase tracking-wider py-4 rounded-2xl active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            💳 View Bill &amp; Pay
          </button>
        </Link>
      </div>
    </div>
  );
}
