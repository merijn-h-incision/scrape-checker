import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import type { CheckingSession } from '@/types/device';
import {
  createSession,
  getSession,
  updateSession,
  listSessions,
  logSessionActivity,
  OptimisticLockError,
} from '@/lib/db';

// Configure API route
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Set body size limit to 50MB for this route
export const runtime = 'nodejs';

/**
 * POST - Save or update session to Postgres
 * Implements optimistic locking to prevent data loss from concurrent edits
 */
export async function POST(request: Request) {
  try {
    // Get authenticated user
    const session = await auth();
    const userId = session?.user?.email || undefined;

    // Parse request data (supports both compressed and uncompressed)
    const contentType = request.headers.get('Content-Type');
    let sessionData: CheckingSession;

    if (contentType === 'application/gzip' || request.headers.get('Content-Encoding') === 'gzip') {
      console.log('[API] Receiving compressed session data');
      const compressedBlob = await request.blob();
      console.log(`[API] Compressed size: ${(compressedBlob.size / 1024 / 1024).toFixed(2)} MB`);
      
      const decompressedStream = compressedBlob.stream().pipeThrough(new DecompressionStream('gzip'));
      const decompressedBlob = await new Response(decompressedStream).blob();
      const decompressedText = await decompressedBlob.text();
      console.log(`[API] Decompressed size: ${(decompressedBlob.size / 1024 / 1024).toFixed(2)} MB`);
      
      sessionData = JSON.parse(decompressedText);
    } else {
      const bodyText = await request.text();
      sessionData = JSON.parse(bodyText);
    }

    // Check if session exists in database
    const existingSession = await getSession(sessionData.session_id);
    
    let savedSession;
    let action: 'created' | 'updated';

    if (existingSession) {
      // Update existing session with optimistic locking
      action = 'updated';
      const currentVersion = existingSession._version || 1;
      
      try {
        const result = await updateSession(sessionData, currentVersion);
        savedSession = result;
        console.log(`[API] Session ${sessionData.session_id} updated successfully (version ${currentVersion} → ${result.version})`);
      } catch (error) {
        if (error instanceof OptimisticLockError) {
          console.error('[API] Optimistic lock conflict:', error.message);
          
          // Log the conflict
          await logSessionActivity(
            sessionData.session_id,
            'conflict',
            userId,
            currentVersion,
            {
              attempted_version: error.attemptedVersion,
              current_version: error.currentVersion,
            }
          );

          return NextResponse.json(
            {
              error: 'CONFLICT',
              message: error.message,
              currentVersion: error.currentVersion,
              attemptedVersion: error.attemptedVersion,
            },
            { status: 409 } // Conflict
          );
        }
        throw error;
      }
    } else {
      // Create new session
      action = 'created';
      const result = await createSession(sessionData, userId);
      savedSession = result;
      console.log(`[API] Session ${sessionData.session_id} created successfully (${sessionData.devices.length} devices)`);
    }

    // Log activity
    await logSessionActivity(
      sessionData.session_id,
      action,
      userId,
      savedSession.version,
      {
        device_count: sessionData.devices.length,
        progress: sessionData.progress_percentage,
      }
    );

    return NextResponse.json({
      success: true,
      sessionId: savedSession.session_id,
      version: savedSession.version,
      lastSaved: savedSession.updated_at,
    });
  } catch (error) {
    console.error('[API] Error saving session:', error);
    return NextResponse.json(
      {
        error: 'SAVE_FAILED',
        message: 'Failed to save session',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET - List all sessions (collaborative mode - all users see all sessions)
 */
export async function GET(request: Request) {
  try {
    // Get authenticated user for logging purposes
    const session = await auth();
    const userId = session?.user?.email;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // List ALL sessions (no user filter for collaborative work)
    const sessions = await listSessions(
      undefined, // No user filter - show all sessions
      limit,
      offset
    );

    console.log(`[API] Listed ${sessions.length} sessions (collaborative mode)`);

    return NextResponse.json({
      success: true,
      sessions,
      total: sessions.length,
      userId: userId || null,
    });
  } catch (error) {
    console.error('[API] Error listing sessions:', error);
    return NextResponse.json(
      {
        error: 'LIST_FAILED',
        message: 'Failed to list sessions',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
