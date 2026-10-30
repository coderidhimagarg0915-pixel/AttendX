-- Migration: 20261030000001_geofence_and_method.sql
-- Description: Adds helper function and policies for Anti-Proxy check-in method and GPS Geofence tracking

-- 1. Helper function to record check-in method / geofence metadata
CREATE OR REPLACE FUNCTION public.record_checkin_metadata(
    p_session_id UUID,
    p_method TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_student_id UUID;
BEGIN
    v_student_id := auth.uid();
    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    UPDATE public.attendance_records
    SET user_agent = p_method
    WHERE session_id = p_session_id AND student_id = v_student_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.record_checkin_metadata(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_checkin_metadata(UUID, TEXT) TO authenticated;

-- 2. Allow students to update their own attendance record metadata
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'attendance_records' 
          AND policyname = 'Students update their own attendance metadata'
    ) THEN
        CREATE POLICY "Students update their own attendance metadata"
        ON public.attendance_records
        FOR UPDATE
        TO authenticated
        USING (student_id = (SELECT auth.uid()))
        WITH CHECK (student_id = (SELECT auth.uid()));
    END IF;
END $$;
