import React from "react";
import Card from "../../components/ui/Card.jsx";

export const NotificationsList = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-[20px] font-bold text-on-surface">Store Alerts & System Notifications</h2>
      <Card title="Alert Feed" subtitle="Feature coming in Phase 2">
        <p className="text-[13px] text-on-surface-variant">
          Filtering and managing low inventory warning alerts, payment failures, and new order triggers are scheduled for Phase 2.
        </p>
      </Card>
    </div>
  );
};

export default NotificationsList;
