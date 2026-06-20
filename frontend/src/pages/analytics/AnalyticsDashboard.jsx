import React from "react";
import Card from "../../components/ui/Card.jsx";

export const AnalyticsDashboard = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-[20px] font-bold text-on-surface">Sales Performance & Feedback Sentiment</h2>
      <Card title="Business Intelligence Charts" subtitle="Feature coming in Phase 2">
        <p className="text-[13px] text-on-surface-variant">
          Historical daily sales summaries, channels volume, top-selling items metrics, and customer review sentiment labels are scheduled for Phase 2.
        </p>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;
