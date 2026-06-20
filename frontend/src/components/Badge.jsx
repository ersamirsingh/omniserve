const variants = {
  success: 'bg-emerald-500/12 text-emerald-400',
  warning: 'bg-amber-500/12 text-amber-400',
  danger: 'bg-red-500/12 text-red-400',
  info: 'bg-blue-500/12 text-blue-400',
  neutral: 'bg-slate-500/12 text-slate-400',
};

export default function Badge({ variant = 'neutral', children, className = '' }) {
  return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap tracking-wide ${variants[variant] || variants.neutral} ${className}`}>{children}</span>;
}
