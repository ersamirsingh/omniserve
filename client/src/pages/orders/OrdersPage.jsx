import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { fetchOrders, updateOrderStatus, cancelOrder } from '../../store/orderSlice';
import { getOrderByIdApi } from '../../api/models/order.api';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { ORDER_STATUS_VARIANT, ORDER_STATUS_LABELS, PAYMENT_STATUS_VARIANT } from '../../utils/constants';
import { HiOutlineShoppingCart, HiOutlineEye, HiOutlineXMark, HiOutlineClock, HiOutlineArrowPath } from 'react-icons/hi2';
import { useSocket } from '../../context/SocketContext';
import OrderLifecycleActions from '../../components/shared/OrderLifecycleActions';

export default function OrdersPage({ mode = 'ALL', hideHeader = false, viewType = 'TABLE' }) {
  const dispatch = useDispatch();
  const { orders, loading } = useSelector((s) => s.orders);
  const { addToast } = useToast();
  const { lastMessage } = useSocket();
  const [filter, setFilter] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const orderIdParam = searchParams.get('orderId');
  
  // Details Modal State
  const [detailsModal, setDetailsModal] = useState({ open: false, orderId: null, data: null, loading: false });
  // Cancel Reason State
  const [cancelModal, setCancelModal] = useState({ open: false, orderId: null, reason: '' });

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    const params = {};
    if (mode !== 'ALL') {
      params.operationalMode = mode;
    }
    try {
      await dispatch(fetchOrders(params)).unwrap();
      addToast('Orders refreshed successfully', 'success');
    } catch (err) {
      addToast(err || 'Failed to refresh orders', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const loadOrderDetails = async (id) => {
    setDetailsModal(prev => ({ ...prev, open: true, orderId: id, loading: true }));
    try {
      const response = await getOrderByIdApi(id);
      setDetailsModal(prev => ({ ...prev, data: response?.data?.data, loading: false }));
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to load order details. The order may have been deleted or does not exist.', 'error');
      setDetailsModal(prev => ({ ...prev, open: false, orderId: null, loading: false }));
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('orderId');
      setSearchParams(newParams, { replace: true });
    }
  };

  const handleCloseDetails = () => {
    setDetailsModal({ open: false, orderId: null, data: null, loading: false });
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('orderId');
    setSearchParams(newParams, { replace: true });
  };

  const handleViewDetails = (id) => {
    setSearchParams({ orderId: id });
  };

  useEffect(() => { 
    const params = {};
    if (mode !== 'ALL') {
      params.operationalMode = mode;
    }
    dispatch(fetchOrders(params)); 
  }, [dispatch, mode]);

  useEffect(() => {
    if (!lastMessage) return;
    const { event } = lastMessage;
    if (event === 'ORDER_CREATED' || event === 'ORDER_STATUS_CHANGED') {
      const params = {};
      if (mode !== 'ALL') {
        params.operationalMode = mode;
      }
      dispatch(fetchOrders(params));
    }
  }, [lastMessage, dispatch, mode]);

  useEffect(() => {
    if (orderIdParam) {
      if (detailsModal.orderId !== orderIdParam) {
        loadOrderDetails(orderIdParam);
      }
    } else if (detailsModal.open) {
      setDetailsModal({ open: false, orderId: null, data: null, loading: false });
    }
  }, [orderIdParam, detailsModal.orderId, detailsModal.open]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const r = await dispatch(updateOrderStatus({ id, status: newStatus })).unwrap();
      addToast(`Order status updated to ${newStatus}`, 'success');
      // If details modal is open for this order, refresh its info
      if (detailsModal.open && detailsModal.orderId === id) {
        loadOrderDetails(id);
      }
    } catch (err) {
      addToast(err || 'Failed to update status', 'error');
    }
  };

  const handleCancelClick = (id) => {
    setCancelModal({ open: true, orderId: id, reason: '' });
  };

  const submitCancel = async (e) => {
    e.preventDefault();
    if (!cancelModal.reason.trim()) {
      addToast('Cancellation reason is required', 'error');
      return;
    }
    const { orderId, reason } = cancelModal;
    try {
      await dispatch(cancelOrder({ id: orderId, reason })).unwrap();
      addToast('Order cancelled successfully', 'success');
      setCancelModal({ open: false, orderId: null, reason: '' });
      if (detailsModal.open && detailsModal.orderId === orderId) {
        loadOrderDetails(orderId);
      }
    } catch (err) {
      addToast(err || 'Failed to cancel order', 'error');
    }
  };

  const filtered = filter ? orders.filter((o) => o.orderStatus === filter) : orders;

  const columns = [
    { 
      key: 'orderNumber', 
      label: 'Order ID', 
      render: (r) => (
        <button 
          onClick={() => handleViewDetails(r.id)} 
          className="font-mono text-xs font-semibold text-primary dark:text-primary-fixed-dim hover:underline focus:outline-none"
        >
          #{r.orderNumber?.slice(-8) || r.id?.slice(-8)}
        </button>
      ) 
    },
    { 
      key: 'customer', 
      label: 'Customer', 
      render: (r) => {
        if (!r.customerId) return '—';
        const name = `${r.customerId.firstName || ''} ${r.customerId.lastName || ''}`.trim();
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-on-surface dark:text-zinc-200">{name || '—'}</span>
            <span className="text-[11px] text-on-surface-variant dark:text-zinc-550">{r.customerId.phone || ''}</span>
          </div>
        );
      } 
    },
    { 
      key: 'outlet', 
      label: 'Outlet', 
      render: (r) => r.outletId?.name || '—' 
    },
    { 
      key: 'source', 
      label: 'Source', 
      render: (r) => <Badge variant="neutral">{r.source?.replace('_', ' ')}</Badge> 
    },
    { 
      key: 'totalAmount', 
      label: 'Total', 
      render: (r) => <span className="font-bold text-on-surface dark:text-zinc-200">₹{(r.totalAmount ?? 0).toLocaleString()}</span> 
    },
    { 
      key: 'orderStatus', 
      label: 'Order Status', 
      render: (r) => <Badge variant={ORDER_STATUS_VARIANT[r.orderStatus] || 'neutral'}>{ORDER_STATUS_LABELS[r.orderStatus] || r.orderStatus}</Badge> 
    },
    { 
      key: 'paymentStatus', 
      label: 'Payment', 
      render: (r) => <Badge variant={PAYMENT_STATUS_VARIANT[r.paymentStatus] || 'neutral'}>{r.paymentStatus}</Badge> 
    },
    { 
      key: 'createdAt', 
      label: 'Date', 
      render: (r) => <span className="text-xs text-on-surface-variant dark:text-zinc-400">{new Date(r.createdAt).toLocaleString()}</span> 
    },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (r) => {
        const canCancel = r.orderStatus !== 'CANCELLED' && r.orderStatus !== 'DELIVERED' && r.orderStatus !== 'COMPLETED';
        return (
          <div className="flex gap-1.5 justify-end">
            <Button size="sm" variant="secondary" onClick={() => handleViewDetails(r.id)} title="View Details" className="!p-2">
              <HiOutlineEye className="text-base" />
            </Button>
            <div className="w-[120px]">
              <OrderLifecycleActions 
                order={r} 
                onStatusChanged={(newStatus) => {
                  if (detailsModal.open && detailsModal.orderId === r.id) {
                    loadOrderDetails(r.id);
                  }
                }}
              />
            </div>
            {canCancel && (
              <Button size="sm" variant="danger" onClick={() => handleCancelClick(r.id)} className="font-bold">
                Cancel
              </Button>
            )}
          </div>
        );
      } 
    },
  ];

  const isOnline = mode === 'ONLINE';
  const flowColumns = isOnline
    ? [
        { status: 'PENDING', label: 'Received', color: 'text-amber-600 dark:text-amber-400 border-amber-500/20' },
        { status: 'ACCEPTED', label: 'Accepted', color: 'text-blue-600 dark:text-blue-400 border-blue-500/20' },
        { status: 'PREPARING', label: 'Preparing', color: 'text-purple-600 dark:text-purple-400 border-purple-500/20' },
        { status: 'READY', label: 'Ready', color: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
        { status: 'PICKED_UP', label: 'Out for Delivery', color: 'text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
      ]
    : [
        { status: 'PENDING', label: 'Received', color: 'text-amber-600 dark:text-amber-400 border-amber-500/20' },
        { status: 'ACCEPTED', label: 'Accepted', color: 'text-blue-600 dark:text-blue-400 border-blue-500/20' },
        { status: 'PREPARING', label: 'Preparing', color: 'text-purple-600 dark:text-purple-400 border-purple-500/20' },
        { status: 'READY', label: 'Ready', color: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
        { status: 'SERVED', label: 'Served', color: 'text-sky-600 dark:text-sky-400 border-sky-500/20' },
      ];

  const nextStatusMap = isOnline
    ? {
        PENDING: 'ACCEPTED',
        ACCEPTED: 'PREPARING',
        PREPARING: 'READY',
        READY: 'PICKED_UP',
        PICKED_UP: 'DELIVERED'
      }
    : {
        PENDING: 'ACCEPTED',
        ACCEPTED: 'PREPARING',
        PREPARING: 'READY',
        READY: 'SERVED',
        SERVED: 'COMPLETED'
      };

  const nextActionLabels = {
    ACCEPTED: 'Accept',
    PREPARING: 'Start Prep',
    READY: 'Mark Ready',
    PICKED_UP: 'Dispatch',
    DELIVERED: 'Complete',
    SERVED: 'Serve',
    COMPLETED: 'Complete'
  };

  let pageTitle = 'Orders';
  let pageDescription = 'Track live customer orders, update kitchen preparation stages, and manage delivery handoffs.';
  if (mode === 'ONLINE') {
    pageTitle = viewType === 'BOARD' ? 'Online Order Flow' : 'Online Orders';
    pageDescription = viewType === 'BOARD' 
      ? 'Manage and advance online orders through the preparation board stages.'
      : 'Track online customer orders, update kitchen preparation stages, and manage delivery handoffs.';
  } else if (mode === 'DINE_IN') {
    pageTitle = viewType === 'BOARD' ? 'Offline Order Flow' : 'Offline Orders';
    pageDescription = viewType === 'BOARD'
      ? 'Manage and advance dine-in / table orders through the preparation board stages.'
      : 'Track offline customer orders, update kitchen preparation stages, and manage table services.';
  }

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <PageHeader 
          section="Operations"
          title={pageTitle} 
          description={pageDescription}
          actions={
            <Button
              size="sm"
              variant="outline"
              className="flex items-center gap-1.5 font-bold"
              onClick={handleRefresh}
              loading={refreshing}
              disabled={refreshing}
            >
              <HiOutlineArrowPath className="text-sm text-on-surface dark:text-zinc-300" /> Refresh
            </Button>
          }
        />
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select 
          className="px-4 py-2.5 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-on-surface dark:text-zinc-200 text-sm outline-none cursor-pointer focus:border-primary transition-all duration-200" 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {viewType === 'BOARD' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 h-[calc(100vh-230px)] min-h-[500px]">
          {flowColumns.map((col) => {
            const colOrders = filtered.filter((o) => o.orderStatus === col.status);
            return (
              <div 
                key={col.status} 
                className="bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl p-4 flex flex-col h-full shadow-xs"
              >
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-border-base dark:border-zinc-800 shrink-0">
                  <span className={`text-[12px] font-bold uppercase tracking-wider ${col.color}`}>
                    {col.label}
                  </span>
                  <span className="w-5.5 h-5.5 rounded-full bg-surface-container-low dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-on-surface-variant dark:text-zinc-350">
                    {colOrders.length}
                  </span>
                </div>

                <div className="flex-1 flex flex-col gap-3.5 overflow-y-auto min-h-0 pr-1">
                  {colOrders.length === 0 ? (
                    <p className="text-on-surface-variant/40 dark:text-zinc-650 text-xs text-center py-12 font-medium">No active orders</p>
                  ) : (
                    colOrders.map((order) => {
                      const nextStatus = nextStatusMap[order.orderStatus];
                      const nextLabel = nextActionLabels[nextStatus];
                      const canCancel = order.orderStatus !== 'CANCELLED' && order.orderStatus !== 'DELIVERED' && order.orderStatus !== 'COMPLETED';
                      return (
                        <div 
                          key={order.id || order._id} 
                          className="bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-800/85 rounded-lg p-3.5 hover:border-primary-container dark:hover:border-primary-fixed-dim hover:shadow-xs transition-all duration-200 cursor-pointer flex flex-col"
                          onClick={() => handleViewDetails(order.id || order._id)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-on-surface-variant dark:text-zinc-500 font-bold font-mono">
                              #{(order.orderNumber || order.id || '').slice(-6).toUpperCase()}
                            </span>
                            {order.source && (
                              <Badge variant="neutral" className="!text-[9px] !px-1.5 !py-0.5">
                                {order.source.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>

                          <div className="text-xs font-bold text-on-surface dark:text-zinc-200 mt-2 truncate">
                            {order.customerId ? `${order.customerId.firstName || ''} ${order.customerId.lastName || ''}`.trim() : 'Guest'}
                          </div>

                          {order.diningContext && (order.diningContext.tableNumber) && (
                            <div className="mt-1.5 bg-teal-50/40 dark:bg-teal-950/10 border border-teal-150/40 dark:border-teal-900/20 rounded px-1.5 py-0.5 self-start text-[9px] text-teal-650 dark:text-teal-400 font-bold">
                              Table {order.diningContext.tableNumber}
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border-base/50 dark:border-zinc-850 text-[11px] text-on-surface-variant dark:text-zinc-400">
                            <span className="font-bold text-on-surface dark:text-zinc-300">₹{(order.totalAmount || 0).toLocaleString()}</span>
                            <span className="font-medium">{order.items?.length || 0} items</span>
                          </div>

                          <div className="flex gap-1.5 mt-3 pt-2 border-t border-border-base/40 dark:border-zinc-850/40" onClick={(e) => e.stopPropagation()}>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1 !py-1 text-[10px] font-bold" 
                              onClick={() => handleViewDetails(order.id || order._id)}
                            >
                              Details
                            </Button>
                            {nextStatus && (
                              <Button 
                                size="sm" 
                                variant="primary" 
                                className="flex-1 !py-1 text-[10px] font-bold" 
                                onClick={() => handleStatusChange(order.id || order._id, nextStatus)}
                              >
                                {nextLabel || 'Advance'}
                              </Button>
                            )}
                            {canCancel && (
                              <Button 
                                size="sm" 
                                variant="danger" 
                                className="!p-1.5" 
                                onClick={() => handleCancelClick(order.id || order._id)}
                                title="Cancel Order"
                              >
                                <HiOutlineXMark className="text-xs" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Table 
          columns={columns} 
          data={filtered} 
          loading={loading === 'pending'} 
          emptyMessage="No orders found" 
          getRowClassName={(row) => (row.id === detailsModal.orderId || row._id === detailsModal.orderId) ? 'bg-primary/5 dark:bg-primary/5 border-l-2 border-primary font-bold' : ''}
        />
      )}

      {/* Details Modal */}
      <Modal 
        isOpen={detailsModal.open} 
        onClose={handleCloseDetails} 
        title={`Order Details #${detailsModal.data?.orderNumber?.slice(-8) || ''}`}
        size="md"
      >
        {detailsModal.loading ? (
          <div className="flex justify-center py-12 items-center">
            <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></span>
          </div>
        ) : detailsModal.data ? (
          <div className="space-y-6 text-sm text-on-surface dark:text-zinc-300">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-on-surface-variant dark:text-zinc-500 font-bold uppercase tracking-wider">Customer Details</span>
                <p className="font-semibold text-on-surface dark:text-zinc-200">
                  {detailsModal.data.customerId ? `${detailsModal.data.customerId.firstName} ${detailsModal.data.customerId.lastName || ''}`.trim() : '—'}
                </p>
                <p className="text-xs text-on-surface-variant dark:text-zinc-400">{detailsModal.data.customerId?.phone || 'No phone'}</p>
                <p className="text-xs text-on-surface-variant dark:text-zinc-400">{detailsModal.data.customerId?.email || 'No email'}</p>
              </div>
              <div className="space-y-1 text-right">
                <span className="text-xs text-on-surface-variant dark:text-zinc-500 font-bold uppercase tracking-wider">Order Status</span>
                <div>
                  <Badge variant={ORDER_STATUS_VARIANT[detailsModal.data.orderStatus] || 'neutral'}>
                    {ORDER_STATUS_LABELS[detailsModal.data.orderStatus] || detailsModal.data.orderStatus}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-on-surface-variant dark:text-zinc-400">
                  Payment: <Badge variant={PAYMENT_STATUS_VARIANT[detailsModal.data.paymentStatus] || 'neutral'}>{detailsModal.data.paymentStatus}</Badge>
                </div>
              </div>
            </div>

            <hr className="border-border-base dark:border-zinc-800" />

            {/* Items list */}
            <div className="space-y-3">
              <span className="text-xs text-on-surface-variant dark:text-zinc-500 font-bold uppercase tracking-wider">Items ordered</span>
              <div className="divide-y divide-border-base/50 dark:divide-zinc-800/50">
                {detailsModal.data.items?.map((item) => (
                  <div key={item.id} className="py-2.5 flex justify-between items-start gap-4">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-on-surface dark:text-zinc-200">{item.name} <span className="text-xs font-bold text-primary dark:text-primary-fixed-dim">x{item.quantity}</span></p>
                      {item.notes && <p className="text-xs text-warning-orange font-medium">Note: {item.notes}</p>}
                    </div>
                    <span className="font-bold text-on-surface dark:text-zinc-150">₹{(item.totalPrice ?? (item.unitPrice * item.quantity)).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <hr className="border-border-base dark:border-zinc-800" />

            {/* Breakdown */}
            <div className="space-y-1.5 max-w-xs ml-auto text-right">
              <div className="flex justify-between text-xs text-on-surface-variant dark:text-zinc-400">
                <span>Subtotal</span>
                <span>₹{detailsModal.data.subtotal?.toLocaleString() ?? 0}</span>
              </div>
              <div className="flex justify-between text-xs text-on-surface-variant dark:text-zinc-400">
                <span>Tax</span>
                <span>₹{detailsModal.data.tax?.toLocaleString() ?? 0}</span>
              </div>
              <div className="flex justify-between text-xs text-on-surface-variant dark:text-zinc-400">
                <span>Delivery Fee</span>
                <span>₹{detailsModal.data.deliveryFee?.toLocaleString() ?? 0}</span>
              </div>
              {detailsModal.data.discount > 0 && (
                <div className="flex justify-between text-xs text-emerald-500">
                  <span>Discount</span>
                  <span>-₹{detailsModal.data.discount?.toLocaleString() ?? 0}</span>
                </div>
              )}
              <div className="flex justify-between text-[15px] font-extrabold text-on-surface dark:text-zinc-100 pt-1 border-t border-border-base dark:border-zinc-800">
                <span>Total Amount</span>
                <span>₹{detailsModal.data.totalAmount?.toLocaleString() ?? 0}</span>
              </div>
            </div>

            {/* Order Timestamps Timeline */}
            <div className="bg-surface-subtle dark:bg-zinc-900/50 p-4 rounded-xl space-y-3">
              <span className="text-xs text-on-surface-variant dark:text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
                <HiOutlineClock /> Status Timeline
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-on-surface-variant dark:text-zinc-500 font-medium">Placed:</span>{' '}
                  <span className="font-semibold text-on-surface dark:text-zinc-300">
                    {new Date(detailsModal.data.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                {detailsModal.data.acceptedAt && (
                  <div>
                    <span className="text-on-surface-variant dark:text-zinc-500 font-medium">Accepted:</span>{' '}
                    <span className="font-semibold text-on-surface dark:text-zinc-300">
                      {new Date(detailsModal.data.acceptedAt).toLocaleTimeString()}
                    </span>
                  </div>
                )}
                {detailsModal.data.preparedAt && (
                  <div>
                    <span className="text-on-surface-variant dark:text-zinc-500 font-medium">Preparing:</span>{' '}
                    <span className="font-semibold text-on-surface dark:text-zinc-300">
                      {new Date(detailsModal.data.preparedAt).toLocaleTimeString()}
                    </span>
                  </div>
                )}
                {detailsModal.data.readyAt && (
                  <div>
                    <span className="text-on-surface-variant dark:text-zinc-500 font-medium">Ready:</span>{' '}
                    <span className="font-semibold text-on-surface dark:text-zinc-300">
                      {new Date(detailsModal.data.readyAt).toLocaleTimeString()}
                    </span>
                  </div>
                )}
                {detailsModal.data.pickedUpAt && (
                  <div>
                    <span className="text-on-surface-variant dark:text-zinc-500 font-medium">Dispatched:</span>{' '}
                    <span className="font-semibold text-on-surface dark:text-zinc-300">
                      {new Date(detailsModal.data.pickedUpAt).toLocaleTimeString()}
                    </span>
                  </div>
                )}
                {detailsModal.data.deliveredAt && (
                  <div>
                    <span className="text-on-surface-variant dark:text-zinc-500 font-medium">Delivered:</span>{' '}
                    <span className="font-semibold text-on-surface dark:text-zinc-300">
                      {new Date(detailsModal.data.deliveredAt).toLocaleTimeString()}
                    </span>
                  </div>
                )}
                {detailsModal.data.cancelledAt && (
                  <div className="col-span-2 sm:col-span-3 text-red-500">
                    <span className="font-bold">Cancelled:</span>{' '}
                    <span>{new Date(detailsModal.data.cancelledAt).toLocaleTimeString()}</span>
                    {detailsModal.data.cancellationReason && (
                      <p className="mt-0.5 text-xs text-on-surface-variant dark:text-zinc-400 italic">
                        Reason: "{detailsModal.data.cancellationReason}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {detailsModal.data.notes && (
              <div className="text-xs bg-amber-500/10 text-amber-500 p-3 rounded-lg">
                <span className="font-bold block mb-0.5">Kitchen Instructions:</span>
                "{detailsModal.data.notes}"
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Cancel Order Reason Modal */}
      <Modal
        isOpen={cancelModal.open}
        onClose={() => setCancelModal({ open: false, orderId: null, reason: '' })}
        title="Cancel Order"
        size="sm"
      >
        <form onSubmit={submitCancel} className="space-y-4">
          <p className="text-xs text-on-surface-variant dark:text-zinc-400">
            Please provide a cancellation reason. This will be stored for audit and sent to the customer notifications system.
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface-variant dark:text-zinc-400">Cancellation Reason</label>
            <input 
              type="text" 
              placeholder="e.g. Out of stock, Customer request, Outlet closing early" 
              className="w-full px-4 py-2.5 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-on-surface dark:text-zinc-200 text-sm outline-none focus:border-primary transition-all"
              value={cancelModal.reason}
              onChange={(e) => setCancelModal(prev => ({ ...prev, reason: e.target.value }))}
              maxLength={255}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border-base dark:border-zinc-850">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setCancelModal({ open: false, orderId: null, reason: '' })}
            >
              Close
            </Button>
            <Button 
              type="submit" 
              variant="danger"
            >
              Cancel Order
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

