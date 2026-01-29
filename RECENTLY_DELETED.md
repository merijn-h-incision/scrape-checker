# Recently Deleted Feature

This app includes a "Recently Deleted" feature that provides a safety net for accidentally deleted sessions.

## How It Works

### Soft Delete
When a session is deleted:
- It's **not permanently removed** from the database
- Instead, it's marked with a `deleted_at` timestamp
- The session is moved to "Recently Deleted" page
- It remains there for **14 days** before permanent deletion

### Automatic Cleanup
Sessions in Recently Deleted are automatically removed after 14 days using the database cleanup function.

## User Interface

### Home Page
- Added "Recently Deleted" button in the header
- Delete confirmation mentions the 14-day retention period

### Recently Deleted Page (`/deleted`)
- Lists all soft-deleted sessions
- Shows days remaining until permanent deletion
- Color-coded warnings (red for ≤3 days, yellow for ≤7 days)
- One-click restore functionality

## API Endpoints

### List Deleted Sessions
```
GET /api/sessions/deleted
```
Returns all sessions with `deleted_at IS NOT NULL`

### Restore Session
```
PATCH /api/sessions/[sessionId]
Body: { "action": "restore" }
```
Clears the `deleted_at` timestamp, making the session active again

### Delete Session (Soft Delete)
```
DELETE /api/sessions/[sessionId]
```
Sets `deleted_at = NOW()` instead of permanently removing the record

## Database Schema Changes

### Sessions Table
Added column:
- `deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL`

### Indexes
- `idx_sessions_deleted_at` - For efficiently querying deleted sessions
- `idx_sessions_active` - For efficiently querying active (non-deleted) sessions

### Views
- `session_summaries` - Updated to exclude deleted sessions
- `deleted_sessions` - New view for Recently Deleted page with calculated `days_remaining`

### Functions
- `cleanup_old_deleted_sessions()` - Permanently removes sessions older than 14 days

## Maintenance

### Manual Cleanup
Run the cleanup script manually:
```bash
pnpm cleanup:deleted
```

### Automated Cleanup (Recommended)
Set up a daily cron job or scheduled task:

**Using Vercel Cron:**
Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/cleanup-deleted",
    "schedule": "0 2 * * *"
  }]
}
```

**Using System Cron:**
```bash
0 2 * * * cd /path/to/app && pnpm cleanup:deleted
```

## Benefits

1. **Accident Prevention**: Users can recover from accidental deletions
2. **Peace of Mind**: 14-day grace period provides ample recovery time
3. **Automatic Cleanup**: Old sessions are removed automatically
4. **No Storage Bloat**: Blob files remain unchanged (already handled separately)
5. **Audit Trail**: Activity log records deletions and restorations

## Recovery Success Story

This feature was implemented after successfully recovering a user's accidentally deleted session containing 1,460 devices with 26.51% completion (387 devices checked). The session data was preserved in Blob storage, allowing for complete recovery.

## Implementation Notes

- Blob storage files are **not** deleted when sessions are soft-deleted
- This allows complete restoration including all device images
- Permanent deletion (after 14 days) only removes database records
- Orphaned blobs can be cleaned up separately if needed

## Migration

The soft-delete feature was added via migration script:
- `scripts/add-soft-delete.sql` - SQL migration
- Run with: `npx tsx scripts/apply-soft-delete-migration.ts`

All existing sessions remain unaffected (deleted_at = NULL).
