import React from "react";

export const NetworkHealth = ({ health }) => {
  const uptime = health?.uptime ?? 100;
  const dashArray = 440;
  const dashOffset = dashArray * (1 - uptime / 100);

  return (
    <section className="bg-surface-container-lowest dark:bg-zinc-900 p-6 rounded-xl border border-border-base dark:border-zinc-800 whisper-shadow">
      <h4 className="font-label-md text-label-md text-on-surface dark:text-zinc-200 uppercase tracking-wider mb-6 text-[12px] font-bold">
        Network Health Status
      </h4>
      <div className="relative w-40 h-40 mx-auto mb-6 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90">
          <circle
            cx="80"
            cy="80"
            fill="transparent"
            r="70"
            stroke="var(--border-base)"
            className="stroke-border-base dark:stroke-zinc-800"
            strokeWidth="12"
          ></circle>
          <circle
            cx="80"
            cy="80"
            fill="transparent"
            r="70"
            stroke="var(--success-green, #10B981)"
            className="stroke-success-green"
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
            strokeWidth="12"
            strokeLinecap="round"
          ></circle>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-headline-md font-headline-md text-on-surface dark:text-zinc-100 text-[24px] font-bold">
            {uptime}%
          </span>
          <span className="text-label-sm font-label-sm text-on-surface-variant dark:text-zinc-400 text-[12px]">
            Uptime
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-headline-sm font-headline-sm text-success-green text-[18px] font-bold">
            {health?.online ?? 0}
          </p>
          <p className="text-[10px] uppercase font-bold text-on-surface-variant dark:text-zinc-400">
            Online
          </p>
        </div>
        <div className="border-x border-border-base dark:border-zinc-800">
          <p className="text-headline-sm font-headline-sm text-error text-[18px] font-bold">
            {health?.offline ?? 0}
          </p>
          <p className="text-[10px] uppercase font-bold text-on-surface-variant dark:text-zinc-400">
            Offline
          </p>
        </div>
        <div>
          <p className="text-headline-sm font-headline-sm text-[#B45309] text-[18px] font-bold">
            {health?.issues ?? 0}
          </p>
          <p className="text-[10px] uppercase font-bold text-on-surface-variant dark:text-zinc-400">
            Issues
          </p>
        </div>
      </div>
    </section>
  );
};

export default NetworkHealth;
