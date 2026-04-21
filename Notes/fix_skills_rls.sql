-- Fix skills RLS: allow all authenticated users to insert
-- The previous policy only allowed TPO, but students need to add skills too
DROP POLICY IF EXISTS "skills_add" ON public.skills;
DROP POLICY IF EXISTS "skills_insert" ON public.skills;

CREATE POLICY "skills_insert_all"
  ON public.skills FOR INSERT
  TO authenticated
  WITH CHECK (true);
