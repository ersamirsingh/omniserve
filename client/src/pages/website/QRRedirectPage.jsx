import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { resolveQrCodeApi, updateGuestSessionApi, mergeTablesApi } from '../../api/models/public.api';
import Spinner from '../../components/ui/Spinner';
import Input from '../../components/ui/Input';
import { HiOutlineExclamationTriangle, HiOutlineUsers, HiOutlineSparkles, HiOutlineQrCode } from 'react-icons/hi2';

export default function QRRedirectPage() {
  const { tableToken } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [geofenceError, setGeofenceError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Profile Prompt Overlay states
  const [showWelcome, setShowWelcome] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [updatingGuest, setUpdatingGuest] = useState(false);
  const [resolvedPayload, setResolvedPayload] = useState(null);
  const [promptData, setPromptData] = useState(null);
  const [pinCode, setPinCode] = useState("");
  const [joinCodeError, setJoinCodeError] = useState(null);
  const [isJoinAction, setIsJoinAction] = useState(false);
  const [guestCount, setGuestCount] = useState(1);
  const [mergeData, setMergeData] = useState(null); // capacity exceeded merge suggestion
  const [mergingTables, setMergingTables] = useState(false);

  // Background Slider index state
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80", // Pizza
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80", // Burger
    "https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=1200&q=80", // Pasta
    "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80", // Sushi
    "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=1200&q=80"  // Dessert
  ];

  // Auto-sliding interval for food image carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handleResolve = (action = null, forceBypass = false, code = null) => {
    localStorage.removeItem('lockExpiresAt');
    setLoading(true);
    setError(null);
    setGeofenceError(null);
    setJoinCodeError(null);

    const callApi = (latitude = undefined, longitude = undefined, bypass = false) => {
      const params = {
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
        ...(bypass && { bypassGeofence: true }),
        ...(action && { action }),
        ...(code && { code }),
        guestCount
      };

      resolveQrCodeApi(tableToken, params)
        .then((res) => {
          const data = res.data.data;

          if (data.capacityExceeded) {
            setMergeData(data);
            setLoading(false);
            return;
          }

          if (data.promptRequired) {
            setPromptData(data);
            setLoading(false);
            return;
          }

          // Clear prompt state
          setPromptData(null);

          // Track if this was a PIN join action (for redirect to session status)
          const wasJoinAction = action === 'join';
          if (wasJoinAction) setIsJoinAction(true);

          const { outletSlug, sessionToken, outletId, guestSessionToken, guestSession, lockRemainingSeconds, joinCode } = data;
          
          // Save tokens
          localStorage.setItem('sessionToken', sessionToken);
          localStorage.setItem('selectedOutletId', outletId);
          localStorage.setItem('guestSessionToken', guestSessionToken);
          localStorage.setItem('tableToken', tableToken);
          if (joinCode) {
            localStorage.setItem('joinCode', joinCode);
          }
          if (lockRemainingSeconds) {
            localStorage.setItem('lockExpiresAt', String(Date.now() + lockRemainingSeconds * 1000));
          }
          
          // Check if name is default "Guest" to ask for details first
          if (!guestSession || guestSession.name === "Guest") {
            setResolvedPayload(data);
            setShowWelcome(true);
            setLoading(false);
          } else {
            // Profile already setup — if rejoining via PIN, show session status; otherwise go to menu
            if (wasJoinAction) {
              navigate(`/public/w/${outletSlug}/session-status`);
            } else {
              navigate(`/public/w/${outletSlug}/menu`);
            }
          }
        })
        .catch((err) => {
          const errorMsg = err.response?.data?.message || 'Failed to resolve QR Code scan';
          const isGeofenceError = errorMsg.includes("distance") || 
                                  errorMsg.includes("restricted") || 
                                  errorMsg.includes("coordinates") || 
                                  errorMsg.includes("Location");

          if (action === "join" && errorMsg.includes("PIN")) {
            setJoinCodeError(errorMsg);
          } else if (isGeofenceError) {
            setGeofenceError(errorMsg);
          } else {
            setError(errorMsg);
          }
          setLoading(false);
        });
    };

    if (forceBypass) {
      callApi(undefined, undefined, true);
      return;
    }

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser. Please contact staff.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        callApi(latitude, longitude, false);
      },
      (error) => {
        let msg = "Please allow location access to order from this table.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Location permission was denied. Location verification is required to scan the table QR.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = "Your location is currently unavailable. Please ensure GPS is active.";
        } else if (error.code === error.TIMEOUT) {
          msg = "Acquiring location timed out. Please try again.";
        }
        setGeofenceError(msg);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleWelcomeSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!guestName.trim()) return;

    setUpdatingGuest(true);
    try {
      await updateGuestSessionApi({
        name: guestName.trim(),
        phone: guestPhone.trim() || undefined
      });
      localStorage.setItem("guestName", guestName.trim());
      if (guestPhone.trim()) {
        localStorage.setItem("guestPhone", guestPhone.trim());
      }
      setShowWelcome(false);
      const dest = isJoinAction ? 'session-status' : 'menu';
      navigate(`/public/w/${resolvedPayload.outletSlug}/${dest}`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save your details");
    } finally {
      setUpdatingGuest(false);
    }
  };

  const handleWelcomeSkip = async () => {
    setUpdatingGuest(true);
    try {
      await updateGuestSessionApi({
        name: "Guest",
        phone: "Unknown"
      });
      setShowWelcome(false);
      const dest = isJoinAction ? 'session-status' : 'menu';
      navigate(`/public/w/${resolvedPayload.outletSlug}/${dest}`);
    } catch (err) {
      setShowWelcome(false);
      const dest = isJoinAction ? 'session-status' : 'menu';
      navigate(`/public/w/${resolvedPayload.outletSlug}/${dest}`);
    } finally {
      setUpdatingGuest(false);
    }
  };

  useEffect(() => {
    if (tableToken) {
      localStorage.removeItem('lockExpiresAt');
      handleResolve();
    }
  }, [tableToken]);

  const renderBackgroundMedia = () => {
    return (
      <div className="absolute inset-0 w-full h-full overflow-hidden select-none z-0">
        {/* Auto-sliding image slideshow backdrop */}
        {slides.map((src, index) => (
          <div
            key={index}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms] ease-in-out ${
              index === currentSlide ? 'opacity-35' : 'opacity-0'
            }`}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}

        {/* Premium ambient video loop playing silently */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-overlay"
        >
          <source
            src="https://assets.mixkit.co/videos/preview/mixkit-cooking-in-a-modern-kitchen-40502-large.mp4"
            type="video/mp4"
          />
        </video>

        {/* Modern dark gradient mask overlays */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c051e]/85 via-black/90 to-[#6311f4]/20" />
      </div>
    );
  };

  if (geofenceError) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-white text-center space-y-5 font-sans relative">
        {renderBackgroundMedia()}
        <div className="relative z-10 max-w-sm flex flex-col items-center space-y-4 bg-zinc-950/70 backdrop-blur-md p-8 border border-zinc-900 rounded-3xl shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-950/40 text-indigo-400 border border-indigo-900/50 flex items-center justify-center shadow-lg">
            <HiOutlineExclamationTriangle className="text-3xl" />
          </div>
          <h1 className="text-lg font-black tracking-tight">Geofencing Alert</h1>
          <p className="text-zinc-400 text-xs leading-relaxed">{geofenceError}</p>
          <div className="w-full space-y-2">
            <button
              type="button"
              onClick={() => handleResolve(null, true)}
              className="w-full py-3 bg-[#6311f4] hover:bg-[#520fd2] rounded-xl text-xs font-bold text-white shadow-lg transition-all cursor-pointer"
            >
              🔓 Bypass Geofence (Demo Mode)
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
            >
              Return to Admin Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-white text-center space-y-5 font-sans relative">
        {renderBackgroundMedia()}
        <div className="relative z-10 max-w-sm flex flex-col items-center space-y-4 bg-zinc-950/70 backdrop-blur-md p-8 border border-zinc-900 rounded-3xl shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-950/40 text-red-400 border border-red-900/50 flex items-center justify-center shadow-lg">
            <HiOutlineExclamationTriangle className="text-3xl" />
          </div>
          <h1 className="text-lg font-black tracking-tight">QR Code Scan Failed</h1>
          <p className="text-zinc-400 text-xs leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full py-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
          >
            Return to Admin Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-zinc-950 flex items-center justify-center font-sans text-white relative">
        {renderBackgroundMedia()}
        <div className="relative z-10 flex flex-col items-center gap-5 text-center px-6">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6311f4]/30 opacity-40" />
            <div className="relative w-18 h-18 rounded-3xl bg-[#6311f4]/20 border border-[#6311f4]/40 flex items-center justify-center shadow-lg shadow-[#6311f4]/20">
              <HiOutlineQrCode className="text-3xl text-[#6311f4]" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-extrabold tracking-tight">OmniServe Table Order</h2>
            <div className="flex items-center justify-center gap-2.5 text-zinc-400 text-xs">
              <Spinner size="sm" />
              <span>Acquiring GPS location & setting your table...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Welcome / Profile Setup Form Screen
  if (showWelcome && resolvedPayload) {
    return (
      <div className="min-h-screen w-full bg-zinc-950 flex flex-col lg:grid lg:grid-cols-12 overflow-hidden font-sans text-white relative">
        {/* Left column info area */}
        <div className="hidden lg:block lg:col-span-7 relative h-full overflow-hidden">
          {renderBackgroundMedia()}
          <div className="absolute inset-0 flex flex-col justify-between p-16 z-10">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-r from-[#6311f4] to-[#8b5cf6] flex items-center justify-center text-white font-black text-sm shadow-md">OS</span>
              <span className="font-extrabold tracking-tight text-sm uppercase tracking-wider text-white">OmniServe</span>
            </div>
            <div className="space-y-4 max-w-md">
              <span className="bg-white/10 backdrop-blur-md border border-white/10 px-3.5 py-1.5 rounded-full text-zinc-300 text-[10px] font-bold uppercase tracking-wider block w-fit">
                🍕 Table ordering made easy
              </span>
              <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
                Scan, Order, and Savor.
              </h1>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Skip the wait. Browse the digital menu, customize your dishes, send orders directly to the kitchen, and split the bill with your companions right from your phone.
              </p>
            </div>
            <div className="text-[10px] text-zinc-550 font-medium">
              © {new Date().getFullYear()} OmniServe Inc. All rights reserved.
            </div>
          </div>
        </div>

        {/* Right side form card */}
        <div className="flex-1 lg:col-span-5 flex items-center justify-center p-6 relative z-10">
          {/* Mobile ambient background */}
          <div className="block lg:hidden absolute inset-0 z-0">
            {renderBackgroundMedia()}
          </div>

          <div className="bg-white/95 dark:bg-zinc-950/85 backdrop-blur-xl border border-white/20 dark:border-zinc-900/50 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative z-10 space-y-6 text-zinc-900 dark:text-zinc-100">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 bg-gradient-to-tr from-[#6311f4] to-[#8b5cf6] rounded-2xl flex items-center justify-center mx-auto text-white text-xl font-black shadow-lg shadow-[#6311f4]/30">
                OS
              </div>
              <div className="space-y-1">
                <h2 className="font-black text-2xl text-zinc-950 dark:text-white tracking-tight">Welcome to {resolvedPayload.outletName}</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-tight">{resolvedPayload.outletAddress || 'Table Self-Ordering'}</p>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-[#6311f4]/10 dark:bg-[#6311f4]/20 border border-[#6311f4]/15 px-3.5 py-1.5 rounded-full text-[#6311f4] dark:text-purple-300 text-[10px] font-black uppercase tracking-wider">
                Table {resolvedPayload.tableNumber || 'N/A'} • {resolvedPayload.diningAreaName || 'Dine-In'}
              </div>
            </div>

            {resolvedPayload.joinCode && (
              <div className="bg-[#6311f4]/15 dark:bg-[#6311f4]/25 border border-[#6311f4]/30 px-4 py-2.5 rounded-2xl flex flex-col items-center justify-center gap-0.5 mt-2 text-center">
                <span className="text-[9px] uppercase tracking-widest font-black text-zinc-400">Table Session PIN</span>
                <span className="font-mono text-lg font-black tracking-widest text-[#6311f4] dark:text-purple-300">{resolvedPayload.joinCode}</span>
                <span className="text-[9px] text-zinc-400 mt-0.5">Share this PIN with others joining your table</span>
              </div>
            )}

            <form onSubmit={handleWelcomeSubmit} className="space-y-4">
              {/* Guest Count Stepper */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">Number of Guests</label>
                <div className="flex items-center gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                    className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-lg flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >−</button>
                  <span className="text-2xl font-black text-zinc-900 dark:text-white w-10 text-center tabular-nums">{guestCount}</span>
                  <button
                    type="button"
                    onClick={() => setGuestCount(Math.min(20, guestCount + 1))}
                    className="w-10 h-10 rounded-xl bg-[#6311f4] text-white font-bold text-lg flex items-center justify-center hover:bg-[#520dd4] transition-colors cursor-pointer border-none"
                  >+</button>
                </div>
                {resolvedPayload.seatCount && (
                  <p className="text-[10px] text-zinc-400 text-center">
                    Table {resolvedPayload.tableNumber} has {resolvedPayload.seatCount} seats
                  </p>
                )}
              </div>

              <Input
                label="Your Name"
                placeholder="Enter your name (e.g. John)"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
                icon="person"
                className="!bg-white dark:!bg-zinc-900 !text-zinc-900 dark:!text-white !border-zinc-200 dark:!border-zinc-800 !placeholder-zinc-400 text-xs focus:!border-[#6311f4] rounded-xl py-3"
              />

              <Input
                label="Phone Number (Optional)"
                placeholder="Enter phone number"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                icon="phone"
                type="tel"
                className="!bg-white dark:!bg-zinc-900 !text-zinc-900 dark:!text-white !border-zinc-200 dark:!border-zinc-800 !placeholder-zinc-400 text-xs focus:!border-[#6311f4] rounded-xl py-3"
              />

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={handleWelcomeSkip}
                  disabled={updatingGuest}
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-850 text-zinc-600 dark:text-zinc-300 font-extrabold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all cursor-pointer border-none"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  disabled={updatingGuest || !guestName.trim()}
                  className="flex-1 bg-[#6311f4] hover:bg-[#520dd4] text-white font-black text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-lg shadow-[#6311f4]/15 active:scale-95 transition-all cursor-pointer disabled:opacity-50 border-none"
                >
                  {updatingGuest ? 'Joining...' : 'Start Ordering'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Active Session join prompt overlay
  if (promptData) {
    return (
      <div className="min-h-screen w-full bg-zinc-950 flex flex-col lg:grid lg:grid-cols-12 overflow-hidden font-sans text-white relative">
        {/* Left column info area */}
        <div className="hidden lg:block lg:col-span-7 relative h-full overflow-hidden">
          {renderBackgroundMedia()}
          <div className="absolute inset-0 flex flex-col justify-between p-16 z-10">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-r from-[#6311f4] to-[#8b5cf6] flex items-center justify-center text-white font-black text-sm shadow-md">OS</span>
              <span className="font-extrabold tracking-tight text-sm uppercase tracking-wider text-white">OmniServe</span>
            </div>
            <div className="space-y-4 max-w-md">
              <span className="bg-white/10 backdrop-blur-md border border-white/10 px-3.5 py-1.5 rounded-full text-zinc-300 text-[10px] font-bold uppercase tracking-wider block w-fit">
                👥 Group ordering active
              </span>
              <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
                Order Together, Share the Fun.
              </h1>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Join your friends at the table. Add items to a shared cart in real-time, see what others are ordering, and enjoy dining without payment hassle.
              </p>
            </div>
            <div className="text-[10px] text-zinc-550 font-medium">
              © {new Date().getFullYear()} OmniServe Inc. All rights reserved.
            </div>
          </div>
        </div>

        {/* Right side form card */}
        <div className="flex-1 lg:col-span-5 flex items-center justify-center p-6 relative z-10">
          {/* Mobile ambient background */}
          <div className="block lg:hidden absolute inset-0 z-0">
            {renderBackgroundMedia()}
          </div>

          <div className="bg-white/95 dark:bg-zinc-950/85 backdrop-blur-xl border border-white/20 dark:border-zinc-900/50 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative z-10 space-y-6 text-center text-zinc-900 dark:text-zinc-100">
            <div className="w-16 h-16 bg-[#6311f4]/10 dark:bg-[#6311f4]/20 border border-[#6311f4]/15 rounded-2xl flex items-center justify-center mx-auto text-[#6311f4] dark:text-purple-300 text-3xl">
              <HiOutlineUsers className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">Active Table Session</h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">
                There is an active ordering session on <strong>Table {promptData.tableNumber}</strong> with {promptData.activeGuestsCount} {promptData.activeGuestsCount === 1 ? 'diner' : 'diners'}:
              </p>
              {promptData.seatCount && (
                <div className="inline-flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-1 rounded-full text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
                  🪑 {promptData.availableSeats ?? '?'} of {promptData.seatCount} seats available
                </div>
              )}
            </div>

            <div className="bg-zinc-100/60 dark:bg-zinc-900/40 rounded-2xl p-4 border border-zinc-200/30 dark:border-zinc-800/30 max-h-24 overflow-y-auto">
              <p className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">
                {promptData.activeGuestsNames.join(', ')}
              </p>
            </div>

            {promptData.requiresJoinCode && (
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-550 dark:text-zinc-400">
                  Enter 4-Digit Table PIN
                </label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="e.g. 1234"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center tracking-[1em] pl-4 text-base font-black bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 focus:outline-none focus:border-[#6311f4] focus:ring-1 focus:ring-[#6311f4]"
                />
                {joinCodeError && (
                  <p className="text-red-500 text-[10px] font-semibold text-center mt-1">
                    ⚠️ {joinCodeError}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={() => handleResolve('join', false, pinCode)}
                disabled={promptData.requiresJoinCode && pinCode.length !== 4}
                className="w-full bg-[#6311f4] hover:bg-[#520dd4] text-white font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-lg shadow-[#6311f4]/15 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <HiOutlineUsers className="w-4 h-4" />
                <span>Join Existing Group</span>
              </button>
              <button
                onClick={() => handleResolve('new')}
                className="w-full bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <HiOutlineSparkles className="w-4 h-4 text-[#6311f4]" />
                <span>Start New Group</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Capacity exceeded — merge tables suggestion
  if (mergeData) {
    const handleMerge = async () => {
      setMergingTables(true);
      try {
        const res = await mergeTablesApi({
          tableToken,
          mergeTableIds: mergeData.suggestedMergeTables.map(t => t.tableId),
          guestCount: mergeData.requestedGuestCount
        });
        const data = res.data.data;
        // Save session tokens
        localStorage.setItem('sessionToken', data.sessionToken);
        localStorage.setItem('selectedOutletId', data.outletId);
        localStorage.setItem('guestSessionToken', data.guestSessionToken);
        localStorage.setItem('tableToken', tableToken);
        if (data.joinCode) localStorage.setItem('joinCode', data.joinCode);

        setMergeData(null);
        setResolvedPayload(data);
        setShowWelcome(true);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to merge tables. Please ask staff.");
        setMergeData(null);
      } finally {
        setMergingTables(false);
      }
    };

    const handleContinueWithout = () => {
      setGuestCount(mergeData.seatCount);
      setMergeData(null);
      handleResolve(null, true);
    };

    return (
      <div className="min-h-screen w-full bg-zinc-950 flex items-center justify-center p-6 font-sans text-white relative">
        {renderBackgroundMedia()}
        <div className="bg-white/95 dark:bg-zinc-950/85 backdrop-blur-xl border border-white/20 dark:border-zinc-900/50 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative z-10 space-y-6 text-zinc-900 dark:text-zinc-100">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto text-3xl">
              ⚠️
            </div>
            <h2 className="text-xl font-black tracking-tight text-zinc-950 dark:text-white">
              Party Size Exceeds Capacity
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Your party of <strong className="text-zinc-800 dark:text-zinc-200">{mergeData.requestedGuestCount}</strong> exceeds 
              Table {mergeData.tableNumber}'s capacity of <strong className="text-zinc-800 dark:text-zinc-200">{mergeData.seatCount} seats</strong>.
            </p>
          </div>

          {mergeData.canMerge && mergeData.suggestedMergeTables?.length > 0 ? (
            <div className="space-y-3">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  ✓ Merge tables available
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 dark:text-zinc-400">Your table</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      Table {mergeData.tableNumber} ({mergeData.seatCount} seats)
                    </span>
                  </div>
                  {mergeData.suggestedMergeTables.map((t) => (
                    <div key={t.tableId} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400">+ Merge</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        Table {t.tableNumber} ({t.seatCount} seats)
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2 flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Total capacity</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">
                      {mergeData.totalMergedCapacity} seats
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleMerge}
                disabled={mergingTables}
                className="w-full bg-[#6311f4] hover:bg-[#520dd4] text-white font-black text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-lg shadow-[#6311f4]/15 active:scale-95 transition-all cursor-pointer border-none disabled:opacity-50"
              >
                {mergingTables ? 'Merging Tables...' : `Merge Tables & Continue (${mergeData.totalMergedCapacity} seats)`}
              </button>
            </div>
          ) : (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
              <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
                No nearby tables available for merging. Please contact staff for assistance.
              </p>
            </div>
          )}

          <button
            onClick={handleContinueWithout}
            disabled={mergingTables}
            className="w-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold text-xs py-3 rounded-xl transition-all cursor-pointer"
          >
            Continue with {mergeData.seatCount} seats (without merging)
          </button>
        </div>
      </div>
    );
  }

  return null;
}