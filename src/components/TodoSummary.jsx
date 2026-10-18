import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { todoService } from '../api/api';
import { CheckSquare, Square, ArrowRight, Plus, Calendar, CheckCircle2 } from 'lucide-react';

export default function TodoSummary() {
  const [todos, setTodos] = useState([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    try {
      const data = await todoService.getAll({ status: 'pending' });
      setTodos((data.todos || []).slice(0, 4)); // Compact top 4 tasks
      setCounts({
        total: data.counts?.total || 0,
        pending: data.counts?.pending || 0,
      });
    } catch (err) {
      console.error('Failed to load todo summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleToggle = async (id) => {
    try {
      await todoService.toggle(id);
      await fetchSummary();
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  return (
    <div className="clay-card bg-white p-5">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA] flex items-center justify-center font-bold">
            <CheckSquare size={16} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#431407]">Study To-Do</h3>
            <p className="text-[11px] text-[#78716C]">
              {counts.pending} pending {counts.pending === 1 ? 'task' : 'tasks'}
            </p>
          </div>
        </div>

        <Link
          to="/todos"
          className="clay-btn-subtle text-xs px-2.5 py-1 flex items-center gap-1"
        >
          View All <ArrowRight size={13} />
        </Link>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-[#78716C]">
          Loading tasks...
        </div>
      ) : todos.length === 0 ? (
        <div className="py-6 text-center">
          <CheckCircle2 size={24} className="mx-auto text-green-600 mb-1.5" />
          <p className="text-xs font-bold text-[#431407]">All caught up!</p>
          <p className="text-[11px] text-[#78716C] mt-0.5">
            No pending study tasks.
          </p>
          <Link
            to="/todos"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#EA580C] hover:underline mt-2"
          >
            <Plus size={13} /> Add a Task
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {todos.map((t) => (
            <div
              key={t._id}
              className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#FFF7ED]/50 hover:bg-[#FFF7ED] border border-[#FED7AA]/60 transition"
            >
              <button
                onClick={() => handleToggle(t._id)}
                className="mt-0.5 text-[#EA580C] hover:text-[#C2410C]"
                title="Mark Completed"
              >
                <Square size={16} />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#431407] truncate">
                  {t.title}
                </p>
                {t.dueDate && (
                  <div className="flex items-center gap-1 text-[10px] text-[#78716C] mt-0.5">
                    <Calendar size={11} className="text-[#EA580C]" />
                    <span>Due {new Date(t.dueDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          <Link
            to="/todos"
            className="block text-center text-xs font-bold text-[#EA580C] hover:text-[#C2410C] pt-2"
          >
            + Manage Full Task List
          </Link>
        </div>
      )}
    </div>
  );
}
