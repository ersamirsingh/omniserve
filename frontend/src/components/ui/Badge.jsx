import React from "react";

export const Badge = ({ children, type = "default" }) => {
  const types = {
    // Orders / Webhooks status badges
    pending: "bg-surface-dim/30 text-on-surface-variant",
    accepted: "bg-data-blue/10 text-data-blue",
    preparing: "bg-primary-container/10 text-primary-container",
    ready: "bg-secondary-container/20 text-on-secondary-container",
    picked_up: "bg-success-green/10 text-success-green",
    delivered: "bg-success-green/20 text-success-green font-bold",
    cancelled: "bg-error/10 text-error font-semibold",
    
    // Payments status badges
    success: "bg-success-green/10 text-success-green",
    failed: "bg-error/10 text-error",
    refunded: "bg-surface-dim/40 text-on-surface",

    // Default
    default: "bg-outline-variant/10 text-outline",
  };

  const key = String(children).trim().toLowerCase().replace(" ", "_");
  const colorClass = types[key] || types[type] || types.default;

  return (
    <span className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-[11px] font-semibold tracking-wide uppercase ${colorClass}`}>
      {children}
    </span>
  );
};

export default Badge;
