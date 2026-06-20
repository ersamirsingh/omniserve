import React from 'react';
import { HiXMark } from 'react-icons/hi2';

const sizeClasses = { sm: 'max-w-sm', md: 'max-w-xl', lg: 'max-w-3xl' };

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className={`w-full ${sizeClasses[size]} bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-800 rounded-xl shadow-2xl max-h-[85vh] overflow-y-auto animate-scale-in`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-base dark:border-zinc-850">
          <h2 className="text-[16px] font-bold text-on-surface dark:text-zinc-100 font-hanken">{title}</h2>
          <button className="flex items-center justify-center w-8 h-8 rounded-lg text-on-surface-variant dark:text-zinc-500 hover:bg-surface-container-low dark:hover:bg-zinc-900 hover:text-on-surface dark:hover:text-zinc-200 transition-all cursor-pointer" onClick={onClose}><HiXMark size={20} /></button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4 text-on-surface dark:text-zinc-200">{children}</div>
      </div>
    </div>
  );
}
