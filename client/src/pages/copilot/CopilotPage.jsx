import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  HiOutlinePaperAirplane, 
  HiOutlineCpuChip, 
  HiOutlineUser, 
  HiOutlineArrowPath, 
  HiOutlineSparkles,
  HiOutlineExclamationTriangle,
  HiOutlineChartBar,
  HiOutlineSquare3Stack3D,
  HiOutlineMap,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineChatBubbleLeft
} from 'react-icons/hi2';
import api from '../../api/axios';
import useAuth from '../../hooks/useAuth';

export default function CopilotPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const messagesEndRef = useRef(null);

  // 1. Fetch all active sessions on mount
  useEffect(() => {
    fetchSessions();
  }, []);

  // 2. Initialize welcome message or load session history when session changes
  useEffect(() => {
    if (!currentSessionId) {
      const displayName = user?.firstName || user?.name || user?.email || 'there';
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          text: `Hello ${displayName}! I am your OmniServe Copilot. I can query unstructured notes, trace integration paths via the graph database, or run direct MongoDB aggregates. How can I help you today?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    }
  }, [currentSessionId, user]);

  // Scroll viewport to bottom on new messages
  useEffect(() => {
    if (!highlightedId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, highlightedId]);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/ai-copilot/chats');
      if (res.data?.success) {
        setSessions(res.data.sessions || []);
      }
    } catch (err) {
      console.error('[CopilotPage] Failed to fetch sessions:', err);
    }
  };

  const handleSelectSession = async (sid) => {
    if (sid === currentSessionId) return;
    setLoading(true);
    setCurrentSessionId(sid);
    try {
      const res = await api.get(`/ai-copilot/chats/${sid}`);
      if (res.data?.success) {
        const history = res.data.session.messages.map((m, idx) => ({
          id: m._id || idx.toString(),
          role: m.role,
          text: m.text,
          routing: m.routing,
          timestamp: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));
        setMessages(history);
      }
    } catch (err) {
      console.error('[CopilotPage] Failed to load session details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = async () => {
    try {
      const res = await api.post('/ai-copilot/chats', { title: 'New Chat' });
      if (res.data?.success) {
        const newSess = res.data.session;
        setSessions(prev => [newSess, ...prev]);
        setCurrentSessionId(newSess._id);
        setMessages([]);
      }
    } catch (err) {
      console.error('[CopilotPage] Failed to create new session:', err);
    }
  };

  const handleDeleteSession = async (sid, e) => {
    e.stopPropagation(); // prevent selecting the chat session card row
    if (!confirm('Are you sure you want to delete this chat session?')) return;
    
    try {
      const res = await api.delete(`/ai-copilot/chats/${sid}`);
      if (res.data?.success) {
        setSessions(prev => prev.filter(s => s._id !== sid));
        if (currentSessionId === sid) {
          setCurrentSessionId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('[CopilotPage] Failed to delete session:', err);
    }
  };

  const handleSend = async (textToSend) => {
    const prompt = textToSend || input;
    if (!prompt.trim() || loading) return;

    // Add user message locally
    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/ai-copilot/chat', { 
        message: prompt,
        sessionId: currentSessionId 
      });
      const data = response.data;

      if (data.success) {
        const assistantMsg = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: data.answer,
          routing: data.routing,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, assistantMsg]);
        
        // Update sessionId if we started a new session dynamically
        if (!currentSessionId && data.sessionId) {
          setCurrentSessionId(data.sessionId);
        }
        
        // Refresh session list to show new names/updated dates
        fetchSessions();
      } else {
        throw new Error(data.message || 'Error occurred');
      }
    } catch (err) {
      console.error('[CopilotPage] Chat error:', err);
      const errMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: `Error: ${err.response?.data?.message || err.message || 'Failed to reach AI Copilot backend.'}`,
        isError: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncData = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncStatus('syncing');

    try {
      const response = await api.post('/ai-copilot/sync?force=false');
      if (response.data?.success) {
        setSyncStatus('success');
        const details = response.data.details;
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            text: `System sync triggered successfully! Synchronized ${details.vectorSynced} vector points and processed ${details.graphSynced} graph mappings.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
        ]);
      } else {
        throw new Error(response.data?.message || 'Sync failed');
      }
    } catch (err) {
      console.error('[CopilotPage] Ingestion Sync error:', err);
      setSyncStatus('error');
    } finally {
      setTimeout(() => {
        setSyncing(false);
        setSyncStatus(null);
      }, 5000);
    }
  };

  const jumpToMessage = (msgId) => {
    const element = document.getElementById(`msg-${msgId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedId(msgId);
      setTimeout(() => {
        setHighlightedId(null);
      }, 2000);
    }
  };
  const getSuggestionsByRole = () => {
    const role = user?.role;
    if (role === 'SYSTEM_ADMIN') {
      return [
        { label: 'Analyze webhook error logs', text: 'Show recent webhook logs that failed and suggest a fix.' },
        { label: 'Explain sync job failures', text: 'Check recent SyncJob errors and debug the root cause.' },
        { label: 'Summarize system audits', text: 'Find recent critical audit logs and summarize user actions.' }
      ];
    }
    
    // Business/Analytics roles suggestions
    return [
      { label: 'Daily Revenue Trends', text: 'Show daily revenue and order counts for this month.' },
      { label: 'Top Sold Menu Items', text: 'What are the top 5 most ordered menu items?' },
      { label: 'Low Stock Alerts', text: 'Show all menu items currently low on inventory.' },
      { label: 'Review Sentiment Analysis', text: 'Summarize customer feedback ratings and overall sentiments.' }
    ];
  };

  const renderMessageText = (text) => {
    if (!text) return '';
    let formatted = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    formatted = formatted.replace(/```([\s\S]+?)```/g, '<pre class="bg-base-300 text-base-content rounded-lg p-3 my-2 overflow-x-auto border border-base-content/10 font-mono text-sm"><code>$1</code></pre>');
    formatted = formatted.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-base-200 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');
    formatted = formatted.replace(/\n/g, '<br/>');

    return <div className="space-y-1 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  const getRoutingIcon = (backend) => {
    switch (backend) {
      case 'structured-aggregation':
        return <HiOutlineChartBar className="w-3.5 h-3.5 mr-1" />;
      case 'graph':
        return <HiOutlineMap className="w-3.5 h-3.5 mr-1" />;
      default:
        return <HiOutlineSquare3Stack3D className="w-3.5 h-3.5 mr-1" />;
    }
  };

  const getRoutingLabel = (backend) => {
    switch (backend) {
      case 'structured-aggregation':
        return 'MongoDB Structured Aggregation';
      case 'graph':
        return 'GraphDB Cypher Traversal';
      case 'vector':
        return 'VectorDB Semantic Search';
      default:
        return 'RAG Query';
    }
  };

  return (
    <div className="flex flex-row h-[calc(100vh-120px)] bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 rounded-2xl overflow-hidden border border-border-base dark:border-zinc-800/80 shadow-2xl shadow-indigo-500/5 dark:shadow-none animate-fade-in">
      
      {/* 1. Cool Slate Sidebar */}
      <div className="w-68 border-r border-border-base dark:border-zinc-800/80 flex flex-col bg-slate-900 dark:bg-zinc-950 flex-shrink-0 max-sm:hidden">
        <div className="p-4 border-b border-slate-800 dark:border-zinc-900">
          <button 
            onClick={handleNewChat}
            className="btn btn-block gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 border-0 shadow-lg shadow-indigo-500/20 text-white font-semibold text-sm transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
          >
            <HiOutlinePlus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {sessions.length === 0 ? (
            <div className="text-center py-12 px-4">
              <HiOutlineChatBubbleLeft className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-55" />
              <p className="text-xs text-slate-500 font-semibold">No previous chats</p>
            </div>
          ) : (
            sessions.map((sess) => (
              <div 
                key={sess._id}
                onClick={() => handleSelectSession(sess._id)}
                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 border-l-2 ${
                  sess._id === currentSessionId 
                    ? 'bg-white/10 border-indigo-500 text-white font-bold shadow-inner' 
                    : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center space-x-2.5 overflow-hidden">
                  <HiOutlineChatBubbleLeft className={`w-4 h-4 flex-shrink-0 ${sess._id === currentSessionId ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span className="text-xs truncate w-38">{sess.title}</span>
                </div>
                
                <button
                  onClick={(e) => handleDeleteSession(sess._id, e)}
                  className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:opacity-100 cursor-pointer"
                  title="Delete Chat"
                >
                  <HiOutlineTrash className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-border-base dark:border-zinc-800/80 z-20">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-500 to-violet-600 text-white rounded-xl shadow-lg shadow-indigo-500/20">
              <HiOutlineCpuChip className="w-5.5 h-5.5 animate-pulse" />
            </div>
            <div className="flex items-center space-x-6">
              <div>
                <h1 className="font-extrabold text-lg text-on-surface dark:text-zinc-100 flex items-center gap-2">
                  OmniServe AI Copilot
                  <span className="badge badge-primary badge-xs py-1.5 px-2 uppercase font-extrabold tracking-widest text-[9px] shadow-sm shadow-primary/10">{user?.role}</span>
                </h1>
                <p className="text-[11px] font-medium text-on-surface-variant/80 dark:text-zinc-400/90 tracking-wide">Hybrid Vector + Graph + Structured Analytics</p>
              </div>

              {/* Timeline Track */}
              {messages.length > 0 && (
                <div className="flex items-center space-x-3 pl-6 border-l border-border-base dark:border-zinc-800 max-md:hidden">
                  <span className="text-[10px] uppercase font-black text-on-surface-variant/40 dark:text-zinc-500 tracking-wider">Timeline:</span>
                  <div className="relative flex items-center py-1">
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-slate-200 dark:bg-zinc-850 rounded -z-10" />
                    
                    <div className="flex items-center space-x-2">
                      {messages.map((msg, idx) => (
                        <button
                          key={msg.id}
                          onClick={() => jumpToMessage(msg.id)}
                          className={`w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-900 transition-all duration-300 hover:scale-130 focus:outline-none cursor-pointer hover:shadow-md ${
                            msg.id === highlightedId
                              ? 'bg-indigo-500 ring-4 ring-indigo-500/30 scale-125 z-10'
                              : msg.role === 'user'
                                ? 'bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 shadow-sm shadow-indigo-500/20'
                                : msg.isError
                                  ? 'bg-error shadow-sm shadow-error/20'
                                  : 'bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 shadow-sm shadow-emerald-500/20'
                          }`}
                          title={`${msg.role === 'user' ? 'You' : 'Copilot'}: ${(msg.text || '').substring(0, 35)}...`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sync Trigger for Admins */}
          {(user?.role === 'SYSTEM_ADMIN' || user?.role === 'SUPER_ADMIN') && (
            <button 
              onClick={handleSyncData}
              disabled={syncing}
              className={`btn btn-sm btn-ghost gap-2 border border-border-base dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-855 text-on-surface dark:text-zinc-200 font-semibold shadow-sm transition-all duration-200 ${syncing ? 'loading' : ''}`}
              title="Ingest new incremental delta data into vector and graph stores"
            >
              <HiOutlineArrowPath className={`w-4 h-4 text-indigo-500 dark:text-indigo-400 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Database'}
              {syncStatus === 'success' && <span className="w-2 h-2 rounded-full bg-success animate-ping"></span>}
              {syncStatus === 'error' && <span className="w-2 h-2 rounded-full bg-error"></span>}
            </button>
          )}
        </div>

        {/* Chat Messages Viewport */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/20 dark:bg-zinc-950/30">
          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="p-4 bg-indigo-500/5 dark:bg-indigo-500/10 text-indigo-500 rounded-2xl shadow-inner animate-bounce">
                <HiOutlineSparkles className="w-10 h-10" />
              </div>
              <div className="max-w-md">
                <h3 className="font-bold text-on-surface dark:text-zinc-200 text-base">Start a new conversation</h3>
                <p className="text-xs text-on-surface-variant/70 dark:text-zinc-500 mt-1.5 leading-relaxed">
                  Ask me about checkout errors, trace orders across integration channels, or perform aggregated calculations on menu revenues.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div 
              key={msg.id}
              id={`msg-${msg.id}`}
              className={`flex space-x-3.5 max-w-[85%] transition-all duration-500 ease-out ${
                msg.role === 'user' ? 'ml-auto flex-row-reverse space-x-reverse' : 'mr-auto'
              } ${
                msg.id === highlightedId
                  ? 'scale-102 ring-2 ring-indigo-500/40 ring-offset-4 dark:ring-offset-zinc-900 rounded-2xl p-2.5 bg-indigo-500/5 dark:bg-indigo-500/10 shadow-lg shadow-indigo-500/5'
                  : ''
              }`}
            >
              {/* Avatar with Glow */}
              <div className="flex-shrink-0">
                <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center shadow-md ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-tr from-indigo-500 to-violet-600 text-white ring-2 ring-indigo-500/20' 
                    : 'bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-zinc-800 dark:to-zinc-700 text-slate-700 dark:text-zinc-200 ring-2 ring-zinc-500/10'
                }`}>
                  {msg.role === 'user' ? <HiOutlineUser className="w-4.5 h-4.5" /> : <HiOutlineSparkles className="w-4.5 h-4.5 text-indigo-500" />}
                </div>
              </div>

              {/* Bubble content */}
              <div className="flex flex-col space-y-1.5">
                <div 
                  className={`p-4 rounded-2xl shadow-sm border text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white border-0 shadow-md shadow-indigo-600/10 rounded-tr-none font-medium' 
                      : msg.isError 
                        ? 'bg-red-50 dark:bg-red-950/10 text-red-800 dark:text-red-300 border-red-200/60 dark:border-red-900/30 rounded-tl-none' 
                        : 'bg-white/90 dark:bg-zinc-800/90 text-on-surface dark:text-zinc-200 border-border-base dark:border-zinc-700/60 rounded-tl-none backdrop-blur-sm'
                  }`}
                >
                  {renderMessageText(msg.text)}
                </div>

                {/* Timestamp & Metadata badges */}
                <div className={`flex items-center space-x-2 text-[10px] font-medium text-on-surface-variant/40 dark:text-zinc-500 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <span>{msg.timestamp}</span>
                  {msg.routing?.backend && (
                    <span className="badge badge-outline border-border-base dark:border-zinc-800 text-[10px] px-2 py-0.5 flex items-center bg-white/50 dark:bg-zinc-800/40 text-on-surface-variant/80 dark:text-zinc-400 shadow-sm">
                      {getRoutingIcon(msg.routing.backend)}
                      {getRoutingLabel(msg.routing.backend)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex space-x-3.5 mr-auto max-w-[80%] items-start">
              <div className="avatar placeholder flex-shrink-0">
                <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center ring-2 ring-zinc-500/10 shadow-md">
                  <HiOutlineSparkles className="w-4.5 h-4.5 text-indigo-500 animate-spin" />
                </div>
              </div>
              <div className="flex flex-col space-y-1.5">
                <div className="bg-white/90 dark:bg-zinc-800/90 border border-border-base dark:border-zinc-700/60 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center space-x-2.5 backdrop-blur-sm">
                  <span className="loading loading-dots loading-sm text-indigo-500"></span>
                  <span className="text-xs text-on-surface-variant/80 dark:text-zinc-400 font-medium">Routing and querying databases...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        {messages.length === 1 && (
          <div className="px-6 py-4 bg-white/70 dark:bg-zinc-900/70 border-t border-border-base dark:border-zinc-800/80">
            <p className="text-[10px] text-on-surface-variant/50 dark:text-zinc-500 mb-2.5 font-bold uppercase tracking-wider">Suggested Queries</p>
            <div className="flex flex-wrap gap-2.5">
              {getSuggestionsByRole().map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(s.text)}
                  className="btn btn-xs rounded-full border border-border-base dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700/80 text-on-surface-variant dark:text-zinc-300 hover:text-on-surface font-semibold text-xs py-1.5 px-4 h-auto shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Form */}
        <div className="p-4 bg-white/70 dark:bg-zinc-900/70 border-t border-border-base dark:border-zinc-800/80 flex items-center space-x-3 z-10">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask AI Copilot about errors, menu pricing, revenue summaries..."
            className="input input-bordered flex-1 focus:outline-none bg-slate-50/50 dark:bg-zinc-800/50 focus:bg-slate-100/40 dark:focus:bg-zinc-800/90 text-on-surface dark:text-zinc-100 border-border-base dark:border-zinc-700 shadow-inner rounded-xl focus:border-indigo-500 transition-all duration-250 py-2.5 px-4"
            disabled={loading}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="btn btn-primary bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white border-0 shadow-lg shadow-indigo-600/20 hover:scale-105 transition-all duration-300 rounded-xl px-4 flex items-center justify-center cursor-pointer"
          >
            <HiOutlinePaperAirplane className="w-5 h-5 rotate-90" />
          </button>
        </div>
      </div>
    </div>
  );
}
