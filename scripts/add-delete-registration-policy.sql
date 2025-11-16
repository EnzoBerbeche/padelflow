-- Add RLS policy to allow users to delete their own tournament registrations
-- Run this in your Supabase SQL editor

-- Drop the policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Users can delete their own registrations" ON public.tournament_registrations;

-- Users can delete their own registrations
CREATE POLICY "Users can delete their own registrations"
ON public.tournament_registrations
FOR DELETE
USING (auth.uid() = user_id);

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
WHERE tablename = 'tournament_registrations' 
AND policyname = 'Users can delete their own registrations';

