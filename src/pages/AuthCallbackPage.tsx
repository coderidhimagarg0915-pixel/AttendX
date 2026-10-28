import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { GraduationCap, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

/**
 * AuthCallbackPage
 * ─────────────────
 * Supabase redirects here after:
 *   1. The user clicks an email confirmation link  (#access_token=...&type=signup)
 *   2. Google OAuth completes                      (?code=...)
 *
 * The Supabase client SDK automatically exchanges these for a session.
 * We wait for the SIGNED_IN event, fetch the profile, and route the user:
 *   • No profile yet  → /auth/role-setup   (new Google OAuth user)
 *   • Has a role      → /teacher or /student
 */


export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Confirming your MNIT email…');

  useEffect(() => {
    let redirectTimer: ReturnType<typeof setTimeout>;

    // The Supabase client parses the URL hash on load and fires SIGNED_IN.
    // We listen here to grab the session and route the user.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const user = session.user;

        setMessage('Signed in! Loading your profile…');

        // Check email domain first
        const userEmail = user.email?.toLowerCase() || '';
        if (!userEmail.endsWith('@mnit.ac.in')) {
          await supabase.auth.signOut();
          setStatus('error');
          setMessage('Access restricted: Only official MNIT Jaipur email addresses (@mnit.ac.in) are permitted.');
          redirectTimer = setTimeout(() => {
            navigate('/login', {
              replace: true,
              state: {
                error: 'Access restricted: Only official MNIT Jaipur email addresses (@mnit.ac.in) are permitted.',
              },
            });
          }, 2500);
          return;
        }

        // Fetch profile from public.profiles
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role, institution_id')
            .eq('id', user.id)
            .maybeSingle();

          // A user is NOT registered if:
          // 1. No profile exists in public.profiles, OR
          // 2. The user has no assigned role in their user_metadata AND no institution_id/role setup completed
          // (which happens when Supabase trigger auto-inserts a default 'student' profile on Google OAuth login)
          const isGoogleUser = user.app_metadata?.provider === 'google' || 
                               user.identities?.some(id => id.provider === 'google');
          const hasExplicitRole = !!user.user_metadata?.role;
          const isRegistered = profile && (!isGoogleUser || hasExplicitRole || !!profile.institution_id);

          if (error || !isRegistered) {
            // Unregistered user! Sign out immediately and bounce to login with error
            // Also clean up any auto-created stub profile
            try {
              await supabase.from('profiles').delete().eq('id', user.id);
            } catch {
              // Ignore if RLS restricts delete
            }
            await supabase.auth.signOut();
            setStatus('error');
            setMessage('No registered account found for this Google email. Please register first.');
            redirectTimer = setTimeout(() => {
              navigate('/login', {
                replace: true,
                state: {
                  error: `No registered account found for ${user.email}. Please register first using the New Registration tab.`,
                },
              });
            }, 2000);
            return;
          }

          const role = profile.role as string;
          setStatus('success');
          setMessage(`Welcome back! Redirecting to your ${role === 'faculty' ? 'Faculty' : 'Student'} dashboard…`);
          redirectTimer = setTimeout(() => {
            navigate(role === 'faculty' ? '/teacher' : '/student', { replace: true });
          }, 1200);

        } catch {
          await supabase.auth.signOut();
          setStatus('error');
          setMessage('Something went wrong. Redirecting to sign in…');
          redirectTimer = setTimeout(() => navigate('/login', { replace: true }), 3000);
        }
      } else if (event === 'SIGNED_OUT') {
        // No valid token in URL
        setStatus('error');
        setMessage('Verification link is invalid or expired. Please register again.');
        redirectTimer = setTimeout(() => navigate('/login', { replace: true }), 3000);
      }
    });

    // Safety net: if nothing fires in 10s, redirect to login
    const safetyTimer = setTimeout(() => {
      setStatus('error');
      setMessage('Verification timed out. Please sign in manually.');
      navigate('/login', { replace: true });
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(redirectTimer);
      clearTimeout(safetyTimer);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="flex flex-col items-center gap-5 max-w-sm text-center">
        {/* Brand */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md">
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">AttendX</span>
        </div>

        {/* Status Icon */}
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
            status === 'loading'
              ? 'bg-brand-50 border-brand-200'
              : status === 'success'
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-rose-50 border-rose-200'
          }`}
        >
          {status === 'loading' && (
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          )}
          {status === 'success' && (
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          )}
          {status === 'error' && (
            <AlertCircle className="w-8 h-8 text-rose-600" />
          )}
        </div>

        {/* Message */}
        <div>
          <h2 className="text-base font-bold text-slate-900">
            {status === 'loading' && 'Verifying Your Account'}
            {status === 'success' && 'Verification Complete!'}
            {status === 'error' && 'Verification Failed'}
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">{message}</p>
        </div>

        {/* Progress dots for loading */}
        {status === 'loading' && (
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-brand-300 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}

        <p className="text-[11px] text-slate-400">
          MNIT Jaipur Academic Portal — AttendX
        </p>
      </div>
    </div>
  );
};
