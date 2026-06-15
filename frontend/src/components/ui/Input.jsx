import React from "react";

export const Input = ({
  label,
  id,
  type = "text",
  placeholder = "",
  value,
  onChange,
  required = false,
  icon,
  error,
  className = "",
  ...props
}) => {
  return (
    <div className={`relative w-full ${className}`}>
      {label && (
        <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1 text-[12px]" htmlFor={id}>
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-on-surface-variant/50 text-[18px]">
              {icon}
            </span>
          </div>
        )}
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className={`block w-full py-2.5 bg-surface-subtle border rounded-lg font-body-md text-body-md text-on-surface placeholder-on-surface-variant/40 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-colors duration-200 text-[14px] ${
            icon ? "pl-9" : "pl-3"
          } ${
            error ? "border-error focus:border-error focus:ring-error/20" : "border-border-base"
          }`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-[11px] text-error font-medium">{error}</p>}
    </div>
  );
};

export default Input;
