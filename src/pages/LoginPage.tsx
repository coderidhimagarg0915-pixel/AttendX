import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  GraduationCap,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  IdCard,
  Camera,
  Check,
  Sparkles,
} from 'lucide-react';
import { FaceScannerModal } from '@/components/auth/FaceScannerModal';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, signInWithPassword, signInWithGoogle, signUp } = useAuth();

  // Mode: 'signin' or 'signup'
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sign up fields
  const [fullName, setFullName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isTeacherSignup, setIsTeacherSignup] = useState(false);

  // Biometric Face Capture States
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [faceImageBlob, setFaceImageBlob] = useState<Blob | null>(null);
  const [facePreviewUrl, setFacePreviewUrl] = useState<string | null>(null);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Helper to extract pending check-in or return URL
  const getRedirectTarget = useCallback((): string | null => {
    // 1. Check React Router state
    const fromState = (location.state as any)?.from;
    if (typeof fromState === 'string' && fromState.startsWith('/')) {
      return fromState;
    }
    if (fromState?.pathname) {
      return `${fromState.pathname}${fromState.search || ''}`;
    }

    // 2. Check current URL query params (if user opened /login?code=DIST-849...)
    if (typeof window !== 'undefined' && location.search) {
      const sp = new URLSearchParams(location.search);
      if (sp.get('code') || sp.get('sessionId')) {
        return `/student${location.search}`;
      }
    }

    // 3. Check persistent localStorage check-in (valid for 10 minutes)
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('attendx_pending_checkin');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.code && Date.now() - (parsed.storedAt || 0) < 600000) {
            const qs = new URLSearchParams();
            if (parsed.sessionId) qs.set('sessionId', parsed.sessionId);
            if (parsed.code) qs.set('code', parsed.code);
            if (parsed.ts) qs.set('ts', parsed.ts);
            if (parsed.course) qs.set('course', parsed.course);
            return `/student?${qs.toString()}`;
          }
        }
      } catch {}
    }

    return null;
  }, [location.state, location.search]);

  // Detected pending checkin info for UI banner
  const pendingCheckinInfo = useMemo(() => {
    const target = getRedirectTarget();
    if (target && target.includes('code=')) {
      try {
        const queryPart = target.split('?')[1];
        if (queryPart) {
          const sp = new URLSearchParams(queryPart);
          return {
            code: sp.get('code'),
            course: sp.get('course'),
          };
        }
      } catch {}
    }
    return null;
  }, [getRedirectTarget]);

  // Display errors or messages passed via router state
  useEffect(() => {
    const state = location.state as { error?: string; message?: string } | null;
    if (state?.error) {
      setErrorMessage(state.error);
    } else if (state?.message) {
      setSuccessMessage(state.message);
    }
  }, [location.state]);

  // Automatically redirect when user is authenticated
  useEffect(() => {
    if (user && role) {
      const target = getRedirectTarget();
      if (role === 'faculty') {
        navigate('/teacher', { replace: true });
      } else if (target) {
        navigate(target, { replace: true });
      } else {
        navigate('/student', { replace: true });
      }
    }
  }, [user, role, navigate, getRedirectTarget]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      setErrorMessage('Please enter both your MNIT email and password.');
      return;
    }

    // Enforce @mnit.ac.in domain restriction
    if (!trimmedEmail.endsWith('@mnit.ac.in')) {
      setErrorMessage(
        'Access restricted: Only official MNIT Jaipur email addresses (@mnit.ac.in) are permitted.'
      );
      return;
    }

    setIsLoading(true);
    const { error, role: loggedInRole } = await signInWithPassword(trimmedEmail, password);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setErrorMessage('Invalid MNIT email or password. Please verify your credentials.');
      } else {
        setErrorMessage(error.message);
      }
      return;
    }

    const effectiveRole = loggedInRole || role || 'student';
    const target = getRedirectTarget();
    if (effectiveRole === 'faculty' || effectiveRole === 'admin') {
      navigate('/teacher', { replace: true });
    } else if (target) {
      navigate(target, { replace: true });
    } else {
      navigate('/student', { replace: true });
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsGoogleLoading(true);

    const target = getRedirectTarget();
    if (target && typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('attendx_oauth_return', target);
      } catch {}
    }

    const { error } = await signInWithGoogle();
    if (error) {
      setErrorMessage(error.message || 'Google sign-in failed. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim().toLowerCase();

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!trimmedEmail.endsWith('@mnit.ac.in')) {
      setErrorMessage(
        'Registration is restricted to MNIT Jaipur members. Please use your official @mnit.ac.in email address (e.g. 2024ucp1234@mnit.ac.in).'
      );
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    // Require face scan for students (optional for faculty)
    if (!isTeacherSignup && !faceDescriptor) {
      setErrorMessage('Biometric Face Registration is required for students. Please click "Scan Face" below.');
      return;
    }

    setIsLoading(true);
    const assignedRole = isTeacherSignup ? 'faculty' : 'student';

    const { error, role: createdRole } = await signUp({
      email: trimmedEmail,
      password,
      fullName,
      institutionId: rollNumber ? rollNumber : undefined,
      role: assignedRole,
      faceEmbedding: faceDescriptor || undefined,
      faceImageBlob: faceImageBlob || undefined,
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    const effectiveRole = createdRole || assignedRole;
    const target = getRedirectTarget();
    setSuccessMessage('Account created successfully! Redirecting to your dashboard...');
    setTimeout(() => {
      if (effectiveRole === 'faculty') {
        navigate('/teacher', { replace: true });
      } else if (target) {
        navigate(target, { replace: true });
      } else {
        navigate('/student', { replace: true });
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-slate-50 py-12 sm:px-6 lg:px-8">
      {/* Top Brand Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold shadow-md group-hover:scale-105 transition-transform">
            <GraduationCap className="w-6 h-6" />
          </div>
          <span className="text-2xl font-bold text-slate-900 tracking-tight">AttendX</span>
        </Link>
        <h2 className="mt-3 text-xl font-bold text-slate-900 tracking-tight">
          {activeTab === 'signin' ? 'Sign in to AttendX' : 'Student & Faculty Registration'}
        </h2>
        <div className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>MNIT Jaipur Portal • @mnit.ac.in only</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Academic SaaS for tamper-proof classroom attendance
        </p>
      </div>

      {/* Main Login Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="shadow-lg border-slate-200">
          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 mb-6 -mt-2 -mx-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-3 text-xs font-semibold text-center border-b-2 transition-all ${
                activeTab === 'signin'
                  ? 'border-brand-600 text-brand-700 bg-brand-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              Sign In (All Roles)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-3 text-xs font-semibold text-center border-b-2 transition-all ${
                activeTab === 'signup'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              New Registration
            </button>
          </div>

          {/* Pending Check-in Notification Banner */}
          {pendingCheckinInfo?.code && (
            <div className="mb-4 p-3.5 rounded-xl bg-gradient-to-r from-brand-50 to-emerald-50 border border-brand-200 text-slate-800 text-xs flex items-center justify-between gap-3 shadow-sm animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-brand-600 text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">QR Check-In Detected!</p>
                  <p className="text-[11px] text-slate-600">
                    Code <strong className="font-mono text-brand-700 bg-brand-100/80 px-1.5 py-0.5 rounded font-bold">{pendingCheckinInfo.code}</strong>{' '}
                    {pendingCheckinInfo.course ? `(${pendingCheckinInfo.course})` : ''} will open verification automatically after sign in.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md shrink-0 border border-emerald-200">
                Auto-Saved
              </span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {activeTab === 'signin' ? (
            /* SIGN IN FORM */
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  MNIT Institutional Email (@mnit.ac.in)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="2024ucp1234@mnit.ac.in or prof@mnit.ac.in"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <span className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer">
                    Forgot?
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-10 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full justify-center"
                  isLoading={isLoading}
                >
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>

              {/* Divider */}
              <div className="relative flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[11px] text-slate-400 font-medium">or continue with</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Google Sign-In */}
              <button
                type="button"
                id="google-signin-btn"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isLoading}
                className="w-full flex items-center justify-center gap-2.5 py-2 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                {isGoogleLoading ? (
                  <svg className="w-4 h-4 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                <span>{isGoogleLoading ? 'Redirecting to Google…' : 'Continue with Google (@mnit.ac.in)'}</span>
              </button>

              {/* Security Hint */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Role and permissions verified automatically by server</span>
              </div>
            </form>
          ) : (
            /* SIGN UP FORM */
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isTeacherSignup ? 'Department / Employee ID' : 'Student Roll Number'}
                </label>
                <div className="relative">
                  <IdCard className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder={isTeacherSignup ? 'e.g. CS-FACULTY-01' : 'e.g. 2024UCP1234'}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  MNIT Email (@mnit.ac.in)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={isTeacherSignup ? 'faculty@mnit.ac.in' : '2024ucp1234@mnit.ac.in'}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 chars"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>

              {/* Teacher Mode Toggle */}
              <div className="pt-1">
                <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-700 font-medium">Are you a faculty member?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTeacherSignup(!isTeacherSignup);
                      setErrorMessage(null);
                    }}
                    className="text-brand-600 font-semibold hover:underline"
                  >
                    {isTeacherSignup ? 'Register as Student' : 'Register as Faculty'}
                  </button>
                </div>
              </div>

              {/* Biometric Face Registration Section */}
              <div className="p-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/70">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-brand-600" />
                      <span className="text-xs font-bold text-slate-800">
                        Face Biometric Scan {!isTeacherSignup && <span className="text-rose-500">*</span>}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isTeacherSignup
                        ? 'Optional for faculty members'
                        : 'Required to verify presence during classroom attendance sessions'}
                    </p>
                  </div>

                  {facePreviewUrl ? (
                    <div className="relative group shrink-0">
                      <img
                        src={facePreviewUrl}
                        alt="Enrolled Face"
                        className="w-11 h-11 rounded-lg object-cover border-2 border-emerald-500 shadow-sm"
                      />
                      <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFaceModalOpen(true)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                      faceDescriptor
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                        : 'bg-brand-600 hover:bg-brand-700 text-white'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{faceDescriptor ? 'Re-scan Face' : 'Open Camera & Scan Face'}</span>
                  </button>

                  {faceDescriptor && (
                    <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 bg-emerald-100/60 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                      <Check className="w-3 h-3" />
                      Enrolled
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
                  isLoading={isLoading}
                >
                  <span>{isTeacherSignup ? 'Create Faculty Account' : 'Create Student Account'}</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </form>
          )}
        </Card>

        {/* Back to Home Link */}
        <div className="mt-4 text-center">
          <Link to="/" className="text-xs text-slate-500 hover:text-slate-800 font-medium">
            ← Back to AttendX Overview
          </Link>
        </div>
      </div>

      {/* Live Biometric Face Scanner Modal */}
      <FaceScannerModal
        isOpen={isFaceModalOpen}
        onClose={() => setIsFaceModalOpen(false)}
        onFaceCaptured={(data) => {
          setFaceDescriptor(data.descriptor);
          setFaceImageBlob(data.imageBlob);
          setFacePreviewUrl(data.previewUrl);
          setErrorMessage(null);
        }}
      />
    </div>
  );
};
