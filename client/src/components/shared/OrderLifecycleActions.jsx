import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { updateOrderStatus } from '../../store/orderSlice';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast';

const onlineFlow = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'PICKED_UP', 'DELIVERED'];
const dineInFlow = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED'];

export const getNextStatus = (currentStatus, source, diningContext) => {
  const isDineIn = ['DINE_IN', 'QR_DINE_IN', 'WAITER', 'POS', 'WEBSITE'].includes(source) || !!diningContext?.tableId;
  const flow = isDineIn ? dineInFlow : onlineFlow;
  const idx = flow.indexOf(currentStatus);
  return idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null;
};

export const getStatusActionButtonLabel = (nextStatus) => {
  switch (nextStatus) {
    case 'ACCEPTED': return 'Accept Order';
    case 'PREPARING': return 'Start Preparing';
    case 'READY': return 'Mark as Ready';
    case 'PICKED_UP': return 'Dispatch Order';
    case 'DELIVERED': return 'Complete Delivery';
    case 'SERVED': return 'Mark as Served';
    case 'COMPLETED': return 'Complete Order';
    default: return 'Advance Status';
  }
};

export default function OrderLifecycleActions({ order, onStatusChanged }) {
  const dispatch = useDispatch();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  const currentStatus = order?.orderStatus || 'PENDING';
  const source = order?.source || 'ONLINE';
  const nextStatus = getNextStatus(currentStatus, source, order?.diningContext);

  const handleAdvanceStatus = async () => {
    if (!nextStatus) return;
    setLoading(true);
    try {
      await dispatch(updateOrderStatus({ id: order._id || order.id, status: nextStatus })).unwrap();
      addToast(`Order status updated to ${nextStatus}`, 'success');
      if (onStatusChanged) onStatusChanged(nextStatus);
    } catch (err) {
      addToast(err || 'Failed to update status', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!nextStatus) {
    return (
      <div className="text-[10px] text-success-green font-bold text-center border border-success-green/20 bg-success-green/10 rounded py-1 px-2">
        {currentStatus === 'CANCELLED' ? 'Cancelled' : 'Completed'}
      </div>
    );
  }

  return (
    <Button 
      size="sm" 
      variant="primary" 
      className="w-full text-[10px] py-1 h-auto"
      onClick={handleAdvanceStatus}
      isLoading={loading}
    >
      {getStatusActionButtonLabel(nextStatus)}
    </Button>
  );
}
