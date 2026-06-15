import React from "react";

export const Card = ({ children, title, subtitle, className = "", ...props }) => {
  return (
    <div
      className={`bg-surface-subtle border border-border-base rounded-xl p-6 whisper-shadow transition-all duration-200 hover:shadow-md ${className}`}
      {...props}
    >
      {(title || subtitle) && (
        <div className="mb-4 border-b border-border-base pb-3">
          {title && (
            <h3 className="text-[16px] font-bold text-on-surface font-headline-sm leading-snug">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-[12px] text-on-surface-variant mt-1 leading-normal">
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
