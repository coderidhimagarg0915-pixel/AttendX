-- ============================================================
-- ATTENDX: CLASSROOM ENGINE MIGRATION
-- Adds:
-- 1. join_code to courses table for student self-enrollment (Google Classroom style)
-- 2. warning_messages table (in-app warnings from faculty to students)
-- 3. enroll_via_join_code RPC (student self-enrollment with 8-char code)
-- 4. get_course_students RPC (enrolled students with attendance %)
-- 5. get_student_session_history RPC (lecture-by-lecture history)
-- 6. send_student_warning RPC (faculty sends in-app warning)
-- 7. get_my_warnings RPC (student reads active warnings)
-- 8. mark_warning_read RPC (student dismisses warning)
-- 9. manually_enroll_student RPC (faculty adds student by email / roll)
-- 10. Faculty direct enrollment insert/delete RLS policies
-- ============================================================

-- 1. Add join_code column to courses (safe to run multiple times)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'join_code'
    ) THEN
        ALTER TABLE public.courses ADD COLUMN join_code TEXT UNIQUE;
    END IF;
END $$;

-- Generate join codes for any existing courses that don't have one
UPDATE public.courses
SET join_code = upper(substr(md5(id::text), 1, 8))
WHERE join_code IS NULL;

-- 2. Create warning_messages table
CREATE TABLE IF NOT EXISTS public.warning_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    attendance_percent INTEGER,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.warning_messages ENABLE ROW LEVEL SECURITY;

-- Faculty can create warnings for students in their courses
DROP POLICY IF EXISTS "Faculty create warnings" ON public.warning_messages;
CREATE POLICY "Faculty create warnings"
ON public.warning_messages
FOR INSERT TO authenticated
WITH CHECK (
    faculty_id = (SELECT auth.uid())
    AND EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = warning_messages.course_id
          AND c.instructor_id = (SELECT auth.uid())
    )
);

-- Students read their own warnings
DROP POLICY IF EXISTS "Students read their warnings" ON public.warning_messages;
CREATE POLICY "Students read their warnings"
ON public.warning_messages
FOR SELECT TO authenticated
USING (
    student_id = (SELECT auth.uid())
    OR faculty_id = (SELECT auth.uid())
    OR (SELECT public.current_user_role()) = 'admin'
);

-- Students can mark warnings as read
DROP POLICY IF EXISTS "Students mark warning read" ON public.warning_messages;
CREATE POLICY "Students mark warning read"
ON public.warning_messages
FOR UPDATE TO authenticated
USING (student_id = (SELECT auth.uid()))
WITH CHECK (student_id = (SELECT auth.uid()));

GRANT SELECT, INSERT ON public.warning_messages TO authenticated;
GRANT UPDATE (is_read) ON public.warning_messages TO authenticated;


-- 3. RPC: Enroll via join code (student self-enrollment)
CREATE OR REPLACE FUNCTION public.enroll_via_join_code(p_join_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id UUID;
    v_course RECORD;
BEGIN
    v_student_id := auth.uid();
    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    SELECT * INTO v_course
    FROM public.courses
    WHERE upper(join_code) = upper(trim(p_join_code));

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid course join code. Please check and try again.');
    END IF;

    INSERT INTO public.enrollments (course_id, student_id)
    VALUES (v_course.id, v_student_id)
    ON CONFLICT (course_id, student_id) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'course_id', v_course.id,
        'course_code', v_course.code,
        'course_name', v_course.name
    );
END;
$$;

REVOKE ALL ON FUNCTION public.enroll_via_join_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enroll_via_join_code(TEXT) TO authenticated;


