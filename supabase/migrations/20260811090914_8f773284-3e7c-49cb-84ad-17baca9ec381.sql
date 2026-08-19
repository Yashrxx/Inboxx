-- 1. kb_images: enable RLS + workspace-scoped policies
ALTER TABLE public.kb_images ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kb_images FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kb_images TO authenticated;
GRANT ALL ON public.kb_images TO service_role;

DROP POLICY IF EXISTS "workspace owners manage kb_images" ON public.kb_images;
CREATE POLICY "workspace owners manage kb_images"
ON public.kb_images FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = kb_images.workspace_id AND w.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = kb_images.workspace_id AND w.user_id = auth.uid()));

-- 2. kb_documents: replace permissive `true` policies with workspace ownership
DROP POLICY IF EXISTS "authenticated can read kb_documents" ON public.kb_documents;
DROP POLICY IF EXISTS "authenticated can insert kb_documents" ON public.kb_documents;
DROP POLICY IF EXISTS "authenticated can delete kb_documents" ON public.kb_documents;
REVOKE ALL ON public.kb_documents FROM anon;

CREATE POLICY "workspace owners manage kb_documents"
ON public.kb_documents FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = kb_documents.workspace_id AND w.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = kb_documents.workspace_id AND w.user_id = auth.uid()));

-- 3. kb_chunks: restrict to chunks of documents in the caller's workspace
DROP POLICY IF EXISTS "authenticated can read kb_chunks" ON public.kb_chunks;
REVOKE ALL ON public.kb_chunks FROM anon;

CREATE POLICY "workspace owners read kb_chunks"
ON public.kb_chunks FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.kb_documents d
  JOIN public.workspaces w ON w.id = d.workspace_id
  WHERE d.id = kb_chunks.document_id AND w.user_id = auth.uid()
));

-- 4. leads: replace permissive `true` policies with workspace ownership
DROP POLICY IF EXISTS "authenticated can read leads" ON public.leads;
DROP POLICY IF EXISTS "authenticated can insert leads" ON public.leads;
DROP POLICY IF EXISTS "authenticated can update leads" ON public.leads;
DROP POLICY IF EXISTS "authenticated can delete leads" ON public.leads;
REVOKE ALL ON public.leads FROM anon;

CREATE POLICY "workspace owners manage leads"
ON public.leads FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = leads.workspace_id AND w.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = leads.workspace_id AND w.user_id = auth.uid()));

-- 5. integrations: OAuth tokens must never be reachable from a browser client
DROP POLICY IF EXISTS "users read own integrations" ON public.integrations;
DROP POLICY IF EXISTS "users insert own integrations" ON public.integrations;
DROP POLICY IF EXISTS "users update own integrations" ON public.integrations;
DROP POLICY IF EXISTS "users delete own integrations" ON public.integrations;
REVOKE ALL ON public.integrations FROM anon, authenticated;
GRANT ALL ON public.integrations TO service_role;
-- RLS stays enabled with zero policies: server (service role) only.

-- 6. Harden mutable search_path on trigger helper
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
begin
  new.updated_at = now();
  return new;
end $$;