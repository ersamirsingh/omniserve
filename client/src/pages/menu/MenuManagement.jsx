import React from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import CategoriesPage from './CategoriesPage';
import MenuItemsPage from './MenuItemsPage';
import VariantsPage from './VariantsPage';
import AddonsPage from './AddonsPage';

export default function MenuManagement() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'items';

  const menuTabs = [
    { to: '/menu-management?tab=items', label: 'Menu Items' },
    { to: '/menu-management?tab=categories', label: 'Categories' },
    { to: '/menu-management?tab=variants', label: 'Variants' },
    { to: '/menu-management?tab=addons', label: 'Addons' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        section="Operations"
        title="Menu Management"
        description="Unified workspace to configure categories, menu items, variants, and addons."
        tabs={menuTabs}
      />
      <div>
        {activeTab === 'items' && <MenuItemsPage isEmbedded={true} />}
        {activeTab === 'categories' && <CategoriesPage isEmbedded={true} />}
        {activeTab === 'variants' && <VariantsPage isEmbedded={true} />}
        {activeTab === 'addons' && <AddonsPage isEmbedded={true} />}
      </div>
    </div>
  );
}
