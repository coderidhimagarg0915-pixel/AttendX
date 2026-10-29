import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CreateSessionModal } from '@/components/teacher/CreateSessionModal';
import { ManualOverrideModal } from '@/components/teacher/ManualOverrideModal';
import { SessionQrModal } from '@/components/teacher/SessionQrModal';
import { StudentDetailModal } from '@/components/teacher/StudentDetailModal';
import { sessionService, AttendanceSessionData, StudentAttendee, CourseStudent, Course } from '@/services/sessionService';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { AttendanceStatus } from '@/types/attendance';
import {
  Users, CheckCircle, Play, Square, Search, RefreshCw, QrCode, Download,
  ShieldCheck, UserCheck, ChevronLeft, UserPlus, Copy, Check, History,
  TrendingDown, BookOpen, CalendarDays, Plus
} from 'lucide-react';

const statusVariant = (s: string) => {
  if (s === 'present') return 'success';
  if (s === 'late') return 'warning';
  if (s === 'absent') return 'danger';
  return 'default';
};

export const ClassroomPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [activeSession, setActiveSession] = useState<AttendanceSessionData | null>(null);
  const [roster, setRoster] = useState<StudentAttendee[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<CourseStudent[]>([]);
  const [pastSessions, setPastSessions] = useState<{ id: string; title: string; state: string; createdAt: string; presentCount: number }[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'live' | 'students' | 'history'>('live');
  const [timeLeftFormatted, setTimeLeftFormatted] = useState('00:00');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedStudentForOverride, setSelectedStudentForOverride] = useState<StudentAttendee | null>(null);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<CourseStudent | null>(null);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [addStudentInput, setAddStudentInput] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [addStudentFeedback, setAddStudentFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [copiedJoin, setCopiedJoin] = useState(false);
  const [statusTab, setStatusTab] = useState<'all' | AttendanceStatus>('all');

  // Load course info
  useEffect(() => {
    if (!courseId) return;
    sessionService.getCourseById(courseId).then(setCourse);
  }, [courseId]);

  // Load enrolled students
  const loadEnrolledStudents = useCallback(async () => {
    if (!courseId) return;
    setIsLoadingStudents(true);
    const students = await sessionService.getCourseStudents(courseId);
    setEnrolledStudents(students);
    setIsLoadingStudents(false);
  }, [courseId]);

  useEffect(() => {
    loadEnrolledStudents();
  }, [loadEnrolledStudents]);

  // Load past sessions
  useEffect(() => {
    if (!courseId) return;
    sessionService.getCourseSessions(courseId).then(setPastSessions);
  }, [courseId]);

  // Check for active session on mount
  useEffect(() => {
    if (!courseId || !isSupabaseConfigured) return;

    (supabase as any)
      .from('attendance_sessions')
      .select('*')
      .eq('course_id', courseId)
      .eq('state', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data, error }: any) => {
        if (!error && data && data.length > 0) {
          const row = data[0];
          if (new Date(row.expires_at).getTime() > Date.now()) {
            setActiveSession({
              id: row.id,
              courseId: row.course_id,
              courseCode: course?.code || 'COURSE',
              courseName: course?.name || '',
              room: 'Classroom',
              title: row.title,
              code: '',
              state: 'active',
              startTime: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              expiresAt: row.expires_at,
              enrolled: enrolledStudents.length,
              present: 0,
            });
          }
        }
      });
  }, [courseId, course, enrolledStudents.length]);

  // Countdown timer
  useEffect(() => {
    if (!activeSession) { setTimeLeftFormatted('00:00'); return; }
    const interval = setInterval(() => {
      const diff = new Date(activeSession.expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeftFormatted('Expired');
        setActiveSession((prev) => prev ? { ...prev, state: 'closed' } : null);
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeftFormatted(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // Realtime subscription for live roster
  useEffect(() => {
    if (!activeSession?.id || !isSupabaseConfigured) return;

    sessionService.fetchSessionAttendees(activeSession.id).then((a) => { if (a.length > 0) setRoster(a); });

    const channel = (supabase as any)
      .channel(`classroom-realtime-${activeSession.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'attendance_records',
        filter: `session_id=eq.${activeSession.id}`,
      }, () => {
        sessionService.fetchSessionAttendees(activeSession.id).then(setRoster);
      })
      .subscribe();

    return () => (supabase as any).removeChannel(channel);
  }, [activeSession?.id]);

  const handleSessionCreated = (newSession: AttendanceSessionData) => {
    setActiveSession({ ...newSession, enrolled: enrolledStudents.length });
    setRoster([]);
    setActiveTab('live');
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;
    if (!window.confirm('Close this attendance session? Students will no longer be able to check in.')) return;
    await sessionService.closeSession(activeSession.id);
    setActiveSession(null);
    sessionService.getCourseSessions(courseId!).then(setPastSessions);
    loadEnrolledStudents(); // refresh attendance percentages
  };

  const handleOverrideConfirmed = async (studentId: string, newStatus: AttendanceStatus, reason: string) => {
    if (activeSession) await sessionService.overrideAttendance(activeSession.id, studentId, newStatus, reason);
    setRoster((prev) => prev.map((s) =>
      s.id === studentId || s.studentId === studentId
        ? { ...s, status: newStatus, verificationState: 'verified', method: 'Manual Override', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), overrideReason: reason }
        : s
    ));
  };

  const handleAddStudent = async () => {
    if (!courseId || !addStudentInput.trim()) return;
    setIsAddingStudent(true);
    setAddStudentFeedback(null);
    const result = await sessionService.manuallyAddStudent(courseId, addStudentInput.trim());
    setIsAddingStudent(false);
    setAddStudentFeedback({ type: result.success ? 'success' : 'error', msg: result.message });
    if (result.success) {
      setAddStudentInput('');
      loadEnrolledStudents();
    }
  };

  const handleCopyJoinCode = () => {
    if (course?.joinCode) {
      navigator.clipboard.writeText(course.joinCode);
      setCopiedJoin(true);
      setTimeout(() => setCopiedJoin(false), 2000);
    }
  };

  // Computed
  const presentCount = roster.filter((s) => s.status === 'present').length;
  const lateCount = roster.filter((s) => s.status === 'late').length;
  const verified = presentCount + lateCount;
  const enrolled = activeSession?.enrolled || enrolledStudents.length || 0;
  const quorumPct = enrolled > 0 ? Math.round((verified / enrolled) * 100) : 0;
  const atRiskCount = enrolledStudents.filter((s) => s.attendancePercent < 75).length;

  const filteredRoster = roster.filter((s) => {
    const q = searchFilter.toLowerCase();
    const matchSearch = s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
    const matchStatus = statusTab === 'all' || s.status === statusTab;
    return matchSearch && matchStatus;
  });

  const filteredStudents = enrolledStudents.filter((s) => {
    const q = searchFilter.toLowerCase();
    return s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.institutionId || '').toLowerCase().includes(q);
  });

  if (!course) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Course Header */}
      <div>
        <button onClick={() => navigate('/teacher')} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium mb-3 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />
          My Courses
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white font-black text-sm shadow-lg shrink-0">
              {course.code.slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-100">{course.code}</span>
                <Badge variant="default">{course.semester}</Badge>
                <Badge variant="default">{course.academicYear}</Badge>
              </div>
              <h1 className="text-xl font-black text-slate-900 mt-1">{course.name}</h1>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {enrolledStudents.length} students</span>
                <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> {pastSessions.length} sessions held</span>
                {atRiskCount > 0 && (
                  <span className="flex items-center gap-1 text-amber-600 font-semibold">
                    <TrendingDown className="w-3.5 h-3.5" /> {atRiskCount} below 75%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Join Code */}
          {course.joinCode && (
            <div className="flex items-center gap-2 bg-slate-50 border border-dashed border-brand-300 rounded-xl px-3 py-2">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Join Code</p>
                <span className="font-mono font-black text-brand-700 tracking-widest text-lg">{course.joinCode}</span>
              </div>
              <button onClick={handleCopyJoinCode} className="p-1.5 rounded-lg hover:bg-brand-50 transition-colors text-brand-600">
                {copiedJoin ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {[
          { id: 'live', label: 'Live Session', icon: Play },
          { id: 'students', label: `Students (${enrolledStudents.length})`, icon: Users },
          { id: 'history', label: `History (${pastSessions.length})`, icon: History },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── LIVE SESSION TAB ── */}
      {activeTab === 'live' && (
        <div className="space-y-5">
          {activeSession ? (
            <>
              {/* Session Status Banner */}
              <Card className="border-brand-200 bg-gradient-to-r from-brand-50 to-indigo-50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-sm">
                      <Play className="w-5 h-5 text-white fill-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-bold text-slate-900">{activeSession.title}</span>
                        <Badge variant="success">Live</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Started {activeSession.startTime} • Closes in <strong className="text-rose-600">{timeLeftFormatted}</strong></p>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => setIsQrModalOpen(true)} className="gap-1.5">
                      <QrCode className="w-4 h-4" />
                      Project QR
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => sessionService.exportRosterToCsv(activeSession.title, course.code, roster)} className="gap-1.5">
                      <Download className="w-4 h-4" />
                      Export CSV
                    </Button>
                    <Button variant="danger" size="sm" onClick={handleCloseSession} className="gap-1.5">
                      <Square className="w-4 h-4 fill-current" />
                      Close Session
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Live Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Enrolled', value: enrolled, color: 'text-slate-900' },
                  { label: 'Present', value: presentCount, color: 'text-emerald-700' },
                  { label: 'Late', value: lateCount, color: 'text-amber-700' },
                  { label: 'Quorum', value: `${quorumPct}%`, color: quorumPct >= 75 ? 'text-emerald-700' : 'text-rose-600' },
                ].map(({ label, value, color }) => (
                  <Card key={label} className="text-center py-4">
                    <div className={`text-3xl font-black ${color}`}>{value}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                  </Card>
                ))}
              </div>

              {/* Live Roster */}
              <Card padding="none">
                <CardHeader className="px-6 pt-5 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-brand-600" />
                      Live Attendance Roster
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {/* Status filter tabs */}
                      <div className="flex gap-1 text-[11px]">
                        {(['all', 'present', 'late', 'absent'] as const).map((st) => (
                          <button key={st} onClick={() => setStatusTab(st)}
                            className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-all ${statusTab === st ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                          >{st}</button>
                        ))}
                      </div>
                      {/* Search */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchFilter}
                          onChange={(e) => setSearchFilter(e.target.value)}
                          placeholder="Search..."
                          className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-400 w-36"
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-y border-slate-200">
                        <tr>
                          <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500">Student</th>
                          <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500">Roll</th>
                          <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500">Status</th>
                          <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500">Time</th>
                          <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500">Method</th>
                          <th className="px-5 py-2.5 text-right text-xs font-semibold text-slate-500">Override</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredRoster.length > 0 ? filteredRoster.map((st) => (
                          <tr key={st.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-5 py-3">
                              <div className="font-semibold text-slate-900 text-sm">{st.name}</div>
                              <div className="text-xs text-slate-400">{st.email}</div>
                            </td>
                            <td className="px-5 py-3 font-mono text-xs text-slate-600">{st.roll}</td>
                            <td className="px-5 py-3">
                              <Badge variant={statusVariant(st.status) as any} className="capitalize">{st.status}</Badge>
                            </td>
                            <td className="px-5 py-3 text-xs text-slate-500">{st.timestamp}</td>
                            <td className="px-5 py-3">
                              <span className="flex items-center gap-1 text-xs text-slate-600">
                                <ShieldCheck className="w-3.5 h-3.5 text-brand-500" />
                                {st.method}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <Button variant="ghost" size="sm" onClick={() => setSelectedStudentForOverride(st)} className="text-xs font-semibold text-brand-600 hover:text-brand-800">
                                Override
                              </Button>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">
                              {roster.length === 0
                                ? 'Waiting for students to scan the QR code. Their check-ins appear here in real time.'
                                : 'No students match your filter.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="text-center py-16 bg-slate-50/50 border-dashed border-2">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900">No Active Session</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
                Launch an attendance session to start recording live student check-ins for <strong>{course.name}</strong>.
              </p>
              <Button variant="primary" size="md" onClick={() => setIsCreateModalOpen(true)} className="gap-2 shadow-md mx-auto">
                <Play className="w-4 h-4 fill-current" />
                Launch Attendance Session
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* ── STUDENTS TAB ── */}
      {activeTab === 'students' && (
        <div className="space-y-5">
          {/* Add Student form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <UserPlus className="w-4 h-4 text-brand-600" />
                Add Student to Classroom
              </CardTitle>
              <CardDescription>Enter student email or MNIT roll number (e.g. 2025UCP1580)</CardDescription>
            </CardHeader>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={addStudentInput}
                onChange={(e) => setAddStudentInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
                placeholder="email@mnit.ac.in or Roll Number"
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddStudent}
                isLoading={isAddingStudent}
                disabled={isAddingStudent || !addStudentInput.trim()}
                className="gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                Add Student
              </Button>
            </div>
            {addStudentFeedback && (
              <div className={`p-3 rounded-lg text-xs mt-3 flex items-start gap-2 border ${
                addStudentFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                <span>{addStudentFeedback.msg}</span>
              </div>
            )}
          </Card>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search students by name, roll, or email..."
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>

          {/* Student grid */}
          {isLoadingStudents ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <Card className="text-center py-10 border-dashed">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No students enrolled yet.</p>
              <p className="text-xs text-slate-400 mt-1">Share the join code <strong className="text-brand-600">{course.joinCode}</strong> or add them manually above.</p>
            </Card>
          ) : (
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Student</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Roll</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Attendance</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Sessions</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((st) => {
                    const risk = st.attendancePercent < 75;
                    return (
                      <tr key={st.studentId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3">
                          <div className="font-semibold text-slate-900">{st.fullName}</div>
                          <div className="text-xs text-slate-400">{st.email}</div>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-600">{st.institutionId || '—'}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${risk ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                style={{ width: `${st.attendancePercent}%` }} />
                            </div>
                            <span className={`text-xs font-bold ${risk ? 'text-rose-600' : 'text-slate-700'}`}>
                              {st.attendancePercent}%
                            </span>
                            {risk && <TrendingDown className="w-3.5 h-3.5 text-rose-500" />}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-500">
                          {st.attendedSessions}/{st.totalSessions}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedStudentDetail(st)}
                            className="text-xs font-semibold text-brand-600 hover:text-brand-800 gap-1.5">
                            <RefreshCw className="w-3.5 h-3.5" />
                            View Record
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {pastSessions.length === 0 ? (
            <Card className="text-center py-12 border-dashed">
              <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No completed sessions yet.</p>
              <p className="text-xs text-slate-400 mt-1">Launch your first session in the Live Session tab.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {pastSessions.map((sess, idx) => (
                <Card key={sess.id} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-black text-slate-600">
                      {pastSessions.length - idx}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900">{sess.title}</span>
                        <Badge variant={sess.state === 'active' ? 'success' : 'default'} className="capitalize text-[10px]">{sess.state}</Badge>
                      </div>
                      <p className="text-xs text-slate-400">
                        {new Date(sess.createdAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        {' '} · {new Date(sess.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xl font-black text-emerald-700">{sess.presentCount}</span>
                      <p className="text-[10px] text-slate-400">checked in</p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Launch Session button (visible unless active) */}
      {!activeSession && activeTab !== 'live' && (
        <div className="fixed bottom-6 right-6">
          <Button variant="primary" size="lg" onClick={() => { setIsCreateModalOpen(true); setActiveTab('live'); }} className="shadow-xl gap-2 rounded-2xl">
            <Plus className="w-5 h-5" />
            Launch Session
          </Button>
        </div>
      )}

      {/* Modals */}
      <CreateSessionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSessionCreated={handleSessionCreated}
        courseId={courseId!}
        courseCode={course.code}
        courseName={course.name}
      />

      <ManualOverrideModal
        isOpen={Boolean(selectedStudentForOverride)}
        onClose={() => setSelectedStudentForOverride(null)}
        student={selectedStudentForOverride}
        onOverrideConfirmed={handleOverrideConfirmed}
      />

      <SessionQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        session={activeSession}
        timeLeftFormatted={timeLeftFormatted}
        onCodeRotated={(newCode, _ts) => {
          if (activeSession) sessionService.rotateSessionCode(activeSession.id, newCode);
          setActiveSession((prev) => prev ? { ...prev, code: newCode } : null);
        }}
      />

      <StudentDetailModal
        isOpen={Boolean(selectedStudentDetail)}
        onClose={() => setSelectedStudentDetail(null)}
        student={selectedStudentDetail}
        courseId={courseId!}
        courseName={course.name}
        courseCode={course.code}
      />
    </div>
  );
};
