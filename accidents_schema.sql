-- ========================================================
-- RescueLink Accidents Schema & Row Level Security (RLS)
-- (Updated with Volunteer Live Tracking Columns)
-- ========================================================

-- 1. Add `volunteer_id`, `volunteer_latitude`, `volunteer_longitude`, `hospital_*`, and `blood_group` columns to public.accidents
ALTER TABLE public.accidents 
  ADD COLUMN IF NOT EXISTS volunteer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS volunteer_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS volunteer_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS hospital_name TEXT,
  ADD COLUMN IF NOT EXISTS hospital_address TEXT,
  ADD COLUMN IF NOT EXISTS hospital_phone TEXT,
  ADD COLUMN IF NOT EXISTS hospital_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS hospital_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS blood_group TEXT;

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
  blood_group TEXT,
  status TEXT NOT NULL DEFAULT 'Reported',
  volunteer_latitude DOUBLE PRECISION,
  volunteer_longitude DOUBLE PRECISION,
  hospital_name TEXT,
  hospital_address TEXT,
  hospital_phone TEXT,
  hospital_latitude DOUBLE PRECISION,
  hospital_longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.accidents ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Allow authenticated users to view:
--    a) Their own reports (as citizen/reporter)
--    b) Their assigned missions (as volunteer)
--    c) ALL active (non-completed) accidents so volunteer dashboards see every new SOS
-- BUG FIX: Previous policy used status = 'Reported' which blocked 'SOS Sent' and all other
-- active statuses from appearing on volunteer dashboards. The status column stores 'SOS Sent',
-- 'Volunteer Assigned', 'Volunteer En Route', etc — not just 'Reported'.
DROP POLICY IF EXISTS "Users can view own accident reports" ON public.accidents;
DROP POLICY IF EXISTS "Users and Volunteers can view accident reports" ON public.accidents;

CREATE POLICY "Users and Volunteers can view accident reports"
  ON public.accidents
  FOR SELECT
  USING (
    auth.uid() = reporter_id
    OR auth.uid() = volunteer_id
    OR status NOT IN (
      'Emergency Completed',
      'Emergency Resolved',
      'Completed',
      'Problem Resolved',
      'Resolved'
    )
  );

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
  USING (
    auth.uid() = reporter_id
    OR auth.uid() = volunteer_id
    OR status NOT IN (
      'Emergency Completed',
      'Emergency Resolved',
      'Completed',
      'Problem Resolved',
      'Resolved'
    )
  );

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

-- 8. Enable Supabase Realtime for public.accidents table
ALTER TABLE public.accidents REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'accidents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.accidents;
  END IF;
END $$;

