import React from 'react';
import Spinner from './Spinner';

export default function Table({ columns = [], data = [], loading, emptyMessage = 'No data found', getRowClassName }) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-border-base dark:border-zinc-800 bg-white dark:bg-zinc-950 transition-colors duration-200">
      <table className="table w-full text-sm border-collapse">
        <thead>
          <tr>
            {columns.map((col) => (
              <th 
                key={col.key} 
                className="text-left px-5 py-3.5 font-semibold text-on-surface-variant dark:text-zinc-400 bg-surface-subtle dark:bg-zinc-900/60 border-b border-border-base dark:border-zinc-850 whitespace-nowrap text-[11px] uppercase tracking-wider font-label-md static"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-base dark:divide-zinc-850">
          {data.length === 0 ? (
            <tr>
              <td 
                colSpan={columns.length} 
                className="text-center py-12 text-on-surface-variant dark:text-zinc-500 font-medium"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr 
                key={row.id || row._id || i} 
                className={`transition-colors hover:bg-surface-container-low dark:hover:bg-zinc-900/40 text-on-surface dark:text-zinc-200 ${getRowClassName ? getRowClassName(row) : ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-5 py-3.5 align-middle text-[13px] font-sans">
                    {col.render ? col.render(row) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
