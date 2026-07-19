import React from 'react';

export default function Input({ label, error, type = 'text', id, className = '', icon, rightElement, ...rest }) {
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
      <div className="relative w-full">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant/50 dark:text-zinc-500 text-[20px]">
            {typeof icon === 'string' ? (
              <span className="material-symbols-outlined text-[20px]">{icon}</span>
            ) : (
              icon
            )}
          </div>
        )}
        <input
          id={id}
          type={type}
          className={`input block w-full py-2.5 bg-surface-subtle dark:bg-zinc-900 border rounded-lg font-body-md text-body-md text-on-surface dark:text-zinc-150 placeholder-on-surface-variant/40 dark:placeholder-zinc-600 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all duration-200 text-[14px] h-auto min-h-0 ${
            icon ? 'pl-10' : 'pl-3'
          } ${
            rightElement ? 'pr-10' : 'pr-3'
          } ${
            error
              ? 'border-error focus:border-error focus:ring-error/20'
              : 'border-border-base dark:border-zinc-800'
          } ${className}`}
          {...rest}
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
      {error && <span className="text-xs text-error mt-1 font-medium">{error}</span>}
    </div>
  );
}
