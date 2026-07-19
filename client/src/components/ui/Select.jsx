import React from 'react';

export default function Select({ label, error, id, className = '', children, options, ...rest }) {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label 
          className="block font-label-sm text-label-sm text-on-surface-variant dark:text-zinc-400 text-[12px] mb-1 font-semibold" 
          htmlFor={id}
        >
          {label} {rest.required && <span className="text-error">*</span>}
        </label>
      )}
      <select
        id={id}
        className={`select block w-full py-2.5 px-3 bg-surface-subtle dark:bg-zinc-900 border rounded-lg font-body-md text-body-md text-on-surface dark:text-zinc-150 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all duration-200 text-[14px] cursor-pointer h-auto min-h-0 ${
          error
            ? 'border-error focus:border-error focus:ring-error/20'
            : 'border-border-base dark:border-zinc-800'
        } ${className}`}
        {...rest}
      >
        {children}
        {options && options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white dark:bg-zinc-950 text-on-surface dark:text-zinc-200">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-error mt-1 font-medium">{error}</span>}
    </div>
  );
}
