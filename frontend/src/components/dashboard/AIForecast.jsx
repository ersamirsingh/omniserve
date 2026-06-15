import React from "react";

export const AIForecast = ({ forecast }) => {
  if (!forecast) return null;

  return (
    <div className="p-6 rounded-xl bg-ai-accent dark:bg-teal-950/20 border border-secondary/20 dark:border-teal-500/20 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity dark:text-teal-400">
        <span className="material-symbols-outlined text-[64px]" data-icon="psychology">
          psychology
        </span>
      </div>
      <h5 className="text-secondary dark:text-teal-400 font-bold text-label-sm uppercase tracking-widest mb-2 flex items-center gap-1 text-[11px]">
        <span className="material-symbols-outlined text-[16px]" data-icon="auto_awesome">
          auto_awesome
        </span>
        {forecast.title}
      </h5>
      <p className="text-body-sm font-body-sm text-on-surface dark:text-zinc-300 leading-relaxed text-[13px]">
        {forecast.message}
      </p>
      <button className="mt-4 bg-secondary dark:bg-teal-600 dark:hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-label-sm font-label-sm hover:opacity-90 active:scale-[0.98] transition-all text-[12px] font-semibold">
        {forecast.actionText}
      </button>
    </div>
  );
};

export default AIForecast;
