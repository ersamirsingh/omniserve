import React from 'react';

const variants = {
  primary: 'text-on-primary bg-primary-container hover:bg-primary-container/90 shadow-sm active:scale-[0.98] focus:ring-2 focus:ring-primary/20',
  secondary: 'bg-surface-subtle dark:bg-zinc-900 text-on-surface dark:text-zinc-300 border border-border-base dark:border-zinc-800 hover:bg-surface-container-low dark:hover:bg-zinc-800 active:scale-[0.98] focus:ring-2 focus:ring-border-base/20',
  danger: 'bg-error text-on-error hover:bg-error/90 active:scale-[0.98] focus:ring-2 focus:ring-error/20',
  ghost: 'bg-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-200 hover:bg-surface-container-low dark:hover:bg-zinc-800 active:scale-[0.98]',
};

const sizes = {
  sm: 'px-3.5 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm font-semibold',
  lg: 'px-7 py-3.5 text-sm font-semibold',
};

export default function Button({ children, variant = 'primary', size = 'md', loading, disabled, onClick, type = 'button', className = '' }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-lg cursor-pointer transition-all duration-150 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin-custom shrink-0" />}
      {children}
    </button>
  );
}
