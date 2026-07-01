import { useState, useCallback, createContext, useContext } from 'react';
import { HiCheckCircle, HiXCircle, HiInformationCircle } from 'react-icons/hi2';

const ToastContext = createContext();
export function useToast() { return useContext(ToastContext); }

const icons = {
  success: <HiCheckCircle className="text-xl shrink-0" />,
  error: <HiXCircle className="text-xl shrink-0" />,
  info: <HiInformationCircle className="text-xl shrink-0" />,
};

const toastStyles = {
  success: 'bg-emerald-500/12 border-emerald-500/30 text-emerald-400',
  error: 'bg-red-500/12 border-red-500/30 text-red-400',
  info: 'bg-blue-500/12 border-blue-500/30 text-blue-400',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="toast toast-top toast-end fixed top-6 right-6 z-[2000] flex flex-col gap-2 max-w-sm p-0">
        {toasts.map((t) => (
          <div 
            key={t.id} 
            className={`alert flex items-center gap-2 px-4 py-3.5 rounded-lg text-sm font-medium shadow-2xl border cursor-pointer animate-slide-in-right ${toastStyles[t.type] || toastStyles.info}`} 
            onClick={() => removeToast(t.id)}
          >
            {icons[t.type]}
            <span className="flex-1">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
