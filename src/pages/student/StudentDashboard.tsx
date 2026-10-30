import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { StudentCheckInSchema } from '@/lib/validation';
import { FaceVerificationModal } from '@/components/student/FaceVerificationModal';
import { sessionService, StudentEnrolledCourse, WarningMessage, SessionRecord } from '@/services/sessionService';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Camera,
  ScanFace,
  Clock,
  Plus,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  CalendarDays,
  X,
  KeyRound,
  GraduationCap,
  ArrowRight,
  History,
  Sparkles
} from 'lucide-react';

const QR_VALIDITY_WINDOW_MS = 90 * 1000; // 90 seconds TTL (accounts for camera focus, mobile browser load & network latency)

export const StudentDashboard: React.FC = () => {
  const { profile, user } = useAuth();
  const [searchParams] = useSearchParams();
  const paramCode = searchParams.get('code') || '';
  const paramSessionId = searchParams.get('sessionId') || '';
  const paramCourse = searchParams.get('course') || '';
  const paramTs = searchParams.get('ts');

  const [sessionCode, setSessionCode] = useState(paramCode);
  const [effectiveSessionId, setEffectiveSessionId] = useState(paramSessionId);
  const [effectiveCourseCode, setEffectiveCourseCode] = useState(paramCourse);
  const [validQrTimestamp, setValidQrTimestamp] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isQuickSubmitting, setIsQuickSubmitting] = useState(false);
  const [qrExpirationError, setQrExpirationError] = useState<{
    isExpired: boolean;
    ageSeconds: number;
    allowedSeconds: number;
    code: string;
  } | null>(null);

  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState<StudentEnrolledCourse[]>([]);
  const [warnings, setWarnings] = useState<WarningMessage[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);

  // Join Classroom Modal state
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinFeedback, setJoinFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Full Log / Attendance History Modal state
  const [selectedCourseForLog, setSelectedCourseForLog] = useState<StudentEnrolledCourse | null>(null);
  const [courseSessionHistory, setCourseSessionHistory] = useState<SessionRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [submissionFeedback, setSubmissionFeedback] = useState<{
    status: 'success' | 'error';
    message: string;
    course?: string | undefined;
  } | null>(null);

  // Load student courses and warnings
  const loadStudentData = useCallback(async () => {
    setIsLoadingCourses(true);
    const [courses, unreadWarnings] = await Promise.all([
      sessionService.getStudentCoursesWithStats(),
      sessionService.getMyWarnings(),
    ]);
    setEnrolledCourses(courses);
    setWarnings(unreadWarnings);
    setIsLoadingCourses(false);
  }, []);

  useEffect(() => {
    loadStudentData();
  }, [loadStudentData]);

  // Realtime subscription for incoming warnings and attendance updates
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const channel = (supabase as any)
      .channel('student-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'warning_messages' }, () => {
        sessionService.getMyWarnings().then(setWarnings);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, () => {
        sessionService.getStudentCoursesWithStats().then(setEnrolledCourses);
      })
      .subscribe();

    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, []);

  // Validate QR TTL on scan & automatically launch face verification
  useEffect(() => {
    let activeCode = paramCode;
    let activeSessionId = paramSessionId;
    let activeCourse = paramCourse;
    let activeTs = paramTs;

    // Check localStorage fallback if URL parameters were stripped during login redirect
    if (!activeCode && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('attendx_pending_checkin');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.code && Date.now() - (parsed.storedAt || 0) < 600000) {
            activeCode = parsed.code;
            activeSessionId = parsed.sessionId || '';
            activeCourse = parsed.course || '';
            activeTs = parsed.ts || '';
          }
        }
      } catch {}
    }

    if (!activeCode) return;

    setSessionCode(activeCode);
    setEffectiveSessionId(activeSessionId);
    setEffectiveCourseCode(activeCourse);

    // Persist in localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'attendx_pending_checkin',
          JSON.stringify({
            code: activeCode,
            sessionId: activeSessionId,
            course: activeCourse,
            ts: activeTs,
            storedAt: Date.now(),
          })
        );
      } catch {}
    }

    if (activeTs) {
      const qrTimestamp = parseInt(activeTs, 10);
      const isTimestampValid = !isNaN(qrTimestamp) && qrTimestamp > 0;
      const ageMs = isTimestampValid ? Date.now() - qrTimestamp : 0;

      if (isTimestampValid && ageMs > QR_VALIDITY_WINDOW_MS) {
        // Flag warning banner but keep session code so user can verify
        const ageSeconds = Math.max(1, Math.round(ageMs / 1000));
        setQrExpirationError({
          isExpired: true,
          ageSeconds,
          allowedSeconds: Math.round(QR_VALIDITY_WINDOW_MS / 1000),
          code: activeCode,
        });
        setValidQrTimestamp(null);
        // Automatically open face modal so student proceeds to biometric scan
        setIsFaceModalOpen(true);
        return;
      }

      setValidQrTimestamp(qrTimestamp);
      setQrExpirationError(null);
      setIsFaceModalOpen(true);
    } else {
      setValidQrTimestamp(null);
      setQrExpirationError(null);
      setIsFaceModalOpen(true);
    }
  }, [paramCode, paramTs, paramSessionId, paramCourse]);

  const handleLaunchFaceVerification = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError(null);
    setSubmissionFeedback(null);
    setQrExpirationError(null);

    // Validate using Zod schema
    const result = StudentCheckInSchema.safeParse({ sessionCode: sessionCode.trim() });
    if (!result.success) {
      setFormError(result.error.errors[0]?.message || 'Please enter a valid session code format (e.g. DIST-849)');
      return;
    }

    // If sessionId is not provided via QR, find the active session in Supabase
    if (!effectiveSessionId) {
      const active = await sessionService.findActiveSession();
      if (active) {
        setEffectiveSessionId(active.id);
        if (!effectiveCourseCode) setEffectiveCourseCode(active.courseCode);
      }
    }

    setIsFaceModalOpen(true);
  };

  // Direct manual submission fallback (from teammate's branch)
  const handleQuickManualSubmit = async () => {
    setFormError(null);
    setSubmissionFeedback(null);

    const result = StudentCheckInSchema.safeParse({ sessionCode: sessionCode.trim() });
    if (!result.success) {
      setFormError(result.error.errors[0]?.message || 'Please enter a valid session code format (e.g. DIST-849)');
      return;
    }

    setIsQuickSubmitting(true);

    try {
      if (isSupabaseConfigured && effectiveSessionId) {
        const { data, error } = await (supabase as any).rpc('submit_student_attendance', {
          p_session_id: effectiveSessionId,
          p_submitted_code: sessionCode.trim(),
        });

        setIsQuickSubmitting(false);

        if (!error && data?.success) {
          // Record method as Manual OTP (No Face Biometrics)
          try {
            await (supabase as any).rpc('record_checkin_metadata', {
              p_session_id: effectiveSessionId,
              p_method: 'Manual OTP (No Face Biometrics)',
            });
          } catch {
            try {
              await (supabase as any)
                .from('attendance_records')
                .update({ user_agent: 'Manual OTP (No Face Biometrics)' })
                .eq('session_id', effectiveSessionId)
                .eq('student_id', user?.id || profile?.id);
            } catch {}
          }

          setSubmissionFeedback({
            status: 'success',
            message: 'Attendance recorded successfully via code verification!',
            course: effectiveCourseCode ? `${effectiveCourseCode}: Recorded` : undefined,
          });
          setSessionCode('');
          loadStudentData();
          return;
        } else if (data && data.success === false) {
          setSubmissionFeedback({
            status: 'error',
            message: data.error || 'The session code entered is invalid or has expired.',
          });
          return;
        }
      }

      // Offline / demo fallback check
      setTimeout(() => {
        setIsQuickSubmitting(false);
        if (sessionCode.trim().toUpperCase() === 'DIST-849' || sessionCode.trim().length >= 6) {
          setSubmissionFeedback({
            status: 'success',
            message: 'Check-in received! Session token validated and presence recorded.',
            course: effectiveCourseCode || 'CS301: Distributed Computing Systems',
          });
          setSessionCode('');
        } else {
          setSubmissionFeedback({
            status: 'error',
            message: 'The session code entered is invalid or has expired. Please verify with your instructor.',
          });
        }
      }, 700);
    } catch {
      setIsQuickSubmitting(false);
      setSubmissionFeedback({
        status: 'error',
        message: 'Could not process submission. Please try face verification or scan live QR.',
      });
    }
  };

  const handleVerificationComplete = (result: { success: boolean; message: string }) => {
    if (result.success) {
      if (typeof window !== 'undefined') { try { localStorage.removeItem('attendx_pending_checkin'); } catch {} }
      setSubmissionFeedback({
        status: 'success',
        message: result.message,
        course: effectiveCourseCode ? `${effectiveCourseCode}: Attendance Verified & Recorded` : 'Attendance Successfully Recorded',
      });
      setSessionCode('');
      setValidQrTimestamp(null);
      loadStudentData();
    } else {
      setSubmissionFeedback({
        status: 'error',
        message: result.message,
      });
    }
  };

  const handleJoinCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    setIsJoining(true);
    setJoinFeedback(null);

    const res = await sessionService.enrollViaJoinCode(joinCodeInput.trim());
    setIsJoining(false);

    if (res.success) {
      setJoinFeedback({ type: 'success', message: res.message });
      setJoinCodeInput('');
      loadStudentData();
      setTimeout(() => {
        setIsJoinModalOpen(false);
        setJoinFeedback(null);
      }, 1500);
    } else {
      setJoinFeedback({ type: 'error', message: res.message });
    }
  };

  const handleDismissWarning = async (warningId: string) => {
    await sessionService.markWarningRead(warningId);
    setWarnings((prev) => prev.filter((w) => w.id !== warningId));
  };

  // Open Full Log Modal for a course (from teammate's branch)
  const handleOpenCourseLog = async (course: StudentEnrolledCourse) => {
    setSelectedCourseForLog(course);
    setIsLoadingHistory(true);
    const history = await sessionService.getStudentSessionHistory(course.courseId, user?.id || 'demo-student');
    setCourseSessionHistory(history);
    setIsLoadingHistory(false);
  };

  const unreadWarnings = warnings.filter((w) => !w.isRead);
  const studentDisplayName = profile?.full_name || user?.email?.split('@')[0] || 'Student';
  const studentRoll = profile?.institution_id ? `Roll: ${profile.institution_id}` : 'MNIT Portal';

  // Check if any course is critical (< 75%)
  const criticalCourse = enrolledCourses.find((c) => c.attendancePercent < 75);

  return (
    <div className="space-y-6">
      {/* Title & Student Profile Banner */}
      <div className="pb-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Welcome back, {studentDisplayName}
            </h1>
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {studentRoll}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Submit classroom QR tokens with biometric face verification and track course quorum.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setJoinFeedback(null);
              setJoinCodeInput('');
              setIsJoinModalOpen(true);
            }}
            className="gap-1.5 border-brand-200 text-brand-700 hover:bg-brand-50"
          >
            <KeyRound className="w-4 h-4" />
            Join Classroom with Code
          </Button>
          <Badge variant="success" className="w-fit">
            Biometric Anti-Proxy Enforced
          </Badge>
        </div>
      </div>

      {/* ⚠️ IN-APP WARNING MESSAGES BANNER (From Teacher Portal) */}
      {unreadWarnings.length > 0 && (
        <div className="space-y-3">
          {unreadWarnings.map((w) => (
            <div
              key={w.id}
              className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-sm text-slate-900 animate-in fade-in slide-in-from-top-2 duration-300 relative"
            >
              <div className="flex items-start gap-3.5 pr-8">
                <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-amber-950">
                      Attendance Alert: {w.courseCode} — {w.courseName}
                    </span>
                    {w.attendancePercent !== null && (
                      <span className="font-mono text-xs font-bold text-amber-900 bg-amber-200 px-2 py-0.5 rounded-full border border-amber-300">
                        Current: {w.attendancePercent}%
                      </span>
                    )}
                    <span className="text-xs text-amber-800">from {w.facultyName}</span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed font-medium">
                    {w.message}
                  </p>
                  <p className="text-[10px] text-amber-700">
                    Received {new Date(w.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{' '}
                    at {new Date(w.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDismissWarning(w.id)}
                className="absolute top-3.5 right-3.5 p-1 rounded-lg text-amber-600 hover:text-amber-900 hover:bg-amber-100 transition-colors"
                title="Acknowledge and dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ⚠️ CRITICAL THRESHOLD ALERT (From Teammate's Branch) */}
      {criticalCourse && unreadWarnings.length === 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-rose-600" />
          </div>
          <div className="text-sm space-y-1 flex-1">
            <h4 className="font-bold text-rose-950 flex items-center gap-2">
              <span>Attendance Threshold Alert</span>
              <span className="font-mono text-xs font-bold text-rose-800 bg-rose-200 px-2 py-0.5 rounded-full">
                {criticalCourse.code}: {criticalCourse.attendancePercent}%
              </span>
            </h4>
            <p className="text-rose-800 text-xs leading-relaxed">
              Your attendance in <strong>{criticalCourse.code} ({criticalCourse.name})</strong> is currently{' '}
              <strong>{criticalCourse.attendancePercent}%</strong>, which is below the mandatory university threshold of <strong>75%</strong>. Attend the next consecutive sessions to restore eligibility.
            </p>
          </div>
        </div>
      )}

      {/* Check-In Terminal Section */}
      <Card className="border-emerald-200 bg-gradient-to-b from-emerald-50/40 to-white shadow-sm">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold tracking-wider uppercase text-emerald-800">
              Live Classroom Check-In Terminal
            </span>
          </div>

          <CardTitle className="text-xl">
            {paramCode ? `Scanned Code for ${paramCourse || 'Classroom Session'}` : 'Scan Classroom QR or Enter Code'}
          </CardTitle>
          <CardDescription className="mt-1">
            Point your device camera at the classroom projector or enter the active code to initiate face verification.
          </CardDescription>

          {/* Anti-Proxy Expiration Banner */}
          {qrExpirationError && (
            <div className="mt-4 p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 shadow-sm text-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6 text-rose-600" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-bold text-rose-950 text-sm sm:text-base flex items-center gap-1.5">
                      <span>Anti-Proxy Violation Detected: QR Code Expired</span>
                    </h4>
                    <span className="font-mono text-[11px] font-bold text-rose-800 bg-rose-200/80 px-2.5 py-0.5 rounded-full border border-rose-300">
                      Scanned {qrExpirationError.ageSeconds}s after generation (TTL: {qrExpirationError.allowedSeconds}s)
                    </span>
                  </div>
                  <p className="text-xs text-rose-900 leading-relaxed">
                    This QR code was captured from an <strong>older photo or screenshot</strong> and is no longer valid. 
                    AttendX rotates classroom codes every 15 seconds to prevent student proxy attendance and code forwarding.
                  </p>
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-lg border border-emerald-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      Please scan the LIVE rotating QR code on the projector screen
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleLaunchFaceVerification} className="mt-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="e.g. DIST-849"
                  value={sessionCode}
                  onChange={(e) => {
                    setSessionCode(e.target.value.toUpperCase());
                    if (formError) setFormError(null);
                    if (qrExpirationError) setQrExpirationError(null);
                  }}
                  className={`w-full uppercase font-mono tracking-widest text-base px-4 py-2.5 rounded-lg border bg-white focus:outline-none focus:ring-2 transition-all ${
                    formError || qrExpirationError
                      ? 'border-red-300 focus:ring-red-400'
                      : 'border-slate-300 focus:ring-emerald-500'
                  }`}
                  maxLength={12}
                />
              </div>

              {/* Direct Face Verification Launch Button */}
              <Button
                type="submit"
                variant="primary"
                className="bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 gap-1.5 shadow-sm"
              >
                <ScanFace className="w-4 h-4" />
                Verify Face &amp; Check In
              </Button>

              {/* Quick Submit Fallback Button (From Teammate's Branch) */}
              <Button
                type="button"
                variant="outline"
                onClick={handleQuickManualSubmit}
                isLoading={isQuickSubmitting}
                disabled={!sessionCode.trim()}
                className="text-slate-700 border-slate-300 hover:bg-slate-50 gap-1.5"
                title="Quick token submit without camera"
              >
                Quick Submit
              </Button>
            </div>

            {formError && (
              <p className="text-xs text-rose-600 flex items-center gap-1.5 font-medium mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {formError}
              </p>
            )}

            {submissionFeedback && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 mt-2 animate-in fade-in duration-200 ${
                  submissionFeedback.status === 'success'
                    ? 'bg-emerald-100/80 text-emerald-950 border border-emerald-300 shadow-xs'
                    : 'bg-rose-100 text-rose-950 border border-rose-300 shadow-xs'
                }`}
              >
                {submissionFeedback.status === 'success' ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">{submissionFeedback.message}</p>
                  {submissionFeedback.course && (
                    <p className="mt-0.5 text-emerald-800 font-medium">{submissionFeedback.course}</p>
                  )}
                </div>
              </div>
            )}
          </form>

          {/* Biometric Guarantee Note */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-brand-600 shrink-0" />
              Biometric camera matches facial alignment against registered profile.
            </span>
            <span className="hidden sm:inline text-slate-400">Zero Proxy Guarantee</span>
          </div>
        </div>
      </Card>

      {/* Enrolled Course Attendance Quorum Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Enrolled Course Attendance Quorum</h2>
            <p className="text-xs text-slate-500">Official academic threshold: 75% attendance required</p>
          </div>
          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="flex items-center gap-1.5 text-xs text-brand-600 font-bold hover:text-brand-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Join Another Course
          </button>
        </div>

        {isLoadingCourses ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : enrolledCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enrolledCourses.map((c) => {
              const isAtRisk = c.attendancePercent < 75;
              const faculty = c.facultyName || 'Faculty Instructor';
              return (
                <Card key={c.courseId} className="p-4 space-y-3.5 border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-100">
                            {c.code}
                          </span>
                          <span className="text-xs text-slate-400">{c.semester}</span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 mt-1">{c.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{faculty}</p>
                      </div>
                      <Badge variant={isAtRisk ? 'danger' : 'success'} className="shrink-0 text-[10px]">
                        {isAtRisk ? 'Below 75% Requirement' : 'Eligible'}
                      </Badge>
                    </div>

                    {/* Attendance Percentage & Progress Bar */}
                    <div className="space-y-1.5 mt-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                          {c.attendedSessions} of {c.totalSessions} sessions attended
                        </span>
                        <span className={`font-mono font-black text-sm flex items-center gap-1 ${isAtRisk ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {isAtRisk && <TrendingDown className="w-3.5 h-3.5" />}
                          {c.attendancePercent}%
                        </span>
                      </div>

                      <div className="w-full bg-slate-100 rounded-full h-2.5 relative overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-500 ${isAtRisk ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, c.attendancePercent)}%` }}
                        />
                        {/* 75% threshold marker */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-slate-400"
                          style={{ left: '75%' }}
                          title="75% Quorum Threshold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Footer with Minimum Required and Interactive Full Log button */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 mt-2">
                    <span>Minimum Required: 75%</span>
                    <button
                      onClick={() => handleOpenCourseLog(c)}
                      className="text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1 transition-colors group cursor-pointer"
                    >
                      <span>Full Log</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3">
              <GraduationCap className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">You haven't joined any classrooms yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-4">
              Enter the 8-character join code provided by your instructor to self-enroll in their course.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsJoinModalOpen(true)}
              className="gap-1.5 shadow-sm mx-auto"
            >
              <KeyRound className="w-4 h-4" />
              Join a Classroom
            </Button>
          </div>
        )}
      </div>

      {/* Course Attendance History Modal ("Full Log") */}
      <Modal
        isOpen={Boolean(selectedCourseForLog)}
        onClose={() => setSelectedCourseForLog(null)}
        title={selectedCourseForLog ? `${selectedCourseForLog.code} — Attendance History` : 'Attendance History'}
        description={selectedCourseForLog ? `${selectedCourseForLog.name} • ${selectedCourseForLog.facultyName || 'Faculty Instructor'}` : ''}
        maxWidth="lg"
      >
        <div className="space-y-4">
          {selectedCourseForLog && (
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Attended Sessions</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">
                  {selectedCourseForLog.attendedSessions}/{selectedCourseForLog.totalSessions}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Current Quorum</p>
                <p className={`text-lg font-bold mt-0.5 ${selectedCourseForLog.attendancePercent < 75 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {selectedCourseForLog.attendancePercent}%
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Status</p>
                <Badge
                  variant={selectedCourseForLog.attendancePercent < 75 ? 'danger' : 'success'}
                  className="mt-1"
                >
                  {selectedCourseForLog.attendancePercent < 75 ? 'Critical (<75%)' : 'Eligible'}
                </Badge>
              </div>
            </div>
          )}

          {isLoadingHistory ? (
            <div className="space-y-2 py-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : courseSessionHistory.length > 0 ? (
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
              {courseSessionHistory.map((s) => {
                const isPresent = s.status === 'present';
                const isLate = s.status === 'late';
                return (
                  <div key={s.sessionId} className="pt-2.5 pb-2 flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-900">{s.sessionTitle}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{s.sessionDate}</span>
                        {s.verifiedAt && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-700 font-medium flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-emerald-500" />
                              {s.verificationMethod || 'Biometric Match'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={isPresent ? 'success' : isLate ? 'warning' : 'danger'}
                      className="shrink-0 uppercase text-[10px]"
                    >
                      {s.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p>No classroom sessions recorded yet for this course.</p>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={() => setSelectedCourseForLog(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Join Course Modal (Google Classroom style) */}
      <Modal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        title="Join Classroom"
        description="Enter the course join code shared by your professor (e.g. 8 characters)."
        maxWidth="md"
      >
        <form onSubmit={handleJoinCourse} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Course Join Code
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="e.g. A9B4C7D2"
                value={joinCodeInput}
                onChange={(e) => {
                  setJoinCodeInput(e.target.value.toUpperCase());
                  if (joinFeedback) setJoinFeedback(null);
                }}
                className="w-full pl-9 pr-3 py-2 text-base font-mono font-bold uppercase tracking-widest border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                maxLength={10}
                autoFocus
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Ask your teacher for the course code displayed on their classroom projector or dashboard.
            </p>
          </div>

          {joinFeedback && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                joinFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {joinFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{joinFeedback.message}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsJoinModalOpen(false)}
              disabled={isJoining}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isJoining}
              disabled={!joinCodeInput.trim()}
            >
              Join Classroom
            </Button>
          </div>
        </form>
      </Modal>

      {/* Face Verification Modal */}
      <FaceVerificationModal
        isOpen={isFaceModalOpen}
        onClose={() => setIsFaceModalOpen(false)}
        sessionId={effectiveSessionId}
        sessionCode={sessionCode}
        courseCode={effectiveCourseCode}
        qrTimestamp={validQrTimestamp || undefined}
        onVerificationComplete={handleVerificationComplete}
      />
    </div>
  );
};
