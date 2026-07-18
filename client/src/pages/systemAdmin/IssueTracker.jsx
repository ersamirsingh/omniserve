import { useState, useEffect } from 'react';
import { 
  HiOutlineChatBubbleLeftRight,
  HiOutlinePlus,
  HiOutlineUser,
  HiOutlineClock,
  HiOutlineTag,
  HiOutlinePaperAirplane,
  HiOutlineAdjustmentsHorizontal,
  HiOutlineExclamationTriangle
} from 'react-icons/hi2';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import PageHeader from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { listIssuesApi, createIssueApi, addIssueCommentApi, updateIssueStatusApi } from '../../api/models/systemAdmin.api';
import useAuth from '../../hooks/useAuth';

export default function IssueTracker() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [newIssueForm, setNewIssueForm] = useState({
    title: '',
    description: '',
    type: 'SUPPORT_QUERY',
    priority: 'MEDIUM',
    tenantId: '',
    restaurantId: '',
    outletId: '',
  });

  const fetchIssues = () => {
    setLoading(true);
    listIssuesApi()
      .then((res) => {
        setIssues(res.data?.data || []);
      })
      .catch(() => {
        addToast('Failed to load issues tracker board', 'error');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  const handleCreateIssue = (e) => {
    e.preventDefault();
    createIssueApi(newIssueForm)
      .then((res) => {
        addToast('Issue created and logged successfully', 'success');
        setIssues(prev => [res.data.data, ...prev]);
        setCreateModal(false);
        setNewIssueForm({
          title: '',
          description: '',
          type: 'SUPPORT_QUERY',
          priority: 'MEDIUM',
          tenantId: '',
          restaurantId: '',
          outletId: '',
        });
      })
      .catch(() => {
        addToast('Failed to log tracking issue', 'error');
      });
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedIssue) return;
    setSubmittingComment(true);

    addIssueCommentApi(selectedIssue._id || selectedIssue.id, commentText)
      .then((res) => {
        const updated = res.data.data;
        setIssues(prev => prev.map(iss => (iss._id === updated._id || iss.id === updated.id) ? updated : iss));
        setSelectedIssue(updated);
        setCommentText('');
        addToast('Comment added to issue thread', 'success');
      })
      .catch(() => {
        addToast('Failed to post reply comment', 'error');
      })
      .finally(() => {
        setSubmittingComment(false);
      });
  };

  const handleUpdateStatus = (status) => {
    if (!selectedIssue) return;
    updateIssueStatusApi(selectedIssue._id || selectedIssue.id, { status })
      .then((res) => {
        const updated = res.data.data;
        setIssues(prev => prev.map(iss => (iss._id === updated._id || iss.id === updated.id) ? updated : iss));
        setSelectedIssue(updated);
        addToast(`Issue status changed to ${status}`, 'success');
      })
      .catch(() => {
        addToast('Failed to update issue status', 'error');
      });
  };

  const handleAssignToMe = () => {
    if (!selectedIssue || !user) return;
    const userId = user.id || user._id;
    updateIssueStatusApi(selectedIssue._id || selectedIssue.id, { assigneeId: userId })
      .then((res) => {
        const updated = res.data.data;
        setIssues(prev => prev.map(iss => (iss._id === updated._id || iss.id === updated.id) ? updated : iss));
        setSelectedIssue(updated);
        addToast('Issue assigned to you successfully', 'success');
      })
      .catch(() => {
        addToast('Failed to assign issue', 'error');
      });
  };

  // Group issues by status columns
  const getColumnsData = () => {
    const cols = {
      OPEN: [],
      IN_PROGRESS: [],
      RESOLVED: [],
      CLOSED: [],
    };
    issues.forEach(iss => {
      const statusKey = iss.status || 'OPEN';
      if (cols[statusKey]) {
        cols[statusKey].push(iss);
      } else {
        cols.OPEN.push(iss);
      }
    });
    return cols;
  };

  const columns = getColumnsData();

  const getPriorityBadgeVariant = (priority) => {
    if (priority === 'CRITICAL') return 'danger';
    if (priority === 'HIGH') return 'danger';
    if (priority === 'MEDIUM') return 'warning';
    return 'neutral';
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <PageHeader
        section="System Admin"
        title="Admin Support & Issue Tracker"
        description="Monitor system alarms, crash logs, and user help queries in a unified collaborative board."
        actions={
          <Button onClick={() => setCreateModal(true)} variant="primary" className="font-bold flex items-center gap-1.5 shadow-md">
            <HiOutlinePlus /> Log New Issue
          </Button>
        }
      />

      {loading ? (
        <div className="py-24 flex justify-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 overflow-x-auto pb-4 items-start">
          {/* Columns map */}
          {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(colKey => {
            const colIssues = columns[colKey] || [];
            const colLabels = {
              OPEN: { label: 'Open Logs', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
              IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
              RESOLVED: { label: 'Resolved', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
              CLOSED: { label: 'Closed/Archive', color: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' },
            };
            const colTheme = colLabels[colKey];

            return (
              <div key={colKey} className="bg-zinc-50 dark:bg-zinc-950 border border-border-base dark:border-zinc-900/60 rounded-2xl p-4 flex flex-col gap-4 min-w-[260px] min-h-[500px]">
                <div className={`p-2.5 rounded-xl border font-black text-xs uppercase tracking-wide flex justify-between items-center ${colTheme.color}`}>
                  <span>{colTheme.label}</span>
                  <span className="w-5 h-5 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold">{colIssues.length}</span>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
                  {colIssues.length === 0 ? (
                    <div className="p-8 text-center text-zinc-400 dark:text-zinc-550 border border-dashed border-border-base dark:border-zinc-900 rounded-xl text-[11px] font-semibold">
                      No issues in this tier
                    </div>
                  ) : (
                    colIssues.map(issue => {
                      const ageDays = Math.floor((Date.now() - new Date(issue.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                      const timeLabel = ageDays === 0 ? 'Today' : ageDays === 1 ? 'Yesterday' : `${ageDays}d ago`;

                      return (
                        <div 
                          key={issue._id || issue.id}
                          onClick={() => setSelectedIssue(issue)}
                          className="bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-900 rounded-xl p-4 shadow-2xs space-y-3 cursor-pointer hover:shadow-md hover:border-primary dark:hover:border-zinc-800 transition-all"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <Badge variant={getPriorityBadgeVariant(issue.priority)} className="text-[8px] font-bold uppercase tracking-wider">
                              {issue.priority}
                            </Badge>
                            <span className="text-[9px] font-bold text-zinc-400 uppercase">{issue.type?.replace('_', ' ')}</span>
                          </div>

                          <h4 className="font-bold text-xs text-on-surface dark:text-zinc-200 line-clamp-1">{issue.title}</h4>
                          <p className="text-[11px] text-on-surface-variant dark:text-zinc-450 line-clamp-2 leading-relaxed">{issue.description}</p>

                          <div className="flex justify-between items-center pt-2 border-t border-zinc-100 dark:border-zinc-900/60 text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold">
                            <span className="flex items-center gap-1"><HiOutlineClock /> {timeLabel}</span>
                            <span className="flex items-center gap-1">
                              <HiOutlineUser className="text-[11px]" />
                              {issue.assigneeId ? `${issue.assigneeId.firstName || 'Admin'}` : 'Unassigned'}
                            </span>
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
      )}

      {/* Detail Modal with Threaded comment thread */}
      {selectedIssue && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
          <div className="bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-900 p-6 rounded-2xl w-[600px] max-w-[90vw] max-h-[85vh] overflow-y-auto space-y-5 shadow-2xl animate-scale-in flex flex-col">
            
            {/* Header info */}
            <div className="flex justify-between items-start border-b border-border-base dark:border-zinc-900 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={getPriorityBadgeVariant(selectedIssue.priority)} className="uppercase font-bold text-[9px]">{selectedIssue.priority}</Badge>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono">{selectedIssue.type}</span>
                  <span className="text-zinc-300">•</span>
                  <span className="text-[10px] text-zinc-400 font-semibold">{new Date(selectedIssue.createdAt).toLocaleString()}</span>
                </div>
                <h3 className="text-[16px] font-black text-on-surface dark:text-zinc-150 leading-tight">{selectedIssue.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedIssue(null)}
                className="btn btn-sm btn-ghost p-1 rounded-lg text-zinc-400 hover:text-on-background cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Description card */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-border-base dark:border-zinc-900 rounded-xl text-xs space-y-2">
              <p className="text-on-surface-variant dark:text-zinc-300 font-medium leading-relaxed whitespace-pre-wrap">{selectedIssue.description}</p>
              <div className="flex gap-4 text-[10px] text-zinc-400 font-bold pt-1">
                <span>Reporter: {selectedIssue.reporterName || 'System'} {selectedIssue.reporterEmail ? `(${selectedIssue.reporterEmail})` : ''}</span>
                {selectedIssue.outletId && <span>Outlet Scoped</span>}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 dark:border-zinc-900/60 pb-4">
              <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block mr-2">Admin Actions:</span>
              
              {selectedIssue.status !== 'RESOLVED' && selectedIssue.status !== 'CLOSED' && (
                <Button size="xs" variant="success" onClick={() => handleUpdateStatus('RESOLVED')}>
                  Resolve Issue
                </Button>
              )}
              {selectedIssue.status === 'OPEN' && (
                <Button size="xs" variant="primary" onClick={() => handleUpdateStatus('IN_PROGRESS')}>
                  Accept / In Progress
                </Button>
              )}
              {selectedIssue.status === 'RESOLVED' && (
                <Button size="xs" variant="outline" onClick={() => handleUpdateStatus('IN_PROGRESS')}>
                  Reopen
                </Button>
              )}
              {selectedIssue.status !== 'CLOSED' && (
                <Button size="xs" variant="danger" onClick={() => handleUpdateStatus('CLOSED')}>
                  Close & Archive
                </Button>
              )}
              
              {!selectedIssue.assigneeId ? (
                <Button size="xs" variant="outline" className="flex items-center gap-1 font-bold ml-auto" onClick={handleAssignToMe}>
                  <HiOutlineUser className="text-[11px]" /> Assign to Me
                </Button>
              ) : (
                <div className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1 ml-auto">
                  👤 Assigned to: <span className="text-primary">{selectedIssue.assigneeId.firstName || 'Another Admin'}</span>
                </div>
              )}
            </div>

            {/* Comments Thread Area */}
            <div className="space-y-3 flex-1 flex flex-col">
              <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">Thread Discussion Log ({selectedIssue.comments?.length || 0})</span>
              
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 flex-1">
                {selectedIssue.comments?.length === 0 ? (
                  <div className="p-6 text-center text-zinc-405 border border-dashed border-border-base dark:border-zinc-900 rounded-xl text-xs font-semibold">
                    No activity logs or replies on this issue. Use the reply block below to log updates.
                  </div>
                ) : (
                  selectedIssue.comments.map((comment, idx) => {
                    const isSystemLog = comment.authorName === 'System Log';
                    return (
                      <div 
                        key={idx} 
                        className={`p-2.5 rounded-xl border text-xs leading-relaxed ${
                          isSystemLog 
                            ? 'bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200/50 dark:border-zinc-900 text-zinc-500 italic' 
                            : 'bg-primary/5 border-primary/10 text-on-background'
                        }`}
                      >
                        <div className="flex justify-between items-center font-bold text-[10px] mb-1">
                          <span className={isSystemLog ? 'text-zinc-500' : 'text-primary'}>{comment.authorName}</span>
                          <span className="text-zinc-400">{new Date(comment.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="font-semibold">{comment.message}</p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                <input
                  type="text"
                  required
                  placeholder="Type a query reply or action update..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl p-2.5 text-xs text-on-background outline-none focus:ring-2 focus:ring-primary/20"
                />
                <Button type="submit" loading={submittingComment} disabled={!commentText.trim()} className="font-bold flex items-center gap-1.5 px-4">
                  <HiOutlinePaperAirplane className="rotate-45 text-xs" /> Send
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Manual Issue Creation Modal */}
      {createModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
          <form onSubmit={handleCreateIssue} className="bg-white dark:bg-zinc-950 p-6 border border-border-base dark:border-zinc-900 rounded-2xl w-[420px] max-w-[90vw] space-y-4 shadow-2xl animate-scale-in">
            <h3 className="text-[16px] font-black text-on-surface dark:text-zinc-150 flex items-center gap-1.5"><HiOutlineExclamationTriangle className="text-primary text-xl" /> Log Support Issue</h3>
            
            <div className="space-y-3">
              <Input
                id="iss-title"
                label="Issue Title"
                required
                value={newIssueForm.title}
                onChange={(e) => setNewIssueForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Brief summary of the query or alert"
              />
              
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide">Detailed Description</label>
                <textarea
                  required
                  rows={3}
                  value={newIssueForm.description}
                  onChange={(e) => setNewIssueForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-surface-container dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg p-2 text-xs text-on-background outline-none"
                  placeholder="Crash trace logs, support request details, or steps to reproduce..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Select
                  id="iss-type"
                  label="Category Type"
                  value={newIssueForm.type}
                  onChange={(e) => setNewIssueForm(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="SUPPORT_QUERY">Support Query</option>
                  <option value="CRASH_REPORT">Crash Report</option>
                  <option value="SYSTEM_DETECTED">System Alarm</option>
                </Select>
                
                <Select
                  id="iss-priority"
                  label="Priority Level"
                  value={newIssueForm.priority}
                  onChange={(e) => setNewIssueForm(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-150 dark:border-zinc-900">
              <Button size="sm" variant="outline" onClick={() => setCreateModal(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" type="submit" className="font-bold">
                Log Issue
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
