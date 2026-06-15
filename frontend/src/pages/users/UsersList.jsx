import React from "react";
import Card from "../../components/ui/Card.jsx";

export const UsersList = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-[20px] font-bold text-on-surface">Store Team & User Roles</h2>
      <Card title="Manage Accounts" subtitle="Feature coming in Phase 2">
        <p className="text-[13px] text-on-surface-variant">
          Adding managers, cashiers, kitchen staff, role access levels, and active status controls are scheduled for Phase 2.
        </p>
      </Card>
    </div>
  );
};

export default UsersList;
