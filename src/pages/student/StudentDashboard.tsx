import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StudentCheckInSchema } from '@/lib/validation';
import { FaceVerificationModal } from '@/components/student/FaceVerificationModal';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { 
  AlertCircle, 
  ShieldCheck, 
  Camera, 
  ScanFace,
  BookOpen
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const paramCode = searchParams.get('code') || '';
  const paramSessionId = searchParams.get('sessionId') || '';
  const paramCourse = searchParams.get('course') || '';

  const [sessionCode, setSessionCode] = useState(paramCode);
  const [formError, setFormError] = useState<string | null>(null);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    status: 'success' | 'error';
    message: string;
    course?: string;
  } | null>(null);

  // Sync sessionCode if search param changes and auto-prompt face scanner
  useEffect(() => {
    if (paramCode) {
      setSessionCode(paramCode);
      setIsFaceModalOpen(true);
    }
  }, [paramCode]);

  // Load real courses from Supabase
  useEffect(() => {
    if (isSupabaseConfigured) {
      (supabase as any)
        .from('courses')
        .select('*')
        .then(({ data }: any) => {
          if (data && data.length > 0) {
            setCourses(data);
          }
        });
    }
  }, []);

  const handleLaunchFaceVerification = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError(null);
    setSubmissionFeedback(null);

    // Validate using Zod schema
    const result = StudentCheckInSchema.safeParse({ sessionCode: sessionCode.trim() });
    if (!result.success) {
      setFormError(result.error.errors[0]?.message || 'Please enter a valid session code format');
      return;
    }

    setIsFaceModalOpen(true);
  };

  const handleVerificationComplete = (result: { success: boolean; message: string }) => {
    if (result.success) {
      setSubmissionFeedback({
        status: 'success',
        message: result.message,
        course: paramCourse ? `${paramCourse}: Active Attendance Recorded` : 'Attendance Successfully Recorded',
      });
      setSessionCode('');
    } else {
      setSubmissionFeedback({
        status: 'error',
        message: result.message,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="pb-2 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Attendance Portal</h1>
          <p className="text-sm text-slate-500">
            Submit classroom QR tokens with biometric face verification and track course quorum.
          </p>
        </div>
        <Badge variant="success" className="w-fit">
          Biometric Anti-Proxy Enforced
        </Badge>
      </div>

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
                  }}
                  className={`w-full uppercase font-mono tracking-widest text-base px-4 py-2.5 rounded-lg border bg-white focus:outline-none focus:ring-2 transition-all ${
                    formError
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
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
            <Camera className="w-3.5 h-3.5 text-brand-600 shrink-0" />
            <span>Biometric camera verification matches facial alignment before recording attendance.</span>
          </div>
        </div>
      </Card>

      {/* Real Course Attendance Quorum */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-900">Enrolled Course Attendance Quorum</h2>
          <span className="text-xs text-slate-500">Minimum threshold: 75% requirement</span>
        </div>

        {courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((c) => (
              <Card key={c.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                      {c.code}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">{c.name}</h3>
                    <p className="text-xs text-slate-500">{c.semester} • {c.academic_year}</p>
                  </div>
                  <Badge variant="success">Enrolled</Badge>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No Registered Courses in Database</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Once faculty creates course cohorts in Supabase, your course quorum cards will be displayed here.
            </p>
          </div>
        )}
      </div>

      {/* Face Verification Modal */}
      <FaceVerificationModal
        isOpen={isFaceModalOpen}
        onClose={() => setIsFaceModalOpen(false)}
        sessionId={paramSessionId}
        sessionCode={sessionCode}
        courseCode={paramCourse}
        onVerificationComplete={handleVerificationComplete}
      />
    </div>
  );
};
