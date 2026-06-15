import { useState, useEffect } from 'react';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import { useToast } from '../../components/ui/Toast';
import { HiPlus } from 'react-icons/hi2';
import { listSubscriptionsApi, createSubscriptionApi, cancelSubscriptionApi, getCurrentSubscriptionApi } from '../../api/models/subscription.api';
import { SUBSCRIPTION_STATUS_VARIANT, SUBSCRIPTION_PLANS } from '../../utils/constants';

export default function SubscriptionsPage() {
  const [data, setData] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ plan: 'STARTER' });
  const { addToast } = useToast();

  const fetchData = async () => { setLoading(true); try { const [list, cur] = await Promise.allSettled([listSubscriptionsApi(), getCurrentSubscriptionApi()]); setData(list.status === 'fulfilled' && Array.isArray(list.value.data?.data) ? list.value.data.data : []); setCurrent(cur.status === 'fulfilled' ? cur.value.data?.data : null); } catch {} finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e) => { e.preventDefault(); try { await createSubscriptionApi(form); addToast('Subscription created', 'success'); setModal(false); fetchData(); } catch (err) { addToast(err.response?.data?.message || 'Failed', 'error'); } };
  const handleCancel = async (id) => { if (!confirm('Cancel subscription?')) return; try { await cancelSubscriptionApi(id); addToast('Cancelled', 'success'); fetchData(); } catch { addToast('Failed', 'error'); } };

  const columns = [
    { key: 'plan', label: 'Plan', render: (r) => <Badge variant="info">{r.plan}</Badge> },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={SUBSCRIPTION_STATUS_VARIANT[r.status] || 'neutral'}>{r.status}</Badge> },
    { key: 'startDate', label: 'Start', render: (r) => r.startDate ? new Date(r.startDate).toLocaleDateString() : '—' },
    { key: 'endDate', label: 'End', render: (r) => r.endDate ? new Date(r.endDate).toLocaleDateString() : '—' },
    { key: 'actions', label: '', render: (r) => r.status === 'ACTIVE' ? <Button size="sm" variant="danger" onClick={() => handleCancel(r._id)}>Cancel</Button> : null },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-xl font-bold text-slate-100">Subscriptions</h1>
        {!current && <Button onClick={() => setModal(true)}><HiPlus /> New Subscription</Button>}
      </div>

      {current && (
        <Card className="mb-6">
          <h3 className="mb-3 font-bold text-slate-100">Active Subscription</h3>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="info">{current.plan}</Badge>
            <Badge variant="success">ACTIVE</Badge>
            <span className="text-slate-500 text-sm">Expires: {current.endDate ? new Date(current.endDate).toLocaleDateString() : 'N/A'}</span>
          </div>
        </Card>
      )}

      <Table columns={columns} data={data} loading={loading} emptyMessage="No subscription history" />

      <Modal isOpen={modal} onClose={() => setModal(false)} title="New Subscription" size="sm">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-400">Plan</label>
            <select className="w-full px-4 py-2.5 bg-[#232640] border border-[rgba(99,102,241,0.15)] rounded-lg text-slate-100 text-sm outline-none cursor-pointer focus:border-indigo-500 transition-all" value={form.plan} onChange={(e) => setForm({ plan: e.target.value })}>
              {SUBSCRIPTION_PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-[rgba(99,102,241,0.15)]"><Button type="submit">Subscribe</Button></div>
        </form>
      </Modal>
    </div>
  );
}
