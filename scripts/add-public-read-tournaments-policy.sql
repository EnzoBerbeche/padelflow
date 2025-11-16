-- Allow all authenticated users to read all tournaments
-- This policy allows any authenticated user to see tournaments for searching and browsing
-- Run this in your Supabase SQL editor

-- Drop the policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can read all tournaments" ON public.tournaments;

-- Create the policy to allow authenticated users to read all tournaments
CREATE POLICY "Authenticated users can read all tournaments"
ON public.tournaments
FOR SELECT
TO authenticated
USING (true);

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
AND policyname = 'Authenticated users can read all tournaments';

