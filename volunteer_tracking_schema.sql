-- ========================================================
-- RescueLink Live Volunteer Tracking - Phase 1 (Database)
-- ========================================================

-- Add nullable columns for volunteer live GPS coordinates to public.accidents
ALTER TABLE public.accidents 
  ADD COLUMN IF NOT EXISTS volunteer_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS volunteer_longitude DOUBLE PRECISION;
