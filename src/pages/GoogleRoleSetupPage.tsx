import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  GraduationCap,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  UserCheck,
  BookOpen,
  IdCard,
  ArrowRight,
} from 'lucide-react';

/**
 * GoogleRoleSetupPage
 * ────────────────────
 * Shown to first-time Google OAuth users who have authenticated but don't yet
 * have a profile row (or their profile is missing a role).
 *
 * The user selects Student or Faculty, optionally provides their institution ID,
 * and for faculty, confirms with the passcode. Then we upsert their profile.
 */
export const GoogleRoleSetupPage: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState<'student' | 'faculty' | null>(null);
  const [institutionId, setInstitutionId] = useState('');
  const [fullName, setFullName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Pre-fill name from Google account metadata
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    const googleName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      '';
    setFullName(googleName);

    // Email domain guard — if somehow a non-mnit user made it here, bounce them
    const email = user.email ?? '';
    if (email && !email.endsWith('@mnit.ac.in')) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedRole) {
      setErrorMessage('Please select your role (Student or Faculty).');
      return;
    }

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    setIsLoading(true);

    try {
      // Upsert the profile — Google OAuth won't trigger the signup DB trigger,
      // so we create/update it manually here.
      const { error } = await supabase.from('profiles').upsert(
        {
          id: user!.id,
          email: user!.email!,
          full_name: fullName.trim(),
          role: selectedRole,
          institution_id: institutionId.trim() || null,
          avatar_url: user!.user_metadata?.avatar_url || null,
        },
        { onConflict: 'id' }
      );

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      // Refresh auth context to pick up the new profile & role
      await refreshProfile();
      setSuccess(true);

      setTimeout(() => {
        navigate(selectedRole === 'faculty' ? '/teacher' : '/student', { replace: true });
      }, 1200);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
        <div className="flex flex-col items-center gap-5 max-w-sm text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-emerald-50 border-2 border-emerald-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Profile Created!</h2>
            <p className="mt-1.5 text-sm text-slate-500">
              Redirecting you to your{' '}
              {selectedRole === 'faculty' ? 'Faculty' : 'Student'} dashboard…
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center bg-slate-50 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center gap-2.5 mb-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold shadow-md">
            <GraduationCap className="w-6 h-6" />
          </div>
          <span className="text-2xl font-bold text-slate-900 tracking-tight">AttendX</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Complete Your Profile</h2>
        <div className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>MNIT Jaipur Portal · Almost there!</span>
        </div>
        {user?.email && (
          <p className="mt-2 text-xs text-slate-500">
            Signed in as <span className="font-semibold text-slate-700">{user.email}</span>
          </p>
        )}
      </div>

      {/* Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              />
            </div>

            {/* Role Selection Cards */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                I am a…
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Student */}
                <button
                  type="button"
                  onClick={() => setSelectedRole('student')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                    selectedRole === 'student'
                      ? 'border-brand-500 bg-brand-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedRole === 'student' ? 'bg-brand-100' : 'bg-slate-100'
                  }`}>
                    <BookOpen className={`w-5 h-5 ${selectedRole === 'student' ? 'text-brand-600' : 'text-slate-500'}`} />
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${selectedRole === 'student' ? 'text-brand-700' : 'text-slate-700'}`}>
                      Student
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Mark attendance</p>
                  </div>
                </button>

                {/* Faculty */}
                <button
                  type="button"
                  onClick={() => setSelectedRole('faculty')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                    selectedRole === 'faculty'
                      ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedRole === 'faculty' ? 'bg-emerald-100' : 'bg-slate-100'
                  }`}>
                    <UserCheck className={`w-5 h-5 ${selectedRole === 'faculty' ? 'text-emerald-600' : 'text-slate-500'}`} />
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${selectedRole === 'faculty' ? 'text-emerald-700' : 'text-slate-700'}`}>
                      Faculty
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Manage sessions</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Institution ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {selectedRole === 'faculty' ? 'Department / Employee ID' : 'Student Roll Number'}{' '}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <div className="relative">
                <IdCard className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={institutionId}
                  onChange={(e) => setInstitutionId(e.target.value)}
                  placeholder={
                    selectedRole === 'faculty' ? 'e.g. CS-FACULTY-01' : 'e.g. 2024UCP1234'
                  }
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !selectedRole}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                selectedRole === 'faculty'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500'
                  : 'bg-brand-600 hover:bg-brand-700 text-white focus:ring-brand-500'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Complete Setup</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
