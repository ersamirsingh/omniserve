import React from 'react';

const variants = {
  success: 'badge badge-success bg-emerald-500/12 text-emerald-400 border-none',
  warning: 'badge badge-warning bg-amber-500/12 text-amber-400 border-none',
  danger: 'badge badge-error bg-red-500/12 text-red-400 border-none',
  info: 'badge badge-info bg-blue-500/12 text-blue-400 border-none',
  neutral: 'badge badge-neutral bg-slate-500/12 text-slate-400 border-none',
  outline: 'badge bg-transparent border border-border-base dark:border-zinc-700',
};

export default function Badge({ variant = 'neutral', children, className = '' }) {
  return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap tracking-wide ${variants[variant] || variants.neutral} ${className}`}>{children}</span>;
}
