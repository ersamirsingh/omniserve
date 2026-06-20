import React from "react";
import Card from "../../components/ui/Card.jsx";

export const OrdersManagement = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-[20px] font-bold text-on-surface">Order Management Pipeline</h2>
      <Card title="Live Kitchen Feed" subtitle="Feature coming in Phase 2">
        <p className="text-[13px] text-on-surface-variant">
          The interactive real-time order board, driver pickup notifications, and cashier accepting pipelines are scheduled for Phase 2.
        </p>
      </Card>
    </div>
  );
};

export default OrdersManagement;
