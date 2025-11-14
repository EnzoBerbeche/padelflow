-- Migration script: Rename 'club' role to 'juge_arbitre'
-- This script updates all users with the 'club' role to 'juge_arbitre'
-- Run this in your Supabase SQL editor

-- Update all users with 'club' role to 'juge_arbitre'
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb), 
  '{role}', 
  '"juge_arbitre"'
)
WHERE raw_user_meta_data->>'role' = 'club';

-- Verify the migration
-- This query shows all users with their roles after migration
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role,
  created_at
FROM auth.users
WHERE raw_user_meta_data->>'role' IN ('juge_arbitre', 'club')
ORDER BY created_at DESC;

