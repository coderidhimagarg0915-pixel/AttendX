-- ============================================================
-- ATTENDX: FACE BIOMETRIC REGISTRATION MIGRATION
-- Adds face biometric embedding vector and timestamp to public.profiles
-- Sets up Supabase storage bucket for biometric avatars
-- ============================================================

-- 1. Add biometric fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS face_embedding JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS face_registered_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Create storage bucket for face avatars if not existing
INSERT INTO storage.buckets (id, name, public)
VALUES ('face-avatars', 'face-avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Storage access policies for face avatars
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Public face avatars are viewable'
    ) THEN
        CREATE POLICY "Public face avatars are viewable"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'face-avatars');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Authenticated users can upload face avatars'
    ) THEN
        CREATE POLICY "Authenticated users can upload face avatars"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'face-avatars');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can update their own face avatars'
    ) THEN
        CREATE POLICY "Users can update their own face avatars"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (bucket_id = 'face-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
    END IF;
END $$;

