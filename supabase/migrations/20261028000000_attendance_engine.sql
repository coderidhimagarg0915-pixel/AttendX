-- ============================================================
-- ATTENDX: SESSION ENGINE, SECRETS ROTATION & REALTIME MIGRATION
-- Adds RPCs for:
-- 1. Setting / rotating session token hashes (attendance_session_secrets)
-- 2. Faculty manual attendance override (attendance_records)
-- 3. Student self-enrollment into courses
-- 4. Supabase Realtime publication on attendance_records & attendance_sessions
-- ============================================================

-- 1. Helper function for setting / rotating session dynamic OTP / QR code token
CREATE OR REPLACE FUNCTION public.set_session_token(
    p_session_id UUID,
    p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_hash TEXT;
    v_instructor_id UUID;
BEGIN
    v_instructor_id := auth.uid();
    IF v_instructor_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    -- Ensure the user is the instructor of the session or an admin
    IF NOT EXISTS (
        SELECT 1 FROM public.attendance_sessions
        WHERE id = p_session_id 
          AND (instructor_id = v_instructor_id OR (SELECT public.current_user_role()) = 'admin')
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session not found or unauthorized');
    END IF;

    -- Calculate SHA-256 hash using pgcrypto digest matching submit_student_attendance
    v_hash := encode(digest(convert_to(p_code, 'UTF8'), 'sha256'), 'hex');

    -- Insert or update into private secrets table
    INSERT INTO public.attendance_session_secrets (session_id, token_hash)
    VALUES (p_session_id, v_hash)
    ON CONFLICT (session_id) DO UPDATE
    SET token_hash = EXCLUDED.token_hash;

    RETURN jsonb_build_object('success', true, 'session_id', p_session_id);
END;
$$;

REVOKE ALL ON FUNCTION public.set_session_token(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_session_token(UUID, TEXT) TO authenticated;


-- 2. Helper function for faculty manual override on student attendance status
CREATE OR REPLACE FUNCTION public.override_student_attendance(
    p_session_id UUID,
    p_student_id UUID,
    p_status public.attendance_status,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_instructor_id UUID;
BEGIN
    v_instructor_id := auth.uid();
    IF v_instructor_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    -- Verify instructor ownership
    IF NOT EXISTS (
        SELECT 1 FROM public.attendance_sessions
        WHERE id = p_session_id 
          AND (instructor_id = v_instructor_id OR (SELECT public.current_user_role()) = 'admin')
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session not found or unauthorized');
    END IF;

    -- Upsert attendance record
    INSERT INTO public.attendance_records (
        session_id,
        student_id,
        status,
        verification_state,
        verified_at
    )
    VALUES (
        p_session_id,
        p_student_id,
        p_status,
        'verified',
        now()
    )
    ON CONFLICT (session_id, student_id) DO UPDATE SET
        status = EXCLUDED.status,
        verification_state = 'verified',
        verified_at = now();

    RETURN jsonb_build_object('success', true, 'session_id', p_session_id, 'student_id', p_student_id, 'status', p_status);
END;
$$;

REVOKE ALL ON FUNCTION public.override_student_attendance(UUID, UUID, public.attendance_status, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.override_student_attendance(UUID, UUID, public.attendance_status, TEXT) TO authenticated;


-- 3. Student Self-Enrollment RPC
CREATE OR REPLACE FUNCTION public.enroll_in_course(
    p_course_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id UUID;
BEGIN
    v_student_id := auth.uid();
    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    INSERT INTO public.enrollments (course_id, student_id)
    VALUES (p_course_id, v_student_id)
    ON CONFLICT (course_id, student_id) DO NOTHING;

    RETURN jsonb_build_object('success', true, 'course_id', p_course_id);
END;
$$;

REVOKE ALL ON FUNCTION public.enroll_in_course(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enroll_in_course(UUID) TO authenticated;


-- 4. Enable Student Insert on Enrollments table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'enrollments' AND policyname = 'Students can self-enroll'
    ) THEN
        CREATE POLICY "Students can self-enroll"
        ON public.enrollments
        FOR INSERT
        TO authenticated
        WITH CHECK (student_id = (SELECT auth.uid()));
    END IF;
END $$;


-- 5. Enable Supabase Realtime on attendance tables
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_sessions;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
END $$;
