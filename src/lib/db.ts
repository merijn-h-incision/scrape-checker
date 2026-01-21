import { sql } from '@vercel/postgres';
import type { CheckingSession } from '@/types/device';

/**
 * Database utility functions for session management
 * Implements optimistic locking to prevent concurrent edit conflicts
 */

export interface SessionRow {
  id: string;
  session_id: string;
  session_name: string;
  filename: string;
  user_id: string | null;
  total_rows: number;
  progress_percentage: number;
  current_batch: number;
  total_batches: number;
  completed_batches: number[];
  created_at: string;
  updated_at: string;
  version: number;
  devices: unknown; // JSONB
  locked_by: string | null;
  locked_at: string | null;
  device_count: number;
  completed_device_count: number;
}

export interface SessionSummary {
  session_id: string;
  session_name: string;
  filename: string;
  total_rows: number;
  progress_percentage: number;
  created_at: string;
  updated_at: string;
  last_updated: string; // Alias for updated_at
  device_count: number;
  completed_device_count: number;
}

export class OptimisticLockError extends Error {
  constructor(
    message: string,
    public currentVersion: number,
    public attemptedVersion: number
  ) {
    super(message);
    this.name = 'OptimisticLockError';
  }
}

export class SessionLockedError extends Error {
  constructor(
    message: string,
    public lockedBy: string,
    public lockedAt: string
  ) {
    super(message);
    this.name = 'SessionLockedError';
  }
}

/**
 * Create a new session in the database
 */
export async function createSession(
  session: CheckingSession,
  userId?: string
): Promise<SessionRow> {
  const completedBatches = session.completed_batches || [];
  const completedBatchesArray = completedBatches.length > 0 
    ? `{${completedBatches.join(',')}}` 
    : '{}';

  // Calculate device counts to avoid expensive JSONB queries later
  const deviceCount = session.devices.length;
  const completedDeviceCount = session.devices.filter(d => 
    d.status === 'approved' || d.status === 'custom_selected' || d.status === 'rejected'
  ).length;

  const result = await sql<SessionRow>`
    INSERT INTO sessions (
      session_id,
      session_name,
      filename,
      user_id,
      total_rows,
      progress_percentage,
      current_batch,
      total_batches,
      completed_batches,
      devices,
      version,
      device_count,
      completed_device_count
    ) VALUES (
      ${session.session_id},
      ${session.session_name},
      ${session.filename},
      ${userId || null},
      ${session.total_rows},
      ${session.progress_percentage},
      ${session.current_batch || 1},
      ${session.total_batches},
      ${completedBatchesArray}::integer[],
      ${JSON.stringify(session.devices)}::jsonb,
      1,
      ${deviceCount},
      ${completedDeviceCount}
    )
    RETURNING *
  `;

  if (result.rows.length === 0) {
    throw new Error('Failed to create session');
  }

  return result.rows[0];
}

/**
 * Get a session by ID
 */
export async function getSession(sessionId: string): Promise<CheckingSession | null> {
  const result = await sql<SessionRow>`
    SELECT * FROM sessions
    WHERE session_id = ${sessionId}
    LIMIT 1
  `;

  if (result.rows.length === 0) {
    return null;
  }

  return rowToSession(result.rows[0]);
}

/**
 * Try to lock a session for editing
 * Throws SessionLockedError if already locked by another user (within 5 minutes)
 */
export async function lockSession(
  sessionId: string,
  userId: string
): Promise<boolean> {
  // Check if session is locked by someone else (within last 5 minutes)
  const checkResult = await sql<SessionRow>`
    SELECT locked_by, locked_at FROM sessions
    WHERE session_id = ${sessionId}
    AND locked_by IS NOT NULL
    AND locked_by != ${userId}
    AND locked_at > NOW() - INTERVAL '5 minutes'
    LIMIT 1
  `;

  if (checkResult.rows.length > 0) {
    const lock = checkResult.rows[0];
    throw new SessionLockedError(
      `This session is currently being edited by another user. Please try again later or contact them to coordinate.`,
      lock.locked_by!,
      lock.locked_at!
    );
  }

  // Lock the session (or refresh the lock if already ours)
  await sql`
    UPDATE sessions
    SET 
      locked_by = ${userId},
      locked_at = NOW()
    WHERE session_id = ${sessionId}
  `;

  return true;
}

/**
 * Unlock a session when user is done
 */
export async function unlockSession(
  sessionId: string,
  userId: string
): Promise<void> {
  await sql`
    UPDATE sessions
    SET 
      locked_by = NULL,
      locked_at = NULL
    WHERE session_id = ${sessionId}
    AND locked_by = ${userId}
  `;
}

