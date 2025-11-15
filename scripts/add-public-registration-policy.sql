-- Add public RLS policy to allow reading tournaments with active registration
-- This allows anyone to view tournament details via registration link
-- Run this in your Supabase SQL editor

-- First, drop the policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Public can read tournaments with active registration" ON public.tournaments;

-- Create the public policy
CREATE POLICY "Public can read tournaments with active registration"
ON public.tournaments
FOR SELECT
USING (
  registration_enabled = true 
  AND registration_id IS NOT NULL
);

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'tournaments' 
AND policyname = 'Public can read tournaments with active registration';

