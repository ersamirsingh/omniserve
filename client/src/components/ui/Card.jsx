export default function Card({ children, className = '', onClick }) {
  return <div className={`bg-[rgba(26,29,46,0.65)] backdrop-blur-2xl border border-[rgba(99,102,241,0.15)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.35)] p-6 animate-fade-in ${className}`} onClick={onClick}>{children}</div>;
}
