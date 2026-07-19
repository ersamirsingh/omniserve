import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import KitchenDisplay from './components/KitchenDisplay';
import useAuth from '../../hooks/useAuth';
import { listOutletsApi } from '../../api/models/outlet.api';
import Button from '../../components/ui/Button';
import { HiOutlineArrowPath } from 'react-icons/hi2';

export default function OrderPreparationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState('CARDS'); // 'CARDS' | 'LANES'
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [outletsList, setOutletsList] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState(
    user?.outletId || (user?.outletIds && user.outletIds[0]) || localStorage.getItem('selectedOutletId') || ''
  );

  useEffect(() => {
    // Only fetch outlets if user can manage multiple outlets (SUPER_ADMIN or RESTAURANT_OWNER)
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'RESTAURANT_OWNER') {
      listOutletsApi()
        .then((res) => {
          const list = res.data?.data?.outlets || [];
          setOutletsList(list);
          // If selectedOutletId is not valid, fallback
          let targetId = selectedOutletId;
          const found = list.find(o => o.id === targetId || o._id === targetId);
          if (!found && list.length > 0) {
            targetId = list[0].id || list[0]._id;
            setSelectedOutletId(targetId);
            localStorage.setItem('selectedOutletId', targetId);
          }
        })
        .catch((err) => console.error('Failed to load outlets:', err));
    }
  }, [user, selectedOutletId]);

  const handleOutletChange = (e) => {
    const newId = e.target.value;
    setSelectedOutletId(newId);
    localStorage.setItem('selectedOutletId', newId);
  };

  // Outlet selector & view switcher header actions
  const headerActions = (
    <div className="flex items-center gap-3">
      {/* Top Right View Switcher */}
      <div className="flex items-center gap-1 bg-surface-subtle dark:bg-zinc-900 p-1 rounded-xl border border-border-base dark:border-zinc-800 shrink-0">
        <button
          onClick={() => setViewMode('CARDS')}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            viewMode === 'CARDS'
              ? 'bg-white dark:bg-zinc-950 text-primary shadow-xs border border-border-base dark:border-zinc-800'
              : 'text-on-surface-variant dark:text-zinc-400 hover:text-on-surface'
          }`}
        >
          ⚡ Station Cards
        </button>
        <button
          onClick={() => setViewMode('LANES')}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            viewMode === 'LANES'
              ? 'bg-white dark:bg-zinc-950 text-primary shadow-xs border border-border-base dark:border-zinc-800'
              : 'text-on-surface-variant dark:text-zinc-400 hover:text-on-surface'
          }`}
        >
          📊 Multi-Column Lanes
        </button>
      </div>

      <Button
        onClick={() => {
          setRefreshing(true);
          setRefreshKey(prev => prev + 1);
        }}
        variant="outline"
        size="sm"
        loading={refreshing}
        disabled={refreshing}
        className="flex items-center gap-1.5 font-bold text-xs py-1.5 px-3 hover:scale-105 transition-all duration-200 cursor-pointer"
      >
        <HiOutlineArrowPath className="text-sm" /> Refresh
      </Button>
      {outletsList.length > 0 && (
        <div className="flex items-center gap-2 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-850 rounded-lg px-3 py-1.5 shadow-sm">
          <span className="text-xs font-bold text-on-surface-variant dark:text-zinc-400">Outlet:</span>
          <select 
            value={selectedOutletId}
            className="bg-transparent border-none text-xs font-bold text-on-surface dark:text-zinc-200 focus:outline-none cursor-pointer p-0"
            onChange={handleOutletChange}
          >
            {outletsList.map((o) => (
              <option key={o.id || o._id} value={o.id || o._id} className="dark:bg-zinc-900">
                {o.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {(user?.role === 'SUPER_ADMIN' || user?.role === 'RESTAURANT_OWNER') && (
        <Button 
          onClick={() => navigate('/outlets')} 
          variant="secondary" 
          size="sm" 
          className="flex items-center gap-1 font-bold whitespace-nowrap text-xs py-1.5 px-3 hover:scale-105 transition-all duration-200 cursor-pointer"
        >
          <span>View All Outlets 📍</span>
        </Button>
      )}
    </div>
  );

  return (
    <div className="h-[calc(100vh-112px)] flex flex-col overflow-hidden space-y-4 animate-fade-in">
      {/* Page Header */}
      <div className="shrink-0">
        <PageHeader 
          section="Operations"
          title="Offline Order Flow" 
          description="Real-time Kitchen Display System (KDS). Monitor food and beverage prep status across all online and offline channels."
          actions={headerActions}
        />
      </div>

      {/* Embedded KDS Display */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white dark:bg-zinc-950 p-6 rounded-xl border border-border-base dark:border-zinc-900">
        <KitchenDisplay key={`${selectedOutletId}-${refreshKey}`} viewMode={viewMode} onRefreshDone={() => setRefreshing(false)} />
      </div>
    </div>
  );
}
