import Spinner from './Spinner';

export default function Table({ columns = [], data = [], loading, emptyMessage = 'No data found' }) {
  if (loading) return <div className="flex justify-center py-12"><Spinner size="md" /></div>;

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-[rgba(99,102,241,0.15)]">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="text-left px-5 py-3.5 font-semibold text-slate-400 bg-[#232640] border-b border-[rgba(99,102,241,0.15)] whitespace-nowrap text-xs uppercase tracking-wider">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} className="text-center py-12 text-slate-500">{emptyMessage}</td></tr>
          ) : (
            data.map((row, i) => (
              <tr key={row._id || i} className="transition-colors hover:bg-indigo-500/5 border-b border-indigo-500/5 last:border-b-0">
                {columns.map((col) => (
                  <td key={col.key} className="px-5 py-3.5 text-slate-100 align-middle">
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
