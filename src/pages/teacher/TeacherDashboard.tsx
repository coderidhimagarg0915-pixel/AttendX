import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Play, 
  Square, 
  ExternalLink,
  Search,
  Filter
} from 'lucide-react';

interface MockSession {
  id: string;
  courseCode: string;
  courseName: string;
  room: string;
  isActive: boolean;
  code: string;
  enrolled: number;
  present: number;
  startTime: string;
}

export const TeacherDashboard: React.FC = () => {
  const [activeSession, setActiveSession] = useState<MockSession | null>({
    id: 'sess-101',
    courseCode: 'CS301',
    courseName: 'Distributed Computing Systems',
    room: 'Hall B-204',
    isActive: true,
    code: 'DIST-849',
    enrolled: 48,
    present: 42,
    startTime: '10:00 AM',
  });

  const [studentRosterFilter, setStudentRosterFilter] = useState('');

  const mockStudents = [
    { id: '1', roll: 'CS-24-001', name: 'Aarav Sharma', status: 'present', time: '10:02 AM', method: 'Dynamic OTP' },
    { id: '2', roll: 'CS-24-002', name: 'Ananya Iyer', status: 'present', time: '10:03 AM', method: 'Dynamic OTP' },
    { id: '3', roll: 'CS-24-003', name: 'David Miller', status: 'late', time: '10:14 AM', method: 'Manual Verify' },
    { id: '4', roll: 'CS-24-004', name: 'Emily Chen', status: 'present', time: '10:01 AM', method: 'Dynamic OTP' },
    { id: '5', roll: 'CS-24-005', name: 'Farhan Zaidi', status: 'absent', time: '-', method: 'Unreported' },
    { id: '6', roll: 'CS-24-006', name: 'Priya Patel', status: 'present', time: '10:05 AM', method: 'Dynamic OTP' },
  ];

  const filteredStudents = mockStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(studentRosterFilter.toLowerCase()) ||
      s.roll.toLowerCase().includes(studentRosterFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Faculty Dashboard</h1>
          <p className="text-sm text-slate-500">Monitor active classroom sessions and audit attendance logs.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Download Report (.CSV)
          </Button>
          <Button variant="primary" size="sm">
            + Schedule New Session
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Assigned Courses</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">4</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">Total 184 active enrollments</div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Avg. Semester Attendance</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">87.5%</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-xs text-emerald-600 font-medium">+2.1% higher than department benchmark</div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Attendance Defaulters (&lt;75%)</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">8</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-xs text-rose-600 font-medium">Automatic alerts dispatched</div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Live Active Sessions</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{activeSession ? '1 Active' : 'None'}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">Session room: Hall B-204</div>
        </Card>
      </div>

      {/* Active Session Management Box */}
      {activeSession ? (
        <Card className="border-brand-200 bg-brand-50/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-brand-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Live Attendance Window Open</span>
                <Badge variant="info">Room {activeSession.room}</Badge>
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {activeSession.courseCode} — {activeSession.courseName}
              </h2>
              <p className="text-xs text-slate-500">
                Started at {activeSession.startTime} • Auto-expires in 11 minutes
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 text-center shadow-sm">
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Student Check-In Code</span>
                <span className="text-2xl font-mono font-extrabold tracking-widest text-brand-700">{activeSession.code}</span>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setActiveSession(null)}
                className="gap-1.5"
              >
                <Square className="w-4 h-4" />
                Close Session
              </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200/80">
              <p className="text-xs text-slate-500 font-medium">Verified Attendees</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">{activeSession.present}</span>
                <span className="text-sm text-slate-500">/ {activeSession.enrolled} enrolled</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                <div
                  className="bg-brand-600 h-2 rounded-full transition-all"
                  style={{ width: `${(activeSession.present / activeSession.enrolled) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200/80">
              <p className="text-xs text-slate-500 font-medium">Live Attendance Quorum</p>
              <div className="mt-2 text-3xl font-extrabold text-emerald-600">
                {Math.round((activeSession.present / activeSession.enrolled) * 100)}%
              </div>
              <p className="mt-3 text-xs text-slate-500">Threshold: 75% quorum requirement met</p>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200/80 flex flex-col justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Security Validation Policy</p>
                <p className="text-xs text-slate-700 mt-1">
                  Enforces one submission per student per session with audit IP stamping.
                </p>
              </div>
              <div className="mt-2">
                <Badge variant="success">Server Row-Level Security Enforced</Badge>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="text-center py-8">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-slate-900">No Active Attendance Session</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Select a class below or launch a new dynamic check-in code session for students.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              setActiveSession({
                id: 'sess-102',
                courseCode: 'CS301',
                courseName: 'Distributed Computing Systems',
                room: 'Hall B-204',
                isActive: true,
                code: 'DIST-' + Math.floor(100 + Math.random() * 900),
                enrolled: 48,
                present: 0,
                startTime: 'Now',
              })
            }
          >
            <Play className="w-4 h-4 mr-1.5" />
            Launch CS301 Attendance Session
          </Button>
        </Card>
      )}

      {/* Live Roster Audit Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Session Real-Time Verification Audit</CardTitle>
            <CardDescription>
              Live stream of student check-ins with server validation status.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search roll number or name..."
                value={studentRosterFilter}
                onChange={(e) => setStudentRosterFilter(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 w-56"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-1 text-xs">
              <Filter className="w-3.5 h-3.5" />
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-y border-slate-200">
                <tr>
                  <th scope="col" className="px-6 py-3">Roll Number</th>
                  <th scope="col" className="px-6 py-3">Student Name</th>
                  <th scope="col" className="px-6 py-3">Verification Timestamp</th>
                  <th scope="col" className="px-6 py-3">Method</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3 text-right">Faculty Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-xs font-semibold text-slate-900">
                        {st.roll}
                      </td>
                      <td className="px-6 py-3.5 font-medium text-slate-900">
                        {st.name}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-500">
                        {st.time}
                      </td>
                      <td className="px-6 py-3.5 text-xs">
                        <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {st.method}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        {st.status === 'present' && <Badge variant="success">Present</Badge>}
                        {st.status === 'late' && <Badge variant="warning">Late (12 min)</Badge>}
                        {st.status === 'absent' && <Badge variant="danger">Absent</Badge>}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button className="text-xs font-medium text-brand-600 hover:text-brand-800 transition-colors">
                          Modify
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-sm">
                      No student records match the search filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
