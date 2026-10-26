import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { AttendanceStatus, SessionState } from '@/types/attendance';

export interface Course {
  id: string;
  code: string;
  name: string;
  semester: string;
  academicYear: string;
  enrolledCount: number;
}

export interface AttendanceSessionData {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  room: string;
  title: string;
  code: string;
  state: SessionState;
  startTime: string;
  expiresAt: string;
  enrolled: number;
  present: number;
}

export interface StudentAttendee {
  id: string;
  studentId: string;
  roll: string;
  name: string;
  email: string;
  status: AttendanceStatus;
  verificationState: string;
  timestamp: string;
  method: string;
  overrideReason?: string | undefined;
}

// Helper to generate a dynamic readable OTP code (e.g. DIST-849 or CS-942)
export function generateSessionCode(prefix = 'ATT'): string {
  const cleanPrefix = prefix.replace(/[^A-Z]/gi, '').toUpperCase().slice(0, 4) || 'ATT';
  const randomNum = Math.floor(100 + Math.random() * 900);
  return `${cleanPrefix}-${randomNum}`;
}

export const sessionService = {
  /**
   * Fetch courses taught by the faculty
   */
  async getCourses(): Promise<Course[]> {
    if (!isSupabaseConfigured) {
      return [];
    }

    try {
      const { data, error } = await (supabase as any)
        .from('courses')
        .select('*');

      if (error || !data || data.length === 0) {
        return [];
      }

      return (data as any[]).map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        semester: c.semester,
        academicYear: c.academic_year,
        enrolledCount: 0,
      }));
    } catch {
      return [];
    }
  },

  /**
   * Create a new dynamic attendance session in Supabase (with fallback)
   */
  async createSession(params: {
    courseId: string;
    courseCode: string;
    courseName: string;
    title: string;
    room: string;
    expirationMinutes: number;
  }): Promise<AttendanceSessionData> {
    const code = generateSessionCode(params.courseCode);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + params.expirationMinutes * 60 * 1000).toISOString();
    const sessionId = `sess-${Date.now()}`;

    if (!isSupabaseConfigured) {
      return {
        id: sessionId,
        courseId: params.courseId,
        courseCode: params.courseCode,
        courseName: params.courseName,
        room: params.room,
        title: params.title,
        code,
        state: 'active',
        startTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        expiresAt,
        enrolled: 48,
        present: 0,
      };
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const instructorId = userData?.user?.id;

      if (instructorId) {
        // Insert to Supabase attendance_sessions
        const { data: sessionRow, error: sessionErr } = await (supabase as any)
          .from('attendance_sessions')
          .insert({
            course_id: params.courseId,
            instructor_id: instructorId,
            title: params.title,
            state: 'active',
            expires_at: expiresAt,
          })
          .select()
          .single();

        if (!sessionErr && sessionRow) {
          return {
            id: sessionRow.id,
            courseId: params.courseId,
            courseCode: params.courseCode,
            courseName: params.courseName,
            room: params.room,
            title: params.title,
            code,
            state: 'active',
            startTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            expiresAt,
            enrolled: 48,
            present: 0,
          };
        }
      }
    } catch (err) {
      console.warn('[sessionService] Supabase not active, using local state:', err);
    }

    // Fallback local session data
    return {
      id: sessionId,
      courseId: params.courseId,
      courseCode: params.courseCode,
      courseName: params.courseName,
      room: params.room,
      title: params.title,
      code,
      state: 'active',
      startTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      expiresAt,
      enrolled: 48,
      present: 0,
    };
  },

  /**
   * Close / Terminate an active attendance session
   */
  async closeSession(sessionId: string): Promise<boolean> {
    try {
      const { error } = await (supabase as any)
        .from('attendance_sessions')
        .update({ state: 'closed' })
        .eq('id', sessionId);

      return !error;
    } catch {
      return true;
    }
  },

  /**
   * Export attendees roster to a downloadable CSV file
   */
  exportRosterToCsv(sessionTitle: string, courseCode: string, attendees: StudentAttendee[]): void {
    const headers = ['Roll Number', 'Student Name', 'Email', 'Verification Timestamp', 'Method', 'Status', 'Override Reason'];
    const rows = attendees.map((a) => [
      `"${a.roll}"`,
      `"${a.name}"`,
      `"${a.email}"`,
      `"${a.timestamp}"`,
      `"${a.method}"`,
      `"${a.status}"`,
      `"${a.overrideReason || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `AttendX_${courseCode}_${sessionTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
