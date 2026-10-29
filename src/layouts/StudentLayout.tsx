import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { PrototypeBanner } from '@/components/ui/PrototypeBanner';
import { useAuth } from '@/context/AuthContext';
import { 
  BookOpen, 
  ArrowLeft,
  LogOut
} from 'lucide-react';

export const StudentLayout: React.FC = () => {
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Enrolled Student';
  const displayRoll = profile?.institution_id ? `Roll: ${profile.institution_id}` : user?.email || 'Student Portal';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'ST';

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
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-slate-900 tracking-tight text-lg">AttendX</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100">
                Student Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-800">{displayName}</p>
              <p className="text-[11px] text-slate-500">{displayRoll}</p>
            </div>
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="w-9 h-9 rounded-full object-cover border border-emerald-200 shadow-sm"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center font-semibold text-xs">
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

      {/* Main View Area — full width, no sidebar (single page) */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <main className="w-full min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
