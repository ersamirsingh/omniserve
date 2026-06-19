import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchNotifications, markAsRead, markAllAsRead } from '../../store/notificationSlice';
import { fetchCurrentUser } from '../../store/authSlice';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';
import { acceptMyInvitationApi } from '../../api/models/user.api';
import { NOTIFICATION_TYPE_VARIANT } from '../../utils/constants';
import { HiBellAlert, HiCheck } from 'react-icons/hi2';

export default function NotificationsPage() {
  const dispatch = useDispatch();
  const { addToast } = useToast();
  const { notifications, loading, unreadCount } = useSelector((s) => s.notifications);
  const { user } = useSelector((s) => s.auth);
  useEffect(() => { dispatch(fetchNotifications()); }, [dispatch]);

  const handleAcceptInvitation = async (notification) => {
    try {
      await acceptMyInvitationApi();
      addToast('Invitation accepted', 'success');
      if (!notification.isRead) dispatch(markAsRead(notification.id || notification._id));
      dispatch(fetchCurrentUser(true));
      dispatch(fetchNotifications());
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to accept invitation', 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">Notifications {unreadCount > 0 && <Badge variant="danger">{unreadCount} unread</Badge>}</h1>
        {unreadCount > 0 && <Button variant="secondary" onClick={() => dispatch(markAllAsRead())}><HiCheck /> Mark All Read</Button>}
      </div>

      {loading === 'pending' && <div className="flex justify-center py-12"><Spinner size="md" /></div>}

      {notifications.length === 0 && loading !== 'pending' && (
        <div className="flex flex-col items-center justify-center py-16">
          <HiBellAlert className="text-5xl text-slate-500 mb-3" />
          <p className="text-slate-500 font-medium">No notifications yet</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {notifications.map((n) => {
          const notificationId = n.id || n._id;
          const isInvitation = n.entityType === 'UserInvitation';
          return (
          <Card key={notificationId} className={`flex items-start gap-4 hover:border-indigo-500 transition-all !p-4 ${n.isRead ? 'opacity-60' : ''}`} onClick={() => !n.isRead && !isInvitation && dispatch(markAsRead(notificationId))}>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={NOTIFICATION_TYPE_VARIANT[n.type] || 'neutral'}>{n.type?.replace(/_/g, ' ')}</Badge>
                {!n.isRead && <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />}
              </div>
              <p className="text-sm text-slate-100">{n.message || n.title || 'Notification'}</p>
              <span className="text-xs text-slate-500">{new Date(n.createdAt).toLocaleString()}</span>
              {isInvitation && (
                <div className="mt-3 flex gap-2 items-center">
                  {!user?.invitationAccepted ? (
                    <>
                      <Button size="sm" onClick={() => handleAcceptInvitation(n)}>Accept Invitation</Button>
                      {!n.isRead && <Button size="sm" variant="secondary" onClick={() => dispatch(markAsRead(notificationId))}>Mark Read</Button>}
                    </>
                  ) : (
                    <span className="text-sm font-medium text-emerald-400 flex items-center gap-1">
                      <HiCheck className="text-lg" /> Invitation Accepted
                    </span>
                  )}
                </div>
              )}
            </div>
          </Card>
        );})}
      </div>
    </div>
  );
}