-- 4. RPC: Get enrolled students with attendance percentage for a course
CREATE OR REPLACE FUNCTION public.get_course_students(p_course_id UUID)
RETURNS TABLE (
    student_id UUID,
    full_name TEXT,
    email TEXT,
    institution_id TEXT,
    total_sessions BIGINT,
    attended_sessions BIGINT,
    attendance_percent INTEGER,
    last_attended TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only the instructor or admin can call this
    IF NOT EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = p_course_id
          AND (c.instructor_id = (SELECT auth.uid()) OR (SELECT public.current_user_role()) = 'admin')
    ) THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        p.id AS student_id,
        p.full_name,
        p.email,
        p.institution_id,
        (
            SELECT count(*)::BIGINT FROM public.attendance_sessions s
            WHERE s.course_id = p_course_id
              AND s.state IN ('closed', 'active')
        ) AS total_sessions,
        (
            SELECT count(*)::BIGINT FROM public.attendance_records ar
            JOIN public.attendance_sessions s ON s.id = ar.session_id
            WHERE s.course_id = p_course_id
              AND ar.student_id = p.id
              AND ar.status IN ('present', 'late', 'excused')
        ) AS attended_sessions,
        CASE
            WHEN (
                SELECT count(*) FROM public.attendance_sessions s
                WHERE s.course_id = p_course_id AND s.state IN ('closed', 'active')
            ) = 0 THEN 100
            ELSE (
                (
                    SELECT count(*)::INTEGER FROM public.attendance_records ar
                    JOIN public.attendance_sessions s ON s.id = ar.session_id
                    WHERE s.course_id = p_course_id
                      AND ar.student_id = p.id
                      AND ar.status IN ('present', 'late', 'excused')
                ) * 100 /
                (
                    SELECT count(*)::INTEGER FROM public.attendance_sessions s
                    WHERE s.course_id = p_course_id AND s.state IN ('closed', 'active')
                )
            )
        END AS attendance_percent,
        (
            SELECT max(ar.verified_at) FROM public.attendance_records ar
            JOIN public.attendance_sessions s ON s.id = ar.session_id
            WHERE s.course_id = p_course_id AND ar.student_id = p.id
        ) AS last_attended
    FROM public.enrollments e
    JOIN public.profiles p ON p.id = e.student_id
    WHERE e.course_id = p_course_id
    ORDER BY p.full_name;
END;
$$;

