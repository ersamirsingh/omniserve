import React, { useState } from "react";
import { useSearchParams, useParams, Link } from "react-router-dom";
import Card from "../../components/ui/Card";

const NEXT_STEPS = [
  { label: "Accepted", desc: "Kitchen confirms your order" },
  { label: "Preparing", desc: "Your food is cooked fresh" },
  { label: "Ready", desc: "Served hot, right on time" },
];

export default function OrderSuccessPage() {
  const { outletSlug } = useParams();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!orderId) return;
    navigator.clipboard?.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-background text-on-background flex items-center justify-center p-6 font-sans">
      <Card className="bg-surface-container border border-border-base p-8 rounded-3xl max-w-md w-full text-center space-y-6 shadow-[0_20px_60px_-20px_color-mix(in_srgb,var(--color-brand-accent)_25%,transparent)]">
        <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-green opacity-25" />
          <div className="relative w-16 h-16 rounded-full bg-success-green/10 border border-success-green/30 flex items-center justify-center text-success-green text-3xl animate-scale-in">
            ✓
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-on-background font-hanken">Order Placed!</h1>
          <p className="text-sm text-on-surface-variant">
            Thank you for ordering. Your order has been sent straight to the kitchen.
          </p>
        </div>

        {orderId && (
          <button
            type="button"
            onClick={handleCopy}
            className="w-full bg-surface-container-low border border-border-base rounded-2xl p-4 text-left space-y-1.5 hover:border-primary/40 transition-colors"
            title="Tap to copy order ID"
          >
            <span className="text-xs text-on-surface-variant uppercase tracking-wider block">Order ID</span>
            <span className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-bold text-on-surface break-all">{orderId}</span>
              <span className={`text-xs shrink-0 font-semibold ${copied ? "text-success-green" : "text-on-surface-variant"}`}>
                {copied ? "✓ Copied" : "⧉ Copy"}
              </span>
            </span>
          </button>
        )}

        {/* What happens next preview */}
        <div className="flex items-center justify-between px-1">
          {NEXT_STEPS.map((step, i) => (
            <React.Fragment key={step.label}>
              <div className="flex flex-col items-center gap-1.5 w-16">
                <span className="text-[10px] font-bold text-on-surface-variant">{i + 1}</span>
                <span className="text-[11px] font-semibold text-on-surface text-center leading-tight">{step.label}</span>
              </div>
              {i < NEXT_STEPS.length - 1 && <div className="flex-1 h-px bg-border-base mt-3" />}
            </React.Fragment>
          ))}
        </div>

        <div className="pt-2 flex flex-col gap-3">
          {orderId && (
            <Link to={`/public/w/${outletSlug}/track/${orderId}`}>
              <button
                type="button"
                className="w-full bg-primary-fixed hover:brightness-95 text-on-primary-fixed font-bold py-3 px-4 rounded-xl shadow-[0_8px_20px_-8px_color-mix(in_srgb,var(--color-brand-accent)_35%,transparent)] transition-all text-sm"
              >
                Track Live Progress
              </button>
            </Link>
          )}
          <Link to={`/public/w/${outletSlug}`}>
            <button
              type="button"
              className="w-full bg-surface-container-low border border-border-base hover:bg-surface-container-high text-on-surface font-bold py-3 px-4 rounded-xl transition-colors text-sm"
            >
              Back to Menu
            </button>
          </Link>
        </div>
      </Card>
    </div>
  );
}