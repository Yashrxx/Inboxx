-- Drop insecure policies
DROP POLICY IF EXISTS "authenticated can read answer_logs" ON public.answer_logs;
DROP POLICY IF EXISTS "authenticated can update answer_logs" ON public.answer_logs;
DROP POLICY IF EXISTS "authenticated can delete answer_logs" ON public.answer_logs;

-- Recreate policies with workspace ownership check
CREATE POLICY "authenticated can read answer_logs"
  ON public.answer_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = answer_logs.workspace_id
      AND workspaces.user_id = auth.uid()
    )
  );

CREATE POLICY "authenticated can update answer_logs"
  ON public.answer_logs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = answer_logs.workspace_id
      AND workspaces.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = answer_logs.workspace_id
      AND workspaces.user_id = auth.uid()
    )
  );

CREATE POLICY "authenticated can delete answer_logs"
  ON public.answer_logs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = answer_logs.workspace_id
      AND workspaces.user_id = auth.uid()
    )
  );
