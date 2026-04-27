import { useState } from 'react';
import {
  Sparkles, Loader2, Trash2, CheckCircle2,
  Copy, Download, RefreshCw, ChevronDown, ChevronUp,
  Zap, BookOpen, Target, AlertTriangle, Send, Cpu, GraduationCap, Layers
} from 'lucide-react';
import api from '../api/api';

const DIFFICULTY_COLORS = {
  easy:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',
  hard:   'bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400',
};

export default function AdminAIQuiz() {
  const [courseName, setCourseName] = useState('');
  const [topic, setTopic]           = useState('');
  const [difficulty, setDifficulty] = useState('mixed');
  const [count, setCount]           = useState(10);
  const [questions, setQuestions]   = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [errorHint, setErrorHint]   = useState('');
  const [usedModel, setUsedModel]   = useState('');
  const [expandedIdx, setExpandedIdx] = useState(null);

  // Save to quiz
  const [quizTitle, setQuizTitle]   = useState('');
  const [saving, setSaving]         = useState(false);
  const [savedQuizId, setSavedQuizId] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  /* ── Generate ── */
  const handleGenerate = async () => {
    if (!topic.trim()) return setError('Please enter a topic.');
    setError('');
    setErrorHint('');
    setQuestions([]);
    setSaveSuccess(false);
    setSavedQuizId(null);
    setLoading(true);
    try {
      const res = await api.post('/api/admin/ai-quiz/generate', {
        topic: topic.trim(),
        courseName: courseName.trim(),
        difficulty,
        count,
      });
      setQuestions(res.data.questions || []);
      setUsedModel(res.data.model || '');
      setQuizTitle(courseName.trim()
        ? `${courseName.trim()} — ${topic.trim()} Quiz`
        : `${topic.trim()} Quiz`);
    } catch (err) {
      const data = err.response?.data || {};
      setError(data.error || 'Generation failed. Check your Groq API key in backend .env.');
      setErrorHint(data.hint || '');
    } finally {
      setLoading(false);
    }
  };

  /* ── Edit helpers ── */
  const editQuestion = (idx, field, value) =>
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));

  const editOption = (qIdx, oIdx, value) =>
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = [...q.options];
      opts[oIdx] = value;
      return { ...q, options: opts };
    }));

  const removeQuestion = (idx) =>
    setQuestions(prev => prev.filter((_, i) => i !== idx));

  /* ── Save Quiz ── */
  const handleSave = async () => {
    if (!quizTitle.trim()) return alert('Enter a quiz title first.');
    if (questions.length === 0) return;
    setSaving(true);
    try {
      const res = await api.post('/api/quiz', {
        title: quizTitle,
        description: `AI-generated quiz on: ${topic}${courseName ? ` (${courseName})` : ''}`,
        questions: questions.map(q => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          difficulty: q.difficulty,
          topic: q.topic || topic,
        })),
        status: 'draft',
      });
      setSavedQuizId(res.data._id);
      setSaveSuccess(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save quiz.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Copy / Download JSON ── */
  const handleCopy = () =>
    navigator.clipboard.writeText(JSON.stringify(questions, null, 2));

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(questions, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `${topic || 'quiz'}_questions.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const easyCount   = questions.filter(q => q.difficulty === 'easy').length;
  const mediumCount = questions.filter(q => q.difficulty === 'medium').length;
  const hardCount   = questions.filter(q => q.difficulty === 'hard').length;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center gap-4 p-6 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-[2rem] text-white shadow-2xl shadow-violet-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />
        <div className="relative w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner">
          <Sparkles size={32} className="text-white" />
        </div>
        <div className="relative">
          <h2 className="text-2xl font-black tracking-tight">AI Quizer</h2>
          <p className="text-violet-200 text-sm mt-0.5">Powered by Groq AI · Generate MCQs instantly from any topic</p>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Course Name */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
              <GraduationCap size={12} className="inline mr-1" /> Course Name (optional)
            </label>
            <input
              value={courseName}
              onChange={e => setCourseName(e.target.value)}
              placeholder="e.g. Full Stack Development, Data Science..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:border-transparent transition dark:text-white outline-none"
            />
          </div>

          {/* Topic */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
              <BookOpen size={12} className="inline mr-1" /> Topic / Subject *
            </label>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && handleGenerate()}
              placeholder="e.g. JavaScript Promises, Photosynthesis, WWII..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:border-transparent transition dark:text-white outline-none"
            />
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
              <Layers size={12} className="inline mr-1" /> Difficulty Level
            </label>
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold focus:ring-2 focus:ring-violet-500 transition dark:text-white outline-none"
            >
              <option value="mixed">Mixed (Easy + Medium + Hard)</option>
              <option value="easy">Easy Only</option>
              <option value="medium">Medium Only</option>
              <option value="hard">Hard Only</option>
            </select>
          </div>

          {/* Count */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
              <Target size={12} className="inline mr-1" /> Number of Questions
            </label>
            <select
              value={count}
              onChange={e => setCount(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold focus:ring-2 focus:ring-violet-500 transition dark:text-white outline-none"
            >
              {[5, 10, 15, 20, 25, 30].map(n => (
                <option key={n} value={n}>{n} Questions</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-bold">
              <AlertTriangle size={16} /> {error}
            </div>
            {errorHint && (
              <p className="mt-1 text-xs text-red-500 dark:text-red-400 pl-6">{errorHint}</p>
            )}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading || !topic.trim()}
          className="w-full flex items-center justify-center gap-3 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black text-sm transition shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30"
        >
          {loading
            ? <><Loader2 size={18} className="animate-spin" /> Generating with Groq AI...</>
            : <><Sparkles size={18} /> Generate {count} MCQ Questions</>
          }
        </button>
      </div>

      {/* ── Results / Preview ── */}
      {questions.length > 0 && (
        <div className="space-y-4 animate-fade-in">

          {/* Stats + Actions bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-black dark:text-white">{questions.length} Questions Generated</span>
              {easyCount > 0 && <span className={`badge text-[10px] font-black ${DIFFICULTY_COLORS.easy}`}>{easyCount} Easy</span>}
              {mediumCount > 0 && <span className={`badge text-[10px] font-black ${DIFFICULTY_COLORS.medium}`}>{mediumCount} Medium</span>}
              {hardCount > 0 && <span className={`badge text-[10px] font-black ${DIFFICULTY_COLORS.hard}`}>{hardCount} Hard</span>}
              {usedModel && (
                <span className="flex items-center gap-1 badge bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 text-[10px] font-black">
                  <Cpu size={10} /> {usedModel}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition">
                <Copy size={13} /> Copy JSON
              </button>
              <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition">
                <Download size={13} /> Download
              </button>
              <button onClick={handleGenerate} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-800/40 rounded-xl text-xs font-bold transition">
                <RefreshCw size={13} /> Regenerate
              </button>
            </div>
          </div>

          {/* Question Cards — Preview + Edit */}
          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition hover:shadow-md"
              >
                {/* Question header */}
                <div
                  className="flex items-start justify-between gap-3 p-4 cursor-pointer"
                  onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="w-7 h-7 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center font-black text-xs flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="font-semibold text-sm dark:text-white leading-relaxed">{q.question}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`badge text-[10px] font-black capitalize ${DIFFICULTY_COLORS[q.difficulty] || DIFFICULTY_COLORS.medium}`}>
                      {q.difficulty}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); removeQuestion(idx); }}
                      className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                    >
                      <Trash2 size={13} />
                    </button>
                    {expandedIdx === idx
                      ? <ChevronUp size={16} className="text-slate-400" />
                      : <ChevronDown size={16} className="text-slate-400" />
                    }
                  </div>
                </div>

                {/* Collapsed: radio-button option preview */}
                {expandedIdx !== idx && (
                  <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border transition ${
                          q.correctAnswer === opt
                            ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400 font-bold'
                            : 'border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${
                          q.correctAnswer === opt
                            ? 'border-green-500 bg-green-500'
                            : 'border-slate-300 dark:border-slate-600'
                        }`} />
                        {opt}
                      </div>
                    ))}
                  </div>
                )}

                {/* Expanded edit view */}
                {expandedIdx === idx && (
                  <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-4 bg-slate-50/50 dark:bg-slate-800/30">
                    {/* Edit question text */}
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Question Text</label>
                      <textarea
                        rows={2}
                        value={q.question}
                        onChange={e => editQuestion(idx, 'question', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm dark:text-white resize-none focus:ring-2 focus:ring-violet-500 outline-none"
                      />
                    </div>

                    {/* Options — radio-button style (only one selectable as correct) */}
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">
                        Options — click ● to set correct answer
                      </label>
                      <div className="space-y-2">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => editQuestion(idx, 'correctAnswer', opt)}
                              className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition ${
                                q.correctAnswer === opt
                                  ? 'border-green-500 bg-green-500 shadow shadow-green-500/30'
                                  : 'border-slate-300 dark:border-slate-600 hover:border-green-400'
                              }`}
                              title="Set as correct answer"
                            />
                            <input
                              value={opt}
                              onChange={e => {
                                const wasCorrect = q.correctAnswer === opt;
                                editOption(idx, oIdx, e.target.value);
                                if (wasCorrect) editQuestion(idx, 'correctAnswer', e.target.value);
                              }}
                              className={`flex-1 px-3 py-2 rounded-xl border text-sm focus:ring-2 focus:ring-violet-500 outline-none transition dark:text-white ${
                                q.correctAnswer === opt
                                  ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10'
                                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                              }`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Difficulty + Topic */}
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Difficulty:</label>
                        {['easy', 'medium', 'hard'].map(d => (
                          <button
                            key={d}
                            onClick={() => editQuestion(idx, 'difficulty', d)}
                            className={`px-3 py-1 rounded-lg text-xs font-black capitalize transition ${
                              q.difficulty === d ? DIFFICULTY_COLORS[d] : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Topic:</label>
                        <input
                          value={q.topic || topic}
                          onChange={e => editQuestion(idx, 'topic', e.target.value)}
                          className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Save Quiz ── */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-violet-200 dark:border-violet-900/40 shadow-sm">
            <h3 className="font-black text-lg dark:text-white flex items-center gap-2 mb-4">
              <Zap size={18} className="text-violet-500" /> Save Quiz to Database
            </h3>

            {saveSuccess ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl border border-green-200 dark:border-green-800 font-bold">
                  <CheckCircle2 size={20} /> Quiz saved as draft! Go to Quiz Manager to activate it.
                </div>
                {savedQuizId && (
                  <p className="text-xs text-slate-400">Quiz ID: <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">{savedQuizId}</code></p>
                )}
              </div>
            ) : (
              <div className="flex gap-3">
                <input
                  value={quizTitle}
                  onChange={e => setQuizTitle(e.target.value)}
                  placeholder="Quiz title..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-violet-500 outline-none transition dark:text-white"
                />
                <button
                  onClick={handleSave}
                  disabled={saving || !quizTitle.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm transition shadow-lg shadow-violet-500/20 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  {saving ? 'Saving...' : 'Save Quiz'}
                </button>
              </div>
            )}
            <p className="text-xs text-slate-400 mt-3">
              Quiz is saved as a <strong>draft</strong>. Activate it from Quiz Manager to make it live for users.
            </p>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {questions.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-violet-100 dark:bg-violet-900/30 rounded-3xl flex items-center justify-center text-violet-500 mb-5">
            <Sparkles size={40} />
          </div>
          <h3 className="text-xl font-black dark:text-white">Ready to Generate</h3>
          <p className="text-slate-500 mt-2 max-w-sm text-sm">
            Fill in the topic above and click generate. Groq AI will create unique, educational MCQ questions instantly.
          </p>
        </div>
      )}
    </div>
  );
}
