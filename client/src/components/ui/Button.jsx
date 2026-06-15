const variants = {
  primary: 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5',
  secondary: 'bg-[#232640] text-slate-100 border border-[rgba(99,102,241,0.15)] hover:border-indigo-500 hover:bg-[#2a2d45]',
  danger: 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:-translate-y-0.5',
  ghost: 'bg-transparent text-slate-400 hover:text-slate-100 hover:bg-[#232640]',
};

const sizes = {
  sm: 'px-3.5 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-sm',
};

export default function Button({ children, variant = 'primary', size = 'md', loading, disabled, onClick, type = 'button', className = '' }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-lg cursor-pointer transition-all duration-150 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-custom" />}
      {children}
    </button>
  );
}
