import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import BugReport from './BugReport';
import NotificationPanel from './NotificationPanel';
import { BookOpen, Zap, Trophy, User, Bug, ChevronDown, LogOut, MessageSquare, Video } from 'lucide-react';

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showBugReport, setShowBugReport] = useState(false);

  return (
    <>
      <nav className="navbar-blur flex justify-between items-center py-3 px-6 bg-white/80 dark:bg-slate-900/80 border-b border-orange-200/60 dark:border-slate-800 sticky top-0 z-20 shadow-sm">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="relative">
            <div className="btn-primary p-2.5 rounded-xl flex items-center justify-center">
              <BookOpen size={22} />
            </div>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-slate-900 pulse-dot" />
          </div>
          <div>
            <h1 className="text-xl font-black grad-text leading-none tracking-tight">
              Course Buddy
            </h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-widest uppercase leading-none mt-0.5">
              Learn · Track · Grow
            </p>
          </div>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Leaderboard quick link */}
          {user?.features?.canUseLeaderboard !== false && (
            <Link
              to="/leaderboard"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition"
            >
              <Trophy size={14} /> Leaderboard
            </Link>
          )}

          {/* Bug Report button */}
          {user?.features?.canReportBug !== false && (
            <button
              onClick={() => setShowBugReport(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition"
            >
              <Bug size={14} /> Report Bug
            </button>
          )}

          <NotificationPanel />
          <ThemeToggle />

          {/* User Menu */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-slate-800 border border-orange-200 dark:border-slate-700 hover:bg-orange-100 dark:hover:bg-slate-700 transition"
              >
                <div className="w-6 h-6 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center text-white text-xs font-black">
                  {getInitials(user.name)}
                </div>
                <span className="hidden sm:block text-xs font-bold text-slate-700 dark:text-slate-200 max-w-[80px] truncate">{user.name}</span>
                <ChevronDown size={13} className="text-slate-400" />
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-40 overflow-hidden">
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                      <p className="font-bold text-sm dark:text-white truncate">{user.name}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setShowMenu(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                      <User size={15} /> My Profile
                    </Link>
                    {user?.features?.canUseLeaderboard !== false && (
                      <Link
                        to="/leaderboard"
                        onClick={() => setShowMenu(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                      >
                        <Trophy size={15} /> Leaderboard
                      </Link>
                    )}
                    {user?.features?.canUseCommunity !== false && (
                      <Link
                        to="/thoughts"
                        onClick={() => setShowMenu(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                      >
                        <MessageSquare size={15} /> Thoughts
                      </Link>
                    )}
                    <Link
                      to="/telegram-sync"
                      onClick={() => setShowMenu(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                      <Video size={15} /> Telegram Sync
                    </Link>
                    {user?.features?.canReportBug !== false && (
                      <button
                        onClick={() => { setShowMenu(false); setShowBugReport(true); }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                      >
                        <Bug size={15} /> Report Bug
                      </button>
                    )}
                    <div className="border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => { setShowMenu(false); logout(); navigate('/login'); }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                      >
                        <LogOut size={15} /> Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      {showBugReport && <BugReport onClose={() => setShowBugReport(false)} />}
    </>
  );
}
