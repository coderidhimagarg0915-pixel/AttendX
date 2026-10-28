import { UserRole } from './auth';
import { AttendanceStatus, SessionState, VerificationState } from './attendance';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          avatar_url: string | null;
          institution_id: string | null;
          department: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: UserRole;
          avatar_url?: string | null;
          institution_id?: string | null;
          department?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: UserRole;
          avatar_url?: string | null;
          institution_id?: string | null;
          department?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          code: string;
          name: string;
          instructor_id: string;
          semester: string;
          academic_year: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          instructor_id: string;
          semester: string;
          academic_year: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          instructor_id?: string;
          semester?: string;
          academic_year?: string;
        };
        Relationships: [];
      };
      enrollments: {
        Row: {
          id: string;
          course_id: string;
          student_id: string;
          enrolled_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          student_id: string;
          enrolled_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          student_id?: string;
        };
        Relationships: [];
      };
      attendance_sessions: {
        Row: {
          id: string;
          course_id: string;
          instructor_id: string;
          title: string;
          state: SessionState;
          token_hash: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          instructor_id: string;
          title: string;
          state?: SessionState;
          token_hash?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          instructor_id?: string;
          title?: string;
          state?: SessionState;
          token_hash?: string | null;
          expires_at?: string | null;
        };
        Relationships: [];
      };
      attendance_records: {
        Row: {
          id: string;
          session_id: string;
          student_id: string;
          status: AttendanceStatus;
          verification_state: VerificationState;
          ip_address: string | null;
          user_agent: string | null;
          verified_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          student_id: string;
          status?: AttendanceStatus;
          verification_state?: VerificationState;
          ip_address?: string | null;
          user_agent?: string | null;
          verified_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          student_id?: string;
          status?: AttendanceStatus;
          verification_state?: VerificationState;
          ip_address?: string | null;
          user_agent?: string | null;
          verified_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      submit_student_attendance: {
        Args: {
          p_session_id: string;
          p_submitted_code: string;
        };
        Returns: Json;
      };
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: UserRole;
      };
    };
    Enums: {
      user_role: UserRole;
      attendance_status: AttendanceStatus;
      session_state: SessionState;
      verification_state: VerificationState;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
