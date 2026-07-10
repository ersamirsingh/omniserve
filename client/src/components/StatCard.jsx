import React from 'react';

const iconColors = {
  indigo: 'bg-primary-container/10 text-primary-container dark:text-primary-fixed-dim',
  emerald: 'bg-success-green/10 text-success-green',
  amber: 'bg-amber-500/10 text-amber-650 dark:text-amber-400',
  rose: 'bg-error/10 text-error',
  blue: 'bg-blue-500/10 text-blue-650 dark:text-blue-400',
  primary: 'bg-primary-container/10 text-primary-container dark:text-primary-fixed-dim',
  warning: 'bg-amber-500/10 text-amber-650 dark:text-amber-400',
  info: 'bg-blue-500/10 text-blue-650 dark:text-blue-400',
  error: 'bg-rose-500/10 text-error',
};

export default function StatCard({ title, value, icon, trend, trendUp, color = 'indigo', onClick }) {
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    const IconComponent = icon;
    return <IconComponent />;
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl shadow-sm p-6 flex flex-col gap-3 hover:-translate-y-1 transition-transform duration-200 animate-fade-in ${
        onClick ? 'cursor-pointer hover:border-primary/50' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 ${iconColors[color] || iconColors.indigo}`}>
          {renderIcon()}
        </div>
        {trend && (
          <span 
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
              trendUp 
                ? 'text-success-green bg-success-green/10' 
                : 'text-error bg-error/10'
            }`}
          >
            <span className="material-symbols-outlined text-[13px] font-bold">
              {trendUp ? 'trending_up' : 'trending_down'}
            </span>
            {trend}
          </span>
        )}
      </div>
      <div>
        <h3 className="text-2xl font-bold font-hanken text-on-surface dark:text-zinc-100 leading-tight">
          {value}
        </h3>
        <p className="text-[12px] text-on-surface-variant dark:text-zinc-400 font-semibold uppercase tracking-wider mt-1">
          {title}
        </p>
      </div>
    </div>
  );
}
