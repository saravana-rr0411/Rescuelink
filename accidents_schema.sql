-- ========================================================
-- RescueLink Accidents Schema & Row Level Security (RLS)
-- (Updated for Volunteer Assignment & Column Definition)
-- ========================================================

-- 1. Add `volunteer_id` column to public.accidents
ALTER TABLE public.accidents 
  ADD COLUMN IF NOT EXISTS volunteer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Create the `accidents` table if not exists
CREATE TABLE IF NOT EXISTS public.accidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  volunteer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT NOT NULL,
  photo_url TEXT,
  severity TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Reported',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.accidents ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Allow users to view their own reports OR volunteers/users to view active 'Reported' accidents
DROP POLICY IF EXISTS "Users can view own accident reports" ON public.accidents;
DROP POLICY IF EXISTS "Users and Volunteers can view accident reports" ON public.accidents;

CREATE POLICY "Users and Volunteers can view accident reports"
  ON public.accidents
  FOR SELECT
  USING (auth.uid() = reporter_id OR status = 'Reported' OR auth.uid() = volunteer_id);

-- 5. Policy: Allow users to create their own accident reports
DROP POLICY IF EXISTS "Users can create own accident reports" ON public.accidents;
CREATE POLICY "Users can create own accident reports"
  ON public.accidents
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- 6. Policy: Allow users and volunteers to update accident reports
DROP POLICY IF EXISTS "Users can update own accident reports" ON public.accidents;
DROP POLICY IF EXISTS "Users and Volunteers can update accident reports" ON public.accidents;

CREATE POLICY "Users and Volunteers can update accident reports"
  ON public.accidents
  FOR UPDATE
  USING (auth.uid() = reporter_id OR status = 'Reported' OR auth.uid() = volunteer_id);

-- 7. Trigger for automatic `updated_at` timestamps
CREATE OR REPLACE FUNCTION public.update_accidents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_accidents_updated_at ON public.accidents;
CREATE TRIGGER trigger_accidents_updated_at
  BEFORE UPDATE ON public.accidents
  FOR EACH ROW EXECUTE FUNCTION public.update_accidents_updated_at();
