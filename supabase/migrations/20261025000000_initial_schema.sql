
-- ============================================================
-- ATTENDX: INITIAL DATABASE SCHEMA
-- React + Vite + Supabase
-- ============================================================

-- 1. Extensions and custom types

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TYPE public.user_role AS ENUM (
    'faculty', 'student', 'admin'
);

CREATE TYPE public.attendance_status AS ENUM (
    'present', 'absent', 'late', 'excused'
);

CREATE TYPE public.session_state AS ENUM (
    'scheduled', 'active', 'closed', 'archived'
);

CREATE TYPE public.verification_state AS ENUM (
    'pending_server_verification', 'verified', 'rejected'
);


-- 2. Profiles
-- Each profile corresponds to one Supabase Auth user.

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role public.user_role NOT NULL DEFAULT 'student',
    avatar_url TEXT,
    institution_id TEXT,
    department TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 3. Courses

CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    instructor_id UUID NOT NULL
        REFERENCES public.profiles(id) ON DELETE RESTRICT,
    semester TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT unique_course_code_academic_year
        UNIQUE (code, academic_year, semester)
);


-- 4. Enrollments

CREATE TABLE public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL
        REFERENCES public.courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL
        REFERENCES public.profiles(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT unique_course_student_enrollment
        UNIQUE (course_id, student_id)
);


-- 5. Attendance sessions

CREATE TABLE public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL
        REFERENCES public.courses(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL
        REFERENCES public.profiles(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    state public.session_state NOT NULL DEFAULT 'scheduled',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 6. Private session secrets
-- Token hashes are kept OUT of the publicly accessible session table.

CREATE TABLE public.attendance_session_secrets (
    session_id UUID PRIMARY KEY
        REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL
);


-- 7. Attendance records

CREATE TABLE public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL
        REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL
        REFERENCES public.profiles(id) ON DELETE RESTRICT,
    status public.attendance_status NOT NULL DEFAULT 'present',
    verification_state public.verification_state
        NOT NULL DEFAULT 'pending_server_verification',
    ip_address INET,
    user_agent TEXT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT unique_student_session
        UNIQUE (session_id, student_id)
);


-- 8. Helper function for reading the current user's role.
-- SECURITY DEFINER avoids recursive profile RLS checks.

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT p.role
    FROM public.profiles AS p
    WHERE p.id = (SELECT auth.uid())
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;


-- 9. Enable RLS on every application table.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_session_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;


-- 10. PROFILES POLICIES

CREATE POLICY "Users view permitted profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    id = (SELECT auth.uid())
    OR (SELECT public.current_user_role()) = 'admin'
    OR (
        (SELECT public.current_user_role()) = 'faculty'
        AND EXISTS (
            SELECT 1
            FROM public.enrollments e
            JOIN public.courses c ON c.id = e.course_id
            WHERE e.student_id = profiles.id
              AND c.instructor_id = (SELECT auth.uid())
        )
    )
);

CREATE POLICY "Users update their own profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- Column-level permissions prevent users from changing their role,
-- email or account ID through the frontend.

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, avatar_url)
ON public.profiles TO authenticated;


-- 11. COURSES POLICIES

