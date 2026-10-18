import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CategoryOnboarding from '../components/CategoryOnboarding';
import { useAuth } from '../context/AuthContext';
import { chatService } from '../api/api';
import { connectSocket } from '../utils/socket';
import {
  MessageSquare,
  Send,
  Wifi,
  WifiOff,
  ShieldCheck,
  AlertCircle,
  Users,
  MoreVertical,
  Edit2,
  Trash2,
  Check,
  X,
  Lock,
  ArrowDown,
  Sparkles,
  Loader2,
  GraduationCap,
  Atom,
  Code,
  Compass
} from 'lucide-react';

const CATEGORY_META = {
  'government-exams': {
    title: 'Government Exam Preparation',
    short: 'Govt Exams',
    desc: 'SSC, UPSC, Banking, Railways & State PSC competitive discussions',
    icon: GraduationCap,
  },
  'iit-neet': {
    title: 'IIT / NEET Preparation',
    short: 'IIT / NEET',
    desc: 'Engineering & Medical entrance physics, chemistry, biology & maths discussions',
    icon: Atom,
  },
  'skills': {
    title: 'Skills & Career Development',
    short: 'Skills & Tech',
    desc: 'Programming, web development, data structures & career preparation discussions',
    icon: Code,
  },
  'other': {
    title: 'General Learning & Other',
    short: 'General',
    desc: 'Foundational learning, general subjects & self-paced study discussions',
    icon: Compass,
  },
};

