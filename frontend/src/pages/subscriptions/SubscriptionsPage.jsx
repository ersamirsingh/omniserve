import { useState, useEffect } from 'react';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { HiPlus } from 'react-icons/hi2';
import { listSubscriptionsApi, createSubscriptionApi, cancelSubscriptionApi, getCurrentSubscriptionApi } from '../../api/models/subscription.api';
import { SUBSCRIPTION_STATUS_VARIANT, SUBSCRIPTION_PLANS } from '../../utils/constants';

const defaultForm = {
  plan: 'STARTER',
  amount: 0,
  startDate: '',
  endDate: '',
};

export default function SubscriptionsPage() {
  const [data, setData] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const { addToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [list, cur] = await Promise.allSettled([
        listSubscriptionsApi(),
        getCurrentSubscriptionApi()
      ]);
      setData(list.status === 'fulfilled' && Array.isArray(list.value.data?.data?.subscriptions) ? list.value.data.data.subscriptions : []);
      setCurrent(cur.status === 'fulfilled' ? cur.value.data?.data : null);
    } catch {
      addToast('Failed to fetch subscriptions info', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (form.amount < 0) {
      addToast('Amount cannot be negative', 'error');
      return;
    }
    if (new Date(form.startDate) >= new Date(form.endDate)) {
      addToast('Start date must be before end date', 'error');
      return;
    }
    try {
      await createSubscriptionApi({
        plan: form.plan,
        amount: Number(form.amount),
        startDate: form.startDate,
        endDate: form.endDate,
      });
      addToast('Subscription plan activated successfully', 'success');
      setModal(false);
      setForm(defaultForm);
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create subscription', 'error');
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this active subscription?')) return;
    try {
      await cancelSubscriptionApi(id);
      addToast('Subscription cancelled successfully', 'success');
      fetchData();
    } catch {
      addToast('Failed to cancel subscription', 'error');
    }
  };

  const columns = [
    { key: 'plan', label: 'Plan', render: (r) => <Badge variant="info">{r.plan}</Badge> },
    { key: 'amount', label: 'Billing Amount', render: (r) => <span className="font-bold">₹{(r.amount ?? 0).toLocaleString()}</span> },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={SUBSCRIPTION_STATUS_VARIANT[r.status] || 'neutral'}>{r.status}</Badge> },
    { key: 'startDate', label: 'Start Date', render: (r) => r.startDate ? new Date(r.startDate).toLocaleDateString() : '—' },
    { key: 'endDate', label: 'End Date', render: (r) => r.endDate ? new Date(r.endDate).toLocaleDateString() : '—' },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (r) => r.status === 'ACTIVE' ? (
        <Button size="sm" variant="danger" onClick={() => handleCancel(r.id || r._id)}>Cancel</Button>
      ) : null 
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        section="Finance"
        title="Subscriptions" 
        description="Verify billing plans, configure starter limitations, and manage corporate active licenses."
        actions={
          !current && (
            <Button onClick={() => setModal(true)} className="flex items-center gap-1.5 font-bold">
              <HiPlus /> New Subscription
            </Button>
          )
        }
      />

      {current && (
        <Card className="mb-6 border-l-4 border-l-success-green">
          <h3 className="mb-3 font-bold text-on-surface dark:text-zinc-100">Active Subscription</h3>
          <div className="flex items-center gap-4 flex-wrap text-sm text-on-surface-variant dark:text-zinc-400">
            <Badge variant="info">{current.plan}</Badge>
            <Badge variant="success">ACTIVE</Badge>
            <span className="font-semibold text-on-surface dark:text-zinc-300">Amount: ₹{(current.amount ?? 0).toLocaleString()}</span>
            <span className="text-xs">Expires: {current.endDate ? new Date(current.endDate).toLocaleDateString() : 'N/A'}</span>
          </div>
        </Card>
      )}

      <Table columns={columns} data={data} loading={loading} emptyMessage="No subscription history available" />

      <Modal isOpen={modal} onClose={() => setModal(false)} title="New Subscription Plan" size="sm">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface-variant dark:text-zinc-400">Plan Tier</label>
            <select 
              className="w-full px-4 py-2.5 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-on-surface dark:text-zinc-200 text-sm outline-none cursor-pointer focus:border-primary transition-all" 
              value={form.plan} 
              onChange={(e) => setForm(prev => ({ ...prev, plan: e.target.value }))}
            >
              {SUBSCRIPTION_PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface-variant dark:text-zinc-400">Billing Amount (INR)</label>
            <input 
              type="number" 
              min="0" 
              placeholder="e.g. 5000" 
              className="w-full px-4 py-2.5 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-on-surface dark:text-zinc-200 text-sm outline-none focus:border-primary transition-all"
              value={form.amount} 
              onChange={(e) => setForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-on-surface-variant dark:text-zinc-400">Start Date</label>
              <input 
                type="date" 
                className="w-full px-4 py-2.5 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-on-surface dark:text-zinc-200 text-sm outline-none focus:border-primary transition-all"
                value={form.startDate} 
                onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-on-surface-variant dark:text-zinc-400">End Date</label>
              <input 
                type="date" 
                className="w-full px-4 py-2.5 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-on-surface dark:text-zinc-200 text-sm outline-none focus:border-primary transition-all"
                value={form.endDate} 
                onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border-base dark:border-zinc-850">
            <Button type="submit">Subscribe</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
