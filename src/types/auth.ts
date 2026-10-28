import type { User } from '@supabase/supabase-js';

export type UserRole = 'faculty' | 'student' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string | null | undefined;
  institution_id?: string | null | undefined;
  department?: string | null | undefined;
  created_at: string;
  updated_at: string;
}

export interface SignUpResult {
  error: Error | null;
  role?: UserRole | undefined;
  needsEmailConfirmation?: boolean | undefined;
}

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null; role?: UserRole | undefined }>;
  signUp: (params: {
    email: string;
    password: string;
    fullName: string;
    institutionId?: string | undefined;
    role?: UserRole | undefined;
  }) => Promise<SignUpResult>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ error: Error | null; role?: UserRole | undefined }>;
  resendVerificationEmail: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
