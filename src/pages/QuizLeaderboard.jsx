import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { quizService } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { Trophy, Medal, ArrowLeft, Clock, Target } from 'lucide-react';

const formatTime = (secs) => {
  const m = Math.floor((secs || 0) / 60).toString().padStart(2, '0');
  const s = ((secs || 0) % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const rankColors = ['from-amber-400 to-yellow-500', 'from-slate-300 to-slate-400', 'from-orange-700 to-orange-600'];
const rankIcons = ['🥇', '🥈', '🥉'];

export default function QuizLeaderboard() {
  const { id } = useParams();
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      quizService.getLeaderboard(id),
      quizService.getQuiz(id).catch(() => ({ quiz: null }))
    ]).then(([lb, qData]) => {
      setLeaderboard(lb);
      setQuiz(qData.quiz);
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900">
      <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  const myEntry = leaderboard.find(e => String(e.userId) === String(user?.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white px-4 py-8" style={{fontFamily:"'Inter',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet" />
      <div className="max-w-2xl mx-auto">

        <Link to="/dashboard" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition">
          <ArrowLeft size={16} /> Dashboard
        </Link>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-orange-500/30">
            <Trophy size={32} />
          </div>
          <h1 className="text-3xl font-black">{quiz?.title || 'Quiz'}</h1>
          <p className="text-slate-400 text-sm mt-1">Leaderboard — {leaderboard.length} participants</p>
        </div>

        {/* Top 3 podium */}
        {leaderboard.length >= 1 && (
          <div className="flex items-end justify-center gap-4 mb-10">
            {[leaderboard[1], leaderboard[0], leaderboard[2]].filter(Boolean).map((entry, i) => {
              const podiumIdx = i === 0 ? 1 : i === 1 ? 0 : 2;
              const heights = ['h-24', 'h-32', 'h-20'];
              return (
                <div key={entry.userId} className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500/30 to-amber-400/20 border-2 border-white/20 flex items-center justify-center overflow-hidden">
                    {entry.avatar ? <img src={entry.avatar} className="w-full h-full object-cover" alt="" /> : (
                      <span className="text-lg font-black">{entry.name?.[0]}</span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-center max-w-20 truncate">{entry.name}</span>
                  <div className={`${heights[i]} w-20 bg-gradient-to-t ${rankColors[podiumIdx]} rounded-t-xl flex flex-col items-center justify-center gap-1`}>
                    <span className="text-2xl">{rankIcons[podiumIdx]}</span>
                    <span className="text-xs font-bold">{entry.score}/{entry.totalQuestions}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* My position */}
        {myEntry && myEntry.rank > 3 && (
          <div className="mb-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-black text-lg">
              #{myEntry.rank}
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">Your Position</p>
              <p className="text-slate-400 text-xs">{myEntry.score}/{myEntry.totalQuestions} correct · {formatTime(myEntry.timeTaken)} · Score: {myEntry.rankScore}</p>
            </div>
          </div>
        )}

        {/* Full table */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-3 text-xs text-slate-400 font-bold border-b border-white/10 uppercase tracking-wider">
            <div className="col-span-1">#</div>
            <div className="col-span-5">Player</div>
            <div className="col-span-2 text-center">Score</div>
            <div className="col-span-2 text-center">Time</div>
            <div className="col-span-2 text-center">Points</div>
          </div>
          {leaderboard.map((entry, idx) => {
            const isMe = String(entry.userId) === String(user?.id);
            return (
              <div
                key={idx}
                className={`grid grid-cols-12 px-4 py-3 items-center border-b border-white/5 last:border-0 transition ${isMe ? 'bg-orange-500/10' : 'hover:bg-white/5'}`}
              >
                <div className="col-span-1">
                  {idx < 3 ? (
                    <span className="text-lg">{rankIcons[idx]}</span>
                  ) : (
                    <span className={`text-sm font-bold ${isMe ? 'text-orange-400' : 'text-slate-400'}`}>{entry.rank}</span>
                  )}
                </div>
                <div className="col-span-5 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-400/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {entry.avatar ? <img src={entry.avatar} className="w-full h-full object-cover" alt="" /> : (
                      <span className="text-xs font-black">{entry.name?.[0]}</span>
                    )}
                  </div>
                  <span className={`text-sm font-semibold truncate ${isMe ? 'text-orange-300' : ''}`}>{entry.name}{isMe && ' (You)'}</span>
                </div>
                <div className="col-span-2 text-center text-sm font-bold text-green-400">
                  {entry.score}/{entry.totalQuestions}
                </div>
                <div className="col-span-2 text-center text-sm text-slate-400">
                  {formatTime(entry.timeTaken)}
                </div>
                <div className="col-span-2 text-center text-sm font-black text-orange-400">
                  {entry.rankScore}
                </div>
              </div>
            );
          })}
          {leaderboard.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-sm">No submissions yet.</div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <Link to={`/quiz/${id}/results`} className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm text-center transition">
            My Results
          </Link>
          <Link to="/dashboard" className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm text-center transition">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
