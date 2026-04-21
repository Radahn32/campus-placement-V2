-- ============================================
-- FIX: DROP BAD POLICIES AND RECREATE
-- The previous policies caused infinite recursion
-- because profiles policies referenced profiles itself.
-- ============================================

-- Drop ALL existing policies we created (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Anyone can read jobs" ON public.jobs;
DROP POLICY IF EXISTS "TPO can insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "TPO can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Anyone can read skills" ON public.skills;
DROP POLICY IF EXISTS "TPO can insert skills" ON public.skills;
DROP POLICY IF EXISTS "Anyone can read job_requirements" ON public.job_requirements;
DROP POLICY IF EXISTS "TPO can insert job_requirements" ON public.job_requirements;
DROP POLICY IF EXISTS "Students can read own skills" ON public.student_skills;
DROP POLICY IF EXISTS "TPO can read all student_skills" ON public.student_skills;
DROP POLICY IF EXISTS "Students can insert own skills" ON public.student_skills;
DROP POLICY IF EXISTS "Students can delete own skills" ON public.student_skills;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "TPO can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- ============================================
-- PROFILES: Simple non-recursive policies
-- ============================================
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- ============================================
-- JOBS: Use auth.uid() to check role via a security definer function
-- to avoid recursion
-- ============================================

-- Create a helper function that bypasses RLS
CREATE OR REPLACE FUNCTION public.is_tpo()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'tpo'
  );
$$;

CREATE POLICY "jobs_select"
  ON public.jobs FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "jobs_insert"
  ON public.jobs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_tpo());

CREATE POLICY "jobs_update"
  ON public.jobs FOR UPDATE
  TO authenticated
  USING (public.is_tpo());

-- ============================================
-- SKILLS
-- ============================================
CREATE POLICY "skills_select"
  ON public.skills FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "skills_insert"
  ON public.skills FOR INSERT
  TO authenticated
  WITH CHECK (public.is_tpo());

-- ============================================
-- JOB_REQUIREMENTS
-- ============================================
CREATE POLICY "job_requirements_select"
  ON public.job_requirements FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "job_requirements_insert"
  ON public.job_requirements FOR INSERT
  TO authenticated
  WITH CHECK (public.is_tpo());

-- ============================================
-- STUDENT_SKILLS
-- ============================================
CREATE POLICY "student_skills_select"
  ON public.student_skills FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "student_skills_insert"
  ON public.student_skills FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "student_skills_delete"
  ON public.student_skills FOR DELETE
  TO authenticated
  USING (student_id = auth.uid());
