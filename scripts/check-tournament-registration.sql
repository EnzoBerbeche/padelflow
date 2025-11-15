-- Check tournament registration status
-- Run this in Supabase SQL Editor to debug

-- Check if tournament exists with this registration_id (without checking registration_enabled)
SELECT 
  id,
  name,
  registration_id,
  registration_enabled,
  owner_id
FROM tournaments 
WHERE registration_id = 'dfc2fe4e79a948aa';

-- Check all tournaments with registration enabled
SELECT 
  id,
  name,
  registration_id,
  registration_enabled
FROM tournaments 
WHERE registration_enabled = true
ORDER BY created_at DESC
LIMIT 10;

-- Check if registration_id exists but registration_enabled is false
SELECT 
  id,
  name,
  registration_id,
  registration_enabled
FROM tournaments 
WHERE registration_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

