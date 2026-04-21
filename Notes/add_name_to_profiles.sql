-- Add full_name column to profiles table if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;

-- (Optional) If you want to allow everyone to update their own name:
-- This should already be covered by the existing "profiles_update_self" policy.
