-- Add session locking fields to track who's actively working on a session
-- This prevents conflicts by allowing only one user at a time

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS locked_by VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Index for finding locked sessions
CREATE INDEX IF NOT EXISTS idx_sessions_locked_by ON sessions(locked_by) WHERE locked_by IS NOT NULL;

-- Comment explaining the columns
COMMENT ON COLUMN sessions.locked_by IS 'Email of user currently editing this session';
COMMENT ON COLUMN sessions.locked_at IS 'Timestamp when session was locked (auto-releases after 5 minutes of inactivity)';
