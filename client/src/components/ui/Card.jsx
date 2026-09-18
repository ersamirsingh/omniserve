import React from 'react';

export default function Card({ children, className = '', onClick }) {
  return (
    <div 
      className={`card bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl shadow-sm p-6 transition-all duration-200 animate-fade-in text-on-surface dark:text-zinc-200 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-border-base/80 dark:hover:border-zinc-700 active:scale-[0.995]' : ''
      } ${className}`} 
      onClick={onClick}
    >
      {children}
    </div>
  );
}
