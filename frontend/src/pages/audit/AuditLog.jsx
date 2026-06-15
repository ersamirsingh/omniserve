import React from "react";
import Card from "../../components/ui/Card.jsx";

export const AuditLog = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-[20px] font-bold text-on-surface">Compliance Audit Trail</h2>
      <Card title="System Operations Log" subtitle="Feature coming in Phase 2">
        <p className="text-[13px] text-on-surface-variant">
          Filtering user actions (creation, deletion, status edits), tracing audit IPs, and comparing old/new data logs are scheduled for Phase 2.
        </p>
      </Card>
    </div>
  );
};

export default AuditLog;
