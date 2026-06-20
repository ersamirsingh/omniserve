import React from "react";
import Card from "../../components/ui/Card.jsx";

export const OutletsManagement = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-[20px] font-bold text-on-surface">Store Outlet Settings</h2>
      <Card title="Manage Outlets" subtitle="Feature coming in Phase 2">
        <p className="text-[13px] text-on-surface-variant">
          Outlet status toggle, operating hours updates, and nearby store search features are scheduled for Phase 2.
        </p>
      </Card>
    </div>
  );
};

export default OutletsManagement;
