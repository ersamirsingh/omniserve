import React from "react";

export const StatCard = ({
  title,
  value,
  trend,
  trendType = "up",
  subtitle,
  icon,
  type = "default", // 'revenue' | 'orders' | 'inventory' | 'subscription' | 'satisfaction' | 'default'
}) => {
  const isUp = trendType === "up";
  const isDown = trendType === "down";
  const isNeutral = trendType === "neutral";

  let trendColorClass = "text-success-green bg-success-green/10";
  let trendIcon = "trending_up";

  if (isDown) {
    trendColorClass = "text-error bg-error/10";
    trendIcon = "trending_down";
  } else if (isNeutral) {
    trendColorClass = "text-on-surface-variant bg-surface-container-high/50 dark:text-zinc-400 dark:bg-zinc-800";
    trendIcon = "check_circle";
  }

  // Define sparkline styles based on type
  const renderVisual = () => {
    switch (type) {
      case "revenue":
        return (
          <div className="mt-4 h-12 w-full bg-surface-container-low dark:bg-zinc-800/50 rounded relative overflow-hidden">
            <div
              className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/30"
              style={{
                clipPath:
                  "polygon(0 100%, 10% 80%, 20% 85%, 30% 60%, 40% 70%, 50% 40%, 60% 45%, 70% 20%, 80% 30%, 90% 10%, 100% 5%, 100% 100%)",
              }}
            ></div>
          </div>
        );
      case "orders":
        return (
          <div className="mt-4 h-12 w-full bg-surface-container-low dark:bg-zinc-800/50 rounded relative overflow-hidden">
            <div
              className="absolute inset-0 bg-gradient-to-r from-secondary/10 to-secondary/30"
              style={{
                clipPath:
                  "polygon(0 90%, 15% 70%, 30% 75%, 45% 50%, 60% 60%, 75% 40%, 90% 45%, 100% 30%, 100% 100%, 0% 100%)",
              }}
            ></div>
          </div>
        );
      case "inventory":
        return (
          <div className="mt-4 h-12 w-full bg-surface-container-low dark:bg-zinc-800/50 rounded relative overflow-hidden">
            <div
              className="absolute inset-0 bg-gradient-to-r from-tertiary/10 to-tertiary/30"
              style={{
                clipPath: "polygon(0 40%, 20% 45%, 40% 35%, 60% 50%, 80% 60%, 100% 75%, 100% 100%, 0% 100%)",
              }}
            ></div>
          </div>
        );
      case "satisfaction":
        return (
          <div className="mt-5 flex items-center gap-1">
            <div className="h-2 flex-1 bg-success-green rounded-full"></div>
            <div className="h-2 flex-1 bg-success-green rounded-full"></div>
            <div className="h-2 flex-1 bg-success-green rounded-full"></div>
            <div className="h-2 flex-1 bg-success-green rounded-full"></div>
            <div className="h-2 flex-1 bg-surface-container-highest dark:bg-zinc-700 rounded-full"></div>
          </div>
        );
      case "subscription":
      default:
        return (
          <div className="mt-3">
            {value === "No Active Plan" ? (
              <button
                onClick={() => window.location.href = "/dashboard/subscriptions"}
                className="w-full bg-primary dark:bg-primary-container text-white dark:text-on-primary-container py-1.5 px-3 rounded text-[11px] font-bold hover:opacity-90 active:scale-[0.98] transition-all text-center"
              >
                Upgrade Plan
              </button>
            ) : (
              subtitle && (
                <div className="text-[12px] text-on-surface-variant dark:text-zinc-400 font-medium">
                  {subtitle}
                </div>
              )
            )}
          </div>
        );
    }
  };

  return (
    <div className="bg-surface-container-lowest dark:bg-zinc-900 p-6 rounded-xl border border-border-base dark:border-zinc-800 whisper-shadow flex flex-col justify-between hover:-translate-y-1 transition-transform duration-200">
      <div>
        <div className="flex justify-between items-start mb-2">
          <span className="text-label-sm font-label-sm text-on-surface-variant dark:text-zinc-400 text-[12px] font-semibold">
            {title}
          </span>
          {trend && (
            <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold ${trendColorClass}`}>
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'wght' 600" }}>
                {trendIcon}
              </span>
              {trend}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1 mt-1">
          <h3 className="text-headline-md font-headline-md text-on-surface dark:text-zinc-100 text-[24px] font-bold tracking-tight">
            {value}
          </h3>
          {type === "satisfaction" && (
            <span className="text-body-sm font-body-sm text-on-surface-variant dark:text-zinc-400 text-[12px]">
              / 5.0
            </span>
          )}
        </div>
      </div>
      {renderVisual()}
    </div>
  );
};

export default StatCard;
