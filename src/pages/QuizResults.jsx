import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { quizService } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, XCircle, ArrowLeft, Clock, Trophy, Target } from 'lucide-react';

const formatTime = (secs) => {
  const m = Math.floor((secs || 0) / 60).toString().padStart(2, '0');
  const s = ((secs || 0) % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export default function QuizResults() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    quizService.getResults(id)
      .then(setData)
      .catch(err => setError(err.response?.data?.error || 'Failed to load results'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900">
      <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900 text-white text-center px-4">
      <div>
        <p className="text-red-400 text-lg mb-4">{error}</p>
        <Link to="/dashboard" className="text-orange-400 hover:underline">Back to Dashboard</Link>
      </div>
    </div>
  );

  const { quiz, attempt, questions } = data;
  const scorePercent = questions.length > 0 ? Math.round((attempt.score / questions.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white px-4 py-8" style={{fontFamily:"'Inter',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet" />
      <div className="max-w-2xl mx-auto">
        
        {/* Back */}
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition">
          <ArrowLeft size={16} /> Dashboard
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black mb-1">{quiz.title}</h1>
          <p className="text-slate-400 text-sm">Your Results</p>
        </div>

        {/* Score cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <div className="text-3xl font-black text-green-400">{attempt.score}</div>
            <div className="text-xs text-slate-400 mt-1">Correct</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <div className="text-3xl font-black text-slate-300">{scorePercent}%</div>
            <div className="text-xs text-slate-400 mt-1">Accuracy</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <div className="text-3xl font-black text-orange-400">#{attempt.rank || '–'}</div>
            <div className="text-xs text-slate-400 mt-1">Your Rank</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <div className="text-3xl font-black text-sky-400">{formatTime(attempt.timeTaken)}</div>
            <div className="text-xs text-slate-400 mt-1">Time Taken</div>
          </div>
        </div>

        {/* Question breakdown */}
        <h2 className="text-lg font-black mb-4">Question Breakdown</h2>
        <div className="space-y-4 mb-8">
          {questions.map((q, idx) => {
            const userAnswer = attempt.answers?.find(a => String(a.questionId) === String(q._id));
            const selected = userAnswer?.selected || '';
            const isCorrect = selected === q.correctAnswer;
            return (
              <div key={q._id} className={`border rounded-2xl p-5 ${isCorrect ? 'border-green-500/40 bg-green-500/5' : 'border-red-500/40 bg-red-500/5'}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${isCorrect ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    {isCorrect ? <CheckCircle2 size={16} className="text-green-400" /> : <XCircle size={16} className="text-red-400" />}
                  </div>
                  <div className="flex-1">
                    {q.questionImage && <img src={q.questionImage} alt="" className="rounded-lg mb-2 max-h-32 object-cover" />}
                    <h3 className="font-semibold text-sm leading-relaxed">{idx + 1}. {q.questionText}</h3>
                  </div>
                </div>
                <div className="space-y-1.5 ml-10">
                  {[q.option1, q.option2, q.option3, q.option4].filter(Boolean).map((opt, i) => (
                    <div
                      key={i}
                      className={`px-4 py-2 rounded-xl text-sm ${
                        opt === q.correctAnswer ? 'bg-green-500/20 text-green-300 font-semibold' :
                        opt === selected && !isCorrect ? 'bg-red-500/20 text-red-300 line-through' :
                        'text-slate-400'
                      }`}
                    >
                      {opt === q.correctAnswer && <CheckCircle2 size={12} className="inline mr-2 text-green-400" />}
                      {opt === selected && !isCorrect && <XCircle size={12} className="inline mr-2 text-red-400" />}
                      {opt}
                    </div>
                  ))}
                </div>
                {q.explanation && (
                  <div className="mt-3 ml-10 text-xs text-slate-400 bg-white/5 rounded-xl px-3 py-2">
                    <span className="font-semibold text-slate-300">Explanation: </span>{q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link to={`/quiz/${id}/leaderboard`} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm text-center transition flex items-center justify-center gap-2">
            <Trophy size={16} /> Leaderboard
          </Link>
          <Link to="/dashboard" className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm text-center transition">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
