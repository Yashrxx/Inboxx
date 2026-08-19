ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT,
  ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

CREATE TABLE public.alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  scan_sources TEXT[] NOT NULL DEFAULT ARRAY['subject','body']::text[],
  operator TEXT NOT NULL DEFAULT 'contains',
  keywords TEXT[] NOT NULL,
  ai_summarize BOOLEAN NOT NULL DEFAULT false,
  notify_telegram BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alert_rules TO authenticated;
GRANT ALL ON public.alert_rules TO service_role;
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace owners manage alert_rules"
ON public.alert_rules FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = alert_rules.workspace_id AND w.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = alert_rules.workspace_id AND w.user_id = auth.uid()));

CREATE TABLE public.alert_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.alert_rules(id) ON DELETE SET NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email_subject TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  matched_keyword TEXT NOT NULL,
  matched_source TEXT NOT NULL,
  source_filename TEXT,
  extracted_preview TEXT,
  ai_summary TEXT,
  notification_status TEXT NOT NULL DEFAULT 'SENT',
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alert_logs TO authenticated;
GRANT ALL ON public.alert_logs TO service_role;
ALTER TABLE public.alert_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace owners manage alert_logs"
ON public.alert_logs FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = alert_logs.workspace_id AND w.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = alert_logs.workspace_id AND w.user_id = auth.uid()));

CREATE INDEX idx_alert_rules_workspace ON public.alert_rules(workspace_id);
CREATE INDEX idx_alert_logs_workspace_time ON public.alert_logs(workspace_id, triggered_at DESC);