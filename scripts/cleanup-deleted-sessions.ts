#!/usr/bin/env tsx
/**
 * Cleanup script for permanently deleting sessions that have been soft-deleted for 14+ days
 * This should be run periodically (e.g., daily via cron)
 */

import { cleanupOldDeletedSessions } from '@/lib/db';

async function main() {
  console.log('🧹 Starting cleanup of old deleted sessions...\n');
  console.log('   Removing sessions deleted more than 14 days ago...\n');

  try {
    const deletedCount = await cleanupOldDeletedSessions();

    if (deletedCount > 0) {
      console.log(`✅ Successfully removed ${deletedCount} old session(s)`);
    } else {
      console.log('✅ No old sessions to clean up');
    }
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

main()
  .then(() => {
    console.log('\n✅ Cleanup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
