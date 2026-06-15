import React from "react";
import Card from "../../components/ui/Card.jsx";

export const MenuManagement = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-[20px] font-bold text-on-surface">Menu & Item Catalog Sync</h2>
      <Card title="Menu Items & Categories" subtitle="Feature coming in Phase 2">
        <p className="text-[13px] text-on-surface-variant">
          Adding categories, variant modifications, addon packs, and item availability sync toggles are scheduled for Phase 2.
        </p>
      </Card>
    </div>
  );
};

export default MenuManagement;
