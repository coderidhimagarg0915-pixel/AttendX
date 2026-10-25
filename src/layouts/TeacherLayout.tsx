import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { PrototypeBanner } from '@/components/ui/PrototypeBanner';
import { 
  GraduationCap, 
  LayoutDashboard, 
  Users, 
  ClipboardCheck, 
  FileText, 
  Settings,
  ArrowLeft
} from 'lucide-react';

export const TeacherLayout: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { label: 'Overview', href: '/teacher', icon: LayoutDashboard },
    { label: 'Active Sessions', href: '/teacher/sessions', icon: ClipboardCheck },
    { label: 'Students & Rosters', href: '/teacher/roster', icon: Users },
    { label: 'Attendance Reports', href: '/teacher/reports', icon: FileText },
    { label: 'Course Settings', href: '/teacher/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <PrototypeBanner />
      
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-slate-400 hover:text-slate-600 transition-colors mr-1" title="Back to home">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold shadow-sm">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-slate-900 tracking-tight text-lg">AttendX</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
                Faculty Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-800">Dr. Sarah Jenkins</p>
              <p className="text-[11px] text-slate-500">Dept. of Computer Science</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-semibold text-slate-600 text-xs">
              SJ
            </div>
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sub Navigation Sidebar */}
          <aside className="w-full md:w-60 shrink-0">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Core Content */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
