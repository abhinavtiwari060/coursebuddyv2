import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Modal from '../components/Modal';
import { todoService } from '../api/api';
import { 
  CheckSquare, 
  Square, 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  AlertCircle, 
  Filter, 
  CheckCircle2, 
  Edit3, 
  Loader2,
  Tag
} from 'lucide-react';

const CATEGORY_OPTIONS = [
  { id: 'general', label: 'General Task' },
  { id: 'government-exams', label: 'Govt Exam Prep' },
  { id: 'iit-neet', label: 'IIT / NEET Prep' },
  { id: 'skills', label: 'Skills & Career' },
  { id: 'other', label: 'Other Subject' },
];

export default function Todos() {
  const [todos, setTodos] = useState([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, completed: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, completed, overdue
  const [filterCategory, setFilterCategory] = useState('all');
  
  // New / Edit task modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    category: 'general',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadTodos = async () => {
    setLoading(true);
    try {
      const data = await todoService.getAll({
        status: filterStatus !== 'all' ? filterStatus : undefined,
        category: filterCategory !== 'all' ? filterCategory : undefined,
      });
      setTodos(data.todos || []);
      setCounts(data.counts || { total: 0, pending: 0, completed: 0, overdue: 0 });
    } catch (err) {
      console.error('Failed to load todos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodos();
  }, [filterStatus, filterCategory]);

  const handleOpenCreate = () => {
    setEditingTodo(null);
    setFormData({
      title: '',
      description: '',
      dueDate: '',
      category: 'general',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t) => {
    setEditingTodo(t);
    setFormData({
      title: t.title,
      description: t.description || '',
      dueDate: t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : '',
      category: t.category || 'general',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError('Task title is required');
      return;
    }

    setFormSubmitting(true);
    setFormError('');

    try {
      if (editingTodo) {
        await todoService.update(editingTodo._id, formData);
      } else {
        await todoService.create(formData);
      }
      setIsModalOpen(false);
      await loadTodos();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to save task.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      await todoService.toggle(id);
      await loadTodos();
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await todoService.delete(id);
      await loadTodos();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const isOverdue = (dateStr, isCompleted) => {
    if (!dateStr || isCompleted) return false;
    return new Date(dateStr) < new Date(new Date().setHours(0, 0, 0, 0));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF7ED]">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-[#431407] tracking-tight">
              Personal Study To-Do
            </h1>
            <p className="text-sm text-[#78716C] mt-1">
              Organize your assignments, revision targets, and daily study milestones.
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="clay-btn-primary self-start sm:self-auto px-5 py-2.5 text-sm flex items-center gap-2"
          >
            <Plus size={18} /> Add New Task
          </button>
        </div>

        {/* Counts summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div 
            onClick={() => setFilterStatus('all')}
            className={`p-4 clay-card cursor-pointer transition ${
              filterStatus === 'all' ? 'clay-card-selected' : 'hover:border-[#FB923C]'
            }`}
          >
            <span className="text-xs font-bold text-[#78716C] uppercase">Total Tasks</span>
            <p className="text-2xl font-black text-[#431407] mt-1">{counts.total}</p>
          </div>

          <div 
            onClick={() => setFilterStatus('pending')}
            className={`p-4 clay-card cursor-pointer transition ${
              filterStatus === 'pending' ? 'clay-card-selected' : 'hover:border-[#FB923C]'
            }`}
          >
            <span className="text-xs font-bold text-[#EA580C] uppercase">Pending</span>
            <p className="text-2xl font-black text-[#EA580C] mt-1">{counts.pending}</p>
          </div>

          <div 
            onClick={() => setFilterStatus('completed')}
            className={`p-4 clay-card cursor-pointer transition ${
              filterStatus === 'completed' ? 'clay-card-selected' : 'hover:border-[#FB923C]'
            }`}
          >
            <span className="text-xs font-bold text-green-700 uppercase">Completed</span>
            <p className="text-2xl font-black text-green-700 mt-1">{counts.completed}</p>
          </div>

          <div 
            onClick={() => setFilterStatus('overdue')}
            className={`p-4 clay-card cursor-pointer transition ${
              filterStatus === 'overdue' ? 'clay-card-selected' : 'hover:border-[#FB923C]'
            }`}
          >
            <span className="text-xs font-bold text-red-700 uppercase">Overdue</span>
            <p className="text-2xl font-black text-red-700 mt-1">{counts.overdue}</p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="clay-card bg-white p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {['all', 'pending', 'completed', 'overdue'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition ${
                  filterStatus === st
                    ? 'bg-[#EA580C] text-white shadow-sm'
                    : 'bg-[#FFF7ED] text-[#C2410C] hover:bg-[#FED7AA]/50'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Filter size={14} className="text-[#78716C]" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="clay-input py-1.5 px-3 text-xs font-semibold w-full sm:w-48 bg-[#FFF7ED]"
            >
              <option value="all">All Categories</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Task List */}
        {loading ? (
          <div className="clay-card bg-white p-12 text-center text-[#78716C] flex items-center justify-center gap-2">
            <Loader2 size={20} className="animate-spin text-[#EA580C]" /> Loading your tasks...
          </div>
        ) : todos.length === 0 ? (
          <div className="clay-card bg-white p-12 text-center">
            <CheckCircle2 size={40} className="mx-auto text-[#FED7AA] mb-3" />
            <h3 className="text-lg font-bold text-[#431407]">No tasks found</h3>
            <p className="text-xs sm:text-sm text-[#78716C] mt-1 max-w-sm mx-auto">
              {filterStatus === 'completed'
                ? "You haven't completed any tasks in this filter yet."
                : filterStatus === 'overdue'
                ? 'Great job! You have zero overdue tasks.'
                : 'Start tracking your study targets by creating a new task.'}
            </p>
            {filterStatus === 'all' && (
              <button
                onClick={handleOpenCreate}
                className="clay-btn-secondary mt-4 text-xs px-4 py-2"
              >
                <Plus size={14} /> Add First Task
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {todos.map((todo) => {
              const overdue = isOverdue(todo.dueDate, todo.completed);
              return (
                <div
                  key={todo._id}
                  className={`clay-card p-4 sm:p-5 flex items-start justify-between gap-4 transition ${
                    todo.completed
                      ? 'bg-[#FFF7ED]/40 opacity-75'
                      : overdue
                      ? 'border-red-300 bg-red-50/30'
                      : 'bg-white'
                  }`}
                >
                  {/* Left: Checkbox & Info */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggle(todo._id)}
                      className={`mt-0.5 rounded-lg p-0.5 transition ${
                        todo.completed
                          ? 'text-green-700 hover:text-green-800'
                          : 'text-[#EA580C] hover:text-[#C2410C]'
                      }`}
                      title={todo.completed ? 'Mark Pending' : 'Mark Completed'}
                    >
                      {todo.completed ? (
                        <CheckSquare size={22} className="fill-green-100" />
                      ) : (
                        <Square size={22} />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4
                          className={`text-base font-bold ${
                            todo.completed
                              ? 'line-through text-[#78716C]'
                              : 'text-[#431407]'
                          }`}
                        >
                          {todo.title}
                        </h4>

                        {todo.category && todo.category !== 'general' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]">
                            <Tag size={10} />
                            {CATEGORY_OPTIONS.find((c) => c.id === todo.category)?.label || todo.category}
                          </span>
                        )}

                        {overdue && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                            <AlertCircle size={10} /> Overdue
                          </span>
                        )}
                      </div>

                      {todo.description && (
                        <p className="text-xs sm:text-sm text-[#78716C] mt-1 leading-relaxed">
                          {todo.description}
                        </p>
                      )}

                      {todo.dueDate && (
                        <div className="flex items-center gap-1.5 text-xs text-[#78716C] mt-2">
                          <Calendar size={13} className={overdue ? 'text-red-500' : 'text-[#EA580C]'} />
                          <span>Due: {new Date(todo.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(todo)}
                      className="p-1.5 rounded-lg text-[#78716C] hover:text-[#EA580C] hover:bg-[#FFF7ED] transition"
                      title="Edit Task"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(todo._id)}
                      className="p-1.5 rounded-lg text-[#78716C] hover:text-red-600 hover:bg-red-50 transition"
                      title="Delete Task"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTodo(null);
          setFormError('');
        }}
        title={editingTodo ? 'Edit Task' : 'Create New Task'}
        subtitle="Keep your study goals small, actionable, and time-bound."
        icon={<CheckSquare size={20} className="text-[#EA580C]" />}
        isDirty={Boolean(formData.title.trim() || formData.description.trim())}
        maxWidth="max-w-lg"
      >
        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
            {formError}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#431407] mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Complete Electrostatics Video 3 & Notes"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="clay-input"
              maxLength={300}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#431407] mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Additional context or checklist items..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="clay-input"
              maxLength={2000}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#431407] mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="clay-input"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#431407] mb-1">
                Learning Path
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="clay-input"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#FED7AA]">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingTodo(null);
                setFormError('');
              }}
              className="clay-btn-subtle text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="clay-btn-primary text-xs px-5 py-2.5 flex items-center gap-1.5"
            >
              {formSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : editingTodo ? (
                'Save Changes'
              ) : (
                'Create Task'
              )}
            </button>
          </div>
        </form>
      </Modal>

      <Footer />
    </div>
  );
}
