import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { sessionService, CourseStudent, SessionRecord } from '@/services/sessionService';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
  Send,
  TrendingDown,
  CalendarDays,
  Info,
} from 'lucide-react';

interface StudentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: CourseStudent | null;
  courseId: string;
  courseName: string;
  courseCode: string;
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'present': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
    case 'late': return <Clock className="w-3.5 h-3.5 text-amber-600" />;
    case 'excused': return <Info className="w-3.5 h-3.5 text-blue-500" />;
    default: return <XCircle className="w-3.5 h-3.5 text-rose-500" />;
  }
};

const statusColor = (status: string) => {
  switch (status) {
    case 'present': return 'text-emerald-700 bg-emerald-50';
    case 'late': return 'text-amber-700 bg-amber-50';
    case 'excused': return 'text-blue-700 bg-blue-50';
    default: return 'text-rose-700 bg-rose-50';
  }
};

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  isOpen,
  onClose,
  student,
  courseId,
  courseName,
  courseCode,
}) => {
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showWarningForm, setShowWarningForm] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [warningSent, setWarningSent] = useState(false);
  const [showAllSessions, setShowAllSessions] = useState(false);

  useEffect(() => {
    if (isOpen && student) {
      setIsLoadingHistory(true);
      setShowWarningForm(false);
      setWarningSent(false);
      setWarningMessage('');
      setShowAllSessions(false);

      sessionService.getStudentSessionHistory(courseId, student.studentId)
        .then((records) => {
          setHistory(records);
          setIsLoadingHistory(false);
        });
    }
  }, [isOpen, student, courseId]);

  const handleSendWarning = async () => {
    if (!warningMessage.trim() || !student) return;
    setIsSending(true);
    await sessionService.sendWarning(courseId, student.studentId, warningMessage.trim(), student.attendancePercent);
    setIsSending(false);
    setWarningSent(true);
    setShowWarningForm(false);
  };

  const defaultWarning = student
    ? `Dear ${student.fullName.split(' ')[0]}, your current attendance in ${courseCode} is ${student.attendancePercent}%, which is below the 75% minimum requirement. Please attend upcoming classes to restore eligibility.`
    : '';

  if (!student) return null;

  const isAtRisk = student.attendancePercent < 75;
  const displayedSessions = showAllSessions ? history : history.slice(0, 5);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${student.fullName}`}
      description={`${student.institutionId || student.email} • ${courseCode}: ${courseName}`}
      maxWidth="lg"
    >
      <div className="space-y-5">

        {/* Attendance Summary Donut-style */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3`}>
          <div className={`col-span-2 sm:col-span-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 ${isAtRisk ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}>
            <span className={`text-4xl font-black ${isAtRisk ? 'text-rose-600' : 'text-emerald-600'}`}>
              {student.attendancePercent}%
            </span>
            <span className="text-xs font-semibold text-slate-600 mt-1">Overall</span>
            {isAtRisk && (
              <span className="mt-2 flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                <TrendingDown className="w-2.5 h-2.5" /> Below 75%
              </span>
            )}
          </div>
          <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 bg-slate-50">
            <span className="text-2xl font-black text-slate-900">{student.totalSessions}</span>
            <span className="text-xs text-slate-500">Total Lectures</span>
          </div>
          <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-emerald-200 bg-emerald-50">
            <span className="text-2xl font-black text-emerald-700">{student.attendedSessions}</span>
            <span className="text-xs text-slate-500">Attended</span>
          </div>
          <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-rose-200 bg-rose-50">
            <span className="text-2xl font-black text-rose-700">{student.totalSessions - student.attendedSessions}</span>
            <span className="text-xs text-slate-500">Missed</span>
          </div>
        </div>

        {/* Attendance progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Attendance progress</span>
            <span>75% required</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 relative overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${isAtRisk ? 'bg-rose-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, student.attendancePercent)}%` }}
            />
            {/* 75% threshold marker */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-slate-400" style={{ left: '75%' }} />
          </div>
        </div>

        {/* Lecture History */}
        <div>
          <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-brand-600" />
            Lecture-by-Lecture Record
          </h4>
          {isLoadingHistory ? (
            <div className="py-6 text-center">
              <div className="w-5 h-5 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin mx-auto" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No sessions held yet for this course.</p>
          ) : (
            <>
              <div className="rounded-xl overflow-hidden border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">#</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Lecture</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Date</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedSessions.map((rec, idx) => (
                      <tr key={rec.sessionId} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-2 font-medium text-slate-800">{rec.sessionTitle}</td>
                        <td className="px-3 py-2 text-slate-500">
                          {new Date(rec.sessionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold capitalize ${statusColor(rec.status)}`}>
                            <StatusIcon status={rec.status} />
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {history.length > 5 && (
                <button
                  onClick={() => setShowAllSessions(!showAllSessions)}
                  className="mt-2 w-full text-xs text-brand-600 font-semibold flex items-center justify-center gap-1 hover:text-brand-700"
                >
                  {showAllSessions ? <><ChevronUp className="w-3.5 h-3.5" />Show less</> : <><ChevronDown className="w-3.5 h-3.5" />Show all {history.length} sessions</>}
                </button>
              )}
            </>
          )}
        </div>

        {/* Warning section */}
        {warningSent ? (
          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Warning sent. {student.fullName.split(' ')[0]} will see it when they next log in.
          </div>
        ) : showWarningForm ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-700">Warning Message:</p>
            <textarea
              value={warningMessage}
              onChange={(e) => setWarningMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
              rows={4}
              placeholder="Write your warning..."
              onClick={() => { if (!warningMessage) setWarningMessage(defaultWarning); }}
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowWarningForm(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isSending}
                onClick={handleSendWarning}
                className="flex-1 bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Send Warning
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              setShowWarningForm(true);
              setWarningMessage(defaultWarning);
            }}
            className={`w-full flex items-center justify-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl border-2 border-dashed transition-colors ${
              isAtRisk
                ? 'border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100'
                : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Send Attendance Warning to {student.fullName.split(' ')[0]}
          </button>
        )}
      </div>
    </Modal>
  );
};
