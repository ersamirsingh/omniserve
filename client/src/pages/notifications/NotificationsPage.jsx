import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchNotifications, markAsRead, markAllAsRead } from '../../store/notificationSlice';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import { NOTIFICATION_TYPE_VARIANT } from '../../utils/constants';
import { HiBellAlert, HiCheck } from 'react-icons/hi2';

export default function NotificationsPage() {
  const dispatch = useDispatch();
  const { notifications, loading, unreadCount } = useSelector((s) => s.notifications);
  useEffect(() => { dispatch(fetchNotifications()); }, [dispatch]);

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
        {notifications.map((n) => (
          <Card key={n._id} className={`flex items-start gap-4 cursor-pointer hover:border-indigo-500 transition-all !p-4 ${n.isRead ? 'opacity-60' : ''}`} onClick={() => !n.isRead && dispatch(markAsRead(n._id))}>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={NOTIFICATION_TYPE_VARIANT[n.type] || 'neutral'}>{n.type?.replace(/_/g, ' ')}</Badge>
                {!n.isRead && <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />}
              </div>
              <p className="text-sm text-slate-100">{n.message || n.title || 'Notification'}</p>
              <span className="text-xs text-slate-500">{new Date(n.createdAt).toLocaleString()}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
