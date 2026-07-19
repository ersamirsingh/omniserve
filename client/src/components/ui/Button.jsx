import React from 'react';

const variants = {
  primary: 'btn btn-primary text-on-primary bg-primary-container hover:bg-primary-container/90 shadow-sm active:scale-[0.98] focus:ring-2 focus:ring-primary/20 border-none',
  secondary: 'btn btn-outline bg-surface-subtle dark:bg-zinc-900 text-on-surface dark:text-zinc-300 border border-border-base dark:border-zinc-800 hover:bg-surface-container-low dark:hover:bg-zinc-800 active:scale-[0.98] focus:ring-2 focus:ring-border-base/20 hover:text-on-surface dark:hover:text-zinc-200',
  danger: 'btn btn-error text-on-error hover:bg-error/90 active:scale-[0.98] focus:ring-2 focus:ring-error/20 border-none',
  ghost: 'btn btn-ghost bg-transparent text-on-surface-variant dark:text-zinc-450 hover:text-on-surface dark:hover:text-zinc-200 hover:bg-surface-container-low dark:hover:bg-zinc-800 active:scale-[0.98] border-none',
  outline: 'btn bg-transparent text-on-surface-variant dark:text-zinc-350 border border-border-base dark:border-zinc-800 hover:bg-surface-container-low dark:hover:bg-zinc-900 active:scale-[0.98] focus:ring-2 focus:ring-border-base/20 hover:text-on-surface dark:hover:text-zinc-200',
  success: 'btn bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm active:scale-[0.98] focus:ring-2 focus:ring-emerald-500/20 border-none',
};

const sizes = {
  xs: 'px-2.5 py-1 text-[11px] h-auto min-h-0 rounded-md',
  sm: 'btn-sm px-3.5 py-1.5 text-xs h-auto min-h-0',
  md: 'btn-md px-5 py-2.5 text-sm font-semibold h-auto min-h-0',
  lg: 'btn-lg px-7 py-3.5 text-sm font-semibold h-auto min-h-0',
};

export default function Button({ children, variant = 'primary', size = 'md', loading, disabled, onClick, type = 'button', className = '' }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-lg cursor-pointer transition-all duration-150 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <span className="loading loading-spinner w-4 h-4 shrink-0" />}
      {children}
    </button>
  );
}
