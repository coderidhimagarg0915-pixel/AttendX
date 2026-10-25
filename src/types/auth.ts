export type UserRole = 'faculty' | 'student' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  institutionId?: string;
  department?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSessionState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
}
