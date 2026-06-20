import React from "react";
import { formatINR } from "../../utils/currency.js";

export const TopOutlets = ({ outlets = [] }) => {
  return (
    <div className="bg-surface-container-lowest dark:bg-zinc-900 p-6 rounded-xl border border-border-base dark:border-zinc-800 whisper-shadow">
      <div className="flex justify-between items-center mb-6">
        <h4 className="font-label-md text-label-md text-on-surface dark:text-zinc-200 uppercase tracking-wider text-[12px] font-bold">
          Top Performing Outlets
        </h4>
        <button className="text-primary dark:text-primary-fixed-dim font-bold text-[13px] hover:underline">
          View All
        </button>
      </div>
      {outlets.length === 0 ? (
        <div className="p-8 text-center text-on-surface-variant dark:text-zinc-500 text-[13px] font-medium">
          No performance datasets available.
        </div>
      ) : (
        <div className="space-y-4">
          {outlets.map((outlet) => (
            <div key={outlet.rank} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-surface-container-low dark:bg-zinc-800 rounded flex items-center justify-center font-bold text-primary dark:text-primary-fixed-dim text-[14px]">
                  {outlet.rank}
                </div>
                <div>
                  <p className="text-label-md font-label-md text-on-surface dark:text-zinc-200 text-[14px] font-semibold">
                    {outlet.name}
                  </p>
                  <p className="text-label-sm font-label-sm text-on-surface-variant dark:text-zinc-400 text-[12px]">
                    {outlet.rating} ★ Rating
                  </p>
                </div>
              </div>
              <p className="font-mono-data text-mono-data font-bold text-on-surface dark:text-zinc-200 text-[13px]">
                {formatINR(outlet.revenue)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TopOutlets;
