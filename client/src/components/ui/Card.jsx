import React from 'react';

export default function Card({ children, className = '', onClick }) {
  return (
    <div 
      className={`card bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl shadow-sm p-6 transition-all duration-200 animate-fade-in text-on-surface dark:text-zinc-200 ${className}`} 
      onClick={onClick}
    >
      {children}
    </div>
  );
}
