import React from "react";
import Card from "../../components/ui/Card.jsx";

export const WebhookLogs = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-[20px] font-bold text-on-surface">External Webhook Intake Logs</h2>
      <Card title="Integration Event Log" subtitle="Feature coming in Phase 2">
        <p className="text-[13px] text-on-surface-variant">
          Tracing payload logs from Stripe, Swiggy, Zomato, Dunzo, or Dunzo webhook integrations, checking signature compliance, and trigger locking retries are scheduled for Phase 2.
        </p>
      </Card>
    </div>
  );
};

export default WebhookLogs;
