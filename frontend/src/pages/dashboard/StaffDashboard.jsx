import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchOrders, updateOrderStatus } from '../../store/orderSlice';
import Button from '../../components/ui/Button';
import { ORDER_STATUS } from '../../utils/constants';

const cols = [
  { status: ORDER_STATUS.PENDING, label: 'Pending', color: 'text-amber-600 dark:text-amber-400' },
  { status: ORDER_STATUS.ACCEPTED, label: 'Accepted', color: 'text-blue-600 dark:text-blue-400' },
  { status: ORDER_STATUS.PREPARING, label: 'Preparing', color: 'text-purple-600 dark:text-purple-400' },
  { status: ORDER_STATUS.READY, label: 'Ready', color: 'text-emerald-650 dark:text-emerald-400' },
];

const next = { 
  PENDING: 'ACCEPTED', 
  ACCEPTED: 'PREPARING', 
  PREPARING: 'READY', 
  READY: 'PICKED_UP' 
};

export default function StaffDashboard() {
  const dispatch = useDispatch();
  const { orders, loading } = useSelector((s) => s.orders);

  useEffect(() => { 
    dispatch(fetchOrders()); 
  }, [dispatch]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5 mb-2">
        <h2 className="text-headline-lg font-headline-lg text-on-surface dark:text-zinc-100 text-[24px] font-bold tracking-tight">
          Active Orders Board
        </h2>
        <p className="text-body-md text-on-surface-variant dark:text-zinc-400 text-[14px]">
          Advance orders through the preparation pipeline.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
        {cols.map((col) => {
          const colOrders = orders.filter((o) => (o.orderStatus || o.status) === col.status);
          return (
            <div 
              key={col.status} 
              className="bg-white dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl p-4 min-h-[400px] flex flex-col shadow-sm"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border-base dark:border-zinc-850">
                <span className={`text-[12px] font-bold uppercase tracking-wider ${col.color}`}>
                  {col.label}
                </span>
                <span className="w-5.5 h-5.5 rounded-full bg-surface-container-low dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-on-surface-variant dark:text-zinc-350">
                  {colOrders.length}
                </span>
              </div>

              <div className="flex-1 flex flex-col gap-3.5 overflow-y-auto">
                {colOrders.length === 0 ? (
                  <p className="text-on-surface-variant/50 dark:text-zinc-650 text-xs text-center py-8 font-medium">No orders in this state</p>
                ) : (
                  colOrders.map((order) => (
                    <div 
                      key={order.id || order._id} 
                      className="bg-surface-subtle dark:bg-zinc-950 border border-border-base dark:border-zinc-800 rounded-lg p-4 hover:border-primary-container dark:hover:border-primary-fixed-dim hover:shadow-sm transition-all duration-200 cursor-pointer"
                    >
                      <div className="text-[10px] text-on-surface-variant dark:text-zinc-500 font-bold font-mono">
                        #{(order.id || order._id || '').slice(-6).toUpperCase()}
                      </div>
                      <div className="text-sm font-semibold text-on-surface dark:text-zinc-200 mt-1">
                        {order.customerName || 'Customer'}
                      </div>
                      <div className="flex items-center justify-between mt-3 text-xs text-on-surface-variant dark:text-zinc-400">
                        <span className="font-semibold text-on-surface dark:text-zinc-300">₹{order.totalAmount || 0}</span>
                        <span className="font-medium">{order.items?.length || 0} items</span>
                      </div>
                      {next[col.status] && (
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          className="w-full mt-3 text-[11px] font-bold" 
                          onClick={() => dispatch(updateOrderStatus({ id: order.id || order._id, status: next[col.status] }))}
                        >
                          → {next[col.status]}
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
