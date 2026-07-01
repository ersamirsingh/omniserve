import React from 'react';

const sizes = {
  sm: 'loading-sm',
  md: 'loading-md',
  lg: 'loading-lg',
};

export default function Spinner({ size = 'md' }) {
  return <div className={`loading loading-spinner text-indigo-500 ${sizes[size] || sizes.md}`} />;
}
