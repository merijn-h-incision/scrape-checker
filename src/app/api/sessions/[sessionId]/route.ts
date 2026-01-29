import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  getSession,
  deleteSession,
  logSessionActivity,
  lockSession,
  unlockSession,
  refreshSessionLock,
  SessionLockedError,
} from '@/lib/db';

/**
 * GET - Load a specific session by ID
 * Attempts to lock the session for the requesting user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = await auth();
    const userId = session?.user?.email || undefined;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get session metadata from database
    const sessionData = await getSession(sessionId);

    if (!sessionData) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Try to lock the session for this user
    if (userId) {
      try {
        await lockSession(sessionId, userId);
        console.log(`[API] Session ${sessionId} locked by ${userId}`);
      } catch (error) {
        if (error instanceof SessionLockedError) {
          console.log(`[API] Session ${sessionId} already locked by ${error.lockedBy}`);
          return NextResponse.json(
            {
              error: 'SESSION_LOCKED',
              message: error.message,
              lockedBy: error.lockedBy,
              lockedAt: error.lockedAt,
            },
            { status: 423 } // 423 Locked
          );
        }
        throw error;
      }
    }

    // Fetch devices from Blob if blob_url exists
    if (sessionData.blob_url) {
      try {
        console.log(`[API] Fetching devices from Blob: ${sessionData.blob_url}`);
        const blobResponse = await fetch(sessionData.blob_url);
        if (!blobResponse.ok) {
          throw new Error(`Failed to fetch devices from Blob: ${blobResponse.status}`);
        }
        const devices = await blobResponse.json();
        sessionData.devices = devices;
        console.log(`[API] Loaded ${devices.length} devices from Blob`);
      } catch (error) {
        console.error('[API] Error fetching devices from Blob:', error);
        // Fall back to empty array if Blob fetch fails
        sessionData.devices = [];
      }
    }
    // else: devices are still in JSONB (old sessions), already loaded by rowToSession

    console.log(`[API] Session ${sessionId} loaded successfully (version ${sessionData._version}, ${sessionData.devices?.length || 0} devices)`);

    // Remove blob_url from response (internal detail)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { blob_url, ...sessionWithoutBlobUrl } = sessionData;

    return NextResponse.json({
      success: true,
      session: sessionWithoutBlobUrl,
    });
  } catch (error) {
    console.error('[API] Error loading session:', error);
    return NextResponse.json(
      {
        error: 'LOAD_FAILED',
        message: 'Failed to load session',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Unlock, refresh session lock, or restore deleted session
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = await auth();
    const userId = session?.user?.email || undefined;
    const body = await request.json();
    const action = body.action; // 'unlock', 'refresh', or 'restore'

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    if (action === 'unlock') {
      if (!userId) {
        return NextResponse.json(
          { error: 'User required for unlock' },
          { status: 400 }
        );
      }
      await unlockSession(sessionId, userId);
      console.log(`[API] Session ${sessionId} unlocked by ${userId}`);
    } else if (action === 'refresh') {
      if (!userId) {
        return NextResponse.json(
          { error: 'User required for refresh' },
          { status: 400 }
        );
      }
      await refreshSessionLock(sessionId, userId);
    } else if (action === 'restore') {
      const { restoreSession } = await import('@/lib/db');
      await restoreSession(sessionId);
      console.log(`[API] Session ${sessionId} restored by ${userId || 'unknown'}`);
      
      // Log the restoration
      await logSessionActivity(
        sessionId,
        'created', // Log as created since it's back in active sessions
        userId,
        undefined,
        { restored: true }
      );
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error updating session:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Soft delete a session (moves to "Recently Deleted" for 14 days)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = await auth();
    const userId = session?.user?.email || undefined;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Log the deletion BEFORE soft-deleting
    try {
      await logSessionActivity(sessionId, 'deleted', userId);
    } catch (error) {
      // If logging fails, it's okay - continue with deletion
      console.warn('[API] Failed to log deletion activity:', error);
    }

    // Soft delete the session (mark as deleted, keep for 14 days)
    await deleteSession(sessionId);

    console.log(`[API] Session ${sessionId} soft-deleted successfully (will be permanently deleted after 14 days)`);

    return NextResponse.json({
      success: true,
      message: `Session moved to Recently Deleted. It will be permanently deleted after 14 days.`,
    });
  } catch (error) {
    console.error('[API] Error deleting session:', error);
    return NextResponse.json(
      {
        error: 'DELETE_FAILED',
        message: 'Failed to delete session',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
