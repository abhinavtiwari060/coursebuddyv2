import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { quizService } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { Clock, CheckCircle2, XCircle, ArrowRight, Trophy, AlertTriangle } from 'lucide-react';

export default function QuizPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyAttempted, setAlreadyAttempted] = useState(false);
  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    loadQuiz();
    return () => clearInterval(timerRef.current);
  }, [id]);

  const loadQuiz = async () => {
    try {
      const data = await quizService.getQuiz(id);
      setQuiz(data.quiz);
      setQuestions(data.questions || []);
      setAlreadyAttempted(data.alreadyAttempted);
      if (!data.alreadyAttempted) {
        const duration = (data.quiz.duration || 30) * 60;
        setTimeLeft(duration);
        startTimeRef.current = Date.now();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timeLeft === null || submitted || alreadyAttempted) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timeLeft !== null, submitted]);

  const handleSubmit = async () => {
    if (submitting || submitted) return;
    clearInterval(timerRef.current);
    setSubmitting(true);
    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
    const answersArr = questions.map(q => ({
      questionId: q._id,
      selected: answers[q._id] || '',
    }));
    try {
      const res = await quizService.submit(id, { answers: answersArr, timeTaken });
      setResult(res);
      setSubmitted(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isUrgent = timeLeft !== null && timeLeft < 60;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900">
      <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  if (alreadyAttempted && !submitted) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900 text-white" style={{fontFamily:"'Inter',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet" />
      <div className="text-center max-w-sm px-6">
        <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={32} className="text-amber-400" />
        </div>
        <h2 className="text-2xl font-black mb-2">Already Attempted</h2>
        <p className="text-slate-400 text-sm mb-6">You already submitted this quiz. {quiz?.isRetryAllowed ? 'But retry is allowed!' : ''}</p>
        <div className="flex gap-3 justify-center">
          <Link to={`/quiz/${id}/results`} className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition">View Results</Link>
          <Link to={`/quiz/${id}/leaderboard`} className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition flex items-center gap-2"><Trophy size={16} /> Leaderboard</Link>
        </div>
      </div>
    </div>
  );

  if (submitted && result) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900 text-white px-4" style={{fontFamily:"'Inter',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet" />
      <div className="max-w-sm w-full text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-orange-500/30">
          <Trophy size={44} />
        </div>
        <h2 className="text-3xl font-black mb-1">Quiz Complete!</h2>
        <p className="text-slate-400 text-sm mb-8">Here are your results:</p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="text-3xl font-black text-green-400">{result.score}</div>
            <div className="text-xs text-slate-400 mt-1">Correct / {result.total}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="text-3xl font-black text-orange-400">#{result.rank}</div>
            <div className="text-xs text-slate-400 mt-1">Your Rank</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="text-3xl font-black text-purple-400">{result.rankScore}</div>
            <div className="text-xs text-slate-400 mt-1">Rank Score</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="text-3xl font-black text-sky-400">{formatTime(result.timeTaken || 0)}</div>
            <div className="text-xs text-slate-400 mt-1">Time Taken</div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Link to={`/quiz/${id}/results`} className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold transition text-sm">
            View Detailed Results
          </Link>
          <Link to={`/quiz/${id}/leaderboard`} className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold transition text-sm flex items-center justify-center gap-2">
            <Trophy size={16} /> Leaderboard
          </Link>
          <Link to="/dashboard" className="text-slate-400 hover:text-white text-sm transition">Back to Dashboard</Link>
        </div>
      </div>
    </div>
  );

  const q = questions[currentQ];
  const answered = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white px-4 py-8" style={{fontFamily:"'Inter',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet" />
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-black">{quiz?.title}</h1>
            <p className="text-slate-400 text-sm mt-0.5">Question {currentQ + 1} of {questions.length}</p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xl ${isUrgent ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-white/10 text-white'}`}>
            <Clock size={18} />
            {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/10 rounded-full mb-6 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-300" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
        </div>

        {/* Question */}
        {q && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
            {q.questionImage && (
              <img src={q.questionImage} alt="Question" className="rounded-xl mb-4 max-h-48 w-full object-cover" />
            )}
            <h2 className="text-lg font-bold leading-relaxed mb-6">{q.questionText}</h2>
            <div className="space-y-3">
              {[q.option1, q.option2, q.option3, q.option4].filter(Boolean).map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setAnswers(a => ({ ...a, [q._id]: opt }))}
                  className={`w-full text-left px-5 py-4 rounded-xl border font-medium text-sm transition-all ${
                    answers[q._id] === opt
                      ? 'bg-orange-500/20 border-orange-500 text-orange-300 shadow-lg shadow-orange-500/10'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-slate-300'
                  }`}
                >
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-xs mr-3 flex-shrink-0">
                    {['A', 'B', 'C', 'D'][i]}
                  </span>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentQ(c => Math.max(0, c - 1))}
            disabled={currentQ === 0}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold transition"
          >
            ← Previous
          </button>

          <div className="text-xs text-slate-400">{answered}/{questions.length} answered</div>

          {currentQ < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQ(c => Math.min(questions.length - 1, c + 1))}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition"
            >
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-sm font-black transition disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit Quiz ✓'}
            </button>
          )}
        </div>

        {/* Question dots */}
        <div className="flex flex-wrap gap-2 mt-6 justify-center">
          {questions.map((qq, i) => (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                i === currentQ ? 'bg-orange-500 text-white' :
                answers[qq._id] ? 'bg-green-500/20 text-green-400' :
                'bg-white/10 text-slate-400 hover:bg-white/20'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
