import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { UserProfile, UserRole, AuthContextType, SignUpResult } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Helper to fetch the domain profile from public.profiles
  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[AuthContext] Error fetching profile:', error.message);
        return null;
      }

      if (data) {
        const typedProfile: UserProfile = {
          id: data.id,
          email: data.email,
          full_name: data.full_name,
          role: data.role as UserRole,
          avatar_url: data.avatar_url,
          institution_id: data.institution_id,
          department: data.department,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        setProfile(typedProfile);
        setRole(typedProfile.role);
        return typedProfile;
      }

      // Self-heal: If profile row is missing from public.profiles, create it right now from auth user metadata!
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser && currentUser.id === userId) {
        const meta = currentUser.user_metadata || {};
        const fallbackRole = (meta.role as UserRole) || 'student';
        const fallbackName = meta.full_name || currentUser.email?.split('@')[0] || 'User';

        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .upsert(
            {
              id: userId,
              email: currentUser.email || '',
              full_name: fallbackName,
              role: fallbackRole,
              institution_id: meta.institution_id || null,
            },
            { onConflict: 'id' }
          )
          .select('*')
          .single();

        if (newProfile && !createError) {
          const typedProfile: UserProfile = {
            id: newProfile.id,
            email: newProfile.email,
            full_name: newProfile.full_name,
            role: newProfile.role as UserRole,
            avatar_url: newProfile.avatar_url,
            institution_id: newProfile.institution_id,
            department: newProfile.department,
            created_at: newProfile.created_at,
            updated_at: newProfile.updated_at,
          };
          setProfile(typedProfile);
          setRole(typedProfile.role);
          return typedProfile;
        }
      }

      console.warn('[AuthContext] Could not resolve or create profile for user:', userId);
      return null;
    } catch (err) {
      console.error('[AuthContext] Unexpected error fetching profile:', err);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  // Listen to Supabase Auth state changes (including email confirmation redirects from URL)
  useEffect(() => {
    let isMounted = true;

    // Get current session on startup
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;

      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          setUser(session.user);
          const metaRole = session.user.user_metadata?.role as UserRole | undefined;
          if (metaRole) {
            setRole(metaRole);
          }
          await fetchProfile(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setRole(null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signInWithPassword = async (
    email: string,
    password: string
  ): Promise<{ error: Error | null; role?: UserRole | undefined }> => {
    setIsLoading(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        setIsLoading(false);
        return { error };
      }

      if (data.user) {
        setUser(data.user);
        const metaRole = (data.user.user_metadata?.role as UserRole) || 'student';
        setRole(metaRole);
        let resolvedProfile = await fetchProfile(data.user.id);
        if (!resolvedProfile) {
          await new Promise((r) => setTimeout(r, 400));
          resolvedProfile = await fetchProfile(data.user.id);
        }
        setIsLoading(false);
        return { error: null, role: resolvedProfile?.role || metaRole };
      }

      setIsLoading(false);
      return { error: null };
    } catch (err: unknown) {
      setIsLoading(false);
      return { error: err instanceof Error ? err : new Error('Authentication failed') };
    }
  };

  const signInWithGoogle = async (): Promise<{ error: Error | null }> => {
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          // Restrict to @mnit.ac.in Google Workspace domain
          queryParams: {
            hd: 'mnit.ac.in',
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });
      if (error) return { error };
      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error('Google sign-in failed') };
    }
  };

  const signUp = async ({
    email,
    password,
    fullName,
    institutionId,
    role: requestedRole = 'student',
  }: {
    email: string;
    password: string;
    fullName: string;
    institutionId?: string | undefined;
    role?: UserRole | undefined;
  }): Promise<SignUpResult> => {
    setIsLoading(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            institution_id: institutionId?.trim() || null,
            role: requestedRole,
          },
        },
      });

      if (error) {
        setIsLoading(false);
        return { error };
      }

      // Check if user was already registered in auth.users (Supabase returns empty identities array)
      if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
        setIsLoading(false);
        return {
          error: new Error(
            'An account with this MNIT email address already exists. Please switch to the Sign In tab to log in.'
          ),
        };
      }

      if (data.user) {
        setUser(data.user);
        setRole(requestedRole);
        let userProfile = await fetchProfile(data.user.id);
        if (!userProfile) {
          await new Promise((r) => setTimeout(r, 400));
          userProfile = await fetchProfile(data.user.id);
        }

        if (!userProfile) {
          // Fallback: directly create profile in public.profiles in case DB trigger is delayed
          try {
            await supabase.from('profiles').upsert(
              {
                id: data.user.id,
                email: data.user.email || trimmedEmail,
                full_name: fullName.trim(),
                role: requestedRole,
                institution_id: institutionId?.trim() || null,
              },
              { onConflict: 'id' }
            );
            userProfile = await fetchProfile(data.user.id);
          } catch (upsertErr) {
            console.warn('[AuthContext] Manual profile creation failed:', upsertErr);
          }
        }
        setIsLoading(false);
        return { error: null, role: userProfile?.role || requestedRole, needsEmailConfirmation: false };
      }

      setIsLoading(false);
      return { error: null, role: requestedRole, needsEmailConfirmation: false };
    } catch (err: unknown) {
      setIsLoading(false);
      return { error: err instanceof Error ? err : new Error('Sign up failed') };
    }
  };



  const verifyEmailOtp = async (
    email: string,
    token: string
  ): Promise<{ error: Error | null; role?: UserRole | undefined }> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: 'signup',
      });

      if (error) {
        setIsLoading(false);
        return { error };
      }

      if (data.user) {
        setUser(data.user);
        let userProfile = await fetchProfile(data.user.id);
        if (!userProfile) {
          await new Promise((r) => setTimeout(r, 600));
          userProfile = await fetchProfile(data.user.id);
        }
        setIsLoading(false);
        return { error: null, role: userProfile?.role };
      }

      setIsLoading(false);
      return { error: null };
    } catch (err: unknown) {
      setIsLoading(false);
      return { error: err instanceof Error ? err : new Error('Verification failed') };
    }
  };

  const resendVerificationEmail = async (email: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });
      return { error };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error('Failed to resend confirmation email') };
    }
  };

  const signOut = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[AuthContext] Sign out error:', err);
    } finally {
      setUser(null);
      setProfile(null);
      setRole(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isLoading,
        isAuthenticated: !!user,
        signInWithPassword,
        signInWithGoogle,
        signUp,
        verifyEmailOtp,
        resendVerificationEmail,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
