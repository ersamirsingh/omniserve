import React, { useState, useEffect } from 'react';
import { useSearchParams, Navigate, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import useAuth from '../../hooks/useAuth';
import FloorView from './components/FloorView';
import FloorDesigner from './components/FloorDesigner';
import QRCodesCenter from './components/QRCodesCenter';
import { listOutletsApi } from '../../api/models/outlet.api';
import Button from '../../components/ui/Button';

export default function FloorManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'live';

  const isStaff = user?.role === 'STAFF';

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

  // Build tabs based on permissions
  const tabs = [
    { to: '/floor-management?tab=live', label: 'Live Floor' },
  ];

  if (!isStaff) {
    tabs.push({ to: '/floor-management?tab=designer', label: 'Floor Designer' });
    tabs.push({ to: '/floor-management?tab=qrcodes', label: 'QR Codes' });
  }

  // Guard direct URL entry
  if (isStaff && (activeTab === 'designer' || activeTab === 'qrcodes')) {
    return <Navigate to="/floor-management?tab=live" replace />;
  }

  // Outlet selector & view all action element
  const headerActions = (
    <div className="flex items-center gap-3">
      {outletsList.length > 0 && (
        <div className="flex items-center gap-2 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-855 rounded-lg px-3 py-1.5 shadow-sm">
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
    <div className="space-y-6">
      <PageHeader
        section="Operations"
        title="Floor Management"
        description="Monitor table operations, design layouts, and manage QR Codes."
        tabs={tabs}
        actions={headerActions}
      />
      <div>
        {activeTab === 'live' && <FloorView key={selectedOutletId} />}
        {activeTab === 'designer' && <FloorDesigner key={selectedOutletId} />}
        {activeTab === 'qrcodes' && <QRCodesCenter key={selectedOutletId} />}
      </div>
    </div>
  );
}