/**
 * Refresh session lock (keep-alive)
 * Call this periodically (every minute) to maintain the lock
 */
export async function refreshSessionLock(
  sessionId: string,
  userId: string
): Promise<void> {
  await sql`
    UPDATE sessions
    SET locked_at = NOW()
    WHERE session_id = ${sessionId}
    AND locked_by = ${userId}
  `;
}

/**
 * Update a session with optimistic locking
 * Throws OptimisticLockError if version mismatch detected
 */
export async function updateSession(
  session: CheckingSession,
  expectedVersion: number
): Promise<SessionRow> {
  const completedBatches = session.completed_batches || [];
  const completedBatchesArray = completedBatches.length > 0 
    ? `{${completedBatches.join(',')}}` 
    : '{}';

  // Calculate device counts to avoid expensive JSONB queries later
  const deviceCount = session.devices.length;
  const completedDeviceCount = session.devices.filter(d => 
    d.status === 'approved' || d.status === 'custom_selected' || d.status === 'rejected'
  ).length;

  const result = await sql<SessionRow>`
    UPDATE sessions
    SET
      session_name = ${session.session_name},
      progress_percentage = ${session.progress_percentage},
      current_batch = ${session.current_batch || 1},
      completed_batches = ${completedBatchesArray}::integer[],
      devices = ${JSON.stringify(session.devices)}::jsonb,
      device_count = ${deviceCount},
      completed_device_count = ${completedDeviceCount},
      version = version + 1
    WHERE session_id = ${session.session_id}
      AND version = ${expectedVersion}
    RETURNING *
  `;

  if (result.rows.length === 0) {
    // Check if session exists
    const existing = await sql<{ version: number }>`
      SELECT version FROM sessions WHERE session_id = ${session.session_id}
    `;

    if (existing.rows.length === 0) {
      throw new Error('Session not found');
    }

    // Version mismatch - concurrent update detected
    throw new OptimisticLockError(
      'Session was modified by another user. Please refresh and try again.',
      existing.rows[0].version,
      expectedVersion
    );
  }

  return result.rows[0];
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await sql`
    DELETE FROM sessions
    WHERE session_id = ${sessionId}
  `;
}

/**
 * List sessions, optionally filtered by user
 */
export async function listSessions(
  userId?: string,
  limit: number = 100,
  offset: number = 0
): Promise<SessionSummary[]> {
  let result;

  if (userId) {
    result = await sql<SessionSummary>`
      SELECT *, updated_at as last_updated FROM session_summaries
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
  } else {
    result = await sql<SessionSummary>`
      SELECT *, updated_at as last_updated FROM session_summaries
      ORDER BY updated_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
  }

  return result.rows;
}

/**
 * Log session activity for audit trail
 */
export async function logSessionActivity(
  sessionId: string,
  action: 'created' | 'updated' | 'deleted' | 'conflict',
  userId?: string,
  version?: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  await sql`
    INSERT INTO session_activity_log (
      session_id,
      user_id,
      action,
      version,
      metadata
    ) VALUES (
      ${sessionId},
      ${userId || null},
      ${action},
      ${version || null},
      ${metadata ? JSON.stringify(metadata) : null}
    )
  `;
}

/**
 * Convert database row to CheckingSession
 */
function rowToSession(row: SessionRow): CheckingSession & { _version: number } {
  // Postgres JSONB is already parsed as JavaScript object
  const devices = Array.isArray(row.devices) 
    ? row.devices 
    : typeof row.devices === 'string' 
      ? JSON.parse(row.devices) 
      : [];

  return {
    id: row.id,
    session_id: row.session_id,
    session_name: row.session_name,
    filename: row.filename,
    total_rows: row.total_rows,
    progress_percentage: Number(row.progress_percentage),
    current_batch: row.current_batch,
    total_batches: row.total_batches,
    completed_batches: Array.isArray(row.completed_batches) ? row.completed_batches : [],
    created_at: row.created_at,
    last_updated: row.updated_at,
    devices: devices,
    _version: row.version,
  };
}

/**
 * Initialize database (create tables if they don't exist)
 * This should be called during deployment or first run
 */
export async function initializeDatabase(): Promise<void> {
  // Check if sessions table exists
  const result = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name = 'sessions'
    ) as table_exists
  `;

  if (!result.rows[0].table_exists) {
    throw new Error(
      'Database not initialized. Please run the init-database.sql script first.'
    );
  }
}
