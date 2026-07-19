import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { resolveQrCodeApi } from '../../api/models/public.api';
import Spinner from '../../components/ui/Spinner';
import { HiOutlineExclamationTriangle, HiOutlineQrCode } from 'react-icons/hi2';

export default function QRRedirectPage() {
  const { tableToken } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loadingText, setLoadingText] = useState('Initializing table session...');

  // Cycle through warm loading messages to provide dynamic details
  useEffect(() => {
    const messages = [
      'Connecting to table terminal...',
      'Securing your dining session...',
      'Synchronizing kitchen pipelines...',
      'Loading the fresh digital menu...'
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % messages.length;
      setLoadingText(messages[idx]);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!tableToken) return;

    resolveQrCodeApi(tableToken)
      .then((res) => {
        const { outletSlug, sessionToken, outletId, guestSessionToken } = res.data.data;

        // Save QR Session Token & Outlet ID in localStorage
        localStorage.setItem('sessionToken', sessionToken);
        if (guestSessionToken) {
          localStorage.setItem('guestSessionToken', guestSessionToken);
        }
        localStorage.setItem('selectedOutletId', outletId);

        // Redirect to the public website menu
        navigate(`/public/w/${outletSlug}/menu`);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to establish connection to this table. Please request assistance from your waiter or scan the code again.');
      });
  }, [tableToken, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-background bg-pattern flex items-center justify-center p-6 text-on-background relative overflow-hidden font-sans">
        {/* Ambient warning glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)] blur-[120px] pointer-events-none" />

        <div className="relative w-full max-w-md bg-surface-container/60 border border-border-base/50 backdrop-blur-lg shadow-[0_24px_60px_-15px_rgba(0,0,0,0.12)] rounded-3xl p-8 text-center space-y-6 animate-scale-in">
          {/* Glowing error icon */}
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-error/15 border border-error/30 animate-pulse" />
            <div className="relative w-16 h-16 rounded-full bg-error/10 flex items-center justify-center text-error">
              <HiOutlineExclamationTriangle className="text-3xl" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold font-hanken tracking-tight">Table Session Error</h1>
            <p className="text-on-surface-variant text-sm leading-relaxed max-w-sm mx-auto">
              {error}
            </p>
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-3 bg-[color-mix(in_srgb,var(--color-brand-accent)_100%,transparent)] hover:brightness-110 text-white rounded-2xl text-sm font-semibold tracking-wide shadow-md transition-all active:scale-[0.98] cursor-pointer border-none"
            >
              Retry Connection
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="px-5 py-3 bg-surface-container-low border border-border-base hover:bg-surface-container-high rounded-2xl text-xs font-semibold tracking-wide text-on-surface transition-all active:scale-[0.98] cursor-pointer"
            >
              Return to Staff Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-pattern flex items-center justify-center text-on-background p-6 relative overflow-hidden font-sans">
      {/* Background soft glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-[color-mix(in_srgb,var(--color-brand-accent)_8%,transparent)] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-[color-mix(in_srgb,var(--color-secondary)_8%,transparent)] blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-sm bg-surface-container/40 border border-border-base/30 backdrop-blur-lg shadow-[0_24px_60px_-15px_rgba(0,0,0,0.08)] rounded-3xl p-8 text-center space-y-8 animate-scale-in">
        {/* Animated glowing QR loader */}
        <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-3xl bg-[color-mix(in_srgb,var(--color-brand-accent)_100%,transparent)] opacity-10" />
          <span className="absolute inset-0 rounded-3xl bg-[color-mix(in_srgb,var(--color-brand-accent)_100%,transparent)] opacity-5 border border-[color-mix(in_srgb,var(--color-brand-accent)_40%,transparent)]" />
          
          <div className="relative w-20 h-20 rounded-2xl bg-surface-container-high border border-border-base shadow-sm flex items-center justify-center animate-pulse">
            <HiOutlineQrCode className="text-4xl text-[color-mix(in_srgb,var(--color-brand-accent)_100%,transparent)]" />
          </div>
        </div>

        {/* Loading details */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Spinner size="md" />
            <h2 className="text-xs font-bold tracking-widest text-on-surface-variant/80 uppercase font-sans">
              OmniServe Dining
            </h2>
          </div>
          <p className="text-lg font-semibold text-on-surface leading-snug animate-fade-in font-hanken min-h-[1.75rem]">
            {loadingText}
          </p>
          <p className="text-xs text-on-surface-variant">
            Establishing your secure table catalog link.
          </p>
        </div>
      </div>
    </div>
  );
}