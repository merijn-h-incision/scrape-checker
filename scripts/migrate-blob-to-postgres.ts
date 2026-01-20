/**
 * Migration script to move existing sessions from Vercel Blob to Postgres
 * 
 * Usage:
 *   npx tsx scripts/migrate-blob-to-postgres.ts
 * 
 * This script:
 * 1. Lists all sessions from Vercel Blob storage
 * 2. Fetches each session data
 * 3. Inserts it into Postgres with version 1
 * 4. Optionally deletes from Blob after successful migration
 */

import { list, del } from '@vercel/blob';
import { sql } from '@vercel/postgres';

interface BlobSession {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: Date;
}

interface SessionData {
  session_id: string;
  session_name: string;
  filename: string;
  total_rows: number;
  progress_percentage: number;
  current_batch: number;
  total_batches: number;
  completed_batches: number[];
  devices: unknown[];
  created_at: string;
  last_updated: string;
}

async function migrateSession(blobUrl: string, pathname: string): Promise<boolean> {
  try {
    console.log(`\nMigrating: ${pathname}`);
    
    // Fetch session data from blob
    const response = await fetch(blobUrl);
    if (!response.ok) {
      console.error(`  ❌ Failed to fetch blob: ${response.status}`);
      return false;
    }

    const sessionData: SessionData = await response.json();
    console.log(`  📦 Loaded session: ${sessionData.session_id} (${sessionData.devices.length} devices)`);

    // Check if session already exists in Postgres
    const existing = await sql`
      SELECT session_id, version FROM sessions 
      WHERE session_id = ${sessionData.session_id}
    `;

    if (existing.rows.length > 0) {
      console.log(`  ⚠️  Session already exists in database (version ${existing.rows[0].version})`);
      console.log(`  Do you want to overwrite? (This will keep the existing version number)`);
      // For now, skip existing sessions to be safe
      return false;
    }

    // Insert into Postgres
    await sql`
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
        created_at,
        updated_at,
        version
      ) VALUES (
        ${sessionData.session_id},
        ${sessionData.session_name},
        ${sessionData.filename},
        NULL,
        ${sessionData.total_rows},
        ${sessionData.progress_percentage},
        ${sessionData.current_batch || 1},
        ${sessionData.total_batches},
        ${JSON.stringify(sessionData.completed_batches || [])},
        ${JSON.stringify(sessionData.devices)},
        ${sessionData.created_at},
        ${sessionData.last_updated},
        1
      )
    `;

    console.log(`  ✅ Successfully migrated to Postgres`);
    return true;

  } catch (error) {
    console.error(`  ❌ Migration failed:`, error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Blob to Postgres migration...\n');

  const DRY_RUN = process.env.DRY_RUN === 'true';
  const DELETE_AFTER_MIGRATE = process.env.DELETE_BLOB === 'true';

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No actual changes will be made\n');
  }

  if (DELETE_AFTER_MIGRATE) {
    console.log('🗑️  DELETE MODE - Blobs will be deleted after successful migration\n');
  }

  try {
    // List all sessions from blob storage
    console.log('📋 Listing sessions from Vercel Blob...');
    const { blobs } = await list({
      prefix: 'sessions/',
      token: process.env.SCRAPE_BLOB_READ_WRITE_TOKEN,
    });

    console.log(`Found ${blobs.length} sessions in Blob storage\n`);

    if (blobs.length === 0) {
      console.log('No sessions to migrate.');
      return;
    }

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (const blob of blobs) {
      if (DRY_RUN) {
        console.log(`[DRY RUN] Would migrate: ${blob.pathname}`);
        continue;
      }

      const success = await migrateSession(blob.url, blob.pathname);
      
      if (success) {
        successCount++;
        
        // Optionally delete from blob after successful migration
        if (DELETE_AFTER_MIGRATE) {
          try {
            await del(blob.url, {
              token: process.env.SCRAPE_BLOB_READ_WRITE_TOKEN,
            });
            console.log(`  🗑️  Deleted from Blob storage`);
          } catch (error) {
            console.error(`  ⚠️  Failed to delete blob:`, error);
          }
        }
      } else {
        // Check if it was skipped or failed
        const existing = await sql`
          SELECT session_id FROM sessions 
          WHERE session_id LIKE ${blob.pathname.replace('sessions/', '').replace('.json', '') + '%'}
        `;
        
        if (existing.rows.length > 0) {
          skipCount++;
        } else {
          failCount++;
        }
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n' + '='.repeat(50));
    console.log('Migration Summary:');
    console.log('='.repeat(50));
    console.log(`✅ Successfully migrated: ${successCount}`);
    console.log(`⚠️  Skipped (already exists): ${skipCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📊 Total: ${blobs.length}`);
    console.log('='.repeat(50));

    if (DRY_RUN) {
      console.log('\n⚠️  This was a DRY RUN - no changes were made');
      console.log('Run without DRY_RUN=true to perform actual migration');
    }

    if (successCount > 0 && !DELETE_AFTER_MIGRATE) {
      console.log('\n💡 Tip: Run with DELETE_BLOB=true to clean up Blob storage after migration');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
main()
  .then(() => {
    console.log('\n✨ Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
