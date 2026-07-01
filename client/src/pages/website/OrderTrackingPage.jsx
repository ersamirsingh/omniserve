import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { trackOrderApi } from "../../api/models/public.api";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";

export default function OrderTrackingPage() {
  const { outletSlug, orderId } = useParams();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchTracking = () => {
    trackOrderApi(orderId)
      .then((res) => {
        setData(res.data.data);
        setError(null);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load tracking updates");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTracking();
    const interval = setInterval(fetchTracking, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [orderId]);

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-6">
        <h2 className="text-xl font-bold text-red-500 mb-4">Error</h2>
        <p className="text-zinc-400 mb-6">{error || "Failed to retrieve tracking details"}</p>
        <Link to={`/public/w/${outletSlug}`}>
          <Button variant="primary">Return to Menu</Button>
        </Link>
      </div>
    );
  }

  const { order, timeline } = data;
  const currentStatus = order.status;

  // Status mapping indices
  const statusSteps = ["PENDING", "ACCEPTED", "PREPARING", "READY", "DELIVERED"];
  const currentStepIndex = statusSteps.indexOf(currentStatus);

  const getStepStatus = (stepName) => {
    const idx = statusSteps.indexOf(stepName);
    if (currentStatus === "CANCELLED") return "cancelled";
    if (idx === -1) return "upcoming";
    if (idx < currentStepIndex) return "completed";
    if (idx === currentStepIndex) return "active";
    return "upcoming";
  };

  const getStepTime = (stepName) => {
    const record = timeline.find((t) => t.status === stepName);
    return record ? new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <Link to={`/public/w/${outletSlug}`} className="text-zinc-400 hover:text-white transition-all text-sm font-semibold flex items-center gap-2">
          ← Menu
        </Link>
        <h1 className="font-bold text-lg text-white">Order Tracking</h1>
        <button onClick={fetchTracking} className="text-xs text-zinc-400 hover:text-white border border-zinc-800 rounded-lg px-2.5 py-1">
          ↻ Refresh
        </button>
      </header>

      {/* Main progress bar */}
      <div className="flex-grow max-w-2xl w-full mx-auto p-6 space-y-6">
        {/* Order details header card */}
        <Card className="bg-zinc-900 border-zinc-800 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Order Number</span>
            <span className="text-lg font-bold text-white block mt-0.5">{order.orderNumber}</span>
          </div>
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Fulfillment Total</span>
            <span className="text-lg font-bold text-indigo-400 block mt-0.5">₹{order.totalAmount}</span>
          </div>
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Current Status</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg block mt-1 w-fit uppercase ${
              currentStatus === "CANCELLED"
                ? "bg-red-500/10 text-red-400"
                : currentStatus === "DELIVERED"
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-indigo-500/10 text-indigo-400"
            }`}>
              {currentStatus}
            </span>
          </div>
        </Card>

        {/* Timeline Log timeline */}
        <Card className="bg-zinc-900 border-zinc-800 p-6 rounded-2xl">
          <h2 className="text-base font-bold text-white border-b border-zinc-800 pb-4 mb-6">Kitchen Activity Timeline</h2>
          
          <div className="relative border-l border-zinc-800 ml-4 pl-6 space-y-8">
            {/* Step 1: Placed */}
            <div className="relative">
              <span className={`absolute -left-[31px] top-1 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center ${
                getStepStatus("PENDING") === "completed" || getStepStatus("PENDING") === "active"
                  ? "bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-600/30"
                  : getStepStatus("PENDING") === "cancelled"
                  ? "bg-red-500 border-red-500"
                  : "bg-zinc-900 border-zinc-800"
              }`} />
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-white text-sm">Order Placed</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Successfully queued in store records</p>
                </div>
                <span className="text-xs text-zinc-400 font-mono font-medium">{getStepTime("PENDING") || new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            {/* Step 2: Accepted */}
            <div className="relative">
              <span className={`absolute -left-[31px] top-1 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center ${
                getStepStatus("ACCEPTED") === "completed" || getStepStatus("ACCEPTED") === "active"
                  ? "bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-600/30"
                  : getStepStatus("ACCEPTED") === "cancelled"
                  ? "bg-red-500 border-red-500"
                  : "bg-zinc-900 border-zinc-800"
              }`} />
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-white text-sm">Accepted by Store</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Kitchen staff has confirmed the receipt</p>
                </div>
                <span className="text-xs text-zinc-400 font-mono font-medium">{getStepTime("ACCEPTED")}</span>
              </div>
            </div>

            {/* Step 3: Preparing */}
            <div className="relative">
              <span className={`absolute -left-[31px] top-1 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center ${
                getStepStatus("PREPARING") === "completed" || getStepStatus("PREPARING") === "active"
                  ? "bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-600/30"
                  : getStepStatus("PREPARING") === "cancelled"
                  ? "bg-red-500 border-red-500"
                  : "bg-zinc-900 border-zinc-800"
              }`} />
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-white text-sm">Dishes in Preparation</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Your food is currently being cooked</p>
                </div>
                <span className="text-xs text-zinc-400 font-mono font-medium">{getStepTime("PREPARING")}</span>
              </div>
            </div>

            {/* Step 4: Ready */}
            <div className="relative">
              <span className={`absolute -left-[31px] top-1 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center ${
                getStepStatus("READY") === "completed" || getStepStatus("READY") === "active"
                  ? "bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-600/30"
                  : getStepStatus("READY") === "cancelled"
                  ? "bg-red-500 border-red-500"
                  : "bg-zinc-900 border-zinc-800"
              }`} />
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-white text-sm">Ready for Delivery / Takeaway</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Food is packed and hot at the counter</p>
                </div>
                <span className="text-xs text-zinc-400 font-mono font-medium">{getStepTime("READY")}</span>
              </div>
            </div>

            {/* Step 5: Delivered */}
            {currentStatus !== "CANCELLED" ? (
              <div className="relative">
                <span className={`absolute -left-[31px] top-1 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center ${
                  getStepStatus("DELIVERED") === "active"
                    ? "bg-emerald-500 border-emerald-500 shadow-md shadow-emerald-500/30"
                    : "bg-zinc-900 border-zinc-800"
                }`} />
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-white text-sm">Delivered / Handed Over</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Enjoy your delicious meals!</p>
                  </div>
                  <span className="text-xs text-zinc-400 font-mono font-medium">{getStepTime("DELIVERED")}</span>
                </div>
              </div>
            ) : (
              <div className="relative text-red-400">
                <span className="absolute -left-[31px] top-1 w-4.5 h-4.5 rounded-full bg-red-500 border-2 border-red-500 shadow-md shadow-red-500/30 flex items-center justify-center text-white text-[10px] font-bold">
                  ✕
                </span>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-red-400 text-sm">Order Cancelled</h3>
                    <p className="text-xs text-red-500/80 mt-0.5">
                      Reason: "{timeline.find((t) => t.status === "CANCELLED")?.notes || "Store cancellation"}"
                    </p>
                  </div>
                  <span className="text-xs text-red-400 font-mono font-medium">{getStepTime("CANCELLED")}</span>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
