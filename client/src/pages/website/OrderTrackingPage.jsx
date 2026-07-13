import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { trackOrderApi } from "../../api/models/public.api";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";

const formatINR = (amount) => {
  const n = Number(amount) || 0;
  return `₹${n.toLocaleString("en-IN")}`;
};

const STATUS_STEPS = [
  { key: "PENDING", label: "Placed", desc: "Successfully queued in store records" },
  { key: "ACCEPTED", label: "Accepted", desc: "Kitchen staff has confirmed the receipt" },
  { key: "PREPARING", label: "Preparing", desc: "Your food is currently being cooked" },
  { key: "READY", label: "Ready", desc: "Food is packed and hot at the counter" },
  { key: "DELIVERED", label: "Delivered", desc: "Enjoy your delicious meal!" },
];

const formatElapsed = (fromDate) => {
  const diffMs = Date.now() - new Date(fromDate).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
};

export default function OrderTrackingPage() {
  const { outletSlug, orderId } = useParams();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

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

  const handleCopyOrderId = (value) => {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-background">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-on-background p-6 font-sans">
        <div className="w-14 h-14 rounded-2xl bg-error-container text-on-error-container flex items-center justify-center text-2xl mb-5">
          ⚠️
        </div>
        <h2 className="text-xl font-semibold mb-2 font-hanken">Couldn't load tracking</h2>
        <p className="text-on-surface-variant mb-7 text-center max-w-xs">
          {error || "Failed to retrieve tracking details"}
        </p>
        <Link to={`/public/w/${outletSlug}`}>
          <Button variant="primary" className="bg-primary-fixed hover:brightness-95 text-on-primary-fixed border-none font-semibold">
            Return to Menu
          </Button>
        </Link>
      </div>
    );
  }

  const { order, timeline } = data;
  const currentStatus = order.status;
  const isCancelled = currentStatus === "CANCELLED";
  const isDelivered = currentStatus === "DELIVERED";

  const statusKeys = STATUS_STEPS.map((s) => s.key);
  const currentStepIndex = statusKeys.indexOf(currentStatus);

  const getStepStatus = (stepKey) => {
    const idx = statusKeys.indexOf(stepKey);
    if (isCancelled) return "cancelled";
    if (idx === -1) return "upcoming";
    if (idx < currentStepIndex) return "completed";
    if (idx === currentStepIndex) return "active";
    return "upcoming";
  };

  const getStepTime = (stepKey) => {
    const record = timeline.find((t) => t.status === stepKey);
    return record
      ? new Date(record.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";
  };

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-border-base bg-background/90 backdrop-blur sticky top-0 z-40 px-5 py-4 flex items-center justify-between">
        <Link
          to={`/public/w/${outletSlug}`}
          className="text-on-surface-variant hover:text-on-surface transition-colors text-sm font-semibold flex items-center gap-2"
        >
          ← Menu
        </Link>
        <div className="flex items-center gap-1.5">
          <h1 className="font-semibold text-lg text-on-background font-hanken">Order Tracking</h1>
          {!isCancelled && !isDelivered && (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-success-green ml-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-green opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success-green" />
              </span>
              Live
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={fetchTracking}
          className="text-xs text-on-surface-variant hover:text-on-surface border border-border-base hover:bg-surface-container rounded-lg px-2.5 py-1.5 transition-colors"
        >
          ↻ Refresh
        </button>
      </header>

      <div className="flex-grow max-w-2xl w-full mx-auto p-5 space-y-5">
        {/* Order details header card */}
        <Card className="bg-surface-container border border-border-base p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">Order Number</span>
            <button
              type="button"
              onClick={() => handleCopyOrderId(order.orderNumber)}
              className="text-lg font-bold text-on-surface block mt-0.5 hover:text-primary transition-colors"
              title="Copy order number"
            >
              {order.orderNumber} {copied ? <span className="text-xs text-success-green align-middle">✓ copied</span> : <span className="text-xs text-on-surface-variant align-middle">⧉</span>}
            </button>
            <span className="text-[11px] text-on-surface-variant block mt-1">
              Placed {formatElapsed(order.createdAt)}
            </span>
          </div>
          <div>
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">Total</span>
            <span className="text-lg font-bold text-primary block mt-0.5 tabular-nums">{formatINR(order.totalAmount)}</span>
          </div>
          <div>
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">Status</span>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-lg block mt-1 w-fit uppercase ${
                isCancelled
                  ? "bg-error-container text-on-error-container"
                  : isDelivered
                  ? "bg-success-green/10 text-success-green"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {currentStatus}
            </span>
          </div>
        </Card>

        {isCancelled ? (
          <Card className="bg-error-container/40 border border-error/30 p-6 rounded-2xl flex items-start gap-4">
            <span className="w-10 h-10 shrink-0 rounded-full bg-error text-on-error flex items-center justify-center font-bold">
              ✕
            </span>
            <div>
              <h3 className="font-semibold text-on-error-container text-base font-hanken">Order Cancelled</h3>
              <p className="text-sm text-on-error-container/80 mt-1">
                Reason: "{timeline.find((t) => t.status === "CANCELLED")?.notes || "Store cancellation"}"
              </p>
              <p className="text-xs text-on-error-container/60 mt-2">{getStepTime("CANCELLED")}</p>
            </div>
          </Card>
        ) : (
          <>
            {/* Live horizontal progress stepper */}
            <Card className="bg-surface-container border border-border-base p-5 sm:p-6 rounded-2xl">
              <div className="flex items-start justify-between">
                {STATUS_STEPS.map((step, i) => {
                  const status = getStepStatus(step.key);
                  return (
                    <React.Fragment key={step.key}>
                      <div className="flex flex-col items-center gap-2 w-16">
                        <div className="relative flex items-center justify-center h-7 w-7">
                          {status === "active" && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-40" />
                          )}
                          <span
                            className={`relative flex items-center justify-center h-7 w-7 rounded-full border-2 text-xs font-bold transition-colors ${
                              status === "completed"
                                ? "bg-primary-fixed border-primary-fixed text-on-primary-fixed"
                                : status === "active"
                                ? "bg-primary-fixed border-primary-fixed text-on-primary-fixed"
                                : "bg-surface-container-low border-border-base text-on-surface-variant"
                            }`}
                          >
                            {status === "completed" ? "✓" : i + 1}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-semibold text-center leading-tight ${
                            status === "upcoming" ? "text-on-surface-variant" : "text-on-surface"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                      {i < STATUS_STEPS.length - 1 && (
                        <div className="flex-1 h-0.5 mt-3.5 rounded-full overflow-hidden bg-surface-container-high">
                          <div
                            className="h-full bg-primary-fixed transition-all duration-500"
                            style={{ width: i < currentStepIndex ? "100%" : "0%" }}
                          />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </Card>

            {/* Detailed activity timeline */}
            <Card className="bg-surface-container border border-border-base p-6 rounded-2xl">
              <h2 className="text-base font-semibold text-on-background font-hanken border-b border-border-base pb-4 mb-6">
                Kitchen Activity Timeline
              </h2>

              <div className="relative border-l border-border-base ml-4 pl-6 space-y-8">
                {STATUS_STEPS.map((step) => {
                  const status = getStepStatus(step.key);
                  const isActive = status === "active";
                  const isDone = status === "completed";
                  return (
                    <div key={step.key} className="relative">
                      <span className="absolute -left-[31px] top-1 flex items-center justify-center h-[18px] w-[18px]">
                        {isActive && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-50" />
                        )}
                        <span
                          className={`relative w-full h-full rounded-full border-2 ${
                            isDone || isActive
                              ? "bg-primary-fixed border-primary-fixed"
                              : "bg-surface-container-low border-border-base"
                          }`}
                        />
                      </span>
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <h3
                            className={`font-semibold text-sm ${
                              status === "upcoming" ? "text-on-surface-variant" : "text-on-surface"
                            }`}
                          >
                            {step.key === "PENDING" ? "Order Placed" : step.label === "Ready" ? "Ready for Delivery / Takeaway" : step.label === "Delivered" ? "Delivered / Handed Over" : step.label === "Preparing" ? "Dishes in Preparation" : "Accepted by Store"}
                          </h3>
                          <p className="text-xs text-on-surface-variant mt-0.5">{step.desc}</p>
                        </div>
                        <span className="text-xs text-on-surface-variant font-mono font-medium whitespace-nowrap">
                          {step.key === "PENDING"
                            ? getStepTime("PENDING") ||
                              new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : getStepTime(step.key)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}