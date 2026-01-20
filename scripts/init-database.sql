-- Image Checker Database Schema
-- This schema supports multi-user concurrent access with optimistic locking

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sessions table
-- Stores all checking sessions with device data as JSONB
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  session_name VARCHAR(255) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  user_id VARCHAR(255), -- From NextAuth, nullable for backward compatibility
  total_rows INTEGER NOT NULL,
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  current_batch INTEGER DEFAULT 1,
  total_batches INTEGER DEFAULT 1,
  completed_batches INTEGER[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1, -- For optimistic locking to prevent concurrent edit conflicts
  devices JSONB NOT NULL, -- Array of device objects stored as JSON
  
  -- Constraints
  CONSTRAINT session_id_not_empty CHECK (session_id <> ''),
  CONSTRAINT session_name_not_empty CHECK (session_name <> ''),
  CONSTRAINT progress_valid CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  CONSTRAINT version_positive CHECK (version > 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_progress ON sessions(progress_percentage);

-- GIN index for JSONB queries on devices
CREATE INDEX IF NOT EXISTS idx_sessions_devices ON sessions USING GIN (devices);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_sessions_updated_at 
  BEFORE UPDATE ON sessions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Optional: Session activity log table for audit trail
CREATE TABLE IF NOT EXISTS session_activity_log (
  id BIGSERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'conflict'
  version INTEGER,
  metadata JSONB, -- Additional context about the action
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT session_activity_session_id_fk 
    FOREIGN KEY (session_id) 
    REFERENCES sessions(session_id) 
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_activity_log_session_id ON session_activity_log(session_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON session_activity_log(created_at DESC);

-- View for session summaries (useful for listing)
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
  jsonb_array_length(devices) as device_count,
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements(devices) as d
    WHERE d->>'status' IN ('approved', 'custom_selected', 'rejected')
  ) as completed_device_count
FROM sessions;

-- Grant permissions (adjust as needed for your deployment)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