REVOKE ALL ON FUNCTION public.get_course_students(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_course_students(UUID) TO authenticated;


-- 5. RPC: Get student's lecture-by-lecture attendance for a course
CREATE OR REPLACE FUNCTION public.get_student_session_history(p_course_id UUID, p_student_id UUID)
RETURNS TABLE (
    session_id UUID,
    session_title TEXT,
    session_date TIMESTAMPTZ,
    status TEXT,
    verified_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Must be the instructor, admin, or the student themselves
    IF NOT (
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = p_course_id
              AND (c.instructor_id = (SELECT auth.uid()) OR (SELECT public.current_user_role()) = 'admin')
        )
        OR (SELECT auth.uid()) = p_student_id
    ) THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        s.id AS session_id,
        s.title AS session_title,
        s.created_at AS session_date,
        COALESCE(ar.status::TEXT, 'absent') AS status,
        ar.verified_at
    FROM public.attendance_sessions s
    LEFT JOIN public.attendance_records ar ON ar.session_id = s.id AND ar.student_id = p_student_id
    WHERE s.course_id = p_course_id
      AND s.state IN ('closed', 'active')
    ORDER BY s.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_session_history(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_session_history(UUID, UUID) TO authenticated;


-- 6. RPC: Send in-app warning message to a student
CREATE OR REPLACE FUNCTION public.send_student_warning(
    p_course_id UUID,
    p_student_id UUID,
    p_message TEXT,
    p_attendance_percent INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_faculty_id UUID;
BEGIN
    v_faculty_id := auth.uid();
    IF v_faculty_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = p_course_id
          AND (c.instructor_id = v_faculty_id OR (SELECT public.current_user_role()) = 'admin')
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized to send warnings for this course');
    END IF;

    INSERT INTO public.warning_messages (course_id, student_id, faculty_id, message, attendance_percent)
    VALUES (p_course_id, p_student_id, v_faculty_id, trim(p_message), p_attendance_percent);

    RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.send_student_warning(UUID, UUID, TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_student_warning(UUID, UUID, TEXT, INTEGER) TO authenticated;


-- 7. RPC: Get unread warnings for the current student
CREATE OR REPLACE FUNCTION public.get_my_warnings()
RETURNS TABLE (
    id UUID,
    course_id UUID,
    course_name TEXT,
    course_code TEXT,
    faculty_name TEXT,
    message TEXT,
    attendance_percent INTEGER,
    is_read BOOLEAN,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        wm.id,
        wm.course_id,
        c.name AS course_name,
        c.code AS course_code,
        p.full_name AS faculty_name,
        wm.message,
        wm.attendance_percent,
        wm.is_read,
        wm.created_at
    FROM public.warning_messages wm
    JOIN public.courses c ON c.id = wm.course_id
    JOIN public.profiles p ON p.id = wm.faculty_id
    WHERE wm.student_id = (SELECT auth.uid())
    ORDER BY wm.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_warnings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_warnings() TO authenticated;


-- 8. RPC: Mark a warning as read
CREATE OR REPLACE FUNCTION public.mark_warning_read(p_warning_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.warning_messages
    SET is_read = true
    WHERE id = p_warning_id AND student_id = (SELECT auth.uid());

    RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.mark_warning_read(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_warning_read(UUID) TO authenticated;


-- 9. RPC: Faculty manually enroll student by email, roll number, or username
CREATE OR REPLACE FUNCTION public.manually_enroll_student(
    p_course_id UUID,
    p_student_identifier TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_instructor_id UUID;
    v_clean_ident TEXT;
    v_student RECORD;
    v_course RECORD;
BEGIN
    v_instructor_id := auth.uid();
    IF v_instructor_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    -- Verify instructor ownership or admin
    SELECT * INTO v_course
    FROM public.courses
    WHERE id = p_course_id
      AND (instructor_id = v_instructor_id OR (SELECT public.current_user_role()) = 'admin');

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Course not found or unauthorized');
    END IF;

    v_clean_ident := trim(p_student_identifier);
    IF v_clean_ident = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Please provide a student email or roll number');
    END IF;

    -- Find student profile matching email, institution_id (roll), or MNIT prefix
    SELECT * INTO v_student
    FROM public.profiles
    WHERE lower(email) = lower(v_clean_ident)
       OR upper(COALESCE(institution_id, '')) = upper(v_clean_ident)
       OR lower(email) = lower(v_clean_ident || '@mnit.ac.in')
       OR lower(split_part(email, '@', 1)) = lower(v_clean_ident)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Student "' || v_clean_ident || '" has not registered in AttendX yet. They must log in once with their @mnit.ac.in email, or you can share the Course Join Code (' || COALESCE(v_course.join_code, 'N/A') || ') with them.'
        );
    END IF;

    -- Insert into enrollments
    INSERT INTO public.enrollments (course_id, student_id)
    VALUES (p_course_id, v_student.id)
    ON CONFLICT (course_id, student_id) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Enrolled ' || v_student.full_name || ' (' || v_student.email || ') successfully.',
        'student_id', v_student.id,
        'full_name', v_student.full_name,
        'email', v_student.email
    );
END;
$$;

REVOKE ALL ON FUNCTION public.manually_enroll_student(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manually_enroll_student(UUID, TEXT) TO authenticated;


-- 10. Enable Faculty direct enrollment insert & delete permissions on enrollments table
DROP POLICY IF EXISTS "Faculty can enroll students" ON public.enrollments;
CREATE POLICY "Faculty can enroll students"
ON public.enrollments
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_course_instructor(enrollments.course_id, (SELECT auth.uid()))
    OR (SELECT public.current_user_role()) = 'admin'
);

DROP POLICY IF EXISTS "Faculty can remove enrollments" ON public.enrollments;
CREATE POLICY "Faculty can remove enrollments"
ON public.enrollments
FOR DELETE
TO authenticated
USING (
    public.is_course_instructor(enrollments.course_id, (SELECT auth.uid()))
    OR (SELECT public.current_user_role()) = 'admin'
);
