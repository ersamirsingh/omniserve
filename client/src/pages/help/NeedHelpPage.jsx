import { useState, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import { HiOutlineChatBubbleLeftRight, HiOutlineDocumentText, HiOutlineArrowUpTray, HiOutlineClipboard, HiOutlineCheckCircle } from 'react-icons/hi2';
import { createHelpRequestApi } from '../../api/models/helpRequest.api';

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

  useEffect(() => {
    // Populate logs from the captured queue
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

  const handleCopyCode = () => {
    if (!trackingCode) return;
    navigator.clipboard.writeText(trackingCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
      <PageHeader 
        section="Help & Support"
        title="Need Help?" 
        description="Encountered a bug or system crash? Submit a support query with debug diagnostics directly to the administrators."
      />

      {/* Tracking Code Banner */}
      {trackingCode && (
        <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 dark:border-emerald-700/40 rounded-2xl p-5 flex items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <HiOutlineCheckCircle className="text-emerald-500 text-2xl shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Ticket Submitted Successfully</p>
              <p className="text-[11px] text-on-surface-variant dark:text-zinc-400 mt-0.5">Use this code to track your support ticket status with an administrator.</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="font-mono text-[20px] font-black text-emerald-600 dark:text-emerald-300 tracking-[0.2em] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 px-3 py-1 rounded-lg">
                  {trackingCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 transition-colors"
                >
                  {copied ? <HiOutlineCheckCircle className="text-base" /> : <HiOutlineClipboard className="text-base" />}
                  {copied ? 'Copied!' : 'Copy'}
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
    </div>
  );
}
