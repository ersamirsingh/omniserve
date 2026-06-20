import { useState, useEffect } from 'react';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import useAuth from '../../hooks/useAuth';
import { HiPlus } from 'react-icons/hi2';
import { listRestaurantsApi } from '../../api/models/restaurant.api';
import { listOutletsApi } from '../../api/models/outlet.api';
import { listUsersApi, createUserApi, updateUserApi, deleteUserApi } from '../../api/models/user.api';
import { ROLE_LABELS, ROLE_BADGE_VARIANT, USER_STATUS_VARIANT, USER_ROLES } from '../../utils/constants';
import { getEntityId, getList, getRefId } from '../../utils/apiData';

const ASSIGNABLE_ROLES = {
  [USER_ROLES.SUPER_ADMIN]: [USER_ROLES.RESTAURANT_OWNER, USER_ROLES.OUTLET_MANAGER, USER_ROLES.STAFF],
  [USER_ROLES.RESTAURANT_OWNER]: [USER_ROLES.OUTLET_MANAGER, USER_ROLES.STAFF],
};

const restaurantScopedRoles = [USER_ROLES.RESTAURANT_OWNER];
const outletScopedRoles = [USER_ROLES.OUTLET_MANAGER, USER_ROLES.STAFF];

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: USER_ROLES.STAFF,
  restaurantId: '',
  outletId: '',
  outletIds: [],
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [data, setData] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'create', item: null });
  const [form, setForm] = useState(emptyForm);
  const { addToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOutletFilter, setSelectedOutletFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  const myRole = currentUser?.role;
  const allowedRoles = ASSIGNABLE_ROLES[myRole] || [];
  const isSuperAdmin = myRole === USER_ROLES.SUPER_ADMIN;
  const pageTitle = isSuperAdmin ? 'Users' : 'Team';

  const restaurantName = (restaurantId) => {
    const id = getRefId(restaurantId);
    return id ? restaurants.find((restaurant) => getEntityId(restaurant) === id)?.name || 'Unknown' : '-';
  };

  const outletName = (outletId) => {
    const id = getRefId(outletId);
    return id ? outlets.find((outlet) => getEntityId(outlet) === id)?.name || 'Unknown' : '-';
  };

  const memberOutlets = (member) => {
    const pendingIds = member.pendingOutletIds || [];
    const activeIds = member.outletIds || [];
    const ids = pendingIds.length > 0 ? pendingIds : activeIds;
    if (ids && ids.length > 0) {
      return ids.map(id => outletName(id)).join(', ');
    }
    return outletName(member.pendingOutletId || member.outletId);
  };

  const outletsForRestaurant = (restaurantId) => outlets.filter((outlet) => getRefId(outlet.restaurantId) === restaurantId);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersResponse, restaurantsResponse, outletsResponse] = await Promise.all([
        listUsersApi(),
        listRestaurantsApi(),
        listOutletsApi(),
      ]);
      setData(getList(usersResponse, 'users'));
      setRestaurants(getList(restaurantsResponse, 'restaurants'));
      setOutlets(getList(outletsResponse, 'outlets'));
    } catch {
      addToast('Failed to load team data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  const defaultRole = () => allowedRoles.includes(USER_ROLES.STAFF) ? USER_ROLES.STAFF : allowedRoles[0] || USER_ROLES.STAFF;

  const defaultRestaurantId = () => currentUser?.restaurantId || getEntityId(restaurants[0]);

  const defaultOutletId = (restaurantId) => currentUser?.outletId || getEntityId(outletsForRestaurant(restaurantId)[0]);

  const openCreate = () => {
    const role = defaultRole();
    const restaurantId = restaurantScopedRoles.includes(role) || outletScopedRoles.includes(role) ? defaultRestaurantId() : '';
    const outletId = outletScopedRoles.includes(role) ? defaultOutletId(restaurantId) : '';
    setForm({ ...emptyForm, role, restaurantId, outletId, outletIds: outletId ? [outletId] : [] });
    setModal({ open: true, mode: 'create', item: null });
  };

  const openEdit = (item) => {
    const pendingIds = item.pendingOutletIds || [];
    const activeIds = item.outletIds || [];
    const outletIds = (pendingIds.length > 0 ? pendingIds : activeIds).map(id => getRefId(id));
    setForm({
      firstName: item.firstName || '',
      lastName: item.lastName || '',
      email: item.email || '',
      password: '',
      role: item.pendingRole || item.role || USER_ROLES.STAFF,
      restaurantId: getRefId(item.pendingRestaurantId || item.restaurantId),
      outletId: getRefId(item.pendingOutletId || item.outletId) || outletIds[0] || '',
      outletIds: outletIds,
    });
    setModal({ open: true, mode: 'edit', item });
  };

  const closeModal = () => setModal({ open: false, mode: 'create', item: null });

  const updateRole = (role) => {
    const restaurantId = restaurantScopedRoles.includes(role) || outletScopedRoles.includes(role) ? (form.restaurantId || defaultRestaurantId()) : '';
    const outletId = outletScopedRoles.includes(role) ? (form.outletId || defaultOutletId(restaurantId)) : '';
    setForm({ ...form, role, restaurantId, outletId, outletIds: outletId ? [outletId] : [] });
  };

  const updateRestaurant = (restaurantId) => {
    const outletId = outletScopedRoles.includes(form.role) ? defaultOutletId(restaurantId) : '';
    setForm({
      ...form,
      restaurantId,
      outletId,
      outletIds: outletId ? [outletId] : [],
    });
  };

  const buildPayload = () => {
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      role: form.role,
      restaurantId: form.restaurantId || undefined,
      outletId: form.outletId || undefined,
      outletIds: form.outletIds && form.outletIds.length > 0 ? form.outletIds : undefined,
    };
    if (modal.mode === 'create') payload.password = form.password;
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (needsOutlet && (!form.outletIds || form.outletIds.length === 0)) {
      addToast('Please select at least one outlet', 'warning');
      return;
    }
    try {
      const payload = buildPayload();
      if (modal.mode === 'create') {
        await createUserApi(payload);
        addToast('Invitation sent successfully', 'success');
      } else {
        await updateUserApi(getEntityId(modal.item), payload);
        addToast('User updated successfully', 'success');
      }
      closeModal();
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Operation failed', 'error');
    }
  };

  const handleDelete = async (row) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteUserApi(getEntityId(row));
      addToast('User deleted successfully', 'success');
      fetchData();
    } catch {
      addToast('Failed to delete user', 'error');
    }
  };

  const activeOutlets = isSuperAdmin 
    ? outlets 
    : outlets.filter((o) => getRefId(o.restaurantId) === currentUser?.restaurantId);

  const visibleData = isSuperAdmin ? data : data.filter((u) => allowedRoles.includes(u.pendingRole || u.role));
  
  const filteredData = visibleData.filter((u) => {
    // Outlet Filter
    const userOutletId = getRefId(u.pendingOutletId || u.outletId);
    const userOutletIds = (u.pendingOutletIds || u.outletIds || []).map(id => getRefId(id));
    if (selectedOutletFilter === 'hq') {
      if (userOutletId || userOutletIds.length > 0) return false;
    } else if (selectedOutletFilter !== 'all') {
      const matchPrimary = userOutletId === selectedOutletFilter;
      const matchArray = userOutletIds.includes(selectedOutletFilter);
      if (!matchPrimary && !matchArray) return false;
    }

    // Search Query Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const name = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
      const email = (u.email || '').toLowerCase();
      const role = (ROLE_LABELS[u.pendingRole || u.role] || '').toLowerCase();
      return name.includes(query) || email.includes(query) || role.includes(query);
    }

    return true;
  });

  const filteredOutlets = outletsForRestaurant(form.restaurantId);
  const needsRestaurant = restaurantScopedRoles.includes(form.role) || outletScopedRoles.includes(form.role);
  const needsOutlet = outletScopedRoles.includes(form.role);

  const columns = [
    { key: 'name', label: 'Name', render: (r) => <span className="font-bold text-on-surface dark:text-zinc-200">{`${r.firstName || ''} ${r.lastName || ''}`.trim() || '-'}</span> },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', render: (r) => <Badge variant={ROLE_BADGE_VARIANT[r.pendingRole || r.role] || 'neutral'}>{ROLE_LABELS[r.pendingRole || r.role] || r.pendingRole || r.role}</Badge> },
    { key: 'restaurantId', label: 'Restaurant', render: (r) => restaurantName(r.pendingRestaurantId || r.restaurantId) },
    { key: 'outletId', label: 'Outlet', render: (r) => memberOutlets(r) },
    { 
      key: 'status', 
      label: 'Status', 
      render: (r) => (
        <Badge variant={r.invitationAccepted === false ? 'warning' : USER_STATUS_VARIANT[r.status] || 'neutral'}>
          {r.invitationAccepted === false ? 'Pending Invite' : r.status}
        </Badge>
      ) 
    },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (r) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(r)}>Delete</Button>
        </div>
      ) 
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-on-surface dark:text-zinc-100 text-[24px] font-bold tracking-tight">
            {pageTitle}
          </h2>
          <p className="text-body-md text-on-surface-variant dark:text-zinc-400 text-[14px]">
            {isSuperAdmin ? 'Manage platform user accounts and permissions.' : 'Manage restaurant team members and active roles.'}
          </p>
        </div>
        <Button onClick={openCreate} disabled={!allowedRoles.length} className="flex items-center gap-1 font-bold">
          <HiPlus /> Invite {isSuperAdmin ? 'User' : 'Team Member'}
        </Button>
      </div>

      {/* Outlet Filtering Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-none">
        <button
          onClick={() => setSelectedOutletFilter('all')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
            selectedOutletFilter === 'all'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 text-on-surface-variant dark:text-zinc-400 hover:bg-surface-container-low dark:hover:bg-zinc-800/60'
          }`}
        >
          All Members ({visibleData.length})
        </button>
        <button
          onClick={() => setSelectedOutletFilter('hq')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
            selectedOutletFilter === 'hq'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 text-on-surface-variant dark:text-zinc-400 hover:bg-surface-container-low dark:hover:bg-zinc-800/60'
          }`}
        >
          Restaurant HQ ({visibleData.filter(u => !getRefId(u.pendingOutletId || u.outletId)).length})
        </button>
        {activeOutlets.map((outlet) => {
          const id = getEntityId(outlet);
          const count = visibleData.filter(u => getRefId(u.pendingOutletId || u.outletId) === id).length;
          return (
            <button
              key={id}
              onClick={() => setSelectedOutletFilter(id)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
                selectedOutletFilter === id
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 text-on-surface-variant dark:text-zinc-400 hover:bg-surface-container-low dark:hover:bg-zinc-800/60'
              }`}
            >
              {outlet.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Search & View Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-surface-subtle dark:bg-zinc-900/40 p-3 rounded-2xl border border-border-base dark:border-zinc-900 shadow-xs">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 dark:text-zinc-500 text-[20px]">
            search
          </span>
          <input
            type="text"
            className="w-full bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-850 rounded-xl py-2 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-on-surface-variant/40 text-on-surface dark:text-zinc-200"
            placeholder="Search by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs font-bold text-on-surface-variant dark:text-zinc-400 max-sm:hidden">View Mode:</span>
          <div className="flex bg-surface-container-low dark:bg-zinc-900 border border-border-base dark:border-zinc-850 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-zinc-950 shadow-sm text-primary dark:text-primary-fixed-dim'
                  : 'text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-200'
              }`}
              title="Grid View"
            >
              <span className="material-symbols-outlined text-[18px] block">grid_view</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-zinc-950 shadow-sm text-primary dark:text-primary-fixed-dim'
                  : 'text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-200'
              }`}
              title="Table View"
            >
              <span className="material-symbols-outlined text-[18px] block">format_list_bulleted</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <Table columns={columns} data={[]} loading={true} />
      ) : viewMode === 'grid' ? (
        filteredData.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-900 rounded-2xl">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2">group</span>
            <p className="text-sm font-semibold text-on-surface-variant dark:text-zinc-500">No team members found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredData.map((member) => {
              const memberId = getEntityId(member);
              const fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'No Name';
              const role = member.pendingRole || member.role || USER_ROLES.STAFF;
              const status = member.invitationAccepted === false ? 'Pending Invite' : member.status;
              const outlet = memberOutlets(member);
              const restaurant = restaurantName(member.pendingRestaurantId || member.restaurantId);
              const initials = `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase() || '?';

              let avatarBg = 'from-purple-500 to-indigo-500';
              if (role === USER_ROLES.SUPER_ADMIN) avatarBg = 'from-red-500 to-pink-500';
              else if (role === USER_ROLES.RESTAURANT_OWNER) avatarBg = 'from-amber-500 to-orange-500';
              else if (role === USER_ROLES.OUTLET_MANAGER) avatarBg = 'from-blue-500 to-cyan-500';
              else if (role === USER_ROLES.STAFF) avatarBg = 'from-emerald-500 to-teal-500';

              return (
                <div key={memberId} className="bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-900 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-primary dark:hover:border-primary-fixed-dim transition-all duration-300 flex flex-col justify-between group">
                  <div>
                    {/* Top Header of Card */}
                    <div className="flex items-start gap-3.5 mb-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${avatarBg} flex items-center justify-center font-bold text-white shadow-sm shrink-0`}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-[16px] text-on-surface dark:text-zinc-150 leading-snug truncate group-hover:text-primary dark:group-hover:text-primary-fixed-dim transition-colors">
                          {fullName}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <Badge variant={ROLE_BADGE_VARIANT[role] || 'neutral'}>
                            {ROLE_LABELS[role] || role}
                          </Badge>
                          <Badge variant={member.invitationAccepted === false ? 'warning' : USER_STATUS_VARIANT[member.status] || 'neutral'}>
                            {status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Member Details */}
                    <div className="space-y-2.5 text-xs text-on-surface-variant dark:text-zinc-400 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[17px] text-on-surface-variant/60 dark:text-zinc-500">mail</span>
                        <span className="truncate">{member.email}</span>
                      </div>
                      {isSuperAdmin && (
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[17px] text-on-surface-variant/60 dark:text-zinc-500">domain</span>
                          <span className="truncate">{restaurant}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[17px] text-on-surface-variant/60 dark:text-zinc-500">location_on</span>
                        <span className="truncate">{outlet}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="mt-5 pt-3.5 border-t border-border-base dark:border-zinc-900/60 flex items-center justify-end gap-2 shrink-0">
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      onClick={() => openEdit(member)} 
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold"
                    >
                      <span className="material-symbols-outlined text-[15px]">edit</span> Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="danger" 
                      onClick={() => handleDelete(member)} 
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold"
                    >
                      <span className="material-symbols-outlined text-[15px]">delete</span> Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <Table columns={columns} data={filteredData} loading={loading} />
      )}

      <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'create' ? `Invite New ${isSuperAdmin ? 'User' : 'Team Member'}` : 'Edit User details'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Input 
              id="u-first" 
              label="First Name" 
              value={form.firstName} 
              onChange={(e) => setForm({ ...form, firstName: e.target.value })} 
              required 
              placeholder="e.g. John"
            />
            <Input 
              id="u-last" 
              label="Last Name" 
              value={form.lastName} 
              onChange={(e) => setForm({ ...form, lastName: e.target.value })} 
              required 
              placeholder="e.g. Doe"
            />
          </div>

          <Input 
            id="u-email" 
            label="Email Address" 
            type="email" 
            value={form.email} 
            onChange={(e) => setForm({ ...form, email: e.target.value })} 
            required 
            placeholder="john.doe@example.com"
          />

          {modal.mode === 'create' && (
            <Input 
              id="u-pass" 
              label="Temporary Password" 
              type="password" 
              value={form.password} 
              onChange={(e) => setForm({ ...form, password: e.target.value })} 
              required 
              placeholder="••••••••"
            />
          )}

          <Select 
            id="u-role" 
            label="Assignable Role" 
            value={form.role} 
            onChange={(e) => updateRole(e.target.value)} 
            required
          >
            {allowedRoles.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>

          {needsRestaurant && (
            <Select 
              id="u-restaurant" 
              label="Assigned Restaurant" 
              value={form.restaurantId} 
              onChange={(e) => updateRestaurant(e.target.value)} 
              required
            >
              <option value="" disabled>Select restaurant</option>
              {restaurants.map((restaurant) => (
                <option key={getEntityId(restaurant)} value={getEntityId(restaurant)}>
                  {restaurant.name}
                </option>
              ))}
            </Select>
          )}

          {needsOutlet && (
            <div className="flex flex-col gap-2">
              <label className="block font-label-sm text-label-sm text-on-surface-variant dark:text-zinc-400 text-[12px] font-semibold">
                Assigned Outlets <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg max-h-40 overflow-y-auto">
                {filteredOutlets.map((outlet) => {
                  const id = getEntityId(outlet);
                  const isChecked = form.outletIds?.includes(id);
                  return (
                    <label key={id} className="flex items-center gap-2 text-xs font-semibold text-on-surface dark:text-zinc-200 cursor-pointer p-1 hover:bg-surface-container-low dark:hover:bg-zinc-800/40 rounded transition-all">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          let nextIds = [...(form.outletIds || [])];
                          if (e.target.checked) {
                            if (!nextIds.includes(id)) nextIds.push(id);
                          } else {
                            nextIds = nextIds.filter(x => x !== id);
                          }
                          setForm({
                            ...form,
                            outletIds: nextIds,
                            outletId: nextIds[0] || '',
                          });
                        }}
                        className="rounded border-border-base text-primary focus:ring-primary/20 accent-primary"
                      />
                      <span>{outlet.name}</span>
                    </label>
                  );
                })}
              </div>
              {(!form.outletIds || form.outletIds.length === 0) && (
                <p className="text-[10px] text-red-500 font-semibold">At least one outlet must be selected</p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-border-base dark:border-zinc-850">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit">{modal.mode === 'create' ? 'Send Invite' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
