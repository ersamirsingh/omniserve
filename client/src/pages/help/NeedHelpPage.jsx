import { useState, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { 
  HiOutlineChatBubbleLeftRight, 
  HiOutlineDocumentText, 
  HiOutlineArrowUpTray, 
  HiOutlineClipboard, 
  HiOutlineCheckCircle,
  HiOutlineMagnifyingGlass,
  HiOutlineClock,
  HiOutlineUser,
  HiOutlineShieldCheck
} from 'react-icons/hi2';
import { createHelpRequestApi, trackHelpRequestApi } from '../../api/models/helpRequest.api';

// Capture recent errors globally
const recentErrors = [];
const originalError = console.error;
console.error = (...args) => {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  recentErrors.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
  if (recentErrors.length > 5) recentErrors.shift();
  originalError.apply(console, args);
};

export default function NeedHelpPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState('');
  const [loading, setLoading] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [trackingCode, setTrackingCode] = useState(null);
  const [copied, setCopied] = useState(false);

  // Ticket tracking modal & thread states
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackedTicket, setTrackedTicket] = useState(null);
  const [issueComments, setIssueComments] = useState([]);
  const [trackError, setTrackError] = useState(null);
  const [enlargedImage, setEnlargedImage] = useState(null);

  useEffect(() => {
    setConsoleLogs([...recentErrors]);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      addToast('Attachment size must be under 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshot(reader.result);
      addToast('Screenshot loaded successfully!', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      addToast('Issue description is required', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        description: description.trim(),
        screenshot: screenshot || null,
        context: {
          pageRoute: window.location.pathname,
          timestamp: new Date().toISOString(),
          errorLogSnippet: consoleLogs.join('\n') || 'No recent errors logged.'
        }
      };

      const res = await createHelpRequestApi(payload);
      const code = res.data?.data?.trackingCode || res.data?.trackingCode;
      setTrackingCode(code || null);
      addToast('Your support ticket has been submitted. Save your tracking code!', 'success');
      setDescription('');
      setScreenshot('');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to submit help request', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (codeToCopy) => {
    const code = codeToCopy || trackingCode;
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleTrackTicket = async (e) => {
    if (e) e.preventDefault();
    const code = searchCode.trim().toUpperCase();
    if (!code) {
      addToast('Please enter a 12-character tracking code', 'error');
      return;
    }

    setTrackingLoading(true);
    setTrackError(null);
    setTrackedTicket(null);
    setIssueComments([]);

    try {
      const res = await trackHelpRequestApi(code);
      const ticketData = res.data?.data?.helpRequest || res.data?.helpRequest;
      const commentsData = res.data?.data?.issueComments || res.data?.issueComments || [];
      setTrackedTicket(ticketData);
      setIssueComments(commentsData);
      addToast('Ticket status thread retrieved successfully!', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'No ticket found matching this tracking code';
      setTrackError(msg);
      addToast(msg, 'error');
    } finally {
      setTrackingLoading(false);
    }
  };

  const openTrackWithCode = (code) => {
    if (code) setSearchCode(code);
    setTrackModalOpen(true);
    if (code) {
      setTrackingLoading(true);
      setTrackError(null);
      setTrackedTicket(null);
      setIssueComments([]);
      trackHelpRequestApi(code)
        .then((res) => {
          const ticketData = res.data?.data?.helpRequest || res.data?.helpRequest;
          const commentsData = res.data?.data?.issueComments || res.data?.issueComments || [];
          setTrackedTicket(ticketData);
          setIssueComments(commentsData);
        })
        .catch((err) => {
          setTrackError(err.response?.data?.message || 'No ticket found');
        })
        .finally(() => {
          setTrackingLoading(false);
        });
    }
  };

  const getStatusVariant = (st) => {
    if (st === 'RESOLVED') return 'success';
    if (st === 'IN_PROGRESS') return 'warning';
    return 'neutral';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
      <PageHeader 
        section="Help & Support"
        title="Need Help?" 
        description="Encountered a bug or system crash? Submit a support query with debug diagnostics directly to administrators."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTrackModalOpen(true)}
            className="font-bold flex items-center gap-1.5 shadow-xs border-primary/40 text-primary dark:text-primary-fixed-dim hover:bg-primary/5"
          >
            <HiOutlineMagnifyingGlass className="text-base text-primary" /> Track Issue Status
          </Button>
        }
      />

      {/* Tracking Code Banner after creation */}
      {trackingCode && (
        <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 dark:border-emerald-700/40 rounded-2xl p-5 flex items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <HiOutlineCheckCircle className="text-emerald-500 text-2xl shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Ticket Submitted Successfully</p>
              <p className="text-[11px] text-on-surface-variant dark:text-zinc-400 mt-0.5">Use this code to track your support ticket thread anytime.</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="font-mono text-[20px] font-black text-emerald-600 dark:text-emerald-300 tracking-[0.2em] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 px-3 py-1 rounded-lg">
                  {trackingCode}
                </span>
                <button
                  onClick={() => handleCopyCode(trackingCode)}
                  className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 transition-colors"
                >
                  {copied ? <HiOutlineCheckCircle className="text-base" /> : <HiOutlineClipboard className="text-base" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={() => openTrackWithCode(trackingCode)}
                  className="text-[11px] font-bold text-primary dark:text-primary-fixed-dim hover:underline flex items-center gap-1"
                >
                  View Thread →
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={() => setTrackingCode(null)}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg font-bold transition-colors shrink-0"
          >✕</button>
        </div>
      )}

      {/* Main Grid: Form & Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Help Form */}
        <div className="md:col-span-2 bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-900 p-6 rounded-2xl shadow-2xs space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-border-base dark:border-zinc-900">
            <HiOutlineChatBubbleLeftRight className="text-xl text-primary dark:text-primary-fixed-dim" />
            <h3 className="text-sm font-bold text-on-background">Report an Issue</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide">
                Issue Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe what broke or the action you were performing when the issue occurred..."
                rows={5}
                required
                className="w-full px-3.5 py-2.5 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-lg text-xs font-semibold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder-on-surface-variant/40"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide block">
                Attach Screenshot (Optional)
              </label>
              {screenshot ? (
                <div className="relative group w-48 h-32 rounded-xl overflow-hidden border border-border-base dark:border-zinc-800 bg-surface-subtle">
                  <img src={screenshot} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                    <Button size="sm" variant="danger" onClick={() => setScreenshot('')}>
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <label className="w-full h-24 border-2 border-dashed border-border-base dark:border-zinc-800 hover:border-primary dark:hover:border-primary-fixed-dim rounded-xl flex flex-col items-center justify-center text-center cursor-pointer bg-surface-subtle/10 dark:bg-zinc-900/10 transition-all">
                  <HiOutlineArrowUpTray className="text-xl text-on-surface-variant/50 mb-1" />
                  <span className="text-[11px] font-bold text-on-surface dark:text-zinc-300">Upload screenshot or file</span>
                  <span className="text-[9px] text-on-surface-variant dark:text-zinc-500 mt-0.5">PNG, JPG under 2MB</span>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              )}
            </div>

            <div className="pt-4 border-t border-border-base dark:border-zinc-900 flex justify-end">
              <Button type="submit" loading={loading} variant="primary" className="px-6 font-bold flex items-center gap-1.5">
                Submit Support Ticket
              </Button>
            </div>
          </form>
        </div>

        {/* Diagnostics Info */}
        <div className="bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-900 p-6 rounded-2xl shadow-2xs space-y-6 flex flex-col">
          <div className="flex items-center gap-2 pb-3 border-b border-border-base dark:border-zinc-900 shrink-0">
            <HiOutlineDocumentText className="text-xl text-primary dark:text-primary-fixed-dim" />
            <h3 className="text-sm font-bold text-on-background">Auto-Captured Context</h3>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            <div className="p-3 bg-surface-subtle dark:bg-zinc-900/50 border border-border-base/50 dark:border-zinc-850 rounded-xl space-y-2 text-xs">
              <div>
                <span className="text-[10px] text-on-surface-variant dark:text-zinc-500 font-bold block uppercase tracking-wide">Requester Role</span>
                <span className="font-bold text-on-surface dark:text-zinc-300">{user?.role || 'Guest'}</span>
              </div>
              <div>
                <span className="text-[10px] text-on-surface-variant dark:text-zinc-500 font-bold block uppercase tracking-wide">Current Page Path</span>
                <span className="font-mono text-primary dark:text-primary-fixed-dim font-bold">{window.location.pathname}</span>
              </div>
              <div>
                <span className="text-[10px] text-on-surface-variant dark:text-zinc-500 font-bold block uppercase tracking-wide">Capture Timestamp</span>
                <span className="font-semibold text-on-surface dark:text-zinc-300">{new Date().toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wide block">Recent Console Error Logs</span>
              <div className="w-full h-32 p-3 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl font-mono text-[9px] text-red-500 dark:text-red-400 overflow-y-auto whitespace-pre-wrap leading-tight">
                {consoleLogs.length > 0 ? (
                  consoleLogs.map((log, idx) => <div key={idx} className="pb-1 border-b border-red-500/5 last:border-0">{log}</div>)
                ) : (
                  <span className="text-zinc-400 dark:text-zinc-650 italic">No recent browser console errors captured.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Track Issue Modal Card with Threaded Discussion Log */}
      {trackModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
          <div className="bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-900 p-6 rounded-2xl w-[640px] max-w-[92vw] max-h-[88vh] overflow-y-auto space-y-5 shadow-2xl animate-scale-in flex flex-col">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-border-base dark:border-zinc-900 pb-3">
              <h3 className="text-base font-bold text-on-surface dark:text-zinc-150 flex items-center gap-2">
                <HiOutlineMagnifyingGlass className="text-primary text-xl" /> Track Problem Status Thread
              </h3>
              <button 
                onClick={() => { setTrackModalOpen(false); setTrackedTicket(null); setTrackError(null); setSearchCode(''); }} 
                className="text-zinc-400 hover:text-zinc-200 text-sm font-bold"
              >✕</button>
            </div>

            {/* Code Search Input Form */}
            <form onSubmit={handleTrackTicket} className="flex gap-2">
              <input
                type="text"
                required
                maxLength={12}
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                placeholder="Enter 12-character code (e.g. A3F9KX21M7QP)..."
                className="flex-1 px-4 py-2.5 bg-surface-subtle dark:bg-zinc-900 border border-border-base dark:border-zinc-800 rounded-xl text-xs font-mono font-bold uppercase tracking-widest text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:font-sans placeholder:tracking-normal placeholder:font-normal"
              />
              <Button 
                type="submit" 
                loading={trackingLoading} 
                variant="primary" 
                className="font-bold flex items-center gap-1.5 px-5 shrink-0"
              >
                Track
              </Button>
            </form>

            {/* Error Message */}
            {trackError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-semibold text-red-500 animate-fade-in">
                ⚠️ {trackError}
              </div>
            )}

            {/* Threaded Discussion Timeline Display */}
            {trackedTicket && (
              <div className="space-y-4 pt-2 border-t border-border-base dark:border-zinc-900 animate-fade-in flex-1">
                
                {/* Ticket Top Meta Banner */}
                <div className="p-3 bg-surface-subtle dark:bg-zinc-900/60 border border-border-base dark:border-zinc-800 rounded-xl flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">Tracking Code:</span>
                    <span className="font-mono text-sm font-black text-primary dark:text-primary-fixed-dim tracking-wider">{trackedTicket.trackingCode}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusVariant(trackedTicket.status)} className="uppercase font-bold text-[9px]">
                      {trackedTicket.status}
                    </Badge>
                  </div>
                </div>

                <div className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider block">
                  Thread Status & Discussion Log
                </div>

                {/* Vertical Timeline Thread Container */}
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
                  
                  {/* Thread Node 1: User Problem Submission */}
                  <div className="relative">
                    <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-primary/20 border-2 border-primary text-primary flex items-center justify-center text-[10px] font-bold">
                      1
                    </div>
                    <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/50 border border-border-base dark:border-zinc-850 rounded-xl space-y-2 text-xs">
                      <div className="flex justify-between items-center font-bold text-[10px] text-zinc-400">
                        <span className="flex items-center gap-1 text-primary">
                          <HiOutlineUser className="text-[11px]" />
                          Submitted by {trackedTicket.userId ? `${trackedTicket.userId.firstName} ${trackedTicket.userId.lastName || ''}`.trim() : 'Requester'} ({trackedTicket.userRole})
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <HiOutlineClock className="text-[11px]" />
                          {new Date(trackedTicket.createdAt).toLocaleString()}
                        </span>
                      </div>
                      
                      <p className="font-medium text-on-surface dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                        {trackedTicket.description}
                      </p>

                      {/* Cloudinary Screenshot Attachment if present */}
                      {trackedTicket.screenshot && (
                        <div className="pt-2 border-t border-zinc-200/50 dark:border-zinc-800 space-y-1">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide block">Attachment Screenshot (Cloudinary)</span>
                          <button 
                            onClick={() => setEnlargedImage(trackedTicket.screenshot)}
                            className="inline-block relative group rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800"
                          >
                            <img src={trackedTicket.screenshot} alt="Attachment" className="max-h-32 object-contain rounded-lg bg-black/5 dark:bg-black/20" />
                            <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold text-white transition-opacity">
                              Zoom Attachment 🔍
                            </span>
                          </button>
                        </div>
                      )}

                      {trackedTicket.context?.pageRoute && (
                        <div className="text-[10px] text-zinc-400 font-semibold pt-1">
                          Context Route: <code className="font-mono text-primary">{trackedTicket.context.pageRoute}</code>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Thread Node 2: Issue Comments / Updates from System Admins */}
                  {issueComments && issueComments.length > 0 && issueComments.map((comm, idx) => {
                    const isSystemLog = comm.authorName === 'System Log';
                    return (
                      <div key={idx} className="relative">
                        <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                          isSystemLog
                            ? 'bg-zinc-200 dark:bg-zinc-800 border-zinc-400 text-zinc-500'
                            : 'bg-primary/20 border-primary text-primary'
                        }`}>
                          💬
                        </div>
                        <div className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                          isSystemLog 
                            ? 'bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200/50 dark:border-zinc-900 text-zinc-500 italic' 
                            : 'bg-primary/5 border-primary/10 text-on-background'
                        }`}>
                          <div className="flex justify-between items-center font-bold text-[10px] mb-1">
                            <span className={isSystemLog ? 'text-zinc-500' : 'text-primary'}>
                              {comm.authorName}
                            </span>
                            <span className="text-zinc-400 font-mono">
                              {new Date(comm.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="font-semibold text-on-surface dark:text-zinc-200">{comm.message}</p>
                        </div>
                      </div>
                    );
                  })}

                  {/* Thread Node 3: Admin Resolution Note */}
                  {trackedTicket.resolutionNote && (
                    <div className="relative">
                      <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-500 flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </div>
                      <div className="p-3.5 bg-emerald-50/30 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl space-y-1.5 text-xs">
                        <div className="flex justify-between items-center font-bold text-[10px] text-emerald-600 dark:text-emerald-400">
                          <span className="flex items-center gap-1">
                            <HiOutlineShieldCheck className="text-sm" />
                            Resolved by {trackedTicket.resolvedBy ? `${trackedTicket.resolvedBy.firstName} ${trackedTicket.resolvedBy.lastName || ''}`.trim() : 'System Admin'}
                          </span>
                          {trackedTicket.resolvedAt && (
                            <span className="font-mono">{new Date(trackedTicket.resolvedAt).toLocaleString()}</span>
                          )}
                        </div>
                        <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                          {trackedTicket.resolutionNote}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Pending Resolution Node if still open */}
                  {!trackedTicket.resolutionNote && trackedTicket.status !== 'RESOLVED' && (
                    <div className="relative">
                      <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-amber-500/20 border-2 border-amber-500 text-amber-500 flex items-center justify-center text-[10px] font-bold">
                        ⏳
                      </div>
                      <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs font-semibold text-amber-600 dark:text-amber-400 italic">
                        Ticket is currently being reviewed by system administrators. Further thread updates will appear here.
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cloudinary Image Zoom Modal */}
      <Modal isOpen={!!enlargedImage} onClose={() => setEnlargedImage(null)} title="Attachment Zoom" size="md">
        <div className="flex justify-center bg-black/5 dark:bg-black/40 p-2 rounded-2xl">
          <img src={enlargedImage} alt="Attachment" className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl" />
        </div>
      </Modal>
    </div>
  );
}
