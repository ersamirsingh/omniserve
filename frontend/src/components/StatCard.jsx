import React from "react";

export const StatCard = ({ title, value, icon, trend, trendType = "up", subtitle }) => {
  const isUp = trendType === "up";
  const trendColorClass = isUp ? "text-success-green bg-success-green/10" : "text-error bg-error/10";
  const trendIcon = isUp ? "trending_up" : "trending_down";

  return (
    <div className="bg-surface-subtle border border-border-base rounded-xl p-5 hover:-translate-y-1 transition-transform duration-200 whisper-shadow">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider">
          {title}
        </span>
        <span
          className={`material-symbols-outlined text-[20px] ${
            isUp ? "text-success-green" : "text-error"
          }`}
        >
          {icon}
        </span>
      </div>
      <div className="text-[28px] font-bold text-on-surface mb-1 font-display-lg leading-tight">
        {value}
      </div>
      {(trend || subtitle) && (
        <div className="flex items-center text-[12px]">
          {trend && (
            <span className={`px-1.5 py-0.5 rounded font-semibold mr-2 flex items-center gap-0.5 ${trendColorClass}`}>
              <span className="material-symbols-outlined text-[12px]">{trendIcon}</span>
              {trend}
            </span>
          )}
          {subtitle && <span className="text-on-surface-variant">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};

export default StatCard;
