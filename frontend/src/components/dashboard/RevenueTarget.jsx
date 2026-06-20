import React from "react";
import { formatINR } from "../../utils/currency.js";

export const RevenueTarget = ({ data }) => {
  const currentFormatted = formatINR(data?.current || 0);
  const targetFormatted = formatINR(data?.target || 0);

  return (
    <div className="bg-surface-container-lowest dark:bg-zinc-900 p-6 rounded-xl border border-border-base dark:border-zinc-800 whisper-shadow">
      <div className="flex justify-between items-center mb-6">
        <h4 className="font-label-md text-label-md text-on-surface dark:text-zinc-200 uppercase tracking-wider text-[12px] font-bold">
          Revenue vs Target
        </h4>
        <span className="material-symbols-outlined text-on-surface-variant dark:text-zinc-400" data-icon="more_vert">
          more_vert
        </span>
      </div>
      <div className="flex items-end gap-2 mb-4 flex-wrap">
        <span className="text-headline-md font-headline-md text-on-surface dark:text-zinc-100 text-[24px] font-bold">
          {currentFormatted}
        </span>
        {data?.trendMessage && (
          <span className="text-body-sm font-body-sm text-success-green mb-1 font-semibold text-[13px]">
            {data.trendMessage}
          </span>
        )}
      </div>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-label-sm font-label-sm mb-2 text-[12px]">
            <span className="text-on-surface-variant dark:text-zinc-400">
              Monthly Goal ({targetFormatted})
            </span>
            <span className="text-on-surface dark:text-zinc-200 font-bold">
              {data?.percentage || 0}%
            </span>
          </div>
          <div className="w-full h-3 bg-surface-container-low dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-1000"
              style={{ width: `${data?.percentage || 0}%` }}
            ></div>
          </div>
        </div>
        {data?.aiInsight && (
          <p className="text-[12px] text-on-surface-variant dark:text-zinc-400 italic leading-relaxed">
            <span className="font-bold text-secondary dark:text-teal-400">AI Insight:</span> {data.aiInsight}
          </p>
        )}
      </div>
    </div>
  );
};

export default RevenueTarget;
