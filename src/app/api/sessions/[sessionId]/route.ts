import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  getSession,
  deleteSession,
  logSessionActivity,
} from '@/lib/db';

/**
 * GET - Load a specific session by ID
 * This endpoint is now fully functional with Postgres backend
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get session from database
    const session = await getSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    console.log(`[API] Session ${sessionId} loaded successfully (version ${session._version}, ${session.devices?.length || 0} devices)`);

    return NextResponse.json({
      success: true,
      session,
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
 * DELETE - Delete a session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = await auth();
    const userId = session?.user?.email;

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
