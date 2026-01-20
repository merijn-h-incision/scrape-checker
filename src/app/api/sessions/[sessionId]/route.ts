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

    // Get session from database
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

    console.log(`[API] Session ${sessionId} loaded successfully (version ${sessionData._version}, ${sessionData.devices?.length || 0} devices)`);

    return NextResponse.json({
      success: true,
      session: sessionData,
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
 * PATCH - Unlock or refresh session lock
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
    const action = body.action; // 'unlock' or 'refresh'

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'Session ID and user required' },
        { status: 400 }
      );
    }

    if (action === 'unlock') {
      await unlockSession(sessionId, userId);
      console.log(`[API] Session ${sessionId} unlocked by ${userId}`);
    } else if (action === 'refresh') {
      await refreshSessionLock(sessionId, userId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error updating session lock:', error);
    return NextResponse.json(
      { error: 'Failed to update lock' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a session
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

    // Log the deletion BEFORE deleting (foreign key constraint requires session to exist)
    try {
      await logSessionActivity(sessionId, 'deleted', userId);
    } catch (error) {
      // If logging fails, it's okay - continue with deletion
      console.warn('[API] Failed to log deletion activity:', error);
    }

    // Delete the session from database
    await deleteSession(sessionId);

    console.log(`[API] Session ${sessionId} deleted successfully`);

    return NextResponse.json({
      success: true,
      message: `Session ${sessionId} deleted successfully`,
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
