-- Admin RLS for question_flags
--
-- Previously, question_flags policies only allowed owner access, so admin
-- reads/updates required the service role key. This moves admin authorisation
-- into the database so the API route doesn't have to bypass RLS.
--
-- Defines a SECURITY DEFINER helper (is_admin) that checks profiles.role for
-- the calling user, then adds matching SELECT / UPDATE policies for admins.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

-- Lock down the helper: only authenticated users (and service role) need it.
REVOKE ALL ON FUNCTION public.is_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- Admins can read every flag (for the moderation dashboard).
DROP POLICY IF EXISTS "Admins read all flags" ON question_flags;
CREATE POLICY "Admins read all flags" ON question_flags
  FOR SELECT
  USING (public.is_admin());

-- Admins can update flag status / notes without the service role key.
DROP POLICY IF EXISTS "Admins update flags" ON question_flags;
CREATE POLICY "Admins update flags" ON question_flags
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
