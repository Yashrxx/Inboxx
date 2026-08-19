ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS system_prompt text,
  ADD COLUMN IF NOT EXISTS welcome_message text;