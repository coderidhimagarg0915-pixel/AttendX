import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PrototypeBanner } from '@/components/ui/PrototypeBanner';
import { useAuth } from '@/context/AuthContext';
import { 
  GraduationCap, 
  LayoutDashboard, 
  ArrowLeft,
  LogOut
} from 'lucide-react';

export const TeacherLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Faculty Member';
  const displayDepartment = profile?.department || profile?.institution_id || 'Dept. of Computer Science';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'FA';

  // Classroom page gets full-width layout — no sidebar squishing the content
  const isClassroomPage = location.pathname.includes('/teacher/classroom/');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <PrototypeBanner />
      
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isClassroomPage ? (
              <Link to="/teacher" className="text-slate-400 hover:text-slate-600 transition-colors mr-1 flex items-center gap-1.5 text-sm font-medium" title="Back to courses">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">My Courses</span>
              </Link>
            ) : (
              <Link to="/" className="text-slate-400 hover:text-slate-600 transition-colors mr-1" title="Back to home">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            )}
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
              <p className="text-xs font-semibold text-slate-800">{displayName}</p>
              <p className="text-[11px] text-slate-500">{displayDepartment}</p>
            </div>
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="w-9 h-9 rounded-full object-cover border border-indigo-200 shadow-sm"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center font-semibold text-indigo-700 text-xs">
                {initials}
              </div>
            )}
            <button
              onClick={handleSignOut}
              className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {isClassroomPage ? (
          // Full-width layout for classroom detail page
          <main className="w-full min-w-0">
            <Outlet />
          </main>
        ) : (
          // Dashboard layout with sidebar showing only real nav item
          <div className="flex flex-col md:flex-row gap-6">
            <aside className="w-full md:w-52 shrink-0">
              <nav className="space-y-1">
                <Link
                  to="/teacher"
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === '/teacher'
                      ? 'bg-brand-50 text-brand-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <LayoutDashboard className={`w-4 h-4 ${location.pathname === '/teacher' ? 'text-brand-600' : 'text-slate-400'}`} />
                  <span>My Courses</span>
                </Link>
              </nav>
            </aside>

            <main className="flex-1 min-w-0">
              <Outlet />
            </main>
          </div>
        )}
      </div>
    </div>
  );
};
