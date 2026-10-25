import React from 'react';
import { Link } from 'react-router-dom';
import { PrototypeBanner } from '@/components/ui/PrototypeBanner';
import { Button } from '@/components/ui/Button';
import { 
  GraduationCap, 
  BookOpen, 
  ShieldCheck, 
  Users, 
  Sparkles, 
  ArrowRight,
  Database,
  CheckCircle2,
  Lock
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <PrototypeBanner />

      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold shadow-sm">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">AttendX</span>
              <span className="text-xs text-slate-500 ml-2 hidden sm:inline">Classroom Attendance System</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/teacher">
              <Button variant="outline" size="sm">
                Faculty Portal
              </Button>
            </Link>
            <Link to="/student">
              <Button variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                Student Portal
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
            <Sparkles className="w-3.5 h-3.5" />
            Milestone 1 — Frontend Foundation &amp; Architecture
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            High-integrity classroom attendance for modern higher education.
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            AttendX eliminates proxy attendance with dynamic cryptographic session codes, server-side PostgreSQL Row-Level Security, and dual dashboards tailored for professors and students.
          </p>
        </div>

        {/* Dual Dashboard Portal Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Faculty Dashboard Preview Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-5 border border-brand-100">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider text-brand-600">Portal 01</span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500 font-medium">Faculty &amp; Instructors</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mt-2">Teacher Dashboard</h2>
              <p className="text-slate-600 text-sm mt-3 leading-relaxed">
                Launch dynamic OTP session codes, inspect live quorum attendance, enforce lecture timeframes, and audit student check-in timestamps with manual override controls.
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />
                  Real-time dynamic session token generator
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />
                  Live attendee counter with auto-expiring windows
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />
                  Direct CSV export &amp; manual roll correction
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <Link to="/teacher" className="w-full block">
                <Button variant="primary" className="w-full justify-between group">
                  <span>Open Teacher Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Student Dashboard Preview Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5 border border-emerald-100">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider text-emerald-600">Portal 02</span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500 font-medium">Enrolled Students</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mt-2">Student Dashboard</h2>
              <p className="text-slate-600 text-sm mt-3 leading-relaxed">
                Instant classroom check-in terminal with Zod input validation, real-time subject-wise percentage tracking, and proactive threshold alerts (&lt;75% attendance).
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  One-tap token entry with keyboard navigation &amp; error states
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Transparent quorum eligibility calculations
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Cryptographic server confirmation status
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <Link to="/student" className="w-full block">
                <Button variant="primary" className="w-full justify-between bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 group">
                  <span>Open Student Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Engineering Rules Highlights Box */}
        <div className="mt-12 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm mb-4">
            <Lock className="w-4 h-4 text-brand-600" />
            <span>Adherence to AttendX Engineering Rules</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="font-semibold text-slate-800">Rule 8 &amp; 9: Server-Side RLS</p>
              <p className="mt-1 text-slate-500">
                Zero client-side role trust. Service role keys never bundled. Supabase PostgreSQL policies enforce table access.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="font-semibold text-slate-800">Rule 11: True Verification</p>
              <p className="mt-1 text-slate-500">
                Students are never marked present just because the browser reports 200 OK. Verification requires database timestamp matching.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="font-semibold text-slate-800">Rule 6: Realistic Mock Data</p>
              <p className="mt-1 text-slate-500">
                Prototypes explicitly tagged with prototype warning banners. Real data integrity strictly separated.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-400">
          AttendX Academic SaaS • Built by Team of 4 with React, Vite, TypeScript, Tailwind &amp; Supabase
        </div>
      </footer>
    </div>
  );
};
