import React from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import useAuth from '../../hooks/useAuth';
import FloorView from './components/FloorView';
import FloorDesigner from './components/FloorDesigner';
import QRCodesCenter from './components/QRCodesCenter';

export default function FloorManagement() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'live';

  const isStaff = user?.role === 'STAFF';

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

  return (
    <div className="space-y-6">
      <PageHeader
        section="Operations"
        title="Floor Management"
        description="Monitor table operations, design layouts, and manage QR Codes."
        tabs={tabs}
      />
      <div>
        {activeTab === 'live' && <FloorView />}
        {activeTab === 'designer' && <FloorDesigner />}
        {activeTab === 'qrcodes' && <QRCodesCenter />}
      </div>
    </div>
  );
}
