import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { resolveQrCodeApi } from '../../api/models/public.api';
import Spinner from '../../components/ui/Spinner';
import { HiOutlineExclamationTriangle, HiOutlineUsers, HiOutlineSparkles } from 'react-icons/hi2';

export default function QRRedirectPage() {
  const { tableToken } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [promptData, setPromptData] = useState(null);

  const handleResolve = (action = null) => {
    setLoading(true);
    resolveQrCodeApi(tableToken, action ? { action } : {})
      .then((res) => {
        const data = res.data.data;
        
        if (data.promptRequired) {
          setPromptData(data);
          setLoading(false);
          return;
        }

        const { outletSlug, sessionToken, outletId, guestSessionToken } = data;
        
        // Save tokens
        localStorage.setItem('sessionToken', sessionToken);
        localStorage.setItem('selectedOutletId', outletId);
        localStorage.setItem('guestSessionToken', guestSessionToken);
        localStorage.setItem('tableToken', tableToken);
        
        // Redirect to the public website menu
        navigate(`/public/w/${outletSlug}/menu`);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to resolve QR Code scan');
        setLoading(false);
      });
  };

  useEffect(() => {
    if (tableToken) {
      handleResolve();
    }
  }, [tableToken]);

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-zinc-950 text-center space-y-4 guest-ordering">
        <HiOutlineExclamationTriangle className="text-5xl text-rose-500 animate-bounce" />
        <h1 className="text-xl font-black tracking-tight">QR Code Scan Failed</h1>
        <p className="text-zinc-500 max-w-sm text-xs leading-relaxed">{error}</p>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-3 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold tracking-wide transition cursor-pointer"
        >
          Return to Admin Login
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-zinc-950 space-y-3 guest-ordering">
        <Spinner size="lg" className="text-[#6311f4]" />
        <h1 className="text-xs font-bold tracking-wider uppercase text-zinc-400">Loading Menu & Session...</h1>
      </div>
    );
  }

  // Active Session join prompt overlay
  if (promptData) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-5 guest-ordering">
        <div className="bg-white border border-zinc-100 rounded-3xl p-6 w-full max-w-md shadow-xl shadow-zinc-200/50 space-y-6 text-center">
          <div className="w-16 h-16 bg-[#6311f4]/5 border border-[#6311f4]/10 rounded-2xl flex items-center justify-center mx-auto text-[#6311f4] text-3xl">
            <HiOutlineUsers className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-black text-zinc-950 tracking-tight">Active Table Session</h1>
            <p className="text-zinc-500 text-xs leading-relaxed">
              There is an active ordering session on <strong>Table {promptData.tableNumber}</strong> with {promptData.activeGuestsCount} {promptData.activeGuestsCount === 1 ? 'diner' : 'diners'}:
            </p>
          </div>

          <div className="bg-zinc-50 rounded-xl p-3.5 border border-zinc-100/60 max-h-24 overflow-y-auto">
            <p className="text-zinc-700 font-bold text-xs">
              {promptData.activeGuestsNames.join(', ')}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleResolve('join')}
              className="w-full bg-[#6311f4] hover:bg-[#520dd4] text-white font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-lg shadow-[#6311f4]/15 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <HiOutlineUsers className="w-4 h-4" />
              <span>Join Existing Group</span>
            </button>
            <button
              onClick={() => handleResolve('new')}
              className="w-full bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <HiOutlineSparkles className="w-4 h-4 text-[#6311f4]" />
              <span>Start New Group</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
