import React from "react";

export const AlertsList = ({ alerts = [] }) => {
  return (
    <section className="bg-surface-container-lowest dark:bg-zinc-900 rounded-xl border border-border-base dark:border-zinc-800 whisper-shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-border-base dark:border-zinc-800 flex justify-between items-center bg-surface-subtle dark:bg-zinc-900/50">
        <h4 className="font-headline-sm text-headline-sm text-on-surface dark:text-zinc-100 flex items-center gap-2 text-[16px] font-bold">
          <span className="material-symbols-outlined text-error" data-icon="report">
            report
          </span>
          Critical Alerts
        </h4>
        <span className="px-2 py-1 bg-error-container text-on-error-container rounded text-[10px] font-bold uppercase tracking-wider">
          {alerts.length} Issues
        </span>
      </div>
      {alerts.length === 0 ? (
        <div className="p-8 text-center text-on-surface-variant dark:text-zinc-500 text-[13px] font-medium bg-surface-container-lowest dark:bg-zinc-900">
          No critical alerts reported. Operations stable.
        </div>
      ) : (
        <div className="divide-y divide-border-base dark:divide-zinc-800">
          {alerts.map((alert) => {
            let bgClass = "bg-error-container/20";
            let iconColor = "text-error";
            let iconName = "warning";

            if (alert.type === "sla") {
              bgClass = "bg-amber-100/50 dark:bg-amber-950/20";
              iconColor = "text-amber-600 dark:text-amber-500";
              iconName = "timer";
            } else if (alert.type === "reviews") {
              bgClass = "bg-ai-accent/30 dark:bg-teal-950/20";
              iconColor = "text-secondary dark:text-teal-400";
              iconName = "reviews";
            }

            return (
              <div
                key={alert.id}
                className="p-6 flex items-start gap-4 hover:bg-surface-container-low dark:hover:bg-zinc-800/40 transition-colors group"
              >
                <div className={`w-10 h-10 rounded-full ${bgClass} flex items-center justify-center flex-shrink-0`}>
                  <span className={`material-symbols-outlined ${iconColor}`} data-icon={iconName}>
                    {iconName}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <p className="font-label-md text-label-md text-on-surface dark:text-zinc-200 text-[14px] font-semibold">
                      {alert.title}
                    </p>
                    <span className="text-[12px] text-on-surface-variant dark:text-zinc-400">
                      {alert.time}
                    </span>
                  </div>
                  <p className="text-body-sm font-body-sm text-on-surface-variant dark:text-zinc-400 mt-1 text-[13px]">
                    {alert.message}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button className="text-primary dark:text-primary-fixed-dim font-semibold text-[13px] hover:underline">
                      {alert.actionText}
                    </button>
                    {alert.type === "inventory" && (
                      <>
                        <span className="text-outline/40">|</span>
                        <button className="text-on-surface-variant dark:text-zinc-400 text-[13px] hover:underline">
                          Dismiss
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default AlertsList;
