import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { courseService, videoService } from '../api/api';
import { 
  GraduationCap, 
  Atom, 
  Code, 
  Compass, 
  CheckCircle2, 
  MessageSquare, 
  BookOpen, 
  PlayCircle, 
  ArrowRight, 
  Sparkles,
  Layers
} from 'lucide-react';

const CATEGORY_DEFINITIONS = [
  {
    id: 'government-exams',
    title: 'Government Exam Preparation',
    description: 'Prepare for civil services, public sector banks, railways, and state staff selection exams.',
    icon: GraduationCap,
    subcategories: [
      { name: 'SSC CGL & CHSL', desc: 'Quantitative aptitude, reasoning, and general awareness' },
      { name: 'UPSC Civil Services', desc: 'Prelims, mains foundation, and current events' },
      { name: 'Banking & Insurance', desc: 'IBPS PO/Clerk, SBI PO, and RBI Assistant' },
      { name: 'Railways RRB', desc: 'RRB NTPC, Group D, and technical sections' },
      { name: 'State PSC Exams', desc: 'State-specific recruitment and syllabus' },
    ],
  },
  {
    id: 'iit-neet',
    title: 'IIT / NEET Preparation',
    description: 'Master core scientific concepts and high-yield problem solving for engineering and medical admissions.',
    icon: Atom,
    subcategories: [
      { name: 'Physics', desc: 'Mechanics, Electromagnetism, Optics, and Modern Physics' },
      { name: 'Chemistry', desc: 'Physical, Organic, and Inorganic Chemistry' },
      { name: 'Mathematics', desc: 'Calculus, Algebra, Coordinate Geometry, Vectors' },
      { name: 'Biology', desc: 'Botany, Zoology, Genetics, and Human Physiology' },
      { name: 'Mock Problem Sets', desc: 'Previous years papers and speed drills' },
    ],
  },
  {
    id: 'skills',
    title: 'Skills & Career Development',
    description: 'Build portfolio-ready projects, learn software engineering, algorithms, and technical fundamentals.',
    icon: Code,
    subcategories: [
      { name: 'Web Development', desc: 'HTML, CSS, modern JavaScript, and React ecosystem' },
      { name: 'Frontend Engineering', desc: 'Responsive UI, state management, and web performance' },
      { name: 'Backend & APIs', desc: 'Node.js, Express, REST APIs, and database modeling' },
      { name: 'Data Structures & Algorithms', desc: 'Arrays, Trees, Graphs, Dynamic Programming' },
      { name: 'AI & Machine Learning', desc: 'Python, ML foundations, neural nets, and LLMs' },
      { name: 'Data Science & SQL', desc: 'Pandas, NumPy, relational databases, and querying' },
      { name: 'Placement Aptitude', desc: 'Logical reasoning, quantitative ability, and interview prep' },
    ],
  },
  {
    id: 'other',
    title: 'Other Subjects & General Learning',
    description: 'Explore broad academic topics, self-improvement, foundational literacy, and specialized interests.',
    icon: Compass,
    subcategories: [
      { name: 'General Studies', desc: 'World history, geography, and civic foundations' },
      { name: 'Productivity & Focus', desc: 'Study habits, memory retention, and time management' },
      { name: 'Communication Skills', desc: 'Writing, technical presentations, and speaking' },
    ],
  },
];

