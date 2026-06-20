import React from "react";
import Card from "../../components/ui/Card.jsx";

export const InventoryManagement = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-[20px] font-bold text-on-surface">Ingredient Inventory Logs</h2>
      <Card title="Stock Reconciliation" subtitle="Feature coming in Phase 2">
        <p className="text-[13px] text-on-surface-variant">
          Inventory counts, batch reconciliation logs, low stock thresholds, and alerts are scheduled for Phase 2.
        </p>
      </Card>
    </div>
  );
};

export default InventoryManagement;
