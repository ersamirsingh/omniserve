import { useState, useEffect, useCallback } from 'react';
import { getWaiterTasksApi, executeDiningOperationApi } from '../../../api/models/operations.api';
import { useSocket } from '../../../context/SocketContext';
import { useToast } from '../../../components/ui/Toast';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import { HiOutlineUser, HiOutlineExclamationCircle, HiOutlineClock, HiOutlineCheckCircle } from 'react-icons/hi2';

export default function WaiterConsole() {
  const { lastMessage } = useSocket();
  const { addToast } = useToast();
  
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');

  // Load active task list
  const fetchTasks = useCallback(async () => {
    try {
      const res = await getWaiterTasksApi();
      setTasks(res.data?.data?.tasks || []);
    } catch {
      addToast('Failed to load waiter tasks', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Update tasks list on receiving WebSocket events
  useEffect(() => {
    if (!lastMessage) return;
    const { event } = lastMessage;

    const taskSocketEvents = [
      'WAITER_TASK_CREATED', 'WAITER_TASK_ASSIGNED', 'WAITER_TASK_ACKNOWLEDGED',
      'WAITER_TASK_IN_PROGRESS', 'WAITER_TASK_COMPLETED', 'WAITER_TASK_CANCELLED',
      'WAITER_TASK_ESCALATED', 'QR_ASSISTANCE_REQUESTED'
    ];

    if (taskSocketEvents.includes(event)) {
      fetchTasks();
    }
  }, [lastMessage, fetchTasks]);

  // SLA countdown timer helper component
  const SLAProgressBar = ({ task }) => {
    const [timeLeft, setTimeLeft] = useState(0);
    const [percentage, setPercentage] = useState(100);

    useEffect(() => {
      const slaLimitMinutes = 5; // Fallback default
      const limitMs = slaLimitMinutes * 60 * 1000;
      const createdTime = new Date(task.createdAt).getTime();

      const interval = setInterval(() => {
        const elapsed = Date.now() - createdTime;
        const remaining = Math.max(0, limitMs - elapsed);
        const pct = Math.max(0, Math.min((remaining / limitMs) * 100, 100));

        setTimeLeft(Math.round(remaining / 1000));
        setPercentage(pct);

        if (remaining <= 0) {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }, [task]);

    if (task.status === 'COMPLETED') return <span className="text-success-green font-bold text-xs">Completed</span>;
    if (task.status === 'CANCELLED') return <span className="text-on-surface-variant font-semibold text-xs">Cancelled</span>;
    if (task.status === 'ESCALATED') return <span className="text-red-500 font-bold text-xs flex items-center gap-1"><HiOutlineExclamationCircle /> Breached</span>;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
      <div className="w-full space-y-1">
        <div className="flex justify-between text-[11px] font-semibold text-on-surface-variant dark:text-zinc-400">
          <span className="flex items-center gap-1"><HiOutlineClock /> SLA Countdown</span>
          <span className={timeLeft < 60 ? 'text-red-500 font-bold' : ''}>
            {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
          </span>
        </div>
        <div className="w-full bg-surface-container dark:bg-zinc-900 h-1.5 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${timeLeft < 60 ? 'bg-red-500' : 'bg-primary'}`} 
            style={{ width: `${percentage}%` }} 
          />
        </div>
      </div>
    );
  };

  const handleAction = async (taskId, action) => {
    // Action maps to executeOperation types like ACKNOWLEDGE_TASK, COMPLETE_TASK etc.
    // waitertask.model uses status PENDING, ASSIGNED, ACKNOWLEDGED, IN_PROGRESS, COMPLETED, CANCELLED, ESCALATED.
    // Let's implement standard execution call
    try {
      let operationType = '';
      if (action === 'accept') operationType = 'ACKNOWLEDGE_TASK';
      else if (action === 'start') operationType = 'START_TASK';
      else if (action === 'complete') operationType = 'COMPLETE_TASK';
      else if (action === 'escalate') operationType = 'ESCALATE_TASK';

      if (!operationType) return;

      await executeDiningOperationApi({
        operationType,
        payload: { taskId }
      });
      addToast(`Task marked as ${action}ed`, 'success');
      fetchTasks();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update task state', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const taskCategories = ['ALL', 'FOOD', 'CLEANING', 'WATER', 'BILL', 'CUSTOM'];

  const filteredTasks = tasks.filter(task => {
    if (filterType === 'ALL') return true;
    return task.taskType === filterType;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Category filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {taskCategories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterType(cat)}
            className={`px-4 py-2 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${
              filterType === cat
                ? 'bg-primary text-white dark:bg-primary-fixed dark:text-zinc-950 shadow-md'
                : 'bg-white text-on-surface-variant border border-border-base hover:bg-surface-container-low dark:bg-zinc-950 dark:text-zinc-400 dark:border-zinc-900'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-on-surface-variant dark:text-zinc-550 bg-white dark:bg-zinc-950 border border-dashed border-border-base dark:border-zinc-900 rounded-xl">
          <HiOutlineCheckCircle className="text-4xl text-success-green mb-3" />
          <span className="text-[14px] font-semibold">All task queues cleared!</span>
          <span className="text-[12px] mt-1">No pending waiter tasks active for this floor.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((task) => (
            <div 
              key={task._id || task.id} 
              className={`bg-white dark:bg-zinc-950 border rounded-xl p-5 shadow-sm flex flex-col justify-between h-[210px] transition-all ${
                task.status === 'ESCALATED' ? 'border-red-500' : 'border-border-base dark:border-zinc-900'
              }`}
            >
              {/* Top Row: Task type, Table ID, Priority badge */}
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-bold text-primary dark:text-primary-fixed-dim uppercase tracking-wider block">
                      {task.taskType}
                    </span>
                    <h4 className="text-[14px] font-bold text-on-background mt-0.5">
                      Table {task.tableId?.tableNumber || task.metadata?.tableNumber || 'N/A'} 
                      { (task.tableId?.diningAreaId?.name || task.metadata?.diningAreaName) && ` • ${task.tableId?.diningAreaId?.name || task.metadata?.diningAreaName}` }
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      task.priority === 'CRITICAL' || task.priority === 'HIGH'
                        ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                        : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-400'
                    }`}>
                      {task.priority || 'MEDIUM'}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-zinc-500 dark:text-zinc-450 space-y-0.5">
                  <p className="truncate">Session: <span className="font-mono text-[10px] bg-zinc-50 dark:bg-zinc-900 px-1 py-0.5 rounded border border-border-base/50 dark:border-zinc-800">{task.sessionId || 'N/A'}</span></p>
                  {task.seatNumber && <p>Seat: <span className="font-semibold text-on-surface">{task.seatNumber}</span></p>}
                  <p>Waiter: <span className="font-semibold text-on-surface">
                    {task.assignedWaiterId 
                      ? `${task.assignedWaiterId.firstName} ${task.assignedWaiterId.lastName || ''}`.trim()
                      : 'Unassigned'}
                  </span></p>
                </div>

                <p className="text-[12px] text-on-surface-variant dark:text-zinc-400 line-clamp-1">
                  {task.metadata?.notes || `Assistance request of type ${task.taskType}.`}
                </p>
              </div>

              {/* Middle Row: Progress and SLA */}
              <div className="my-2.5">
                <SLAProgressBar task={task} />
              </div>

              {/* Bottom Actions Row */}
              <div className="flex gap-2 justify-end">
                {task.status === 'PENDING' && (
                  <Button size="xs" variant="primary" onClick={() => handleAction(task._id, 'accept')}>
                    Accept
                  </Button>
                )}
                {task.status === 'ASSIGNED' && (
                  <Button size="xs" variant="primary" onClick={() => handleAction(task._id, 'accept')}>
                    Acknowledge
                  </Button>
                )}
                {(task.status === 'ACKNOWLEDGED' || task.status === 'ASSIGNED') && (
                  <Button size="xs" variant="outline" onClick={() => handleAction(task._id, 'start')}>
                    Start
                  </Button>
                )}
                {task.status === 'IN_PROGRESS' && (
                  <Button size="xs" variant="success" onClick={() => handleAction(task._id, 'complete')}>
                    Complete
                  </Button>
                )}
                {['PENDING', 'ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(task.status) && (
                  <Button size="xs" variant="outline" className="text-red-500 border-red-550 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => handleAction(task._id, 'escalate')}>
                    Escalate
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
