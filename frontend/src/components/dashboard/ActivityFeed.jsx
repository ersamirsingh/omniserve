import React from "react";

export const ActivityFeed = ({ feed = [] }) => {
  return (
    <section className="bg-surface-container-lowest dark:bg-zinc-900 rounded-xl border border-border-base dark:border-zinc-800 whisper-shadow flex flex-col h-[500px]">
      <div className="px-6 py-4 border-b border-border-base dark:border-zinc-800 flex justify-between items-center">
        <h4 className="font-label-md text-label-md text-on-surface dark:text-zinc-200 uppercase tracking-wider text-[12px] font-bold">
          Live Activity Feed
        </h4>
        <span className="w-2 h-2 bg-success-green rounded-full animate-pulse"></span>
      </div>
      {feed.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8 text-center text-on-surface-variant dark:text-zinc-500 text-[13px] font-medium">
          No live activity logs recorded.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          {feed.map((activity, index) => {
            let bgClass = "bg-primary-container";
            let iconColor = "text-white";
            let iconName = "shopping_bag";

            if (activity.type === "inventory") {
              bgClass = "bg-secondary-container";
              iconColor = "text-on-secondary-container";
              iconName = "refresh";
            } else if (activity.type === "staff") {
              bgClass = "bg-tertiary-fixed";
              iconColor = "text-on-tertiary-fixed-variant";
              iconName = "person_add";
            } else if (activity.type === "sync") {
              bgClass = "bg-surface-container-highest dark:bg-zinc-800";
              iconColor = "text-on-surface-variant dark:text-zinc-300";
              iconName = "cloud_done";
            }

            const isLast = index === feed.length - 1;

            return (
              <div key={activity.id} className="flex gap-4 relative">
                {!isLast && (
                  <div className="absolute left-4 top-8 bottom-0 w-[1px] bg-border-base dark:bg-zinc-850"></div>
                )}
                <div className={`w-8 h-8 rounded-full ${bgClass} flex items-center justify-center z-10 flex-shrink-0`}>
                  <span className={`material-symbols-outlined ${iconColor} text-[16px]`} data-icon={iconName}>
                    {iconName}
                  </span>
                </div>
                <div className="pb-2">
                  <p className="text-body-sm font-body-sm text-on-surface dark:text-zinc-350 text-[13px]">
                    <span className="font-bold text-on-surface dark:text-zinc-200">{activity.title}</span>{" "}
                    {activity.details}
                  </p>
                  <p className="text-label-sm font-label-sm text-on-surface-variant dark:text-zinc-400 mt-1 text-[12px]">
                    {activity.meta}
                  </p>
                  <span className="text-[10px] text-outline/80 dark:text-zinc-500 font-bold block mt-1">
                    {activity.time}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="p-4 border-t border-border-base dark:border-zinc-800">
        <button className="w-full py-2 text-primary dark:text-primary-fixed-dim hover:bg-surface-container-low dark:hover:bg-zinc-800/50 font-bold text-[13px] transition-colors rounded-lg">
          View Detailed Logs
        </button>
      </div>
    </section>
  );
};

export default ActivityFeed;
