import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listDeletedSessions } from '@/lib/db';

/**
 * GET - List deleted sessions (for "Recently Deleted" page)
 */
export async function GET(request: Request) {
  try {
    // Get authenticated user
    const session = await auth();
    const userId = session?.user?.email;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // List ALL deleted sessions (collaborative mode)
    const deletedSessions = await listDeletedSessions(
      undefined, // No user filter - show all deleted sessions
      limit
    );

    console.log(`[API] Listed ${deletedSessions.length} deleted sessions`);

    return NextResponse.json({
      success: true,
      sessions: deletedSessions,
      total: deletedSessions.length,
      userId: userId || null,
    });
  } catch (error) {
    console.error('[API] Error listing deleted sessions:', error);
    return NextResponse.json(
      {
        error: 'LIST_FAILED',
        message: 'Failed to list deleted sessions',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
