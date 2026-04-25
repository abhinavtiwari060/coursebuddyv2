import { useState, useEffect } from 'react';
import { quizService } from '../api/api';
import { 
  Plus, Trash2, Play, Square, Edit3, ChevronDown, ChevronRight, 
  Loader2, CheckCircle2, Clock, Users, BookOpen, Image, X, Save 
} from 'lucide-react';

const STATUS_COLORS = {
  draft: 'bg-slate-500/20 text-slate-400',
  active: 'bg-green-500/20 text-green-400',
  ended: 'bg-red-500/20 text-red-400',
};

const emptyQuiz = { title: '', description: '', duration: 30, isRetryAllowed: false };
const emptyQ = { questionText: '', questionImage: '', option1: '', option2: '', option3: '', option4: '', correctAnswer: '', explanation: '' };

export default function AdminQuizManager() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedQuiz, setExpandedQuiz] = useState(null);
  const [questions, setQuestions] = useState({});
  const [showCreateQuiz, setShowCreateQuiz] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(null); // quizId
  const [newQuiz, setNewQuiz] = useState(emptyQuiz);
  const [newQuestion, setNewQuestion] = useState(emptyQ);
  const [saving, setSaving] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);

  useEffect(() => { loadQuizzes(); }, []);

  const loadQuizzes = async () => {
    try {
      const data = await quizService.adminGetAll();
      setQuizzes(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadQuestions = async (quizId) => {
    if (questions[quizId]) return;
    try {
      const qs = await quizService.adminGetQuestions(quizId);
      setQuestions(q => ({ ...q, [quizId]: qs }));
    } catch {}
  };

  const toggleExpand = (quizId) => {
    if (expandedQuiz === quizId) { setExpandedQuiz(null); return; }
    setExpandedQuiz(quizId);
    loadQuestions(quizId);
  };

  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const quiz = await quizService.adminCreate(newQuiz);
      setQuizzes(q => [{ ...quiz, questionCount: 0, attemptCount: 0 }, ...q]);
      setNewQuiz(emptyQuiz);
      setShowCreateQuiz(false);
    } catch (err) { alert(err.response?.data?.error || 'Failed to create quiz'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (quizId) => {
    if (!confirm('Delete this quiz and all its questions/attempts?')) return;
    try {
      await quizService.adminDelete(quizId);
      setQuizzes(q => q.filter(quiz => quiz._id !== quizId));
    } catch (err) { alert('Failed to delete'); }
  };

  const handleStart = async (quizId) => {
    try {
      const { quiz } = await quizService.adminStart(quizId);
      setQuizzes(q => q.map(item => item._id === quizId ? { ...item, status: 'active' } : item));
    } catch (err) { alert(err.response?.data?.error || 'Failed to start'); }
  };

  const handleStop = async (quizId) => {
    try {
      await quizService.adminStop(quizId);
      setQuizzes(q => q.map(item => item._id === quizId ? { ...item, status: 'ended' } : item));
    } catch (err) { alert('Failed to stop'); }
  };

  const handleAddQuestion = async (e, quizId) => {
    e.preventDefault();
    setSaving(true);
    try {
      const q = await quizService.adminAddQuestion(quizId, newQuestion);
      setQuestions(prev => ({ ...prev, [quizId]: [...(prev[quizId] || []), q] }));
      setQuizzes(qs => qs.map(quiz => quiz._id === quizId ? { ...quiz, questionCount: (quiz.questionCount || 0) + 1 } : quiz));
      setNewQuestion(emptyQ);
      setShowAddQuestion(null);
    } catch (err) { alert(err.response?.data?.error || 'Failed to add question'); }
    finally { setSaving(false); }
  };

  const handleDeleteQuestion = async (quizId, qId) => {
    if (!confirm('Delete this question?')) return;
    try {
      await quizService.adminDeleteQuestion(qId);
      setQuestions(prev => ({ ...prev, [quizId]: prev[quizId].filter(q => q._id !== qId) }));
      setQuizzes(qs => qs.map(quiz => quiz._id === quizId ? { ...quiz, questionCount: Math.max(0, (quiz.questionCount || 1) - 1) } : quiz));
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black dark:text-white">Quiz Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Create, manage, and run quizzes for your students</p>
        </div>
        <button
          onClick={() => setShowCreateQuiz(!showCreateQuiz)}
          className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
        >
          <Plus size={16} /> New Quiz
        </button>
      </div>

      {/* Create Quiz Form */}
      {showCreateQuiz && (
        <div className="glass-card rounded-2xl p-6 border border-orange-200 dark:border-orange-800/50">
          <h3 className="font-black dark:text-white mb-4">Create New Quiz</h3>
          <form onSubmit={handleCreateQuiz} className="space-y-4">
            <input
              required value={newQuiz.title} onChange={e => setNewQuiz(q => ({ ...q, title: e.target.value }))}
              placeholder="Quiz Title" className="w-full px-4 py-2.5 rounded-xl text-sm border dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
            <textarea
              value={newQuiz.description} onChange={e => setNewQuiz(q => ({ ...q, description: e.target.value }))}
              placeholder="Description (optional)" rows={2} className="w-full px-4 py-2.5 rounded-xl text-sm border dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">Duration (minutes)</label>
                <input
                  type="number" min={1} max={180} value={newQuiz.duration}
                  onChange={e => setNewQuiz(q => ({ ...q, duration: parseInt(e.target.value) || 30 }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm border dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
              <div className="flex items-center pt-5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox" checked={newQuiz.isRetryAllowed}
                    onChange={e => setNewQuiz(q => ({ ...q, isRetryAllowed: e.target.checked }))}
                    className="w-4 h-4 rounded accent-orange-500"
                  />
                  <span className="text-sm font-medium dark:text-slate-300">Allow Retry</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Create Quiz
              </button>
              <button type="button" onClick={() => setShowCreateQuiz(false)} className="px-5 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quiz List */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
      ) : quizzes.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center text-slate-400 dark:text-slate-500">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p>No quizzes yet. Create your first quiz!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {quizzes.map(quiz => (
            <div key={quiz._id} className="glass-card rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              {/* Quiz header row */}
              <div className="p-5 flex flex-wrap items-center gap-4">
                <button onClick={() => toggleExpand(quiz._id)} className="flex-1 text-left">
                  <div className="flex items-center gap-3">
                    {expandedQuiz === quiz._id ? <ChevronDown size={18} className="text-slate-400 flex-shrink-0" /> : <ChevronRight size={18} className="text-slate-400 flex-shrink-0" />}
                    <div>
                      <h3 className="font-bold dark:text-white">{quiz.title}</h3>
                      {quiz.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{quiz.description}</p>}
                    </div>
                  </div>
                </button>
                
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_COLORS[quiz.status] || STATUS_COLORS.draft}`}>
                    {quiz.status?.toUpperCase() || 'DRAFT'}
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <BookOpen size={12} /> {quiz.questionCount || 0} Qs
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Users size={12} /> {quiz.attemptCount || 0} attempts
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock size={12} /> {quiz.duration || 30}min
                  </span>

                  {quiz.status !== 'active' ? (
                    <button onClick={() => handleStart(quiz._id)} disabled={quiz.status === 'ended'} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-bold transition disabled:opacity-40">
                      <Play size={12} /> Start
                    </button>
                  ) : (
                    <button onClick={() => handleStop(quiz._id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition">
                      <Square size={12} /> Stop
                    </button>
                  )}
                  <button onClick={() => handleDelete(quiz._id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Expanded questions section */}
              {expandedQuiz === quiz._id && (
                <div className="border-t border-slate-100 dark:border-slate-800 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-black text-sm dark:text-white">Questions ({(questions[quiz._id] || []).length})</h4>
                    <button
                      onClick={() => setShowAddQuestion(showAddQuestion === quiz._id ? null : quiz._id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition"
                    >
                      <Plus size={14} /> Add Question
                    </button>
                  </div>

                  {/* Add question form */}
                  {showAddQuestion === quiz._id && (
                    <div className="mb-5 p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 rounded-xl">
                      <form onSubmit={e => handleAddQuestion(e, quiz._id)} className="space-y-3">
                        <textarea
                          required value={newQuestion.questionText}
                          onChange={e => setNewQuestion(q => ({ ...q, questionText: e.target.value }))}
                          placeholder="Question text *" rows={2}
                          className="w-full px-3 py-2 rounded-lg text-sm border dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none"
                        />
                        <input
                          type="url" value={newQuestion.questionImage}
                          onChange={e => setNewQuestion(q => ({ ...q, questionImage: e.target.value }))}
                          placeholder="Question image URL (optional)"
                          className="w-full px-3 py-2 rounded-lg text-sm border dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          {['option1','option2','option3','option4'].map((opt, i) => (
                            <input
                              key={opt} required value={newQuestion[opt]}
                              onChange={e => setNewQuestion(q => ({ ...q, [opt]: e.target.value }))}
                              placeholder={`Option ${['A','B','C','D'][i]} *`}
                              className="w-full px-3 py-2 rounded-lg text-sm border dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            />
                          ))}
                        </div>
                        <select
                          required value={newQuestion.correctAnswer}
                          onChange={e => setNewQuestion(q => ({ ...q, correctAnswer: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg text-sm border dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        >
                          <option value="">Select Correct Answer *</option>
                          {['option1','option2','option3','option4'].map((opt, i) => (
                            newQuestion[opt] && (
                              <option key={opt} value={newQuestion[opt]}>
                                Option {['A','B','C','D'][i]}: {newQuestion[opt].slice(0, 40)}
                              </option>
                            )
                          ))}
                        </select>
                        <input
                          value={newQuestion.explanation}
                          onChange={e => setNewQuestion(q => ({ ...q, explanation: e.target.value }))}
                          placeholder="Explanation (optional)"
                          className="w-full px-3 py-2 rounded-lg text-sm border dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        />
                        <div className="flex gap-2">
                          <button type="submit" disabled={saving} className="btn-primary px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
                            {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add Question
                          </button>
                          <button type="button" onClick={() => { setShowAddQuestion(null); setNewQuestion(emptyQ); }} className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Questions list */}
                  <div className="space-y-3">
                    {(questions[quiz._id] || []).map((q, idx) => (
                      <div key={q._id} className="flex gap-3 items-start bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                        <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-xs font-black text-orange-600 dark:text-orange-400 flex-shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          {q.questionImage && <img src={q.questionImage} alt="" className="w-full max-h-24 object-cover rounded-lg mb-2" />}
                          <p className="font-semibold text-sm dark:text-white mb-2 leading-snug">{q.questionText}</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {[q.option1, q.option2, q.option3, q.option4].filter(Boolean).map((opt, i) => (
                              <div key={i} className={`text-xs px-2 py-1 rounded-lg ${opt === q.correctAnswer ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                                {['A','B','C','D'][i]}. {opt}
                              </div>
                            ))}
                          </div>
                          {q.explanation && <p className="text-xs text-slate-400 mt-2 italic">💡 {q.explanation}</p>}
                        </div>
                        <button onClick={() => handleDeleteQuestion(quiz._id, q._id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition flex-shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {(!questions[quiz._id] || questions[quiz._id].length === 0) && (
                      <p className="text-center text-xs text-slate-400 py-4">No questions yet. Add your first question!</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
