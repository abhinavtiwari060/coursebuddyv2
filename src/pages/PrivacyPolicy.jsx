import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ShieldCheck, Lock, Eye, FileText, Globe, Mail } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-16 w-full">
        <div className="glass-card p-8 md:p-12 rounded-[2.5rem] border border-orange-200 dark:border-slate-800 shadow-2xl shadow-orange-500/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-3xl rounded-full" />
          
          <div className="relative">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-2xl flex items-center justify-center mb-8">
              <ShieldCheck size={32} />
            </div>
            
            <h1 className="text-4xl font-black dark:text-white mb-2">Privacy Policy</h1>
            <p className="text-slate-500 font-bold mb-12 uppercase tracking-widest text-sm">Last Updated: October 2023</p>

            <div className="space-y-10 prose dark:prose-invert max-w-none">
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg"><Globe size={18} /></div>
                  <h2 className="text-xl font-bold m-0">1. Introduction</h2>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Welcome to StudyMate ("we," "our," or "us"). Your privacy is important to us. This Privacy Policy explains how we collect, use, store, and protect your information when you use our web application. By using StudyMate, you agree to the practices described in this Privacy Policy.
                </p>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg"><Eye size={18} /></div>
                  <h2 className="text-xl font-bold m-0">2. Information We Collect</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold mb-2">Personal Information</h3>
                    <p className="text-sm text-slate-500">Full name, email address, username, profile picture, and login credentials collected during account creation.</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold mb-2">Learning Activity</h3>
                    <p className="text-sm text-slate-500">Courses enrolled, quiz performance, video progress, study tracker data, and overall learning patterns.</p>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg"><Lock size={18} /></div>
                  <h2 className="text-xl font-bold m-0">3. How We Use Information</h2>
                </div>
                <ul className="list-none space-y-3 pl-0 text-slate-600 dark:text-slate-400">
                  <li className="flex gap-3"><CheckCircle2 className="text-green-500 flex-shrink-0" size={18} /> To provide and maintain our platform services</li>
                  <li className="flex gap-3"><CheckCircle2 className="text-green-500 flex-shrink-0" size={18} /> To track your learning progress and generate analytics</li>
                  <li className="flex gap-3"><CheckCircle2 className="text-green-500 flex-shrink-0" size={18} /> To provide personalized course recommendations</li>
                  <li className="flex gap-3"><CheckCircle2 className="text-green-500 flex-shrink-0" size={18} /> To communicate important updates or notifications</li>
                </ul>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-lg"><FileText size={18} /></div>
                  <h2 className="text-xl font-bold m-0">4. Data Protection</h2>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  We implement a variety of security measures to maintain the safety of your personal information. Your data is stored on secure servers and access is limited to authorized personnel only. However, no method of transmission over the internet is 100% secure.
                </p>
              </section>

              <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-xl shadow-orange-500/20">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                    <Mail size={24} />
                  </div>
                  <h2 className="text-2xl font-black">Contact Us</h2>
                </div>
                <p className="font-medium opacity-90 mb-6">If you have any questions about this Privacy Policy, please contact our support team at:</p>
                <div className="bg-white/10 p-4 rounded-2xl flex items-center gap-3 font-bold border border-white/20">
                   support@studymate.app
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
