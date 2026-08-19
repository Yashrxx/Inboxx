
-- 1. Add session_id to answer_logs to group chat turns per conversation
ALTER TABLE public.answer_logs
  ADD COLUMN IF NOT EXISTS session_id uuid;
CREATE INDEX IF NOT EXISTS answer_logs_session_id_idx ON public.answer_logs(session_id);

-- 2. Leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid UNIQUE,
  name text,
  contact text,
  channel text NOT NULL DEFAULT 'chat' CHECK (channel IN ('chat','whatsapp','gmail')),
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  category text NOT NULL DEFAULT 'cold' CHECK (category IN ('cold','warm','hot')),
  summary text,
  status text NOT NULL DEFAULT 'bot_handling' CHECK (status IN ('bot_handling','needs_human','handed_over','converted','dead')),
  last_activity timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can read leads" ON public.leads
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated can insert leads" ON public.leads
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated can update leads" ON public.leads
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated can delete leads" ON public.leads
  FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS leads_last_activity_idx ON public.leads(last_activity DESC);
CREATE INDEX IF NOT EXISTS leads_category_idx ON public.leads(category);
CREATE INDEX IF NOT EXISTS leads_status_idx ON public.leads(status);
