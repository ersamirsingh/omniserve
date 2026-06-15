import { HiXMark } from 'react-icons/hi2';

const sizeClasses = { sm: 'max-w-sm', md: 'max-w-xl', lg: 'max-w-3xl' };

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className={`w-full ${sizeClasses[size]} bg-[#1a1d2e] border border-[rgba(99,102,241,0.15)] rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto animate-scale-in`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(99,102,241,0.15)]">
          <h2 className="text-lg font-bold text-slate-100">{title}</h2>
          <button className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-[#232640] hover:text-slate-100 transition-all cursor-pointer" onClick={onClose}><HiXMark size={20} /></button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">{children}</div>
      </div>
    </div>
  );
}
