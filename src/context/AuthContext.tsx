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
        // Guard against uncompleted/unregistered OAuth accounts:
        // When a user signs in via Google OAuth without registering, Supabase DB trigger may have
        // auto-inserted a stub with no institution_id, no face_embedding, and no user_metadata role.
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const isGoogleUser = currentUser?.app_metadata?.provider === 'google' ||
                             currentUser?.identities?.some((id) => id.provider === 'google');
        const hasMetadataRole = !!currentUser?.user_metadata?.role;
        const isRegistered = !isGoogleUser || hasMetadataRole || !!data.institution_id || !!data.face_embedding;

        if (!isRegistered) {
          console.warn('[AuthContext] Unregistered Google OAuth stub profile detected. Blocking access.');
          setProfile(null);
          setRole(null);
          return null;
        }

        const typedProfile: UserProfile = {
          id: data.id,
          email: data.email,
          full_name: data.full_name,
          role: data.role as UserRole,
          avatar_url: data.avatar_url,
          institution_id: data.institution_id,
          department: data.department,
          face_embedding: (data.face_embedding as unknown as number[]) || null,
          face_registered_at: data.face_registered_at || null,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        setProfile(typedProfile);
        setRole(typedProfile.role);
        return typedProfile;
      }

      // If no row exists in public.profiles, user has not registered
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
        const userProfile = await fetchProfile(session.user.id);
        if (userProfile) {
          setUser(session.user);
        } else {
          // If no profile exists, sign out to prevent ghost/unregistered sessions
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          setRole(null);
        }
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
          const userProfile = await fetchProfile(session.user.id);
          if (userProfile) {
            setUser(session.user);
            setRole(userProfile.role);
          } else {
            // User is not registered! Keep auth state cleared
            setUser(null);
            setProfile(null);
            setRole(null);
          }
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

        // Block sign-in if no profile exists — the user is not properly registered
        if (!resolvedProfile) {
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          setRole(null);
          setIsLoading(false);
          return {
            error: new Error(
              'No account found for this email. Please register first using the New Registration tab.'
            ),
          };
        }

        setIsLoading(false);
        return { error: null, role: resolvedProfile.role };
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
    faceEmbedding,
    faceImageBlob,
  }: {
    email: string;
    password: string;
    fullName: string;
    institutionId?: string | undefined;
    role?: UserRole | undefined;
    faceEmbedding?: number[] | undefined;
    faceImageBlob?: Blob | undefined;
  }): Promise<SignUpResult> => {
    setIsLoading(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();

      // 1. Upload face snapshot BEFORE calling signUp so avatar_url is ready for the auth trigger
      let avatarUrl: string | null = null;
      if (faceImageBlob) {
        try {
          const sanitizedEmail = trimmedEmail.replace(/[^a-zA-Z0-9]/g, '_');
          const filePath = `${sanitizedEmail}_${Date.now()}.jpg`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('face-avatars')
            .upload(filePath, faceImageBlob, { contentType: 'image/jpeg', upsert: true });

          if (!uploadError && uploadData) {
            const { data: publicUrlData } = supabase.storage
              .from('face-avatars')
              .getPublicUrl(filePath);
            avatarUrl = publicUrlData.publicUrl;
          } else if (uploadError) {
            console.warn(
              '[AuthContext] Storage upload failed (' + uploadError.message + '), falling back to base64 Data URL.'
            );
            avatarUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(faceImageBlob);
            });
          }
        } catch (uploadErr) {
          console.warn('[AuthContext] Upload exception, fallback to base64:', uploadErr);
          avatarUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(faceImageBlob);
          });
        }
      }

      // 2. Call Supabase signUp with full metadata including avatar_url and face_embedding
      // The handle_new_user database trigger inserts directly into public.profiles with avatar_url and face_embedding!
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            institution_id: institutionId?.trim() || null,
            role: requestedRole,
            avatar_url: avatarUrl,
            face_embedding: faceEmbedding || null,
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

        // 3. Dual-guarantee: Call save_registration_biometrics RPC function
        try {
          await supabase.rpc('save_registration_biometrics', {
            p_user_id: data.user.id,
            p_avatar_url: avatarUrl || '',
            p_face_embedding: (faceEmbedding || null) as unknown as import('@/types/database').Json,
          });
        } catch {
          // If RPC is pending execution, fallback to direct update
          try {
            await supabase
              .from('profiles')
              .update({
                avatar_url: avatarUrl,
                institution_id: institutionId?.trim() || null,
                face_embedding: faceEmbedding || null,
                face_registered_at: faceEmbedding ? new Date().toISOString() : null,
              })
              .eq('id', data.user.id);
          } catch (updateErr) {
            console.warn('[AuthContext] Profile direct update exception:', updateErr);
          }
        }

        const userProfile = await fetchProfile(data.user.id);
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
