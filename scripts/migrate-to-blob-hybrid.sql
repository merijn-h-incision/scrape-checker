-- Migration: Move device data from JSONB to Blob storage
-- This adds blob_url column and makes devices column optional

-- Add blob_url column to store the Blob URL for device data
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS blob_url TEXT DEFAULT NULL;

-- The devices column will remain but become optional
-- We'll null it out after migrating to save storage
-- For now, keep it for backward compatibility during migration

-- Add index on blob_url for faster lookups
CREATE INDEX IF NOT EXISTS idx_sessions_blob_url ON sessions(blob_url) WHERE blob_url IS NOT NULL;

-- After this migration, the application will:
-- 1. Upload device arrays to Blob storage
-- 2. Store the Blob URL in blob_url column
-- 3. Store only metadata in Postgres (tiny rows)
-- 4. Fetch device data from Blob when needed
