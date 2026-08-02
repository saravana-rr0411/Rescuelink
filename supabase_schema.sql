-- ========================================================
-- Schema Update: Add `avatar_url` to public.profiles
-- ========================================================

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ========================================================
-- Full Table DDL & Trigger Reference
-- ========================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  blood_group TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Citizen',
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  allergies TEXT,
  medical_conditions TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_auth_user_id UNIQUE (auth_user_id)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = auth_user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    auth_user_id,
    full_name,
    phone_number,
    blood_group,
    role,
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relation,
    allergies,
    medical_conditions,
    avatar_url
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'RescueLink User'),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    COALESCE(NEW.raw_user_meta_data->>'blood_group', 'O-'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Citizen'),
    COALESCE(NEW.raw_user_meta_data->>'emergency_contact_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'emergency_contact_phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'emergency_contact_relation', ''),
    COALESCE(NEW.raw_user_meta_data->>'allergies', NULL),
    COALESCE(NEW.raw_user_meta_data->>'medical_conditions', NULL),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
