import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchOrders, updateOrderStatus } from '../../store/orderSlice';
import Button from '../../components/ui/Button';
import { ORDER_STATUS } from '../../utils/constants';

const cols = [
  { status: ORDER_STATUS.PENDING, label: 'Pending', color: 'text-amber-400' },
  { status: ORDER_STATUS.ACCEPTED, label: 'Accepted', color: 'text-blue-400' },
  { status: ORDER_STATUS.PREPARING, label: 'Preparing', color: 'text-indigo-400' },
  { status: ORDER_STATUS.READY, label: 'Ready', color: 'text-emerald-400' },
];

const next = { PENDING: 'ACCEPTED', ACCEPTED: 'PREPARING', PREPARING: 'READY', READY: 'PICKED_UP' };

export default function StaffDashboard() {
  const dispatch = useDispatch();
  const { orders } = useSelector((s) => s.orders);

  useEffect(() => { dispatch(fetchOrders()); }, [dispatch]);

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-100">Active Orders Board</h2>
        <p className="text-slate-500 text-sm">Click advance to move orders through the pipeline</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 animate-fade-in">
        {cols.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.status);
          return (
            <div key={col.status} className="bg-[rgba(26,29,46,0.65)] border border-[rgba(99,102,241,0.15)] rounded-2xl p-4 min-h-[300px]">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[rgba(99,102,241,0.15)]">
                <span className={`text-sm font-bold uppercase tracking-wider ${col.color}`}>{col.label}</span>
                <span className="w-6 h-6 rounded-full bg-[#232640] flex items-center justify-center text-xs font-bold text-slate-300">{colOrders.length}</span>
              </div>
              {colOrders.length === 0 && <p className="text-slate-500 text-xs text-center py-5">No orders</p>}
              {colOrders.map((order) => (
                <div key={order._id} className="bg-[#1a1d2e] border border-[rgba(99,102,241,0.15)] rounded-lg p-4 mb-2 hover:border-indigo-500 hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-xs text-slate-500 font-semibold">#{order._id?.slice(-6)}</div>
                  <div className="text-sm font-semibold text-slate-100 mt-1">{order.customerName || 'Customer'}</div>
                  <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                    <span>₹{order.totalAmount || 0}</span>
                    <span>{order.items?.length || 0} items</span>
                  </div>
                  {next[col.status] && (
                    <Button size="sm" variant="secondary" className="w-full mt-2" onClick={() => dispatch(updateOrderStatus({ id: order._id, status: next[col.status] }))}>
                      → {next[col.status]}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
