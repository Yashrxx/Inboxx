-- Add attachment audit columns to alert_logs for tracking file parse status.
ALTER TABLE public.alert_logs
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_size INTEGER,
  ADD COLUMN IF NOT EXISTS attachment_status TEXT DEFAULT 'PARSED';
-- Valid values: 'PARSED', 'RAW_SCANNED', 'SKIPPED_EXCEEDED_SIZE', 'SKIPPED_UNSUPPORTED_TYPE'