CREATE POLICY "Users view permitted courses"
ON public.courses
FOR SELECT
TO authenticated
USING (
    instructor_id = (SELECT auth.uid())
    OR (SELECT public.current_user_role()) = 'admin'
    OR EXISTS (
        SELECT 1
        FROM public.enrollments e
        WHERE e.course_id = courses.id
          AND e.student_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Faculty create their own courses"
ON public.courses
FOR INSERT
TO authenticated
WITH CHECK (
    instructor_id = (SELECT auth.uid())
    AND (SELECT public.current_user_role()) = 'faculty'
);

CREATE POLICY "Faculty update their own courses"
ON public.courses
FOR UPDATE
TO authenticated
USING (
    instructor_id = (SELECT auth.uid())
    AND (SELECT public.current_user_role()) = 'faculty'
)
WITH CHECK (
    instructor_id = (SELECT auth.uid())
    AND (SELECT public.current_user_role()) = 'faculty'
);

CREATE POLICY "Admins manage courses"
ON public.courses
FOR ALL
TO authenticated
USING (
    (SELECT public.current_user_role()) = 'admin'
)
WITH CHECK (
    (SELECT public.current_user_role()) = 'admin'
);


-- 12. ENROLLMENTS POLICIES

CREATE POLICY "Students view their enrollments"
ON public.enrollments
FOR SELECT
TO authenticated
USING (student_id = (SELECT auth.uid()));

CREATE POLICY "Faculty view their course enrollments"
ON public.enrollments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = enrollments.course_id
          AND c.instructor_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Admins manage enrollments"
ON public.enrollments
FOR ALL
TO authenticated
USING (
    (SELECT public.current_user_role()) = 'admin'
)
WITH CHECK (
    (SELECT public.current_user_role()) = 'admin'
);


-- 13. ATTENDANCE SESSION POLICIES

CREATE POLICY "Users view permitted sessions"
ON public.attendance_sessions
FOR SELECT
TO authenticated
USING (
    instructor_id = (SELECT auth.uid())
    OR (SELECT public.current_user_role()) = 'admin'
    OR (
        state = 'active'
        AND expires_at > now()
        AND EXISTS (
            SELECT 1
            FROM public.enrollments e
            WHERE e.course_id = attendance_sessions.course_id
              AND e.student_id = (SELECT auth.uid())
        )
    )
);

CREATE POLICY "Faculty create their own sessions"
ON public.attendance_sessions
FOR INSERT
TO authenticated
WITH CHECK (
    instructor_id = (SELECT auth.uid())
    AND (SELECT public.current_user_role()) = 'faculty'
    AND EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = attendance_sessions.course_id
          AND c.instructor_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Faculty update their own sessions"
ON public.attendance_sessions
FOR UPDATE
TO authenticated
USING (
    instructor_id = (SELECT auth.uid())
    AND (SELECT public.current_user_role()) = 'faculty'
)
WITH CHECK (
    instructor_id = (SELECT auth.uid())
    AND (SELECT public.current_user_role()) = 'faculty'
);

CREATE POLICY "Admins manage sessions"
ON public.attendance_sessions
FOR ALL
TO authenticated
USING (
    (SELECT public.current_user_role()) = 'admin'
)
WITH CHECK (
    (SELECT public.current_user_role()) = 'admin'
);


-- 14. ATTENDANCE RECORD POLICIES

CREATE POLICY "Students view their own attendance"
ON public.attendance_records
FOR SELECT
TO authenticated
USING (student_id = (SELECT auth.uid()));

CREATE POLICY "Faculty view attendance for their sessions"
ON public.attendance_records
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.attendance_sessions s
        WHERE s.id = attendance_records.session_id
          AND s.instructor_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Admins view attendance"
ON public.attendance_records
FOR SELECT
TO authenticated
USING (
    (SELECT public.current_user_role()) = 'admin'
);


-- 15. PRIVATE SESSION SECRET ACCESS
-- No policies are created. Browser users cannot read or modify hashes.

REVOKE ALL ON public.attendance_session_secrets
FROM PUBLIC, anon, authenticated;


-- 16. Database function for attendance verification

CREATE OR REPLACE FUNCTION public.submit_student_attendance(
    p_session_id UUID,
    p_submitted_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_student_id UUID;
    v_session RECORD;
    v_token_hash TEXT;
    v_submitted_hash TEXT;
BEGIN
    v_student_id := auth.uid();

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 'error', 'Unauthorized'
        );
    END IF;

    IF (SELECT public.current_user_role()) <> 'student' THEN
        RETURN jsonb_build_object(
            'success', false, 'error', 'Only students can submit attendance'
        );
    END IF;

    IF p_submitted_code IS NULL OR p_submitted_code = '' THEN
        RETURN jsonb_build_object(
            'success', false, 'error', 'Attendance code is required'
        );
    END IF;

    SELECT s.*
    INTO v_session
    FROM public.attendance_sessions s
    WHERE s.id = p_session_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 'error', 'Session not found'
        );
    END IF;

    IF v_session.state <> 'active'
       OR v_session.expires_at <= now() THEN
        RETURN jsonb_build_object(
            'success', false, 'error', 'Session closed or expired'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.enrollments e
        WHERE e.course_id = v_session.course_id
          AND e.student_id = v_student_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false, 'error', 'Student not enrolled'
        );
    END IF;

    SELECT secrets.token_hash
    INTO v_token_hash
    FROM public.attendance_session_secrets secrets
    WHERE secrets.session_id = p_session_id;

    IF v_token_hash IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 'error', 'Session verification unavailable'
        );
    END IF;

    -- Expected token_hash format: lowercase hexadecimal SHA-256.
    v_submitted_hash := encode(
        extensions.digest(
            convert_to(p_submitted_code, 'UTF8'),
            'sha256'
        ),
        'hex'
    );

    IF v_submitted_hash <> v_token_hash THEN
        RETURN jsonb_build_object(
            'success', false, 'error', 'Invalid attendance code'
        );
    END IF;

    INSERT INTO public.attendance_records (
        session_id,
        student_id,
        status,
        verification_state,
        verified_at
    )
    VALUES (
        p_session_id,
        v_student_id,
        'present',
        'verified',
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Attendance verified successfully',
        'verified_at', now()
    );

EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Attendance already submitted'
        );
END;
$$;


-- 17. Restrict function execution.

REVOKE ALL ON FUNCTION public.submit_student_attendance(UUID, TEXT)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.submit_student_attendance(UUID, TEXT)
TO authenticated;


-- 18. Explicit table privileges.

GRANT SELECT ON
    public.profiles,
    public.courses,
    public.enrollments,
    public.attendance_sessions,
    public.attendance_records
TO authenticated;

GRANT INSERT, UPDATE, DELETE ON public.courses
TO authenticated;

GRANT INSERT, UPDATE, DELETE ON public.attendance_sessions
TO authenticated;

GRANT INSERT, DELETE ON public.enrollments
TO authenticated;

-- No direct authenticated writes to attendance_records.
-- No direct authenticated access to attendance_session_secrets.
