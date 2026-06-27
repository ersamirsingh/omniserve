import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { resolveQrCodeApi } from '../../api/models/public.api';
import Spinner from '../../components/ui/Spinner';
import { HiOutlineExclamationTriangle } from 'react-icons/hi2';

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
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100 text-center space-y-4">
        <HiOutlineExclamationTriangle className="text-5xl text-rose-500 animate-bounce" />
        <h1 className="text-xl font-bold">QR Code Scan Failed</h1>
        <p className="text-zinc-400 max-w-sm text-sm leading-relaxed">{error}</p>
        <button
          onClick={() => navigate('/login')}
          className="px-5 py-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 rounded-xl text-xs font-semibold tracking-wide transition cursor-pointer"
        >
          Return to Admin Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-100 space-y-3">
      <Spinner size="lg" className="text-primary" />
      <h1 className="text-[14px] font-bold tracking-wide uppercase text-zinc-400">Seating Guest & Loading Menu...</h1>
    </div>
  );
}