export default function Chat() {
  const { user, refreshUser } = useAuth();

  // If user is admin, allow observing other rooms; students are strictly bound to user.category
  const userCategory = user?.category || 'skills';
  const [activeRoom, setActiveRoom] = useState(userCategory);

  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [connected, setConnected] = useState(false);
  const [presenceCount, setPresenceCount] = useState(1);
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isScrolledUp, setIsScrolledUp] = useState(false);

  // Edit message state
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Action menu dropdown state
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Onboarding modal if user has no category
  const [showOnboarding, setShowOnboarding] = useState(!user?.category);

  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const textareaRef = useRef(null);

  // Keep activeRoom in sync with user's category (unless admin specifically observes another)
  useEffect(() => {
    if (user?.role !== 'admin' && user?.category && activeRoom !== user.category) {
      setActiveRoom(user.category);
    }
  }, [user?.category, user?.role, activeRoom]);

  // Check scroll position to determine whether to auto-scroll
  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const isUp = el.scrollHeight - el.scrollTop - el.clientHeight > 120;
    setIsScrolledUp(isUp);
  };

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Socket Connection and event listeners
  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    const onConnect = () => {
      setConnected(true);
      setErrorMsg('');
      socket.emit('join_room', activeRoom);
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    const onConnectError = (err) => {
      console.warn('Socket connect error:', err.message);
      setConnected(false);
    };

    const onReceiveMessage = (msg) => {
      if (msg.room === activeRoom) {
        setMessages((prev) => {
          // Avoid duplicate message if already added
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });

        // Auto-scroll only if user is near bottom
        const el = messagesContainerRef.current;
        if (!el || el.scrollHeight - el.scrollTop - el.clientHeight <= 150) {
          setTimeout(() => scrollToBottom('smooth'), 50);
        }
      }
    };

    const onEditMessage = (payload) => {
      if (payload.room === activeRoom) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === payload._id
              ? { ...m, message: payload.message, isEdited: true, editedAt: payload.editedAt }
              : m
          )
        );
      }
    };

    const onDeleteMessage = (payload) => {
      if (payload.room === activeRoom) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === payload._id
              ? { ...m, isDeleted: true, message: 'This message was deleted' }
              : m
          )
        );
      }
    };

    const onRoomPresence = (payload) => {
      if (payload.room === activeRoom && payload.count !== undefined) {
        setPresenceCount(payload.count);
      }
    };

    const onCategoryUpdated = (payload) => {
      if (payload.newCategory) {
        refreshUser();
        setActiveRoom(payload.newCategory);
      }
    };

    const onErrorMessage = (payload) => {
      if (payload?.error) {
        setErrorMsg(payload.error);
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('receive_message', onReceiveMessage);
    socket.on('edit_message', onEditMessage);
    socket.on('delete_message', onDeleteMessage);
    socket.on('room_presence', onRoomPresence);
    socket.on('category_updated', onCategoryUpdated);
    socket.on('error_message', onErrorMessage);

    if (socket.connected) {
      setConnected(true);
      socket.emit('join_room', activeRoom);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('receive_message', onReceiveMessage);
      socket.off('edit_message', onEditMessage);
      socket.off('delete_message', onDeleteMessage);
      socket.off('room_presence', onRoomPresence);
      socket.off('category_updated', onCategoryUpdated);
      socket.off('error_message', onErrorMessage);
      socket.emit('leave_room', activeRoom);
    };
  }, [activeRoom, refreshUser]);

  // Load room message history via HTTP
  useEffect(() => {
    let isCancelled = false;

    const loadHistory = async () => {
      setLoadingHistory(true);
      setErrorMsg('');
      try {
        const history = await chatService.getHistory(activeRoom);
        if (!isCancelled) {
          setMessages(Array.isArray(history) ? history : []);
          setTimeout(() => scrollToBottom('auto'), 50);
        }
      } catch (err) {
        if (!isCancelled) {
          const errText = err.response?.data?.error || 'Failed to fetch message history.';
          setErrorMsg(errText);
        }
      } finally {
        if (!isCancelled) setLoadingHistory(false);
      }
    };

    loadHistory();
    return () => {
      isCancelled = true;
    };
  }, [activeRoom]);

  // Send message handler
  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    const trimmed = inputMessage.trim();
    if (!trimmed || sending) return;

    if (trimmed.length > 1000) {
      setErrorMsg('Message is too long (maximum 1,000 characters).');
      return;
    }

    setSending(true);
    setErrorMsg('');

    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      setErrorMsg('Chat is currently reconnecting. Please wait a moment.');
      setSending(false);
      return;
    }

    socket.emit('send_message', { room: activeRoom, message: trimmed }, (res) => {
      setSending(false);
      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        setInputMessage('');
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
        setTimeout(() => scrollToBottom('smooth'), 50);
      }
    });
  };

  // Keyboard shortcut: Enter to send, Shift+Enter for new line
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-resize textarea
  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  // Edit Message Handlers
  const handleStartEdit = (msg) => {
    setEditingMessageId(msg._id);
    setEditContent(msg.message);
    setActiveMenuId(null);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleSaveEdit = async (msgId) => {
    const trimmed = editContent.trim();
    if (!trimmed) {
      setErrorMsg('Message cannot be empty.');
      return;
    }
    if (trimmed.length > 1000) {
      setErrorMsg('Message exceeds 1000 characters.');
      return;
    }

    setSavingEdit(true);
    setErrorMsg('');

    const socket = socketRef.current;
    if (socket && socket.connected) {
      socket.emit('edit_message', { messageId: msgId, newContent: trimmed }, (res) => {
        setSavingEdit(false);
        if (res?.error) {
          setErrorMsg(res.error);
        } else {
          setEditingMessageId(null);
          setEditContent('');
        }
      });
    } else {
      // Fallback to REST
      try {
        await chatService.editMessage(msgId, trimmed);
        setMessages((prev) =>
          prev.map((m) =>
            m._id === msgId ? { ...m, message: trimmed, isEdited: true, editedAt: new Date() } : m
          )
        );
        setEditingMessageId(null);
        setEditContent('');
      } catch (err) {
        setErrorMsg(err.response?.data?.error || 'Failed to edit message.');
      } finally {
        setSavingEdit(false);
      }
    }
  };

  // Delete Message Handler
  const handleDeleteMessage = async (msgId) => {
    setActiveMenuId(null);
    if (!window.confirm('Delete this message? It will be replaced with a deleted notice.')) {
      return;
    }

    const socket = socketRef.current;
    if (socket && socket.connected) {
      socket.emit('delete_message', { messageId: msgId }, (res) => {
        if (res?.error) {
          setErrorMsg(res.error);
        }
      });
    } else {
      try {
        await chatService.deleteMessage(msgId);
        setMessages((prev) =>
          prev.map((m) =>
            m._id === msgId ? { ...m, isDeleted: true, message: 'This message was deleted' } : m
          )
        );
      } catch (err) {
        setErrorMsg(err.response?.data?.error || 'Failed to delete message.');
      }
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getSenderInitials = (name = '') => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const activeCategoryMeta = CATEGORY_META[activeRoom] || CATEGORY_META['skills'];
  const CategoryIcon = activeCategoryMeta.icon;

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF7ED] text-[#431407]">
      <Navbar />

      {/* Onboarding modal if user has no assigned category */}
      {showOnboarding && (
        <CategoryOnboarding
          onComplete={(cat) => {
            setShowOnboarding(false);
            setActiveRoom(cat);
            refreshUser();
          }}
          onClose={() => setShowOnboarding(false)}
        />
      )}

      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 flex flex-col min-h-0">
        
        {/* Chat Container Card */}
        <div className="clay-card bg-white border border-[#FED7AA] rounded-2xl flex-1 flex flex-col overflow-hidden shadow-sm h-[calc(100vh-140px)] min-h-[500px]">
          
          {/* ─────────────────────────────────────────────────────────────
              1. CHAT HEADER
              Category name, description, lock indicator, presence & connection
             ───────────────────────────────────────────────────────────── */}
          <div className="px-4 sm:px-6 py-3.5 border-b border-[#FED7AA] bg-white flex items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] text-[#EA580C] flex items-center justify-center flex-shrink-0">
                <CategoryIcon size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm sm:text-base font-black text-[#431407] truncate">
                    {activeCategoryMeta.title}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] shadow-xs">
                    <Lock size={10} className="text-[#EA580C]" /> Category Locked
                  </span>
                </div>
                <p className="text-[11px] text-[#78716C] truncate mt-0.5">
                  {activeCategoryMeta.desc}
                </p>
              </div>
            </div>

            {/* Header Right: Presence & Status */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Online members indicator */}
              <div
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold text-[#431407] bg-[#FFF7ED] border border-[#FED7AA]"
                title="Active peers in this room"
              >
                <Users size={13} className="text-[#EA580C]" />
                <span>{presenceCount} online</span>
              </div>

              {/* Real-time Connection Status */}
              <div
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold ${
                  connected
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                }`}
                title={connected ? 'Real-time WebSocket connected' : 'Attempting to reconnect'}
              >
                {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
                <span className="hidden md:inline">{connected ? 'Live' : 'Reconnecting'}</span>
              </div>

              {/* Admin Room Switcher (Admins only) */}
              {user?.role === 'admin' && (
                <select
                  value={activeRoom}
                  onChange={(e) => setActiveRoom(e.target.value)}
                  className="text-xs font-bold bg-[#FFF7ED] border border-[#FED7AA] rounded-xl px-2 py-1 text-[#431407] focus:outline-none"
                  title="Admin Observation Room Switcher"
                >
                  {Object.entries(CATEGORY_META).map(([key, meta]) => (
                    <option key={key} value={key}>
                      Admin View: {meta.short}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Subheader Alert: 48h Expiry Notice */}
          <div className="px-4 py-1.5 bg-[#FFF7ED]/70 border-b border-[#FED7AA]/60 flex items-center justify-between text-[11px] text-[#78716C] flex-shrink-0">
            <span className="flex items-center gap-1 font-semibold">
              <Sparkles size={12} className="text-[#EA580C]" />
              StudyMate Community • Messages automatically expire after 48 hours
            </span>
            <span className="text-[10px] uppercase font-bold text-[#EA580C]">
              48h Retention Policy
            </span>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-xs font-bold flex items-center justify-between flex-shrink-0">
              <span className="flex items-center gap-1.5">
                <AlertCircle size={14} className="flex-shrink-0" />
                {errorMsg}
              </span>
              <button
                onClick={() => setErrorMsg('')}
                className="text-red-500 hover:text-red-800 p-0.5"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              2. MESSAGE AREA
              Current user on right, other peers on left, skeleton loading, empty state
             ───────────────────────────────────────────────────────────── */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-[#FAFAFA] relative"
          >
            {loadingHistory ? (
              /* Skeleton Loading State */
              <div className="space-y-4 animate-pulse">
                {[
                  { align: 'left', w: 'w-48' },
                  { align: 'right', w: 'w-64' },
                  { align: 'left', w: 'w-56' },
                  { align: 'right', w: 'w-40' },
                ].map((s, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 ${
                      s.align === 'right' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#FED7AA]/40 flex-shrink-0" />
                    <div className={`space-y-1.5 ${s.align === 'right' ? 'items-end' : 'items-start'}`}>
                      <div className="h-3 bg-[#FED7AA]/40 rounded w-20" />
                      <div className={`h-12 bg-white border border-[#FED7AA]/50 rounded-2xl ${s.w}`} />
                    </div>
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              /* Friendly Empty State */
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-14 h-14 rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] text-[#EA580C] flex items-center justify-center mb-3">
                  <MessageSquare size={26} />
                </div>
                <h3 className="text-base font-black text-[#431407]">
                  No messages yet in {activeCategoryMeta.short}
                </h3>
                <p className="text-xs text-[#78716C] mt-1 max-w-sm leading-relaxed">
                  Be the first to share questions, study tips, or discuss course topics with fellow students preparing in this category!
                </p>
                <div className="mt-4 px-3 py-1.5 rounded-xl bg-white border border-[#FED7AA] text-[11px] font-bold text-[#EA580C]">
                  Type a greeting below to start the conversation ↓
                </div>
              </div>
            ) : (
              /* Render Messages */
              messages.map((msg) => {
                const isMe = msg.senderId === user?._id || msg.senderId?.toString() === user?._id;
                const isEditingThis = editingMessageId === msg._id;
                const isMenuOpen = activeMenuId === msg._id;

                return (
                  <div
                    key={msg._id}
                    className={`flex items-start gap-2.5 group relative ${
                      isMe ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    {/* User Avatar / Initials */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 select-none shadow-xs ${
                        isMe
                          ? 'bg-[#EA580C] text-white'
                          : 'bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]'
                      }`}
                      title={msg.senderName}
                    >
                      {msg.senderAvatar ? (
                        <img
                          src={msg.senderAvatar}
                          alt={msg.senderName}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        getSenderInitials(msg.senderName)
                      )}
                    </div>

                    {/* Message Body & Metadata */}
                    <div
                      className={`flex flex-col max-w-[80%] sm:max-w-[70%] ${
                        isMe ? 'items-end' : 'items-start'
                      }`}
                    >
                      {/* Sender Info & Timestamp */}
                      <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px]">
                        <span className="font-bold text-[#431407]">
                          {isMe ? 'You' : msg.senderName}
                        </span>
                        <span className="text-[#A8A29E]">•</span>
                        <span className="text-[#78716C]">{formatTime(msg.createdAt)}</span>
                        {msg.isEdited && !msg.isDeleted && (
                          <span className="text-[10px] font-semibold text-[#EA580C] italic">
                            (edited)
                          </span>
                        )}
                      </div>

                      {/* Bubble Content or Inline Editor */}
                      {isEditingThis ? (
                        /* Inline Editor */
                        <div className="w-full min-w-[260px] sm:min-w-[320px] bg-white border-2 border-[#EA580C] rounded-2xl p-2.5 shadow-md space-y-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={2}
                            maxLength={1000}
                            className="w-full text-xs text-[#431407] bg-[#FFF7ED] p-2 rounded-xl border border-[#FED7AA] focus:outline-none focus:ring-1 focus:ring-[#EA580C] resize-none"
                            placeholder="Edit your message..."
                            autoFocus
                          />
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-[#78716C]">{editContent.length}/1000</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={handleCancelEdit}
                                disabled={savingEdit}
                                className="px-2.5 py-1 text-xs font-bold text-[#78716C] hover:bg-[#FFF7ED] rounded-lg transition"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveEdit(msg._id)}
                                disabled={savingEdit || !editContent.trim()}
                                className="clay-btn-primary px-3 py-1 text-xs font-black flex items-center gap-1 shadow-xs disabled:opacity-50"
                              >
                                {savingEdit ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                Save
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Standard Message Bubble */
                        <div className="relative group/bubble">
                          <div
                            className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs break-words ${
                              msg.isDeleted
                                ? 'bg-[#F3F4F6] text-[#9CA3AF] italic border border-dashed border-[#D1D5DB]'
                                : isMe
                                ? 'bg-[#FFF7ED] text-[#431407] border border-[#FED7AA] rounded-tr-sm'
                                : 'bg-white text-[#431407] border border-[#E5E7EB] rounded-tl-sm'
                            }`}
                          >
                            {msg.message}
                          </div>

                          {/* 3-Dot Action Menu for Current User's non-deleted messages */}
                          {isMe && !msg.isDeleted && (
                            <div className="absolute top-1 -left-7 opacity-0 group-hover/bubble:opacity-100 transition-opacity">
                              <button
                                onClick={() =>
                                  setActiveMenuId(isMenuOpen ? null : msg._id)
                                }
                                className="p-1 rounded-lg bg-white border border-[#FED7AA] text-[#78716C] hover:text-[#EA580C] hover:bg-[#FFF7ED] shadow-xs"
                                title="Message actions"
                              >
                                <MoreVertical size={13} />
                              </button>

                              {/* Dropdown Menu */}
                              {isMenuOpen && (
                                <>
                                  <div
                                    className="fixed inset-0 z-30"
                                    onClick={() => setActiveMenuId(null)}
                                  />
                                  <div className="absolute right-0 top-full mt-1 w-28 bg-white border border-[#FED7AA] rounded-xl p-1 shadow-lg z-40 animate-fadeIn">
                                    <button
                                      onClick={() => handleStartEdit(msg)}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-bold text-[#431407] hover:bg-[#FFF7ED] rounded-lg transition"
                                    >
                                      <Edit2 size={12} className="text-[#EA580C]" /> Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMessage(msg._id)}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition"
                                    >
                                      <Trash2 size={12} /> Delete
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Jump to New Messages floating button if user scrolled up */}
          {isScrolledUp && (
            <div className="absolute bottom-20 right-6 z-20">
              <button
                onClick={() => scrollToBottom('smooth')}
                className="clay-btn-secondary px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 shadow-md bg-white text-[#EA580C] border border-[#FED7AA]"
              >
                <ArrowDown size={14} /> New messages
              </button>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              3. MESSAGE COMPOSER
              Bottom sticky input, Enter to send, Shift+Enter for newline, length counter
             ───────────────────────────────────────────────────────────── */}
          <div className="p-3 sm:p-4 bg-white border-t border-[#FED7AA] flex-shrink-0">
            <form onSubmit={handleSendMessage} className="flex items-end gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  maxLength={1000}
                  placeholder={`Message your ${activeCategoryMeta.short} peers (Enter to send, Shift+Enter for new line)...`}
                  disabled={sending || !connected}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl text-[#431407] placeholder-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#EA580C] resize-none min-h-[42px] max-h-[120px] transition disabled:opacity-50"
                />
                {inputMessage.length > 800 && (
                  <span className="absolute right-3 bottom-2 text-[10px] font-bold text-[#EA580C]">
                    {inputMessage.length}/1000
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={!inputMessage.trim() || sending || !connected}
                className="clay-btn-primary p-3 rounded-2xl flex items-center justify-center shadow-xs disabled:opacity-40 flex-shrink-0 transition-transform active:scale-95"
                title="Send Message"
              >
                {sending ? (
                  <Loader2 size={16} className="animate-spin text-white" />
                ) : (
                  <Send size={16} className="text-white" />
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
