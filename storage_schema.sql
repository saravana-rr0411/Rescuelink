-- ========================================================
-- RescueLink Supabase Storage Bucket & Security Policies
-- (Idempotent SQL Script - Safe to run multiple times)
-- ========================================================

-- 1. Create the `accident-images` bucket only if it does not already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'accident-images', 
  'accident-images', 
  true, 
  10485760, -- 10 MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies if present to ensure idempotency
DROP POLICY IF EXISTS "Public Read Access for accident-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Upload Access for accident-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Update Access for accident-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Delete Access for accident-images" ON storage.objects;

-- 3. Policy: SELECT (Public Read Access to accident scene photos)
CREATE POLICY "Public Read Access for accident-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'accident-images');

-- 4. Policy: INSERT (Authenticated Users can upload images)
CREATE POLICY "Authenticated Users Upload Access for accident-images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'accident-images' 
    AND auth.role() = 'authenticated'
  );

-- 5. Policy: UPDATE (Authenticated Users can update images)
CREATE POLICY "Authenticated Users Update Access for accident-images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'accident-images' 
    AND auth.role() = 'authenticated'
  );

-- 6. Policy: DELETE (Authenticated Users can delete images)
CREATE POLICY "Authenticated Users Delete Access for accident-images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'accident-images' 
    AND auth.role() = 'authenticated'
  );
