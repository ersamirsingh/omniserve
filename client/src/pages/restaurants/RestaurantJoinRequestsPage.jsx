import { useEffect, useMemo, useState } from 'react';
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineCheckCircle,
  HiOutlineEnvelope,
  HiOutlineXCircle,
} from 'react-icons/hi2';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import useAuth from '../../hooks/useAuth';
import { listRestaurantsApi } from '../../api/models/restaurant.api';
import {
  addRestaurantJoinRequestMessageApi,
  createRestaurantJoinRequestApi,
  getAssignableRestaurantRolesApi,
  listRestaurantJoinRequestsApi,
  updateRestaurantJoinRequestDecisionApi,
} from '../../api/models/restaurantJoinRequest.api';
import {
  JOIN_REQUEST_STATUS,
  JOIN_REQUEST_STATUS_VARIANT,
  ROLE_BADGE_VARIANT,
  ROLE_LABELS,
  USER_ROLES,
} from '../../utils/constants';

const EMPTY_INVITE_FORM = {
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  requestedRole: '',
  message: '',
};

const getPayload = (response) => response.data?.data || response.data || {};

export default function RestaurantJoinRequestsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantId, setRestaurantId] = useState(user?.restaurantId || '');
  const [requests, setRequests] = useState([]);
  const [roles, setRoles] = useState([]);
  const [status, setStatus] = useState(JOIN_REQUEST_STATUS.PENDING);
  const [loading, setLoading] = useState(true);
  const [inviteModal, setInviteModal] = useState(false);
  const [messageModal, setMessageModal] = useState({ open: false, item: null, message: '' });
  const [inviteForm, setInviteForm] = useState(EMPTY_INVITE_FORM);

  const canSelectRestaurant = user?.role === USER_ROLES.SUPER_ADMIN;
  const selectedRestaurantId = restaurantId || user?.restaurantId || '';
  const selectedRestaurant = useMemo(
    () => restaurants.find((restaurant) => restaurant._id === selectedRestaurantId || restaurant.id === selectedRestaurantId),
    [restaurants, selectedRestaurantId]
  );

  const normalizeRestaurants = (response) => {
    const payload = getPayload(response);
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.restaurants)) return payload.restaurants;
    if (Array.isArray(response.data?.restaurants)) return response.data.restaurants;
    return [];
  };

  const normalizeRequests = (response) => {
    const payload = getPayload(response);
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.requests)) return payload.requests;
    return [];
  };

  const fetchBootstrap = async () => {
    setLoading(true);
    try {
      const [roleResponse, restaurantResponse] = await Promise.all([
        getAssignableRestaurantRolesApi(),
        canSelectRestaurant ? listRestaurantsApi() : Promise.resolve(null),
      ]);

      const rolePayload = getPayload(roleResponse);
      const nextRoles = Array.isArray(rolePayload.roles) ? rolePayload.roles : [];
      setRoles(nextRoles);

      if (canSelectRestaurant && restaurantResponse) {
        const nextRestaurants = normalizeRestaurants(restaurantResponse);
        setRestaurants(nextRestaurants);
        const firstRestaurantId = nextRestaurants[0]?._id || nextRestaurants[0]?.id || '';
        setRestaurantId((current) => current || firstRestaurantId);
      } else if (user?.restaurantId) {
        setRestaurantId(user.restaurantId);
      }

      setInviteForm((current) => ({
        ...current,
        requestedRole: current.requestedRole || nextRoles[0] || '',
      }));
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to load join request setup', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    if (!selectedRestaurantId) {
      setRequests([]);
      return;
    }

    setLoading(true);
    try {
      const response = await listRestaurantJoinRequestsApi(selectedRestaurantId, status ? { status } : {});
      setRequests(normalizeRequests(response));
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to load join requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBootstrap();
  }, [user?.restaurantId, user?.role]);

  useEffect(() => {
    if (selectedRestaurantId) fetchRequests();
    else setRequests([]);
  }, [selectedRestaurantId, status]);

  const openInvite = () => {
    setInviteForm({ ...EMPTY_INVITE_FORM, requestedRole: roles[0] || '' });
    setInviteModal(true);
  };

  const submitInvite = async (event) => {
    event.preventDefault();
    if (!selectedRestaurantId) {
      addToast('Select a restaurant first', 'error');
      return;
    }

    try {
      const payload = Object.fromEntries(
        Object.entries(inviteForm)
          .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
          .filter(([, value]) => value)
      );
      const response = await createRestaurantJoinRequestApi(selectedRestaurantId, payload);
      const responseData = getPayload(response);
      addToast(responseData.emailSent === false ? 'Request saved; mail sender is not configured' : 'Invitation sent', 'success');
      setInviteModal(false);
      fetchRequests();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to create join request', 'error');
    }
  };

  const submitMessage = async (event) => {
    event.preventDefault();
    try {
      await addRestaurantJoinRequestMessageApi(messageModal.item.id || messageModal.item._id, messageModal.message);
      addToast('Message added', 'success');
      setMessageModal({ open: false, item: null, message: '' });
      fetchRequests();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to add message', 'error');
    }
  };

  const decideRequest = async (item, nextStatus) => {
    const label = nextStatus === JOIN_REQUEST_STATUS.REJECTED ? 'reject' : 'cancel';
    if (!confirm(`Are you sure you want to ${label} this request?`)) return;

    try {
      await updateRestaurantJoinRequestDecisionApi(item.id || item._id, { status: nextStatus });
      addToast(`Request ${label}ed`, 'success');
      fetchRequests();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to update request', 'error');
    }
  };

  const columns = [
    { key: 'email', label: 'Email' },
    {
      key: 'name',
      label: 'Name',
      render: (row) => `${row.firstName || ''} ${row.lastName || ''}`.trim() || '-',
    },
    {
      key: 'requestedRole',
      label: 'Role',
      render: (row) => <Badge variant={ROLE_BADGE_VARIANT[row.requestedRole] || 'neutral'}>{ROLE_LABELS[row.requestedRole] || row.requestedRole}</Badge>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge variant={JOIN_REQUEST_STATUS_VARIANT[row.status] || 'neutral'}>{row.status}</Badge>,
    },
    {
      key: 'messages',
      label: 'Messages',
      render: (row) => row.messages?.length || 0,
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-',
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setMessageModal({ open: true, item: row, message: '' })}>
            <HiOutlineChatBubbleLeftRight /> Message
          </Button>
          {row.status === JOIN_REQUEST_STATUS.PENDING && (
            <>
              <Button size="sm" variant="secondary" onClick={() => decideRequest(row, JOIN_REQUEST_STATUS.CANCELLED)}>
                <HiOutlineXCircle /> Cancel
              </Button>
              <Button size="sm" variant="danger" onClick={() => decideRequest(row, JOIN_REQUEST_STATUS.REJECTED)}>
                <HiOutlineCheckCircle /> Reject
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Join Requests</h1>
          <p className="text-sm text-slate-500 mt-1">{selectedRestaurant?.name || 'Invite people to a restaurant workspace'}</p>
        </div>
        <Button onClick={openInvite} disabled={!selectedRestaurantId || roles.length === 0}>
          <HiOutlineEnvelope /> Send Invite
        </Button>
      </div>

      <div className="grid gap-3 mb-5 md:grid-cols-[minmax(220px,1fr)_220px]">
        {canSelectRestaurant && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-400">Restaurant</label>
            <select
              className="w-full px-4 py-2.5 bg-[#232640] border border-[rgba(99,102,241,0.15)] rounded-lg text-slate-100 text-sm outline-none cursor-pointer focus:border-indigo-500 transition-all"
              value={selectedRestaurantId}
              onChange={(event) => setRestaurantId(event.target.value)}
            >
              {restaurants.map((restaurant) => (
                <option key={restaurant._id || restaurant.id} value={restaurant._id || restaurant.id}>
                  {restaurant.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-400">Status</label>
          <select
            className="w-full px-4 py-2.5 bg-[#232640] border border-[rgba(99,102,241,0.15)] rounded-lg text-slate-100 text-sm outline-none cursor-pointer focus:border-indigo-500 transition-all"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {Object.values(JOIN_REQUEST_STATUS).map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </div>

      {!selectedRestaurantId && !loading ? (
        <div className="rounded-lg border border-[rgba(99,102,241,0.15)] bg-[#1a1d2e] p-6 text-sm text-slate-400">
          No restaurant is available for your account.
        </div>
      ) : (
        <Table columns={columns} data={requests} loading={loading} emptyMessage="No join requests found" />
      )}

      <Modal isOpen={inviteModal} onClose={() => setInviteModal(false)} title="Send Join Invite" size="lg">
        <form onSubmit={submitInvite} className="flex flex-col gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Input id="invite-first" label="First Name" value={inviteForm.firstName} onChange={(event) => setInviteForm({ ...inviteForm, firstName: event.target.value })} />
            <Input id="invite-last" label="Last Name" value={inviteForm.lastName} onChange={(event) => setInviteForm({ ...inviteForm, lastName: event.target.value })} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input id="invite-email" label="Email" type="email" value={inviteForm.email} onChange={(event) => setInviteForm({ ...inviteForm, email: event.target.value })} required />
            <Input id="invite-phone" label="Phone" value={inviteForm.phone} onChange={(event) => setInviteForm({ ...inviteForm, phone: event.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-400">Role</label>
            <select
              className="w-full px-4 py-2.5 bg-[#232640] border border-[rgba(99,102,241,0.15)] rounded-lg text-slate-100 text-sm outline-none cursor-pointer focus:border-indigo-500 transition-all"
              value={inviteForm.requestedRole}
              onChange={(event) => setInviteForm({ ...inviteForm, requestedRole: event.target.value })}
              required
            >
              {roles.map((role) => <option key={role} value={role}>{ROLE_LABELS[role] || role}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-400" htmlFor="invite-message">Message</label>
            <textarea
              id="invite-message"
              className="min-h-28 w-full px-4 py-2.5 bg-[#232640] border border-[rgba(99,102,241,0.15)] rounded-lg text-slate-100 text-sm outline-none resize-y focus:border-indigo-500 transition-all"
              value={inviteForm.message}
              onChange={(event) => setInviteForm({ ...inviteForm, message: event.target.value })}
              maxLength={1000}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-[rgba(99,102,241,0.15)]">
            <Button variant="secondary" onClick={() => setInviteModal(false)}>Cancel</Button>
            <Button type="submit">Send Invite</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={messageModal.open} onClose={() => setMessageModal({ open: false, item: null, message: '' })} title="Request Messages" size="lg">
        <div className="flex flex-col gap-3">
          <div className="max-h-56 overflow-y-auto rounded-lg border border-[rgba(99,102,241,0.15)]">
            {messageModal.item?.messages?.length ? (
              messageModal.item.messages.map((item, index) => (
                <div key={`${item.createdAt}-${index}`} className="border-b border-indigo-500/10 p-3 last:border-b-0">
                  <p className="text-sm text-slate-100">{item.message}</p>
                  <p className="text-xs text-slate-500 mt-1">{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</p>
                </div>
              ))
            ) : (
              <div className="p-4 text-sm text-slate-500">No messages yet</div>
            )}
          </div>
          <form onSubmit={submitMessage} className="flex flex-col gap-3">
            <textarea
              className="min-h-24 w-full px-4 py-2.5 bg-[#232640] border border-[rgba(99,102,241,0.15)] rounded-lg text-slate-100 text-sm outline-none resize-y focus:border-indigo-500 transition-all"
              value={messageModal.message}
              onChange={(event) => setMessageModal({ ...messageModal, message: event.target.value })}
              maxLength={1000}
              required
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setMessageModal({ open: false, item: null, message: '' })}>Cancel</Button>
              <Button type="submit">Send Message</Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
