import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StudentCheckInSchema } from '@/lib/validation';
import { FaceVerificationModal } from '@/components/student/FaceVerificationModal';
import { 
  AlertCircle, 
  ShieldCheck, 
  Camera, 
  ScanFace 
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const paramCode = searchParams.get('code') || '';
  const paramSessionId = searchParams.get('sessionId') || '';
  const paramCourse = searchParams.get('course') || 'CS301';

  const [sessionCode, setSessionCode] = useState(paramCode);
  const [formError, setFormError] = useState<string | null>(null);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    status: 'success' | 'error';
    message: string;
    course?: string;
  } | null>(null);

  // Sync sessionCode if search param changes
  useEffect(() => {
    if (paramCode) {
      setSessionCode(paramCode);
      // Auto prompt face verification modal if user arrived via QR scan
      setIsFaceModalOpen(true);
    }
  }, [paramCode]);

  const mockCourses = [
    {
      id: 'c1',
      code: 'CS301',
      name: 'Distributed Computing Systems',
      faculty: 'Dr. Sarah Jenkins',
      totalClasses: 32,
      attended: 29,
      percentage: 90.6,
      required: 75,
      status: 'safe',
    },
    {
      id: 'c2',
      code: 'CS304',
      name: 'Database Architecture & Internals',
      faculty: 'Prof. Marcus Vance',
      totalClasses: 28,
      attended: 25,
      percentage: 89.2,
      required: 75,
      status: 'safe',
    },
    {
      id: 'c3',
      code: 'MATH240',
      name: 'Applied Linear Algebra & Statistics',
      faculty: 'Dr. Elena Rostova',
      totalClasses: 30,
      attended: 21,
      percentage: 70.0,
      required: 75,
      status: 'critical', // < 75%
    },
    {
      id: 'c4',
      code: 'CS310',
      name: 'Computer Networks & Protocols',
      faculty: 'Dr. Alan Morales',
      totalClasses: 26,
      attended: 22,
      percentage: 84.6,
      required: 75,
      status: 'safe',
    },
  ];

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
            {paramCode ? `Scanned Code for ${paramCourse}` : 'Scan Classroom QR or Enter Code'}
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

      {/* Course Enrollment & Attendance Trackers */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-900">Enrolled Course Attendance Quorum</h2>
          <span className="text-xs text-slate-500">Minimum threshold: 75% requirement</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockCourses.map((c) => (
            <Card key={c.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                    {c.code}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">{c.name}</h3>
                  <p className="text-xs text-slate-500">{c.faculty}</p>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-black ${
                    c.status === 'critical' ? 'text-rose-600' : 'text-emerald-600'
                  }`}>
                    {c.percentage}%
                  </span>
                  <div className="mt-1">
                    {c.status === 'critical' ? (
                      <Badge variant="danger" className="text-[10px]">At-Risk (&lt;75%)</Badge>
                    ) : (
                      <Badge variant="success" className="text-[10px]">Good Standing</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Attendance Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Classes Attended: {c.attended} / {c.totalClasses}</span>
                  <span>Target: 75%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      c.status === 'critical' ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, c.percentage)}%` }}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
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
