-- ============================================
-- FIX REMAINING RLS ISSUES
-- Problem: profiles table has pre-existing policies
-- causing infinite recursion
-- ============================================

-- 1. List and drop ALL policies on profiles
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
-- Drop any pre-existing policies (common Supabase defaults)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;
DROP POLICY IF EXISTS "enable_all_access" ON public.profiles;
DROP POLICY IF EXISTS "allow_all" ON public.profiles;

-- Drop ALL policies on student_skills too
DROP POLICY IF EXISTS "student_skills_select" ON public.student_skills;
DROP POLICY IF EXISTS "student_skills_insert" ON public.student_skills;
DROP POLICY IF EXISTS "student_skills_delete" ON public.student_skills;

-- Drop ALL policies on skills
DROP POLICY IF EXISTS "skills_select" ON public.skills;
DROP POLICY IF EXISTS "skills_insert" ON public.skills;

-- 2. Disable then re-enable RLS to clear any stuck state
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.student_skills DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_skills ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.skills DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

-- 3. Recreate SIMPLE profiles policies (no self-reference)
CREATE POLICY "profiles_read_all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_update_self"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 4. Recreate student_skills policies
CREATE POLICY "student_skills_read"
  ON public.student_skills FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "student_skills_add"
  ON public.student_skills FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "student_skills_remove"
  ON public.student_skills FOR DELETE
  TO authenticated
  USING (student_id = auth.uid());

-- 5. Recreate skills policies (allow ALL authenticated to read AND insert)
CREATE POLICY "skills_read"
  ON public.skills FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "skills_add"
  ON public.skills FOR INSERT
  TO authenticated
  WITH CHECK (true);
