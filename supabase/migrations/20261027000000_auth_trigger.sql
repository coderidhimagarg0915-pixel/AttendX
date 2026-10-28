-- ============================================================
-- ATTENDX: AUTH PROFILE AUTO-CREATION TRIGGER & POLICIES
-- Enforces MNIT Jaipur (@mnit.ac.in) email requirement,
-- eliminates Row-Level Security (RLS) recursion, and
-- automatically creates/updates a public.profiles record
-- when a user signs up via Supabase Auth (auth.users).
-- ============================================================

-- 1. Helper security definer functions to prevent circular RLS recursion between courses & enrollments
CREATE OR REPLACE FUNCTION public.is_student_enrolled(_course_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.enrollments
        WHERE course_id = _course_id AND student_id = _user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.is_course_instructor(_course_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.courses
        WHERE id = _course_id AND instructor_id = _user_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_student_enrolled(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_course_instructor(UUID, UUID) TO authenticated;

-- 2. Profiles Policies: Allow authenticated users to view profiles without recursive policy loops
DROP POLICY IF EXISTS "Users view permitted profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;

CREATE POLICY "Public profiles are viewable by authenticated users"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Users insert their own profile'
    ) THEN
        CREATE POLICY "Users insert their own profile"
        ON public.profiles
        FOR INSERT
        TO authenticated
        WITH CHECK (id = (SELECT auth.uid()));
    END IF;
END $$;

GRANT INSERT ON public.profiles TO authenticated;

-- 3. Non-recursive Courses Policies
DROP POLICY IF EXISTS "Users view permitted courses" ON public.courses;
CREATE POLICY "Users view permitted courses"
ON public.courses
FOR SELECT
TO authenticated
USING (
    instructor_id = (SELECT auth.uid())
    OR (SELECT public.current_user_role()) = 'admin'
    OR public.is_student_enrolled(courses.id, (SELECT auth.uid()))
);

-- 4. Non-recursive Enrollments Policies
DROP POLICY IF EXISTS "Faculty view their course enrollments" ON public.enrollments;
CREATE POLICY "Faculty view their course enrollments"
ON public.enrollments
FOR SELECT
TO authenticated
USING (
    public.is_course_instructor(enrollments.course_id, (SELECT auth.uid()))
);

-- 5. Non-recursive Attendance Sessions Policies
DROP POLICY IF EXISTS "Users view permitted sessions" ON public.attendance_sessions;
CREATE POLICY "Users view permitted sessions"
ON public.attendance_sessions
FOR SELECT
TO authenticated
USING (
    instructor_id = (SELECT auth.uid())
    OR (SELECT public.current_user_role()) = 'admin'
    OR (
        state = 'active'::public.session_state
        AND expires_at > now()
        AND public.is_student_enrolled(attendance_sessions.course_id, (SELECT auth.uid()))
    )
);

-- 6. Auth Trigger: Enforces MNIT Jaipur domain and auto-creates profile
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
    -- Enforce MNIT Jaipur institutional domain restriction
    IF lower(new.email) NOT LIKE '%@mnit.ac.in' THEN
        RAISE EXCEPTION 'Access restricted: Only official MNIT Jaipur email IDs (@mnit.ac.in) are permitted.';
    END IF;

    -- Read role from signup metadata safely
    v_meta_role := lower(COALESCE(new.raw_user_meta_data->>'role', 'student'));
    
    IF v_meta_role IN ('student', 'faculty', 'admin') THEN
        v_role := v_meta_role::public.user_role;
    ELSE
        v_role := 'student'::public.user_role;
    END IF;

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
        -- Prevent unhandled fatal crash of auth flow while logging the reason
        RAISE WARNING 'handle_new_user warning: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Drop trigger if it already exists to allow idempotent re-running
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger attached to auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill any existing users in auth.users that don't have a profile yet
INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
    COALESCE((u.raw_user_meta_data->>'role')::public.user_role, 'student'::public.user_role),
    u.created_at,
    now()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