export default function Categories() {
  const { user, updateUserCategory } = useAuth();
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState(user?.category || 'skills');
  const [courses, setCourses] = useState([]);
  const [updatingCategory, setUpdatingCategory] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const allCourses = await courseService.getAll();
        setCourses(allCourses || []);
      } catch (err) {
        console.error('Failed to load courses:', err);
      }
    };
    fetchCourses();
  }, []);

  const currentCatDef = CATEGORY_DEFINITIONS.find((c) => c.id === selectedCategory) || CATEGORY_DEFINITIONS[0];
  const Icon = currentCatDef.icon;

  const handleSetPrimary = async (catId) => {
    setUpdatingCategory(true);
    try {
      await updateUserCategory(catId);
    } catch (err) {
      console.error('Failed to update primary category:', err);
    } finally {
      setUpdatingCategory(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF7ED]">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Heading */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[#C2410C] border border-[#FED7AA] text-xs font-bold uppercase tracking-wider mb-2">
            <Layers size={13} className="text-[#EA580C]" /> Learning Curricula
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#431407] tracking-tight">
            Explore Learning Categories
          </h1>
          <p className="text-sm text-[#78716C] mt-2">
            Browse structured learning paths, subjects, and study tracks. You can explore all tracks without restriction.
          </p>
        </div>

        {/* 4 Primary Category Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {CATEGORY_DEFINITIONS.map((cat) => {
            const CatIcon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            const isUserPrimary = user?.category === cat.id;

            return (
              <div
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`p-5 clay-card cursor-pointer transition ${
                  isSelected ? 'clay-card-selected' : 'hover:border-[#FB923C]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      isSelected
                        ? 'bg-[#EA580C] text-white shadow-sm'
                        : 'bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]'
                    }`}
                  >
                    <CatIcon size={20} />
                  </div>
                  {isUserPrimary && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EA580C] text-white">
                      Primary
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-[#431407]">
                  {cat.title}
                </h3>
                <p className="text-xs text-[#78716C] mt-1 line-clamp-2 leading-relaxed">
                  {cat.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Selected Category Details View */}
        <div className="clay-card bg-white p-6 sm:p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#FED7AA] mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA] flex items-center justify-center">
                <Icon size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#431407]">
                  {currentCatDef.title}
                </h2>
                <p className="text-xs sm:text-sm text-[#78716C] mt-0.5">
                  {currentCatDef.description}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/chat"
                className="clay-btn-secondary text-xs px-4 py-2 flex items-center gap-1.5"
              >
                <MessageSquare size={14} /> Join Category Chat
              </Link>

              {user?.category !== selectedCategory && (
                <button
                  onClick={() => handleSetPrimary(selectedCategory)}
                  disabled={updatingCategory}
                  className="clay-btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                >
                  <Sparkles size={14} />
                  {updatingCategory ? 'Updating...' : 'Set as Primary Path'}
                </button>
              )}
            </div>
          </div>

          {/* Subcategories list */}
          <h3 className="text-base font-bold text-[#431407] mb-4">
            Curriculum Subjects & Modules
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
            {currentCatDef.subcategories.map((sub, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[#FFF7ED]/50 border border-[#FED7AA] hover:bg-[#FFF7ED] transition"
              >
                <h4 className="text-xs font-bold text-[#431407]">{sub.name}</h4>
                <p className="text-[11px] text-[#78716C] mt-1 leading-relaxed">
                  {sub.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Available Courses in this category */}
          <div className="pt-6 border-t border-[#FED7AA]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#431407]">
                Enrolled Courses in Platform
              </h3>
              <Link
                to="/my-learning"
                className="text-xs font-bold text-[#EA580C] hover:underline"
              >
                View in My Learning →
              </Link>
            </div>

            {courses.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#78716C]">
                No courses added yet. Go to your Dashboard or Admin Portal to add courses.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {courses.slice(0, 6).map((crs) => (
                  <div
                    key={crs._id}
                    className="p-3.5 rounded-xl bg-white border border-[#FED7AA] flex items-center justify-between gap-3 shadow-[1px_1px_3px_rgba(154,52,18,0.04)]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BookOpen size={16} className="text-[#EA580C] flex-shrink-0" />
                      <span className="text-xs font-bold text-[#431407] truncate">
                        {crs.name}
                      </span>
                    </div>
                    <Link
                      to="/my-learning"
                      className="p-1 rounded-lg text-[#EA580C] hover:bg-[#FFF7ED]"
                      title="Open Course"
                    >
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
