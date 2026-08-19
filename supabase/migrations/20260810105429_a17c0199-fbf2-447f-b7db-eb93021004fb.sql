ALTER TABLE public.alert_logs
  ADD COLUMN IF NOT EXISTS gmail_message_id TEXT;

CREATE INDEX IF NOT EXISTS idx_alert_logs_dedup
  ON public.alert_logs (workspace_id, gmail_message_id, rule_id);