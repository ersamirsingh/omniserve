import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Select from '../../components/ui/Select';
import useAuth from '../../hooks/useAuth';
import { listOutletsApi } from '../../api/models/outlet.api';
import { getEntityId, getList } from '../../utils/apiData';
import CategoriesPage from './CategoriesPage';
import MenuItemsPage from './MenuItemsPage';
import VariantsPage from './VariantsPage';
import AddonsPage from './AddonsPage';

export default function MenuManagement() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'categories';
  const { user } = useAuth();
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState('all');

  useEffect(() => {
    const fetchOutlets = async () => {
      try {
        const response = await listOutletsApi();
        setOutlets(getList(response, 'outlets'));
      } catch (err) {
        console.error('Failed to load outlets in MenuManagement:', err);
      }
    };
    fetchOutlets();
  }, [user]);

  const menuTabs = [
    { to: '/menu-management?tab=categories', label: 'Categories' },
    { to: '/menu-management?tab=items', label: 'Menu Items' },
    { to: '/menu-management?tab=variants', label: 'Variants' },
    { to: '/menu-management?tab=addons', label: 'Addons' },
  ];

  const headerActions = outlets.length > 0 ? (
    <div className="w-56 max-w-full">
      <Select
        id="menu-global-outlet"
        label="Global Outlet Filter"
        value={selectedOutlet}
        onChange={(e) => setSelectedOutlet(e.target.value)}
      >
        <option value="all">All Outlets</option>
        {outlets.map((outlet) => (
          <option key={getEntityId(outlet)} value={getEntityId(outlet)}>
            {outlet.name}
          </option>
        ))}
      </Select>
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        section="Operations"
        title="Menu Management"
        description="Unified workspace to configure categories, menu items, variants, and addons."
        tabs={menuTabs}
        actions={headerActions}
      />
      <div>
        {activeTab === 'categories' && (
          <CategoriesPage
            isEmbedded={true}
            selectedOutletId={selectedOutlet}
            globalOutletActive={true}
          />
        )}
        {activeTab === 'items' && (
          <MenuItemsPage
            isEmbedded={true}
            selectedOutletId={selectedOutlet}
            globalOutletActive={true}
          />
        )}
        {activeTab === 'variants' && (
          <VariantsPage
            isEmbedded={true}
            selectedOutletId={selectedOutlet}
          />
        )}
        {activeTab === 'addons' && (
          <AddonsPage
            isEmbedded={true}
            selectedOutletId={selectedOutlet}
          />
        )}
      </div>
    </div>
  );
}

