import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchNotifications, markAsRead, markAllAsRead } from '../../store/notificationSlice';
import { fetchCurrentUser } from '../../store/authSlice';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import PageHeader from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { acceptMyInvitationApi } from '../../api/models/user.api';
import { NOTIFICATION_TYPE_VARIANT } from '../../utils/constants';
import { HiBellAlert, HiCheck } from 'react-icons/hi2';

export default function NotificationsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { notifications, loading, unreadCount } = useSelector((s) => s.notifications);
  const { user } = useSelector((s) => s.auth);

  useEffect(() => { 
    dispatch(fetchNotifications()); 
  }, [dispatch]);

  const handleAcceptInvitation = async (e, notification) => {
    e.stopPropagation();
    try {
      await acceptMyInvitationApi();
      addToast('Invitation accepted successfully', 'success');
      if (!notification.isRead) {
        await dispatch(markAsRead(notification.id || notification._id)).unwrap();
      }
      dispatch(fetchCurrentUser(true));
      dispatch(fetchNotifications());
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to accept invitation', 'error');
    }
  };

  const handleNotificationClick = (n) => {
    const notificationId = n.id || n._id;
    if (!n.isRead) {
      dispatch(markAsRead(notificationId));
    }
    if (n.entityType === 'Order' && n.entityId) {
      navigate(`/orders?orderId=${n.entityId}`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        section="Insights"
        title="Notifications" 
        description="Check real-time system alerts, stock warning reports, and active user invitations."
        actions={
          unreadCount > 0 && (
            <Button 
              variant="secondary" 
              onClick={() => dispatch(markAllAsRead())} 
              className="flex items-center gap-1.5 font-bold transition-all duration-200 hover:scale-[1.02]"
            >
              <HiCheck className="text-base" /> Mark All Read
            </Button>
          )
        }
      />

      {loading === 'pending' && (
        <div className="flex justify-center py-12">
          <Spinner size="md" />
        </div>
      )}

      {notifications.length === 0 && loading !== 'pending' && (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-2xl p-6">
          <HiBellAlert className="text-5xl text-on-surface-variant dark:text-zinc-500 mb-3 animate-bounce" />
          <p className="text-on-surface-variant dark:text-zinc-500 font-medium">You have no new notifications.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {notifications.map((n) => {
          const notificationId = n.id || n._id;
          const isInvitation = n.entityType === 'UserInvitation';
          return (
            <Card 
              key={notificationId} 
              className={`flex items-start gap-4 transition-all duration-200 border border-border-base dark:border-zinc-800 hover:border-primary dark:hover:border-zinc-700 hover:shadow-md cursor-pointer !p-5 ${
                n.isRead ? 'opacity-55 dark:opacity-40' : 'bg-surface-subtle/20 dark:bg-zinc-900/10'
              }`}
              onClick={() => handleNotificationClick(n)}
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={NOTIFICATION_TYPE_VARIANT[n.type] || 'neutral'}>
                    {n.type?.replace(/_/g, ' ')}
                  </Badge>
                  {!n.isRead && (
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                    </span>
                  )}
                </div>
                <p className="text-[14px] font-medium leading-relaxed text-on-surface dark:text-zinc-200">
                  {n.message || n.title || 'Notification alert'}
                </p>
                <div className="text-[11px] font-semibold text-on-surface-variant/60 dark:text-zinc-500 flex items-center gap-1">
                  <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{new Date(n.createdAt).toLocaleTimeString()}</span>
                </div>

                <div className="mt-2.5 flex gap-2 flex-wrap">
                  {n.entityType === 'Order' && n.entityId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!n.isRead) dispatch(markAsRead(notificationId));
                        navigate(`/orders?orderId=${n.entityId}`);
                      }}
                      className="text-xs font-bold"
                    >
                      View Order Details
                    </Button>
                  )}
                  {(n.entityType === 'Table' || n.type === 'QR_ASSISTANCE_REQUESTED' || n.type === 'BILL_REQUESTED') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!n.isRead) dispatch(markAsRead(notificationId));
                        navigate(`/operations/dine-in`);
                      }}
                      className="text-xs font-bold"
                    >
                      View Table Operations
                    </Button>
                  )}
                  {(n.entityType === 'Inventory' || n.type === 'LOW_INVENTORY' || n.type?.includes('STOCK') || n.message?.toLowerCase().includes('stock')) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!n.isRead) dispatch(markAsRead(notificationId));
                        navigate(`/inventory`);
                      }}
                      className="text-xs font-bold"
                    >
                      Check Inventory
                    </Button>
                  )}
                </div>

                {isInvitation && (
                  <div className="mt-3 flex gap-2 items-center flex-wrap">
                    {!user?.invitationAccepted ? (
                      <>
                        <Button size="sm" onClick={(e) => handleAcceptInvitation(e, n)} className="font-bold">
                          Accept Invitation
                        </Button>
                        {!n.isRead && (
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatch(markAsRead(notificationId));
                            }} 
                            className="font-bold"
                          >
                            Mark Read
                          </Button>
                        )}
                      </>
                    ) : (
                      <span className="text-sm font-bold text-success-green dark:text-emerald-400 flex items-center gap-1">
                        <HiCheck className="text-lg" /> Invitation Accepted
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}