-- Add device count columns to avoid expensive JSONB queries
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS device_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_device_count INTEGER DEFAULT 0;

-- Backfill existing sessions with calculated counts
UPDATE sessions
SET 
  device_count = jsonb_array_length(devices),
  completed_device_count = (
    SELECT COUNT(*)
    FROM jsonb_array_elements(devices) as d
    WHERE d->>'status' IN ('approved', 'custom_selected', 'rejected')
  )
WHERE device_count = 0;

-- Recreate the view to use the new columns instead of calculating on every query
DROP VIEW IF EXISTS session_summaries;

CREATE OR REPLACE VIEW session_summaries AS
SELECT 
  id,
  session_id,
  session_name,
  filename,
  user_id,
  total_rows,
  progress_percentage,
  current_batch,
  total_batches,
  array_length(completed_batches, 1) as completed_batches_count,
  created_at,
  updated_at,
  version,
  device_count,
  completed_device_count
FROM sessions;

-- Add index on device_count for faster queries (optional but helpful)
CREATE INDEX IF NOT EXISTS idx_sessions_device_count ON sessions(device_count);
