-- ============================================================
-- ATTENDX: PREVENT UNREGISTERED GOOGLE OAUTH AUTO-PROFILES
-- 1. Updates handle_new_user() trigger so OAuth sign-ins without explicit role metadata
--    do NOT create a profile in public.profiles.
-- 2. Adds DELETE RLS policy on public.profiles so users can delete their own profile.
-- 3. Cleans up any existing empty/unregistered stub profiles.
-- ============================================================

-- 1. Update auth trigger function: Only create profile if an explicit role was specified during registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role public.user_role;
    v_meta_role text;
BEGIN
    -- Enforce MNIT domain
    IF lower(new.email) NOT LIKE '%@mnit.ac.in' THEN
        RAISE EXCEPTION 'Access restricted: Only official MNIT Jaipur email IDs (@mnit.ac.in) are permitted.';
    END IF;

    -- Extract role from raw_user_meta_data
    v_meta_role := lower(new.raw_user_meta_data->>'role');
    
    -- If no role was supplied during registration (like fresh Google OAuth), do NOT insert a profile!
    -- This ensures unregistered OAuth users cannot bypass registration.
    IF v_meta_role IS NULL OR v_meta_role NOT IN ('student', 'faculty', 'admin') THEN
        RETURN NEW;
    END IF;

    v_role := v_meta_role::public.user_role;

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        institution_id,
        department,
        created_at,
        updated_at
    )
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        v_role,
        new.raw_user_meta_data->>'institution_id',
        new.raw_user_meta_data->>'department',
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        institution_id = COALESCE(EXCLUDED.institution_id, profiles.institution_id),
        department = COALESCE(EXCLUDED.department, profiles.department),
        updated_at = now();

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'handle_new_user warning: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- 2. Allow authenticated users to delete their own profile
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public' AND policyname = 'Users delete their own profile'
    ) THEN
        CREATE POLICY "Users delete their own profile"
        ON public.profiles
        FOR DELETE
        TO authenticated
        USING (id = (SELECT auth.uid()));
    END IF;
END $$;

GRANT DELETE ON public.profiles TO authenticated;

-- 3. Clean up any orphaned unregistered stub profiles from previous Google test attempts
DELETE FROM public.profiles
WHERE institution_id IS NULL
  AND face_embedding IS NULL
  AND id IN (
      SELECT id FROM auth.users 
      WHERE (raw_user_meta_data->>'role') IS NULL
  );

-- 4. RPC to allow an unregistered OAuth login to immediately purge its temporary record
CREATE OR REPLACE FUNCTION public.delete_current_unregistered_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NOT NULL THEN
        -- Delete profile if present
        DELETE FROM public.profiles WHERE id = v_user_id;
        -- Delete user from Supabase auth.users so no trace remains
        DELETE FROM auth.users WHERE id = v_user_id;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_current_unregistered_user() TO authenticated;

