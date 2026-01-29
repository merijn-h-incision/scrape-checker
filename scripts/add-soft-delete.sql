-- Add soft delete support to sessions table
-- This allows sessions to be "deleted" but kept for 14 days before permanent removal

-- Add deleted_at column
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for efficient queries on deleted sessions
CREATE INDEX IF NOT EXISTS idx_sessions_deleted_at ON sessions(deleted_at) WHERE deleted_at IS NOT NULL;

-- Add index for active (non-deleted) sessions
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(updated_at DESC) WHERE deleted_at IS NULL;

-- Update the session_summaries view to exclude deleted sessions by default
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
  completed_device_count,
  deleted_at
FROM sessions
WHERE deleted_at IS NULL;

-- Create view for deleted sessions (for "Recently Deleted" page)
CREATE OR REPLACE VIEW deleted_sessions AS
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
  completed_device_count,
  deleted_at,
  -- Calculate days until permanent deletion (14 days retention)
  14 - EXTRACT(DAY FROM (NOW() - deleted_at))::INTEGER as days_remaining
FROM sessions
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC;

-- Function to permanently delete old sessions (14+ days)
CREATE OR REPLACE FUNCTION cleanup_old_deleted_sessions()
RETURNS TABLE(deleted_count INTEGER) AS $$
DECLARE
  count INTEGER;
BEGIN
  DELETE FROM sessions
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '14 days';
  
  GET DIAGNOSTICS count = ROW_COUNT;
  RETURN QUERY SELECT count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_deleted_sessions() IS 'Permanently removes sessions that have been soft-deleted for more than 14 days';
