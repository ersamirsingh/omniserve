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
import Select from '../../components/ui/Select';
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
      addToast(responseData.emailSent === false ? 'Request saved; mail sender is not configured' : 'Invitation sent successfully', 'success');
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
      addToast('Message added successfully', 'success');
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
      addToast(`Request ${label}ed successfully`, 'success');
      fetchRequests();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to update request', 'error');
    }
  };

  const columns = [
    { key: 'email', label: 'Email', render: (r) => <span className="font-semibold text-on-surface dark:text-zinc-200">{r.email}</span> },
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
      render: (row) => (
        <span className="font-mono bg-surface-container-low dark:bg-zinc-800 text-on-surface-variant dark:text-zinc-300 px-2 py-0.5 rounded text-xs font-semibold">
          {row.messages?.length || 0}
        </span>
      ),
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
          <Button size="sm" variant="secondary" onClick={() => setMessageModal({ open: true, item: row, message: '' })} className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">chat</span> Message
          </Button>
          {row.status === JOIN_REQUEST_STATUS.PENDING && (
            <>
              <Button size="sm" variant="secondary" onClick={() => decideRequest(row, JOIN_REQUEST_STATUS.CANCELLED)} className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">cancel</span> Cancel
              </Button>
              <Button size="sm" variant="danger" onClick={() => decideRequest(row, JOIN_REQUEST_STATUS.REJECTED)} className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">block</span> Reject
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-on-surface dark:text-zinc-100 text-[24px] font-bold tracking-tight">
            Join Requests
          </h2>
          <p className="text-body-md text-on-surface-variant dark:text-zinc-400 text-[14px]">
            {selectedRestaurant?.name ? `Manage workspace invites for ${selectedRestaurant.name}` : 'Invite members to a restaurant workspace.'}
          </p>
        </div>
        <Button onClick={openInvite} disabled={!selectedRestaurantId || roles.length === 0} className="flex items-center gap-1 font-bold">
          <span className="material-symbols-outlined text-[18px]">mail</span> Send Invite
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-2">
        {canSelectRestaurant && (
          <Select 
            id="req-restaurant" 
            label="Restaurant" 
            value={selectedRestaurantId} 
            onChange={(event) => setRestaurantId(event.target.value)}
          >
            {restaurants.map((restaurant) => (
              <option key={restaurant._id || restaurant.id} value={restaurant._id || restaurant.id}>
                {restaurant.name}
              </option>
            ))}
          </Select>
        )}
        <Select 
          id="req-status" 
          label="Status Filter" 
          value={status} 
          onChange={(event) => setStatus(event.target.value)}
        >
          {Object.values(JOIN_REQUEST_STATUS).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
      </div>

      {!selectedRestaurantId && !loading ? (
        <div className="rounded-xl border border-border-base dark:border-zinc-800 bg-surface-subtle dark:bg-zinc-950 p-6 text-sm text-on-surface-variant dark:text-zinc-450 font-medium">
          No restaurant is associated with your account.
        </div>
      ) : (
        <Table columns={columns} data={requests} loading={loading} emptyMessage="No join requests found" />
      )}

      <Modal isOpen={inviteModal} onClose={() => setInviteModal(false)} title="Send Workspace Invite" size="lg">
        <form onSubmit={submitInvite} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input 
              id="invite-first" 
              label="First Name" 
              value={inviteForm.firstName} 
              onChange={(event) => setInviteForm({ ...inviteForm, firstName: event.target.value })} 
              placeholder="e.g. Jane"
            />
            <Input 
              id="invite-last" 
              label="Last Name" 
              value={inviteForm.lastName} 
              onChange={(event) => setInviteForm({ ...inviteForm, lastName: event.target.value })} 
              placeholder="e.g. Smith"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input 
              id="invite-email" 
              label="Email Address" 
              type="email" 
              value={inviteForm.email} 
              onChange={(event) => setInviteForm({ ...inviteForm, email: event.target.value })} 
              required 
              placeholder="jane@example.com"
            />
            <Input 
              id="invite-phone" 
              label="Phone Number" 
              value={inviteForm.phone} 
              onChange={(event) => setInviteForm({ ...inviteForm, phone: event.target.value })} 
              placeholder="e.g. +919876543210"
            />
          </div>
          
          <Select 
            id="invite-role" 
            label="Assigned Role" 
            value={inviteForm.requestedRole} 
            onChange={(event) => setInviteForm({ ...inviteForm, requestedRole: event.target.value })} 
            required
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role] || role}
              </option>
            ))}
          </Select>

          <div className="flex flex-col gap-1 w-full">
            <label className="block font-label-sm text-label-sm text-on-surface-variant dark:text-zinc-400 text-[12px] mb-1 font-semibold" htmlFor="invite-message">
              Invitation Message
            </label>
            <textarea
              id="invite-message"
              className="min-h-24 w-full p-3 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-body-md text-on-surface dark:text-zinc-150 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all duration-200 text-[14px] resize-y placeholder-on-surface-variant/40"
              value={inviteForm.message}
              onChange={(event) => setInviteForm({ ...inviteForm, message: event.target.value })}
              maxLength={1000}
              placeholder="Add an optional welcome message..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border-base dark:border-zinc-850">
            <Button variant="secondary" onClick={() => setInviteModal(false)}>Cancel</Button>
            <Button type="submit">Send Invite</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={messageModal.open} onClose={() => setMessageModal({ open: false, item: null, message: '' })} title="Request Message Thread" size="lg">
        <div className="flex flex-col gap-4">
          <div className="max-h-56 overflow-y-auto rounded-xl border border-border-base dark:border-zinc-800 divide-y divide-border-base dark:divide-zinc-850 bg-surface-subtle dark:bg-zinc-900/40">
            {messageModal.item?.messages?.length ? (
              messageModal.item.messages.map((item, index) => (
                <div key={`${item.createdAt}-${index}`} className="p-3.5 flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[11px] font-semibold text-on-surface-variant dark:text-zinc-400">
                    <span>{item.senderEmail || 'System'}</span>
                    <span>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</span>
                  </div>
                  <p className="text-[13px] text-on-surface dark:text-zinc-200 mt-1 font-medium">{item.message}</p>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-sm text-on-surface-variant dark:text-zinc-550 font-medium">No messages in this thread.</div>
            )}
          </div>
          <form onSubmit={submitMessage} className="flex flex-col gap-3">
            <textarea
              className="min-h-20 w-full p-3 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-body-md text-on-surface dark:text-zinc-150 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all duration-200 text-[14px] resize-y placeholder-on-surface-variant/40"
              value={messageModal.message}
              onChange={(event) => setMessageModal({ ...messageModal, message: event.target.value })}
              maxLength={1000}
              placeholder="Type your reply message..."
              required
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setMessageModal({ open: false, item: null, message: '' })}>Cancel</Button>
              <Button type="submit" className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">send</span> Send Reply
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
