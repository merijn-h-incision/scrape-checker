# Postgres Storage Setup

This application now uses **Vercel Postgres (Neon)** instead of Vercel Blob for storing session data. This provides better support for multi-user concurrent access and prevents data loss when users work on the same session from multiple devices.

## Why Postgres Instead of Blob?

**Problems with Blob Storage:**
- ❌ Last-write-wins - no conflict detection
- ❌ No proper session loading (GET endpoint was not functional)
- ❌ Cache propagation delays (~60 seconds)
- ❌ Not designed for frequently-updated structured data
- ❌ No way to detect concurrent edits

**Benefits of Postgres:**
- ✅ ACID transactions prevent data loss
- ✅ Row-level locking for concurrent access
- ✅ Optimistic locking detects conflicts
- ✅ Proper relational queries for listing/searching sessions
- ✅ Sub-10ms latency with Neon edge driver
- ✅ Connection pooling & autoscaling

## Setup Instructions

### 1. Create a Vercel Postgres Database

1. Go to your project in the [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to the **Storage** tab
3. Click **Create Database**
4. Select **Postgres** (powered by Neon)
5. Choose a name (e.g., `image-checker-db`)
6. Select a region close to your users
7. Click **Create**

### 2. Connect Database to Your Project

1. Vercel will automatically add environment variables to your project:
   - `POSTGRES_URL`
   - `POSTGRES_URL_NON_POOLING`
   - `POSTGRES_USER`
   - `POSTGRES_HOST`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_DATABASE`

2. For local development, pull the environment variables:
   ```bash
   vercel env pull .env.local
   ```

### 3. Initialize the Database Schema

Run the initialization SQL script to create tables:

**Option A: Using Vercel Dashboard**
1. Go to your database in the Vercel Dashboard
2. Click on the **Query** tab
3. Copy the contents of `scripts/init-database.sql`
4. Paste and execute

**Option B: Using psql (Local)**
```bash
# Set your database URL from .env.local
psql $POSTGRES_URL -f scripts/init-database.sql
```

**Option C: Using Neon Console**
1. Go to the Neon Console (link in Vercel dashboard)
2. Navigate to SQL Editor
3. Paste and run `scripts/init-database.sql`

### 4. Migrate Existing Blob Data (Optional)

If you have existing sessions in Vercel Blob storage, migrate them to Postgres:

```bash
# Dry run first (see what would happen)
pnpm run migrate:dry-run

# Actual migration
pnpm run migrate:blob-to-postgres

# With automatic blob deletion after successful migration
DELETE_BLOB=true pnpm run migrate:blob-to-postgres
```

The migration script will:
- List all sessions from Blob storage
- Fetch each session's data
- Insert into Postgres with version 1
- Optionally delete from Blob after successful migration
- Skip sessions that already exist in Postgres

### 5. Deploy

Deploy your updated application:

```bash
vercel --prod
```

Or commit and push to your git repository if you have automatic deployments enabled.

## Database Schema

### Sessions Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `session_id` | VARCHAR(255) | Unique session identifier |
| `session_name` | VARCHAR(255) | User-friendly session name |
| `filename` | VARCHAR(255) | Original CSV filename |
| `user_id` | VARCHAR(255) | NextAuth user email (nullable) |
| `total_rows` | INTEGER | Total number of devices |
| `progress_percentage` | DECIMAL(5,2) | Completion percentage (0-100) |
| `current_batch` | INTEGER | Current batch number |
| `total_batches` | INTEGER | Total number of batches |
| `completed_batches` | INTEGER[] | Array of completed batch numbers |
| `created_at` | TIMESTAMP | When session was created |
| `updated_at` | TIMESTAMP | Last update time (auto-updated) |
| `version` | INTEGER | Version number for optimistic locking |
| `devices` | JSONB | Array of device objects |

### Session Activity Log Table

Tracks all changes to sessions for audit purposes:

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `session_id` | VARCHAR(255) | Foreign key to sessions |
| `user_id` | VARCHAR(255) | User who performed the action |
| `action` | VARCHAR(50) | Action type (created/updated/deleted/conflict) |
| `version` | INTEGER | Session version at time of action |
| `metadata` | JSONB | Additional context |
| `created_at` | TIMESTAMP | When action occurred |

## Features

### Optimistic Locking

The application uses **optimistic locking** to prevent concurrent edit conflicts:

1. Each session has a `version` number that increments on every save
2. When saving, the client sends the current version number
3. The database only updates if the version matches (no one else has saved)
4. If versions don't match, a conflict error is returned
5. The UI shows a modal allowing the user to refresh and get the latest changes

### Session Loading

Sessions can now be properly loaded by ID:

```typescript
// Load a session from the database
const response = await fetch(`/api/sessions/${sessionId}`);
const { session } = await response.json();
```

### User-Specific Sessions

Sessions can optionally be associated with authenticated users:

```typescript
// List sessions for the current user
const response = await fetch('/api/sessions?user=true');
const { sessions } = await response.json();

// List all sessions (requires admin)
const response = await fetch('/api/sessions?user=false');
```

## API Endpoints

### POST `/api/sessions`
Save or update a session with optimistic locking.

**Request:**
```json
{
  "session_id": "uuid",
  "session_name": "My Session",
  "_version": 5,
  // ... other session fields
}
```

**Success Response (200):**
```json
{
  "success": true,
  "sessionId": "uuid",
  "version": 6,
  "lastSaved": "2025-12-01T10:30:00Z"
}
```

**Conflict Response (409):**
```json
{
  "error": "CONFLICT",
  "message": "Session was modified by another user",
  "currentVersion": 7,
  "attemptedVersion": 5
}
```

### GET `/api/sessions`
List all sessions (optionally filtered by user).

**Query Parameters:**
- `user` (default: `true`) - Filter by authenticated user
- `limit` (default: `100`) - Max results to return
- `offset` (default: `0`) - Pagination offset

**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "session_id": "uuid",
      "session_name": "My Session",
      "filename": "devices.csv",
      "total_rows": 100,
      "progress_percentage": 45.5,
      "created_at": "2025-12-01T10:00:00Z",
      "updated_at": "2025-12-01T10:30:00Z",
      "device_count": 100,
      "completed_device_count": 45
    }
  ],
  "total": 1
}
```

### GET `/api/sessions/[sessionId]`
Load a specific session by ID.

**Response:**
```json
{
  "success": true,
  "session": {
    "session_id": "uuid",
    "session_name": "My Session",
    "_version": 5,
    "devices": [...],
    // ... all session fields
  }
}
```

### DELETE `/api/sessions/[sessionId]`
Delete a session.

**Response:**
```json
{
  "success": true,
  "message": "Session deleted successfully"
}
```

## Conflict Resolution

When two users (or the same user on different devices) try to save the same session:

1. The first save succeeds and increments the version
2. The second save detects the version mismatch
3. A **Conflict Resolution Modal** appears showing:
   - Your version vs current version
   - Option to refresh and get latest changes
   - Warning about potential data loss

**Best Practices:**
- Don't work on the same session from multiple devices simultaneously
- Use the auto-save feature (saves every 60 seconds)
- Watch for the conflict modal and refresh when prompted
- Consider using different sessions for different users

## Monitoring

### Activity Log

All session changes are logged in the `session_activity_log` table:

```sql
-- View recent activity
SELECT * FROM session_activity_log 
ORDER BY created_at DESC 
LIMIT 100;

-- View conflicts
SELECT * FROM session_activity_log 
WHERE action = 'conflict'
ORDER BY created_at DESC;

-- View activity for a specific session
SELECT * FROM session_activity_log 
WHERE session_id = 'your-session-id'
ORDER BY created_at DESC;
```

### Performance

- Most queries complete in **<10ms** thanks to Neon's edge-optimized driver
- Indexes on frequently queried columns (session_id, user_id, updated_at)
- JSONB GIN index for fast device array queries
- Automatic connection pooling and scaling

## Troubleshooting

### "Failed to connect to database"
- Verify environment variables are set correctly
- Check that Postgres instance is running in Vercel dashboard
- Ensure you're using the correct connection string

### "Session not found" when loading
- Session may not have been migrated from Blob storage
- Run the migration script
- Check database directly using SQL query

### Conflicts happening frequently
- Multiple users or devices accessing same session
- Consider creating separate sessions for each user
- Use refresh button in conflict modal to sync

### Migration script fails
- Check that `SCRAPE_BLOB_READ_WRITE_TOKEN` is set
- Verify database connection is working
- Run with `DRY_RUN=true` first to test

## Cleanup (After Migration)

Once you've confirmed all sessions are migrated and working:

1. Remove Blob storage dependency:
   ```bash
   pnpm remove @vercel/blob
   ```

2. Delete blob data (if migration was successful):
   ```bash
   DELETE_BLOB=true pnpm run migrate:blob-to-postgres
   ```

3. Remove `SCRAPE_BLOB_READ_WRITE_TOKEN` from environment variables

4. Update Vercel project to remove Blob storage integration (optional)

## Support

For issues or questions:
- Check the [Vercel Postgres documentation](https://vercel.com/docs/storage/vercel-postgres)
- Check the [Neon documentation](https://neon.tech/docs/introduction)
- Review the session activity log for debugging conflicts
