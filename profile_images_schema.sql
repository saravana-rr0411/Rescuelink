-- ========================================================
-- RescueLink Profile Picture Schema & Storage Bucket Setup
-- ========================================================

-- 1. Add `avatar_url` column to public.profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Create public storage bucket `profile-images` idempotently
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images', 
  'profile-images', 
  true, 
  5242880, -- 5 MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Drop existing storage policies if present to ensure idempotency
DROP POLICY IF EXISTS "Public Read Access for profile-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Upload Access for profile-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Update Access for profile-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Delete Access for profile-images" ON storage.objects;

-- 4. Policy: SELECT (Public Read Access to profile avatars)
CREATE POLICY "Public Read Access for profile-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-images');

-- 5. Policy: INSERT (Authenticated Users can upload their profile picture)
CREATE POLICY "Authenticated Users Upload Access for profile-images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-images' 
    AND auth.role() = 'authenticated'
  );

-- 6. Policy: UPDATE (Authenticated Users can update their profile picture)
CREATE POLICY "Authenticated Users Update Access for profile-images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-images' 
    AND auth.role() = 'authenticated'
  );

-- 7. Policy: DELETE (Authenticated Users can delete their profile picture)
CREATE POLICY "Authenticated Users Delete Access for profile-images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-images' 
    AND auth.role() = 'authenticated'
  );
