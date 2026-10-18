import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { chatService } from '../api/api';
import { connectSocket } from '../utils/socket';
import { 
  MessageSquare, 
  Send, 
  Wifi, 
  WifiOff, 
  Clock, 
  ShieldCheck, 
  AlertCircle, 
  Users, 
  GraduationCap, 
  Atom, 
  Code, 
  Compass 
} from 'lucide-react';

const ROOMS = [
  { id: 'government-exams', label: 'Government Exam Prep', icon: GraduationCap },
  { id: 'iit-neet', label: 'IIT / NEET Prep', icon: Atom },
  { id: 'skills', label: 'Skills & Career Dev', icon: Code },
  { id: 'other', label: 'Other Subjects', icon: Compass },
];

export default function Chat() {
  const { user } = useAuth();
  const [activeRoom, setActiveRoom] = useState(user?.category || 'government-exams');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Socket Connection and event listeners
  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    const onConnect = () => {
      setConnected(true);
      socket.emit('join_room', activeRoom);
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    const onReceiveMessage = (msg) => {
      if (msg.room === activeRoom) {
        setMessages((prev) => [...prev, msg]);
        scrollToBottom();
      }
    };

    const onConnectError = (err) => {
      console.warn('Socket connect error:', err.message);
      setConnected(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('receive_message', onReceiveMessage);

    if (socket.connected) {
      setConnected(true);
      socket.emit('join_room', activeRoom);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('receive_message', onReceiveMessage);
      socket.emit('leave_room', activeRoom);
    };
  }, [activeRoom]);

  // Load room history via HTTP
  useEffect(() => {
    let isCancelled = false;
    const loadHistory = async () => {
      setLoadingHistory(true);
      setErrorMsg('');
      try {
        const history = await chatService.getHistory(activeRoom);
        if (!isCancelled) {
          setMessages(history || []);
          setTimeout(scrollToBottom, 100);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to load chat history:', err);
          setErrorMsg('Failed to fetch message history.');
        }
      } finally {
        if (!isCancelled) setLoadingHistory(false);
      }
    };

    loadHistory();
    return () => { isCancelled = true; };
  }, [activeRoom]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || sending) return;

    setSending(true);
    setErrorMsg('');

    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      setErrorMsg('Chat is offline. Reconnecting...');
      setSending(false);
      return;
    }

    socket.emit('send_message', { room: activeRoom, message: inputMessage.trim() }, (res) => {
      setSending(false);
      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        setInputMessage('');
        scrollToBottom();
      }
    });
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getSenderInitials = (name = '') => {
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF7ED]">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col">
        {/* Room Header & Room Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-[#431407] tracking-tight">
                Student Learning Rooms
              </h1>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  connected
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
                {connected ? 'Live' : 'Connecting...'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#78716C] mt-1 flex items-center gap-1.5">
              <Clock size={13} className="text-[#EA580C]" /> Messages automatically expire after 48 hours.
            </p>
          </div>

          {/* Category Selector Tabs */}
          <div className="flex flex-wrap gap-2">
            {ROOMS.map((r) => {
              const Icon = r.icon;
              const isSelected = activeRoom === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setActiveRoom(r.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    isSelected
                      ? 'bg-[#EA580C] text-white shadow-sm'
                      : 'bg-white text-[#C2410C] border border-[#FED7AA] hover:bg-[#FFF7ED]'
                  }`}
                >
                  <Icon size={14} />
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat Container */}
        <div className="flex-1 clay-card bg-white flex flex-col overflow-hidden min-h-[500px] max-h-[680px]">
          {/* Room Topbar */}
          <div className="p-4 border-b border-[#FED7AA] bg-[#FFF7ED] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#EA580C] text-white flex items-center justify-center font-bold">
                <MessageSquare size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#431407]">
                  {ROOMS.find((r) => r.id === activeRoom)?.label}
                </h3>
                <p className="text-[10px] text-[#78716C]">
                  Peer discussion & question solving
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs text-[#78716C]">
              <ShieldCheck size={14} className="text-green-600" />
              <span className="hidden sm:inline">Encrypted & Self-Clearing</span>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {loadingHistory ? (
              <div className="h-full flex items-center justify-center text-xs text-[#78716C]">
                Loading conversation history...
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA] flex items-center justify-center mb-3">
                  <Users size={24} />
                </div>
                <h4 className="text-sm font-bold text-[#431407]">
                  No messages yet in this room
                </h4>
                <p className="text-xs text-[#78716C] max-w-sm mt-1">
                  Say hello, share what topic you are currently studying, or ask a question!
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMe = msg.senderId === user?.id || msg.senderId === user?._id;
                return (
                  <div
                    key={msg._id || idx}
                    className={`flex items-start gap-2.5 max-w-xl ${
                      isMe ? 'ml-auto flex-row-reverse' : ''
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isMe
                          ? 'bg-[#EA580C] text-white'
                          : 'bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]'
                      }`}
                    >
                      {getSenderInitials(msg.senderName)}
                    </div>

                    <div className="flex flex-col">
                      <div
                        className={`flex items-center gap-2 mb-1 text-[11px] ${
                          isMe ? 'justify-end text-right' : ''
                        }`}
                      >
                        <span className="font-bold text-[#431407]">
                          {isMe ? 'You' : msg.senderName}
                        </span>
                        <span className="text-[#78716C] text-[10px]">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>

                      <div
                        className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                          isMe
                            ? 'bg-[#EA580C] text-white rounded-tr-none shadow-[2px_2px_6px_rgba(154,52,18,0.25)]'
                            : 'bg-[#FFF7ED] text-[#431407] border border-[#FED7AA] rounded-tl-none'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={14} /> {errorMsg}
            </div>
          )}

          {/* Message Input Box */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 sm:p-4 border-t border-[#FED7AA] bg-[#FFF7ED]/50 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={`Message #${ROOMS.find((r) => r.id === activeRoom)?.label}...`}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="clay-input flex-1 py-2 sm:py-2.5 text-xs sm:text-sm bg-white"
              maxLength={1000}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || sending}
              className="clay-btn-primary px-4 py-2 sm:py-2.5 text-xs sm:text-sm"
              title="Send Message"
            >
              <Send size={15} />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
