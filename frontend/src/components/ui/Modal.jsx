import React, { useEffect } from "react";

export const Modal = ({ isOpen, onClose, title, children, className = "" }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal Box */}
      <div className={`relative bg-surface rounded-xl whisper-shadow border border-border-base w-full max-w-[500px] overflow-hidden transform transition-all duration-300 z-10 p-6 ${className}`}>
        <div className="flex justify-between items-center mb-4 border-b border-border-base pb-3">
          {title && (
            <h3 className="text-[16px] font-bold text-on-surface font-headline-sm">
              {title}
            </h3>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-full text-on-surface-variant/75 hover:bg-surface-container-high hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto pr-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
