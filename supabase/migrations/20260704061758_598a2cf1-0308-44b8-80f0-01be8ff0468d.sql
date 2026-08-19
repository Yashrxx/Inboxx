ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source_domain text;
ALTER TABLE public.answer_logs ADD COLUMN IF NOT EXISTS source_domain text;
CREATE INDEX IF NOT EXISTS leads_source_domain_idx ON public.leads (workspace_id, source_domain);
CREATE INDEX IF NOT EXISTS answer_logs_source_domain_idx ON public.answer_logs (workspace_id, source_domain);