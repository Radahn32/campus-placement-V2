-- Allow TPO to delete jobs and job_requirements
CREATE POLICY "jobs_delete"
  ON public.jobs FOR DELETE
  TO authenticated
  USING (public.is_tpo());

CREATE POLICY "job_requirements_delete"
  ON public.job_requirements FOR DELETE
  TO authenticated
  USING (public.is_tpo());
