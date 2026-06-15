import React from "react";

export const Button = ({
  children,
  type = "button",
  variant = "primary",
  onClick,
  disabled = false,
  loading = false,
  className = "",
  ...props
}) => {
  const baseClasses =
    "flex items-center justify-center font-semibold rounded-lg shadow-sm focus:outline-none transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";
  
  const sizeClasses = "px-4 py-2.5 text-label-md text-[13px]";

  const variants = {
    primary: "bg-primary-container text-on-primary hover:bg-primary-container/90 focus:ring-2 focus:ring-primary/20",
    secondary: "bg-surface-subtle border border-border-base text-on-surface hover:bg-surface-container-low focus:ring-2 focus:ring-border-base",
    danger: "bg-error text-white hover:bg-error/90 focus:ring-2 focus:ring-error/20",
    success: "bg-success-green text-white hover:bg-success-green/90 focus:ring-2 focus:ring-success-green/20",
  };

  const selectedVariant = variants[variant] || variants.primary;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeClasses} ${selectedVariant} ${className}`}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : null}
      {children}
    </button>
  );
};

export default Button;
