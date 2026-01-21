#!/usr/bin/env tsx
/**
 * Migration script to move existing session devices from Postgres JSONB to Blob storage
 * 
 * This script:
 * 1. Finds all sessions with devices in JSONB but no blob_url
 * 2. Uploads their devices array to Blob storage
 * 3. Updates the blob_url in the database
 * 4. Optionally nulls out the JSONB devices column to save storage
 * 
 * Usage:
 *   pnpm tsx scripts/migrate-existing-sessions-to-blob.ts
 */

import { sql } from '@vercel/postgres';
import { put } from '@vercel/blob';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

interface SessionRow {
  session_id: string;
  devices: any;
}

async function migrateSession(session: SessionRow): Promise<void> {
  console.log(`\nMigrating session: ${session.session_id}`);
  
  try {
    // Parse devices from JSONB
    const devices = Array.isArray(session.devices) 
      ? session.devices 
      : JSON.parse(session.devices);
    
    console.log(`  - Found ${devices.length} devices in JSONB`);
    
    // Get Blob token from env
    const blobToken = process.env.SCRAPE_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      throw new Error('SCRAPE_BLOB_READ_WRITE_TOKEN environment variable not found');
    }
    
    // Upload to Blob
    const devicesJson = JSON.stringify(devices);
    const blob = await put(
      `sessions/${session.session_id}/devices.json`,
      devicesJson,
      {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        token: blobToken,
      }
    );
    
    console.log(`  - Uploaded to Blob: ${blob.url}`);
    
    // Update database with blob_url
    await sql`
      UPDATE sessions
      SET blob_url = ${blob.url}
      WHERE session_id = ${session.session_id}
    `;
    
    console.log(`  - Updated database with blob_url`);
    console.log(`  ✓ Migration complete`);
    
  } catch (error) {
    console.error(`  ✗ Error migrating session ${session.session_id}:`, error);
    throw error;
  }
}

async function main() {
  console.log('===================================================');
  console.log('  Migrating Sessions from JSONB to Blob Storage');
  console.log('===================================================\n');
  
  // Find all sessions with devices but no blob_url
  const result = await sql<SessionRow>`
    SELECT session_id, devices
    FROM sessions
    WHERE devices IS NOT NULL
      AND blob_url IS NULL
    ORDER BY created_at DESC
  `;
  
  const sessions = result.rows;
  console.log(`Found ${sessions.length} sessions to migrate\n`);
  
  if (sessions.length === 0) {
    console.log('No sessions to migrate. Exiting.');
    return;
  }
  
  // Migrate each session
  let successCount = 0;
  let errorCount = 0;
  
  for (const session of sessions) {
    try {
      await migrateSession(session);
      successCount++;
    } catch (error) {
      errorCount++;
      console.error(`Failed to migrate session ${session.session_id}`);
    }
  }
  
  console.log('\n===================================================');
  console.log('  Migration Complete');
  console.log('===================================================');
  console.log(`  ✓ Successfully migrated: ${successCount}`);
  console.log(`  ✗ Failed: ${errorCount}`);
  console.log(`  Total: ${sessions.length}`);
  console.log('===================================================\n');
  
  // Optional: Null out JSONB devices to save storage
  if (successCount > 0) {
    console.log('\n💡 Optional: Null out JSONB devices column to save storage?');
    console.log('   Run this SQL in Neon console:');
    console.log('\n   UPDATE sessions');
    console.log('   SET devices = NULL');
    console.log('   WHERE blob_url IS NOT NULL;\n');
  }
}

// Run the migration
main()
  .then(() => {
    console.log('Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
