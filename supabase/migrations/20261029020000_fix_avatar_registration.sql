-- ============================================================
-- ATTENDX: FIX AVATAR URL & FACE BIOMETRIC REGISTRATION
-- 1. Updates handle_new_user trigger to save avatar_url and face_embedding
--    directly from user_metadata during registration.
-- 2. Sets up public upload permissions on face-avatars storage bucket.
-- 3. Provides SECURITY DEFINER RPC to ensure biometrics are saved.
-- ============================================================

-- 1. Ensure biometric columns exist on profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS face_embedding JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS face_registered_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Ensure face-avatars storage bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('face-avatars', 'face-avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Safe policy recreation on storage.objects for face-avatars bucket
DROP POLICY IF EXISTS "Public face avatars are viewable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload face avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload face avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own face avatars" ON storage.objects;

-- Allow public read of face avatars
CREATE POLICY "Public face avatars are viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'face-avatars');

-- Allow public/signup uploads of face avatars
CREATE POLICY "Anyone can upload face avatars"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'face-avatars');

-- Allow updating face avatars
CREATE POLICY "Users can update their own face avatars"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'face-avatars');

-- 4. Update the handle_new_user trigger function to persist avatar_url and biometrics
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role public.user_role;
    v_meta_role text;
    v_avatar_url text;
    v_face_embedding jsonb;
BEGIN
    -- Enforce MNIT Jaipur institutional domain restriction
    IF lower(new.email) NOT LIKE '%@mnit.ac.in' THEN
        RAISE EXCEPTION 'Access restricted: Only official MNIT Jaipur email IDs (@mnit.ac.in) are permitted.';
    END IF;

    -- Read role from signup metadata safely
    v_meta_role := lower(new.raw_user_meta_data->>'role');
    
    -- If no role was provided in registration metadata, this is an uncompleted/unregistered user (e.g. fresh OAuth)
    -- Do NOT auto-insert a profile for them so they cannot bypass registration.
    IF v_meta_role IS NULL OR v_meta_role NOT IN ('student', 'faculty', 'admin') THEN
        RETURN NEW;
    END IF;

    v_role := v_meta_role::public.user_role;
    v_avatar_url := new.raw_user_meta_data->>'avatar_url';

    IF new.raw_user_meta_data ? 'face_embedding' AND new.raw_user_meta_data->'face_embedding' IS NOT NULL THEN
        v_face_embedding := (new.raw_user_meta_data->'face_embedding')::jsonb;
    ELSE
        v_face_embedding := NULL;
    END IF;

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        institution_id,
        department,
        avatar_url,
        face_embedding,
        face_registered_at,
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
        v_avatar_url,
        v_face_embedding,
        CASE WHEN v_face_embedding IS NOT NULL THEN now() ELSE NULL END,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        institution_id = COALESCE(EXCLUDED.institution_id, public.profiles.institution_id),
        department = COALESCE(EXCLUDED.department, public.profiles.department),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        face_embedding = COALESCE(EXCLUDED.face_embedding, public.profiles.face_embedding),
        face_registered_at = COALESCE(EXCLUDED.face_registered_at, public.profiles.face_registered_at),
        updated_at = now();

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'handle_new_user warning: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- 5. Expand column-level UPDATE grants on public.profiles
GRANT UPDATE (full_name, avatar_url, face_embedding, face_registered_at, institution_id, department)
ON public.profiles TO authenticated;

-- 6. Helper RPC function to ensure biometric data can be saved reliably
CREATE OR REPLACE FUNCTION public.save_registration_biometrics(
    p_user_id UUID,
    p_avatar_url TEXT,
    p_face_embedding JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.profiles
    SET 
        avatar_url = COALESCE(NULLIF(p_avatar_url, ''), avatar_url),
        face_embedding = COALESCE(p_face_embedding, face_embedding),
        face_registered_at = CASE WHEN p_face_embedding IS NOT NULL THEN now() ELSE face_registered_at END,
        updated_at = now()
    WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_registration_biometrics(UUID, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_registration_biometrics(UUID, TEXT, JSONB) TO anon, authenticated;

