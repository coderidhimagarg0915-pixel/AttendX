export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export type SessionState = 'scheduled' | 'active' | 'closed' | 'archived';

export type VerificationState = 'pending_server_verification' | 'verified' | 'rejected';

export interface Course {
  id: string;
  code: string; // e.g. "CS301"
  name: string; // e.g. "Distributed Systems"
  instructorId: string;
  semester: string;
  academicYear: string;
  roomNumber?: string;
  totalStudents: number;
}

export interface AttendanceSession {
  id: string;
  courseId: string;
  instructorId: string;
  sessionTitle: string;
  date: string;
  startTime: string;
  endTime?: string;
  state: SessionState;
  token?: string; // One-time or expiring session code
  expiresAt?: string;
  totalEnrolled: number;
  presentCount: number;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  studentRollNumber: string;
  status: AttendanceStatus;
  verificationState: VerificationState;
  verifiedAt?: string;
  verificationMethod: 'code' | 'manual_override' | 'geo_verified';
  notes?: string;
}

export interface StudentAttendanceSummary {
  studentId: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  totalSessions: number;
  attendedSessions: number;
  percentage: number;
  minimumRequired: number; // e.g. 75%
  isDefaulter: boolean;
}
