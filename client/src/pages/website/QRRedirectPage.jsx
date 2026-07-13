import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { resolveQrCodeApi } from '../../api/models/public.api';
import Spinner from '../../components/ui/Spinner';
import { HiOutlineExclamationTriangle, HiOutlineQrCode } from 'react-icons/hi2';

export default function QRRedirectPage() {
  const { tableToken } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tableToken) return;

    resolveQrCodeApi(tableToken)
      .then((res) => {
        const { outletSlug, sessionToken, outletId } = res.data.data;

        // Save QR Session Token & Outlet ID in localStorage
        localStorage.setItem('sessionToken', sessionToken);
        localStorage.setItem('selectedOutletId', outletId);

        // Redirect to the public website menu
        navigate(`/public/w/${outletSlug}/menu`);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to resolve QR Code scan');
      });
  }, [tableToken, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-background bg-pattern flex flex-col items-center justify-center p-6 text-on-background text-center space-y-4 font-sans">
        <div className="w-16 h-16 rounded-2xl bg-error-container text-on-error-container flex items-center justify-center">
          <HiOutlineExclamationTriangle className="text-3xl" />
        </div>
        <h1 className="text-xl font-semibold font-hanken">QR Code Scan Failed</h1>
        <p className="text-on-surface-variant max-w-sm text-sm leading-relaxed">{error}</p>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="px-5 py-2.5 bg-surface-container border border-border-base hover:bg-surface-container-high rounded-xl text-xs font-semibold tracking-wide text-on-surface transition-colors cursor-pointer"
        >
          Return to Admin Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-pattern flex flex-col items-center justify-center text-on-background gap-4 font-sans">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[color-mix(in_srgb,var(--color-brand-accent)_100%,transparent)] opacity-20" />
        <div className="relative w-16 h-16 rounded-2xl bg-[color-mix(in_srgb,var(--color-brand-accent)_10%,transparent)] border border-[color-mix(in_srgb,var(--color-brand-accent)_25%,transparent)] flex items-center justify-center">
          <HiOutlineQrCode className="text-2xl text-[color-mix(in_srgb,var(--color-brand-accent)_100%,transparent)]" />
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <Spinner size="sm" />
        <h1 className="text-sm font-semibold tracking-wide text-on-surface-variant font-sans">
          Setting your table, loading the menu...
        </h1>
      </div>
    </div>
  );
}