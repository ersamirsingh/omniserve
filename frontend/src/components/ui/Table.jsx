import React from "react";

export const Table = ({ headers = [], children, className = "" }) => {
  return (
    <div className={`overflow-x-auto w-full border border-border-base rounded-xl whisper-shadow bg-surface-subtle ${className}`}>
      <table className="min-w-full divide-y divide-border-base text-left text-[13px]">
        <thead className="bg-surface-container-low/40">
          <tr>
            {headers.map((header, idx) => (
              <th
                key={idx}
                scope="col"
                className="px-6 py-3.5 text-label-md font-semibold text-on-surface-variant uppercase tracking-wider text-[11px]"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-base bg-surface-subtle">
          {children}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
