ALTER TABLE public.alert_rules
  ADD COLUMN IF NOT EXISTS tg_show_subject BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tg_show_sender BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tg_show_match_details BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tg_show_scanned_file BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tg_show_detailed_summary BOOLEAN DEFAULT FALSE;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rules') THEN
    ALTER TABLE public.rules
      ADD COLUMN IF NOT EXISTS tg_show_subject BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS tg_show_sender BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS tg_show_match_details BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS tg_show_scanned_file BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS tg_show_detailed_summary BOOLEAN DEFAULT FALSE;
  END IF;
END $$;
