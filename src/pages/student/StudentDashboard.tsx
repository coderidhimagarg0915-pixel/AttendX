import React, { useState } from 'react';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StudentCheckInSchema } from '@/lib/validation';
import { 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  ArrowRight
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const [sessionCode, setSessionCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    status: 'success' | 'error';
    message: string;
    course?: string;
  } | null>(null);

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

  const handleCheckInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmissionFeedback(null);

    // Validate using Zod schema
    const result = StudentCheckInSchema.safeParse({ sessionCode });
    if (!result.success) {
      setFormError(result.error.errors[0]?.message || 'Invalid session code format');
      return;
    }

    setIsSubmitting(true);

    // Simulate safe server submission delay
    setTimeout(() => {
      setIsSubmitting(false);
      if (sessionCode.toUpperCase() === 'DIST-849') {
        setSubmissionFeedback({
          status: 'success',
          message: 'Check-in received! Server cryptographic signature verified your attendance for CS301.',
          course: 'CS301: Distributed Computing Systems',
        });
        setSessionCode('');
      } else {
        setSubmissionFeedback({
          status: 'error',
          message: 'The session code entered is invalid or has expired. Please verify with your instructor.',
        });
      }
    }, 700);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Attendance Portal</h1>
        <p className="text-sm text-slate-500">Track semester progress, minimum requirements, and submit live session tokens.</p>
      </div>

      {/* Check-In Terminal Section */}
      <Card className="border-emerald-200 bg-gradient-to-b from-emerald-50/40 to-white">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-800">
              Live Classroom Check-In
            </span>
          </div>
          <CardTitle className="text-xl">Have a session code from your instructor?</CardTitle>
          <CardDescription className="mt-1">
            Enter the 6 to 8-character token displayed on the classroom projection screen to record your presence.
          </CardDescription>

          <form onSubmit={handleCheckInSubmit} className="mt-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="e.g. DIST-849"
                  value={sessionCode}
                  onChange={(e) => {
                    setSessionCode(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  className={`w-full uppercase font-mono tracking-widest text-base px-4 py-2.5 rounded-lg border bg-white focus:outline-none focus:ring-2 transition-all ${
                    formError
                      ? 'border-red-300 focus:ring-red-400'
                      : 'border-slate-300 focus:ring-emerald-500'
                  }`}
                  maxLength={12}
                  disabled={isSubmitting}
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                className="bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
                isLoading={isSubmitting}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Submit Verification
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
                className={`p-3 rounded-lg text-xs flex items-start gap-2.5 mt-2 ${
                  submissionFeedback.status === 'success'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-rose-100 text-rose-900 border border-rose-300'
                }`}
              >
                {submissionFeedback.status === 'success' ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">{submissionFeedback.message}</p>
                  {submissionFeedback.course && (
                    <p className="mt-0.5 text-emerald-800 opacity-90">{submissionFeedback.course}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Attendance is verified against official enrollment records and IP/time fencing on the database.
              </span>
            </div>
          </form>
        </div>
      </Card>

      {/* Attendance Warning if any course is < 75% */}
      {mockCourses.some((c) => c.status === 'critical') && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <h4 className="font-semibold text-rose-900">Attendance Threshold Alert</h4>
            <p className="text-rose-700 text-xs mt-0.5">
              Your attendance in <strong>MATH240 (Applied Linear Algebra)</strong> is currently <strong>70.0%</strong>, which is below the mandatory university threshold of <strong>75%</strong>. Attend the next 3 consecutive sessions to restore eligibility.
            </p>
          </div>
        </div>
      )}

      {/* Courses List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900">Enrolled Courses &amp; Quorum Status</h2>
          <span className="text-xs text-slate-500 font-medium">Semester 5 • Fall 2026</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockCourses.map((course) => {
            const isDefaulter = course.percentage < course.required;
            return (
              <Card key={course.id} className="relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {course.code}
                      </span>
                      {isDefaulter ? (
                        <Badge variant="danger">Below 75% Requirement</Badge>
                      ) : (
                        <Badge variant="success">Eligible</Badge>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 mt-2">
                      {course.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{course.faculty}</p>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-2xl font-extrabold ${
                        isDefaulter ? 'text-rose-600' : 'text-slate-900'
                      }`}
                    >
                      {course.percentage}%
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      {course.attended}/{course.totalClasses} classes
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 mt-4 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      isDefaulter ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${course.percentage}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                  <span>Minimum Required: {course.required}%</span>
                  <button className="text-emerald-700 hover:text-emerald-800 font-medium inline-flex items-center gap-1">
                    Full Log <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
