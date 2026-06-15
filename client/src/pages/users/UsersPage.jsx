import { useState, useEffect } from 'react';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import useAuth from '../../hooks/useAuth';
import { HiPlus } from 'react-icons/hi2';
import { listUsersApi, createUserApi, updateUserApi, deleteUserApi } from '../../api/models/user.api';
import { ROLE_LABELS, ROLE_BADGE_VARIANT, USER_STATUS_VARIANT, USER_ROLES } from '../../utils/constants';

/* Which roles each role can assign */
const ASSIGNABLE_ROLES = {
  [USER_ROLES.SUPER_ADMIN]: [USER_ROLES.SUPER_ADMIN, USER_ROLES.RESTAURANT_OWNER, USER_ROLES.OUTLET_MANAGER, USER_ROLES.STAFF],
  [USER_ROLES.RESTAURANT_OWNER]: [USER_ROLES.OUTLET_MANAGER, USER_ROLES.STAFF],
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'create', item: null });
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'STAFF' });
  const { addToast } = useToast();

  const myRole = currentUser?.role;
  const allowedRoles = ASSIGNABLE_ROLES[myRole] || [];
  const isSuperAdmin = myRole === USER_ROLES.SUPER_ADMIN;
  const pageTitle = isSuperAdmin ? 'Users' : 'Team';

  const fetchData = async () => {
    setLoading(true);
    try { const r = await listUsersApi(); setData(Array.isArray(r.data?.data) ? r.data.data : []); }
    catch { addToast('Failed', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setForm({ firstName: '', lastName: '', email: '', password: '', role: allowedRoles.includes('STAFF') ? 'STAFF' : allowedRoles[0] || 'STAFF' });
    setModal({ open: true, mode: 'create', item: null });
  };
  const openEdit = (item) => {
    setForm({ firstName: item.firstName || '', lastName: item.lastName || '', email: item.email || '', password: '', role: item.role || 'STAFF' });
    setModal({ open: true, mode: 'edit', item });
  };
  const closeModal = () => setModal({ open: false, mode: 'create', item: null });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modal.mode === 'create') { await createUserApi(form); addToast('User created', 'success'); }
      else { const { password, ...rest } = form; await updateUserApi(modal.item._id, rest); addToast('User updated', 'success'); }
      closeModal(); fetchData();
    } catch (err) { addToast(err.response?.data?.message || 'Failed', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this user?')) return;
    try { await deleteUserApi(id); addToast('Deleted', 'success'); fetchData(); }
    catch { addToast('Failed', 'error'); }
  };

  /* Super Admin sees everyone; Owner only sees their assignable roles */
  const visibleData = isSuperAdmin ? data : data.filter((u) => allowedRoles.includes(u.role));

  const columns = [
    { key: 'name', label: 'Name', render: (r) => `${r.firstName || ''} ${r.lastName || ''}`.trim() || '—' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', render: (r) => <Badge variant={ROLE_BADGE_VARIANT[r.role] || 'neutral'}>{ROLE_LABELS[r.role] || r.role}</Badge> },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={USER_STATUS_VARIANT[r.status] || 'neutral'}>{r.status}</Badge> },
    { key: 'actions', label: 'Actions', render: (r) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(r._id)}>Delete</Button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-xl font-bold text-slate-100">{pageTitle}</h1>
        <Button onClick={openCreate}><HiPlus /> Add {isSuperAdmin ? 'User' : 'Team Member'}</Button>
      </div>

      <Table columns={columns} data={visibleData} loading={loading} />

      <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'create' ? `New ${isSuperAdmin ? 'User' : 'Team Member'}` : 'Edit User'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input id="u-first" label="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            <Input id="u-last" label="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          </div>
          <Input id="u-email" label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          {modal.mode === 'create' && <Input id="u-pass" label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-400">Role</label>
            <select
              className="w-full px-4 py-2.5 bg-[#232640] border border-[rgba(99,102,241,0.15)] rounded-lg text-slate-100 text-sm outline-none cursor-pointer focus:border-indigo-500 transition-all"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {allowedRoles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-[rgba(99,102,241,0.15)]">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit">{modal.mode === 'create' ? 'Create' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
