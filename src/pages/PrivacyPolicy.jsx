import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, FileText, Mail, Info, User } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function PrivacyPolicy() {
  const lastUpdated = "April 25, 2026";
  const developerName = "Abhinav Tiwari"; // User's name from context or placeholder
  const developerEmail = "support@studymate.ai"; // Placeholder
  const companyName = "StudyMate";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-6 py-12">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-orange-500 font-bold transition mb-8 text-sm">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <div className="glass-card p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 dark:bg-orange-500/5 rounded-bl-full pointer-events-none" />
          
          <div className="relative z-10">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mb-6">
              <Shield size={32} className="text-orange-500" />
            </div>
            
            <h1 className="text-4xl font-black text-slate-800 dark:text-white mb-2">Privacy Policy</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">
              Last Updated: {lastUpdated}
            </p>

            <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
              <section>
                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  Welcome to <strong>{companyName}</strong>. Your privacy is critical to us. This policy explains how we collect, use, and protect your information when you use our web application. By using {companyName}, you agree to these practices.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                  <User size={24} className="text-orange-500" /> 1. Information We Collect
                </h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  We may collect personal information such as your <strong>Full Name, Email Address, Username, and Profile Picture</strong> during account creation or Google Login.
                </p>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                   <h4 className="font-bold text-slate-800 dark:text-white mb-2 underline decoration-orange-500 decoration-2 underline-offset-4">Activity Data</h4>
                   <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                     We track your learning progress, including courses enrolled, quiz scores, video completion status, and study streaks to provide a personalized experience.
                   </p>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                  <Info size={24} className="text-blue-500" /> 2. How We Use Your Information
                </h2>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-400 list-none p-0">
                  {[
                    "Provide and improve our core services",
                    "Personalize your learning experience",
                    "Track study progress and performance",
                    "Maintain account security and safety",
                    "Send important updates and alerts",
                    "Optimize app performance and speed"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                      <div className="w-2 h-2 rounded-full bg-orange-500" /> {item}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                  <Lock size={24} className="text-green-500" /> 3. Data Security & Retention
                </h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  We use industry-standard encryption and security measures to protect your data. We retain your information only as long as necessary to provide services. You may request account deletion at any time through your profile settings.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                  <Eye size={24} className="text-indigo-500" /> 4. Third-Party Services
                </h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  We integrate with services like <strong>Firebase (Google Auth), YouTube (Content), and Google Drive</strong>. We do not sell your personal data to advertisers.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                  <FileText size={24} className="text-orange-500" /> 5. Developer Vision
                </h2>
                <div className="bg-orange-500/5 dark:bg-orange-500/5 border border-orange-500/20 p-8 rounded-[2rem]">
                  <p className="italic text-slate-700 dark:text-slate-200 leading-relaxed">
                    "{companyName} was born from a vision to make structured learning accessible and trackable for everyone. We believe that consistency is the key to mastering any skill, and our platform is built to foster that consistency through smart tracking and rewarding milestones."
                  </p>
                  <p className="mt-4 font-black grad-text text-lg">— {developerName}</p>
                </div>
              </section>

              <section className="pt-8 border-t border-slate-100 dark:border-slate-800">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-4 flex items-center gap-3">
                  <Mail size={24} className="text-pink-500" /> Contact Us
                </h2>
                <div className="text-slate-600 dark:text-slate-400 space-y-2">
                  <p><strong>Email:</strong> {developerEmail}</p>
                  <p><strong>Developer:</strong> {developerName}</p>
                  <p><strong>Location:</strong> Lucknow, India</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
