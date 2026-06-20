import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { listPaymentsApi, refundPaymentApi } from '../../api/models/payment.api';
import { getOrderByIdApi } from '../../api/models/order.api';
import { PAYMENT_STATUS_VARIANT, USER_ROLES } from '../../utils/constants';
import { HiOutlineEye, HiOutlineArrowUturnLeft } from 'react-icons/hi2';

export default function PaymentsPage() {
  const { user } = useSelector((s) => s.auth);
  const { addToast } = useToast();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  
  // Detail views
  const [orderModal, setOrderModal] = useState({ open: false, data: null, loading: false });
  const [refundModal, setRefundModal] = useState({ open: false, paymentId: null, refundTxId: '' });

  const isManager = [USER_ROLES.SUPER_ADMIN, USER_ROLES.RESTAURANT_OWNER, USER_ROLES.OUTLET_MANAGER].includes(user?.role);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const response = await listPaymentsApi(params);
      setData(Array.isArray(response.data?.data?.payments) ? response.data.data.payments : []);
    } catch {
      addToast('Failed to load transaction history', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [filterStatus]);

  const loadOrderDetails = async (orderId) => {
    setOrderModal({ open: true, data: null, loading: true });
    try {
      const response = await getOrderByIdApi(orderId);
      setOrderModal({ open: true, data: response?.data?.data, loading: false });
    } catch {
      addToast('Failed to load associated order details', 'error');
      setOrderModal({ open: false, data: null, loading: false });
    }
  };

  const handleRefundClick = (paymentId) => {
    setRefundModal({ open: true, paymentId, refundTxId: '' });
  };

  const submitRefund = async (e) => {
    e.preventDefault();
    if (!refundModal.refundTxId.trim()) {
      addToast('Refund Transaction ID is required', 'error');
      return;
    }
    try {
      await refundPaymentApi(refundModal.paymentId, {
        refundTransactionId: refundModal.refundTxId.trim(),
      });
      addToast('Refund processed successfully', 'success');
      setRefundModal({ open: false, paymentId: null, refundTxId: '' });
      fetchPayments();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to process refund', 'error');
    }
  };

  const columns = [
    { 
      key: 'transactionId', 
      label: 'Transaction ID', 
      render: (r) => <span className="font-mono text-xs font-semibold text-on-surface dark:text-zinc-300">{r.transactionId}</span> 
    },
    { 
      key: 'orderId', 
      label: 'Order Link', 
      render: (r) => (
        <button 
          onClick={() => loadOrderDetails(r.orderId)}
          className="font-mono text-xs text-primary dark:text-primary-fixed-dim hover:underline focus:outline-none"
        >
          #{r.orderId?.slice(-8)}
        </button>
      ) 
    },
    { 
      key: 'paymentMethod', 
      label: 'Method', 
      render: (r) => <Badge variant="neutral">{r.paymentMethod}</Badge> 
    },
    { 
      key: 'amount', 
      label: 'Amount', 
      render: (r) => <span className="font-bold text-on-surface dark:text-zinc-200">₹{(r.amount ?? 0).toLocaleString()}</span> 
    },
    { 
      key: 'status', 
      label: 'Status', 
      render: (r) => <Badge variant={PAYMENT_STATUS_VARIANT[r.status] || 'neutral'}>{r.status}</Badge> 
    },
    { 
      key: 'createdAt', 
      label: 'Date', 
      render: (r) => <span className="text-xs text-on-surface-variant dark:text-zinc-400">{new Date(r.createdAt).toLocaleString()}</span> 
    },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (r) => (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="secondary" onClick={() => loadOrderDetails(r.orderId)} title="View Order" className="!p-2">
            <HiOutlineEye className="text-base" />
          </Button>
          {r.status === 'SUCCESS' && isManager && (
            <Button size="sm" variant="danger" onClick={() => handleRefundClick(r.id)} className="flex items-center gap-1 font-bold">
              <HiOutlineArrowUturnLeft className="text-xs" /> Refund
            </Button>
          )}
        </div>
      ) 
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        section="Finance"
        title="Payments" 
        description="Verify cashier payments, review transactional gateway logs, and initiate authorization refunds."
      />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select 
          className="px-4 py-2.5 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-on-surface dark:text-zinc-200 text-sm outline-none cursor-pointer focus:border-primary transition-all duration-200" 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          {Object.keys(PAYMENT_STATUS_VARIANT).map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>

      <Table 
        columns={columns} 
        data={data} 
        loading={loading} 
        emptyMessage="No payment transactions found" 
      />

      {/* Associated Order Detail Modal */}
      <Modal
        isOpen={orderModal.open}
        onClose={() => setOrderModal({ open: false, data: null, loading: false })}
        title={`Order Details #${orderModal.data?.orderNumber?.slice(-8) || ''}`}
        size="md"
      >
        {orderModal.loading ? (
          <div className="flex justify-center py-12 items-center">
            <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></span>
          </div>
        ) : orderModal.data ? (
          <div className="space-y-5 text-sm text-on-surface dark:text-zinc-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-on-surface-variant dark:text-zinc-550 font-bold uppercase tracking-wider">Customer Details</span>
                <p className="font-semibold text-on-surface dark:text-zinc-250">
                  {orderModal.data.customerId ? `${orderModal.data.customerId.firstName} ${orderModal.data.customerId.lastName || ''}`.trim() : '—'}
                </p>
                <p className="text-xs text-on-surface-variant dark:text-zinc-400">{orderModal.data.customerId?.phone || 'No phone'}</p>
                <p className="text-xs text-on-surface-variant dark:text-zinc-400">{orderModal.data.customerId?.email || 'No email'}</p>
              </div>
              <div className="space-y-1 text-right">
                <span className="text-xs text-on-surface-variant dark:text-zinc-555 font-bold uppercase tracking-wider">Status Information</span>
                <p className="font-semibold">Order: <Badge variant="neutral">{orderModal.data.orderStatus}</Badge></p>
                <p className="text-xs mt-1 text-on-surface-variant dark:text-zinc-400">Payment: <Badge variant={PAYMENT_STATUS_VARIANT[orderModal.data.paymentStatus] || 'neutral'}>{orderModal.data.paymentStatus}</Badge></p>
              </div>
            </div>

            <hr className="border-border-base dark:border-zinc-800" />

            <div className="space-y-2">
              <span className="text-xs text-on-surface-variant dark:text-zinc-500 font-bold uppercase tracking-wider">Items Ordered</span>
              <div className="divide-y divide-border-base/50 dark:divide-zinc-800/50">
                {orderModal.data.items?.map((item) => (
                  <div key={item.id} className="py-2 flex justify-between items-center text-xs">
                    <span>{item.name} <strong className="text-primary">x{item.quantity}</strong></span>
                    <span className="font-bold text-on-surface dark:text-zinc-200">₹{(item.totalPrice ?? (item.unitPrice * item.quantity)).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <hr className="border-border-base dark:border-zinc-800" />

            <div className="flex justify-between font-extrabold text-on-surface dark:text-zinc-150 pt-1">
              <span>Total Amount Paid</span>
              <span>₹{orderModal.data.totalAmount?.toLocaleString() ?? 0}</span>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Process Refund Modal */}
      <Modal
        isOpen={refundModal.open}
        onClose={() => setRefundModal({ open: false, paymentId: null, refundTxId: '' })}
        title="Process Refund Authorization"
        size="sm"
      >
        <form onSubmit={submitRefund} className="space-y-4">
          <p className="text-xs text-on-surface-variant dark:text-zinc-400">
            Confirming this will refund the corresponding order amount back to the customer's account method. This action is irreversible.
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface-variant dark:text-zinc-400">Refund Transaction ID</label>
            <input 
              type="text" 
              placeholder="e.g. TXN-REF-10045" 
              className="w-full px-4 py-2.5 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-on-surface dark:text-zinc-200 text-sm outline-none focus:border-primary transition-all"
              value={refundModal.refundTxId}
              onChange={(e) => setRefundModal(prev => ({ ...prev, refundTxId: e.target.value }))}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border-base dark:border-zinc-850">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setRefundModal({ open: false, paymentId: null, refundTxId: '' })}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="danger"
            >
              Confirm Refund
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
