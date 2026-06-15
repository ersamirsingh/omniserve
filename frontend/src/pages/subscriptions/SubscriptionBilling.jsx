import React from "react";
import Card from "../../components/ui/Card.jsx";

export const SubscriptionBilling = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-[20px] font-bold text-on-surface">Tenant Plans & Billing</h2>
      <Card title="Manage Subscription" subtitle="Feature coming in Phase 2">
        <p className="text-[13px] text-on-surface-variant">
          Plan upgrades (Starter, Pro, Enterprise), payment processing integration, and plan cancellation are scheduled for Phase 2.
        </p>
      </Card>
    </div>
  );
};

export default SubscriptionBilling;
