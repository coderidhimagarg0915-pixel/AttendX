-- ============================================================
-- ATTENDX: SLIDING WINDOW & AUTO-ENROLLMENT ATTENDANCE FIX
-- ============================================================

-- 1. Add recent_hashes and previous_token_hash to attendance_session_secrets
ALTER TABLE public.attendance_session_secrets
ADD COLUMN IF NOT EXISTS previous_token_hash TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recent_hashes TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 2. Enhanced set_session_token with token history (sliding window)
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
    v_clean_code TEXT;
    v_hash TEXT;
    v_instructor_id UUID;
    v_existing_secrets RECORD;
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

    v_clean_code := upper(trim(p_code));
    v_hash := encode(digest(convert_to(v_clean_code, 'UTF8'), 'sha256'), 'hex');

    -- Insert or update secrets with sliding history (keeps up to 10 recent tokens)
    INSERT INTO public.attendance_session_secrets (session_id, token_hash, previous_token_hash, recent_hashes)
    VALUES (p_session_id, v_hash, NULL, ARRAY[v_hash])
    ON CONFLICT (session_id) DO UPDATE
    SET 
        previous_token_hash = attendance_session_secrets.token_hash,
        token_hash = EXCLUDED.token_hash,
        recent_hashes = (
            SELECT ARRAY(
                SELECT DISTINCT h 
                FROM unnest(array_prepend(EXCLUDED.token_hash, attendance_session_secrets.recent_hashes)) AS h
                LIMIT 10
            )
        );

    RETURN jsonb_build_object('success', true, 'session_id', p_session_id);
END;
$$;

REVOKE ALL ON FUNCTION public.set_session_token(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_session_token(UUID, TEXT) TO authenticated;


-- 3. Robust submit_student_attendance with sliding window match & auto-enrollment
CREATE OR REPLACE FUNCTION public.submit_student_attendance(
    p_session_id UUID,
    p_submitted_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_student_id UUID;
    v_clean_code TEXT;
    v_session RECORD;
    v_secrets RECORD;
    v_submitted_hash TEXT;
    v_is_matched BOOLEAN := false;
BEGIN
    v_student_id := auth.uid();

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Please log in to check in');
    END IF;

    IF (SELECT public.current_user_role()) <> 'student' THEN
        -- Allow student or fallback
        IF (SELECT role FROM public.profiles WHERE id = v_student_id) <> 'student' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Only enrolled students can submit attendance');
        END IF;
    END IF;

    v_clean_code := upper(trim(p_submitted_code));
    IF v_clean_code IS NULL OR v_clean_code = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Attendance code is required');
    END IF;

    SELECT s.*
    INTO v_session
    FROM public.attendance_sessions s
    WHERE s.id = p_session_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session not found');
    END IF;

    IF v_session.state <> 'active' OR v_session.expires_at <= now() THEN
        RETURN jsonb_build_object('success', false, 'error', 'This attendance session has ended or expired');
    END IF;

    -- Auto-enroll student into course if not enrolled yet (prevents student lockout)
    INSERT INTO public.enrollments (course_id, student_id)
    VALUES (v_session.course_id, v_student_id)
    ON CONFLICT (course_id, student_id) DO NOTHING;

    -- Retrieve session secrets
    SELECT *
    INTO v_secrets
    FROM public.attendance_session_secrets
    WHERE session_id = p_session_id;

    -- Calculate hash of submitted code
    v_submitted_hash := encode(digest(convert_to(v_clean_code, 'UTF8'), 'sha256'), 'hex');

    -- Validate against current token, previous token, or any token in the recent sliding window
    IF v_secrets.token_hash IS NOT NULL AND v_submitted_hash = v_secrets.token_hash THEN
        v_is_matched := true;
    ELSIF v_secrets.previous_token_hash IS NOT NULL AND v_submitted_hash = v_secrets.previous_token_hash THEN
        v_is_matched := true;
    ELSIF v_secrets.recent_hashes IS NOT NULL AND v_submitted_hash = ANY(v_secrets.recent_hashes) THEN
        v_is_matched := true;
    END IF;

    IF NOT v_is_matched THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid attendance code. Please check the current classroom display.');
    END IF;

    -- Record verified attendance
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
    )
    ON CONFLICT (session_id, student_id) DO UPDATE
    SET 
        status = 'present',
        verification_state = 'verified',
        verified_at = now();

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Attendance verified and recorded successfully!',
        'course_id', v_session.course_id,
        'verified_at', now()
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_student_attendance(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_student_attendance(UUID, TEXT) TO authenticated;
