ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.answer_logs ADD COLUMN IF NOT EXISTS source text;
CREATE INDEX IF NOT EXISTS leads_source_idx ON public.leads (source);
CREATE INDEX IF NOT EXISTS answer_logs_source_idx ON public.answer_logs (source);