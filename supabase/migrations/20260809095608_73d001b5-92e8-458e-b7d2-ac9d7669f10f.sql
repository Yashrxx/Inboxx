ALTER TABLE public.alert_rules
  ADD COLUMN IF NOT EXISTS notify_on_missing_keyword boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS topic_keywords text[] NOT NULL DEFAULT ARRAY[]::text[];

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS gmail_watch_expiration bigint,
  ADD COLUMN IF NOT EXISTS gmail_history_id text,
  ADD COLUMN IF NOT EXISTS gmail_email_address text;

CREATE INDEX IF NOT EXISTS workspaces_gmail_email_address_idx ON public.workspaces (gmail_email_address);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS telegram_chat_id text;