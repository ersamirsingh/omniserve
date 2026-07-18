import { useState, useEffect } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { listHelpRequestsApi, resolveHelpRequestApi } from '../../api/models/helpRequest.api';
import { HiOutlineChatBubbleLeftRight, HiOutlineDocumentText, HiOutlineCheckCircle, HiOutlineClock, HiOutlineArrowPath } from 'react-icons/hi2';

export default function ResolveQueriesPage() {
  const { addToast } = useToast();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Resolution Form State
  const [status, setStatus] = useState('OPEN');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState(null);

  const fetchTickets = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await listHelpRequestsApi();
      setTickets(res.data?.data?.requests || []);
      if (isManual) addToast('Support queries refreshed', 'success');
    } catch (err) {
      addToast('Failed to load support tickets', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleOpenResolve = (ticket) => {
    setSelectedTicket(ticket);
    setStatus(ticket.status);
    setNote(ticket.resolutionNote || '');
  };

  const handleSaveResolution = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;

    setSubmitting(true);
    try {
      await resolveHelpRequestApi(selectedTicket._id, {
        status,
        resolutionNote: note
      });
      addToast('Support ticket updated successfully!', 'success');
      setSelectedTicket(null);
      fetchTickets();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update ticket', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (s) => {
    if (s === 'RESOLVED') return <Badge variant="success">RESOLVED</Badge>;
    if (s === 'IN_PROGRESS') return <Badge variant="warning">IN PROGRESS</Badge>;
    return <Badge variant="neutral">OPEN</Badge>;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in pb-12">
      <PageHeader 
        section="System Administration"
        title="Resolve Support Queries" 
        description="Review incoming system crash reports, check console logs diagnostics, and send resolution confirmations back to users."
        actions={
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 font-bold"
            onClick={() => fetchTickets(true)}
            loading={refreshing}
            disabled={refreshing}
          >
            <HiOutlineArrowPath className="text-sm" /> Refresh
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-900 rounded-2xl p-16 text-center shadow-2xs space-y-4">
          <HiOutlineChatBubbleLeftRight className="text-5xl text-on-surface-variant/20 mx-auto" />
          <h3 className="text-sm font-bold text-on-background">No support queries found</h3>
          <p className="text-xs text-on-surface-variant dark:text-zinc-500 max-w-xs mx-auto">
            Everything looks healthy! No bug reports or support tickets have been submitted yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {tickets.map((t) => {
            const requesterName = t.userId ? `${t.userId.firstName} ${t.userId.lastName || ''}`.trim() : 'Deleted User';
            const requesterEmail = t.userId ? t.userId.email : '—';
            return (
              <div 
                key={t._id} 
                className="bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-900 rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row gap-6 justify-between items-start"
              >
                <div className="flex-1 space-y-4 w-full">
                  {/* Requester Profile & Metadata */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary dark:text-primary-fixed-dim flex items-center justify-center font-bold text-sm">
                      {requesterName[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-on-surface dark:text-zinc-200">{requesterName}</h4>
                      <p className="text-[10px] text-on-surface-variant dark:text-zinc-500 font-semibold">{requesterEmail} • {t.userRole}</p>
                    </div>
                    <div className="ml-auto md:ml-4">
                      {getStatusBadge(t.status)}
                    </div>
                  </div>

                  {/* Bug Description */}
                  <div className="p-4 bg-surface-subtle dark:bg-zinc-900/50 border border-border-base/50 dark:border-zinc-850 rounded-xl space-y-2 text-xs">
                    <span className="text-[10px] text-on-surface-variant dark:text-zinc-500 font-extrabold uppercase tracking-wide block">Issue Description</span>
                    <p className="font-semibold text-on-surface dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                      {t.description}
                    </p>
                  </div>

                  {/* Technical Diagnostic Context */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-surface-subtle dark:bg-zinc-900/40 border border-border-base dark:border-zinc-850 rounded-xl space-y-1.5 text-[11px]">
                      <span className="text-[9px] text-on-surface-variant dark:text-zinc-550 font-bold uppercase tracking-wider block">Context Details</span>
                      <div className="flex justify-between font-semibold"><span className="text-on-surface-variant dark:text-zinc-500">Route:</span> <span className="font-mono text-primary dark:text-primary-fixed-dim">{t.context.pageRoute}</span></div>
                      <div className="flex justify-between font-semibold"><span className="text-on-surface-variant dark:text-zinc-500">Time:</span> <span className="text-on-surface dark:text-zinc-400">{new Date(t.context.timestamp).toLocaleString()}</span></div>
                      {t.restaurantName && (
                        <div className="flex justify-between font-semibold border-t border-border-base/10 pt-1">
                          <span className="text-on-surface-variant dark:text-zinc-500 shrink-0">Restaurant:</span>
                          <span className="text-on-surface dark:text-zinc-400 font-mono text-[10px] text-right truncate pl-2" title={`${t.restaurantName} (${t.restaurantId})`}>
                            {t.restaurantName} ({t.restaurantId})
                          </span>
                        </div>
                      )}
                      {t.outletName && (
                        <div className="flex justify-between font-semibold border-t border-border-base/10 pt-1">
                          <span className="text-on-surface-variant dark:text-zinc-500 shrink-0">Outlet:</span>
                          <span className="text-on-surface dark:text-zinc-400 font-mono text-[10px] text-right truncate pl-2" title={`${t.outletName} (${t.outletId})`}>
                            {t.outletName} ({t.outletId})
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-surface-subtle dark:bg-zinc-900/40 border border-border-base dark:border-zinc-850 rounded-xl space-y-1.5 text-[11px] flex flex-col justify-between">
                      <span className="text-[9px] text-on-surface-variant dark:text-zinc-550 font-bold uppercase tracking-wider block">Attachment Screenshot</span>
                      {t.screenshot ? (
                        <button 
                          onClick={() => setEnlargedImage(t.screenshot)}
                          className="text-[10px] text-primary dark:text-primary-fixed-dim hover:underline font-bold text-left self-start cursor-pointer focus:outline-none"
                        >
                          View Attachment (Click to zoom) 🖼️
                        </button>
                      ) : (
                        <span className="text-on-surface-variant/40 dark:text-zinc-650 italic">No attachments provided.</span>
                      )}
                    </div>
                  </div>

                  {/* Logs snippet */}
                  {t.context.errorLogSnippet && t.context.errorLogSnippet !== 'No recent errors logged.' && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-on-surface-variant dark:text-zinc-450 uppercase tracking-wide block">Console Errors Snippet</span>
                      <pre className="p-3 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-850 rounded-xl text-[9px] font-mono text-red-500 dark:text-red-400 max-h-24 overflow-y-auto whitespace-pre-wrap leading-tight">
                        {t.context.errorLogSnippet}
                      </pre>
                    </div>
                  )}

                  {/* Resolution note */}
                  {t.resolutionNote && (
                    <div className="p-3 bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100/30 dark:border-emerald-900/20 rounded-xl text-xs text-emerald-750 dark:text-emerald-400 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider block">Resolution Note:</span>
                      <p className="font-semibold">{t.resolutionNote}</p>
                    </div>
                  )}
                </div>

                {/* Resolve Action Panel */}
                <div className="flex sm:flex-col gap-2 shrink-0 self-stretch justify-end border-t md:border-t-0 md:border-l border-border-base dark:border-zinc-900 pt-4 md:pt-0 md:pl-6">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleOpenResolve(t)}
                    className="font-bold flex items-center gap-1.5"
                  >
                    Resolve Ticket
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolution Action Modal */}
      <Modal 
        isOpen={!!selectedTicket} 
        onClose={() => setSelectedTicket(null)} 
        title="Resolve Support Ticket"
        size="sm"
      >
        <form onSubmit={handleSaveResolution} className="space-y-4 text-xs font-semibold text-on-surface dark:text-zinc-350">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">
              Update Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg outline-none cursor-pointer focus:border-primary text-xs"
            >
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">
              Resolution Response Notes
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Write a response or note detailing the fix, instructions, or resolution for the requester..."
              rows={4}
              className="w-full px-3 py-2 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs placeholder-on-surface-variant/40"
            />
          </div>

          <div className="flex gap-2 justify-end pt-3 border-t border-border-base dark:border-zinc-900">
            <Button size="sm" variant="outline" onClick={() => setSelectedTicket(null)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" loading={submitting} variant="primary">
              Save Resolution
            </Button>
          </div>
        </form>
      </Modal>

      {/* Image Zoom Modal */}
      <Modal isOpen={!!enlargedImage} onClose={() => setEnlargedImage(null)} title="Attachment Zoom" size="md">
        <div className="flex justify-center bg-black/5 dark:bg-black/40 p-2 rounded-2xl">
          <img src={enlargedImage} alt="Attachment" className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl" />
        </div>
      </Modal>
    </div>
  );
}
