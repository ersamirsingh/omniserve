import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function PageHeader({ 
  section, 
  title, 
  description, 
  actions, 
  tabs = [] 
}) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="border-b border-border-base dark:border-zinc-900/60 pb-1 mb-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          {section && (
            <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold text-on-surface-variant/60 dark:text-zinc-500 uppercase tracking-widest">
              <span>{section}</span>
              {title && (
                <>
                  <span className="material-symbols-outlined text-[13px]">chevron_right</span>
                  <span className="text-primary dark:text-primary-fixed-dim">{title}</span>
                </>
              )}
            </div>
          )}
          <h2 className="text-headline-lg font-headline-lg text-on-surface dark:text-zinc-100 text-[26px] font-bold tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="text-body-md text-on-surface-variant dark:text-zinc-400 text-[14px] mt-1 leading-snug">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>

      {tabs && tabs.length > 0 && (
        <div className="tabs tabs-bordered mt-6 border-b border-border-base/40 dark:border-zinc-900/40">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.to;
            return (
              <button
                key={tab.to}
                onClick={() => navigate(tab.to)}
                className={`tab pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer select-none h-auto ${
                  isActive
                    ? 'tab-active border-primary text-primary dark:text-primary-fixed-dim'
                    : 'border-transparent text-on-surface-variant dark:text-zinc-450 hover:text-on-surface dark:hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
