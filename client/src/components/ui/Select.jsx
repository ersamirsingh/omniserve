export default function Select({ label, error, id, className = '', children, ...rest }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-slate-400" htmlFor={id}>{label}</label>}
      <select
        id={id}
        className={`w-full px-4 py-2.5 bg-[#232640] border rounded-lg text-slate-100 text-sm outline-none transition-all duration-150 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] ${error ? 'border-red-500 focus:border-red-500' : 'border-[rgba(99,102,241,0.15)] focus:border-indigo-500'} ${className}`}
        {...rest}
      >
        {children}
      </select>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
