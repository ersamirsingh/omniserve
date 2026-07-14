import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { fetchCurrentUser } from './store/authSlice';
import AppRouter from './app/router/AppRouter';

export default function App() {
  const dispatch = useDispatch();

  // Real-time table session lock timer states
  const [timeLeft, setTimeLeft] = useState(null);
  const [isPublicRoute, setIsPublicRoute] = useState(false);

  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  // Handle route tracking and session lock checking
  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname;
      setIsPublicRoute(path.startsWith('/public') || path.startsWith('/qr'));
    };

    checkRoute();
    // Track page changes in client router context
    window.addEventListener('popstate', checkRoute);
    
    // Also poll path periodically in case of in-app navigation changes
    const pathTimer = setInterval(checkRoute, 1000);

    return () => {
      window.removeEventListener('popstate', checkRoute);
      clearInterval(pathTimer);
    };
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (!isPublicRoute) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const expiresAtStr = localStorage.getItem('lockExpiresAt');
      if (!expiresAtStr) {
        setTimeLeft(null);
        return;
      }

      const expiresAt = Number(expiresAtStr);
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [isPublicRoute]);

  // Clear session variables when timer expires
  const handleTimeoutClear = () => {
    localStorage.removeItem("sessionToken");
    localStorage.removeItem("guestSessionToken");
    localStorage.removeItem("tableToken");
    localStorage.removeItem("lockExpiresAt");
    setTimeLeft(null);
    window.location.href = "/";
  };

  const showTimerBanner = timeLeft !== null && timeLeft > 0;
  const isExpired = timeLeft === 0;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sticky Premium Session Countdown Banner */}
      {showTimerBanner && (
        <div className="bg-zinc-950 text-white border-b border-zinc-900 text-center py-2 text-[10px] sm:text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 relative z-50 shadow-md select-none font-sans">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
          <span>Table Session Expires In:</span>
          <span className="font-mono text-xs text-rose-450 bg-rose-950/40 border border-rose-900/30 px-2 py-0.5 rounded ml-1 font-bold">
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
          </span>
        </div>
      )}

      {/* Full-screen Session Lock Overlay */}
      {isExpired && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[9999] flex flex-col items-center justify-center p-6 text-center select-none animate-fadeIn font-sans text-white">
          <div className="max-w-sm bg-zinc-950/80 border border-zinc-900 p-8 rounded-3xl space-y-6 shadow-2xl">
            <div className="w-20 h-20 bg-rose-950/30 border border-rose-900/50 text-rose-400 rounded-full flex items-center justify-center text-4xl mx-auto shadow-lg shadow-rose-950/20">
              ⏰
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white tracking-tight">Session Expired</h2>
              <p className="text-zinc-400 text-xs leading-relaxed">
                For your security and table availability, your 5-minute table session has closed. Please scan the QR code at your table again to continue.
              </p>
            </div>
            <button
              type="button"
              onClick={handleTimeoutClear}
              className="w-full py-3.5 bg-rose-900 hover:bg-rose-850 border border-rose-800 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all cursor-pointer shadow-lg shadow-rose-900/25 active:scale-95"
            >
              Acknowledge &amp; Return
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col relative z-10">
        <AppRouter />
      </div>
    </div>
  );
}
