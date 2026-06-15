const iconColors = {
  indigo: 'bg-indigo-500/15 text-indigo-400',
  emerald: 'bg-emerald-500/15 text-emerald-400',
  amber: 'bg-amber-500/12 text-amber-400',
  rose: 'bg-red-500/12 text-red-400',
  blue: 'bg-blue-500/12 text-blue-400',
};

export default function StatCard({ title, value, icon, trend, trendUp, color = 'indigo' }) {
  return (
    <div className="bg-[rgba(26,29,46,0.65)] backdrop-blur-2xl border border-[rgba(99,102,241,0.15)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.35)] p-6 flex flex-col gap-2 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 ${iconColors[color] || iconColors.indigo}`}>{icon}</div>
        {trend && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${trendUp ? 'text-emerald-400 bg-emerald-500/12' : 'text-red-400 bg-red-500/12'}`}>{trend}</span>}
      </div>
      <h3 className="text-2xl font-extrabold text-slate-100 leading-tight">{value}</h3>
      <p className="text-sm text-slate-500 font-medium">{title}</p>
    </div>
  );
}
