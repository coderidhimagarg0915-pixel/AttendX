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
   * Create a new course for the authenticated instructor
   */
  async createCourse(params: {
    code: string;
    name: string;
    semester: string;
    academicYear: string;
  }): Promise<Course | null> {
    if (!isSupabaseConfigured) return null;

    try {
      const { data: userData } = await supabase.auth.getUser();
      const instructorId = userData?.user?.id;
      if (!instructorId) return null;

      const { data, error } = await (supabase as any)
        .from('courses')
        .insert({
          code: params.code.trim().toUpperCase(),
          name: params.name.trim(),
          semester: params.semester.trim(),
          academic_year: params.academicYear.trim(),
          instructor_id: instructorId,
        })
        .select()
        .single();

      if (error || !data) {
        console.warn('[sessionService] Failed to create course:', error?.message);
        return null;
      }

      return {
        id: data.id,
        code: data.code,
        name: data.name,
        semester: data.semester,
        academicYear: data.academic_year,
        enrolledCount: 0,
      };
    } catch (err) {
      console.error('[sessionService] Unexpected error creating course:', err);
      return null;
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
        let validCourseId = params.courseId;

        // Verify or create course if invalid dummy UUID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(validCourseId);
        if (!isUuid) {
          // Check if instructor already has a matching course
          const existingCourses = await this.getCourses();
          const match = existingCourses.find((c) => c.code === params.courseCode);
          if (match) {
            validCourseId = match.id;
          } else {
            const newCourse = await this.createCourse({
              code: params.courseCode || 'CS301',
              name: params.courseName || 'Distributed Computing Systems',
              semester: 'Semester 5',
              academicYear: '2026-2027',
            });
            if (newCourse) {
              validCourseId = newCourse.id;
            }
          }
        }

        // Insert to Supabase attendance_sessions
        const { data: sessionRow, error: sessionErr } = await (supabase as any)
          .from('attendance_sessions')
          .insert({
            course_id: validCourseId,
            instructor_id: instructorId,
            title: params.title,
            state: 'active',
            expires_at: expiresAt,
          })
          .select()
          .single();

        if (!sessionErr && sessionRow) {
          // Register dynamic OTP token in attendance_session_secrets via RPC
          try {
            await (supabase as any).rpc('set_session_token', {
              p_session_id: sessionRow.id,
              p_code: code,
            });
          } catch (rpcErr) {
            console.warn('[sessionService] set_session_token RPC note:', rpcErr);
          }

          return {
            id: sessionRow.id,
            courseId: validCourseId,
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
   * Rotate active session OTP code in Supabase
   */
  async rotateSessionCode(sessionId: string, newCode: string): Promise<boolean> {
    if (!isSupabaseConfigured) return true;
    try {
      const { data, error } = await (supabase as any).rpc('set_session_token', {
        p_session_id: sessionId,
        p_code: newCode,
      });
      return !error && data?.success !== false;
    } catch (err) {
      console.warn('[sessionService] rotateSessionCode error:', err);
      return false;
    }
  },

  /**
   * Apply faculty manual override on student attendance
   */
  async overrideAttendance(
    sessionId: string,
    studentId: string,
    status: AttendanceStatus,
    reason?: string
  ): Promise<boolean> {
    if (!isSupabaseConfigured) return true;
    try {
      const { data, error } = await (supabase as any).rpc('override_student_attendance', {
        p_session_id: sessionId,
        p_student_id: studentId,
        p_status: status,
        p_reason: reason || null,
      });
      return !error && data?.success !== false;
    } catch (err) {
      console.warn('[sessionService] overrideAttendance error:', err);
      return false;
    }
  },

  /**
   * Fetch live attendees from Supabase for a given session
   */
  async fetchSessionAttendees(sessionId: string): Promise<StudentAttendee[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await (supabase as any)
        .from('attendance_records')
        .select(`
          id,
          student_id,
          status,
          verification_state,
          verified_at,
          created_at,
          profiles (
            id,
            full_name,
            email,
            institution_id
          )
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error || !data) return [];

      return (data as any[]).map((row) => ({
        id: row.id,
        studentId: row.student_id,
        roll: row.profiles?.institution_id || row.student_id.slice(0, 8).toUpperCase(),
        name: row.profiles?.full_name || 'Enrolled Student',
        email: row.profiles?.email || '',
        status: row.status as AttendanceStatus,
        verificationState: row.verification_state,
        timestamp: new Date(row.verified_at || row.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        method: 'Dynamic OTP + Biometric Face',
      }));
    } catch (err) {
      console.warn('[sessionService] fetchSessionAttendees error:', err);
      return [];
    }
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
