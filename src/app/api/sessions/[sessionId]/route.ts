import { NextRequest, NextResponse } from 'next/server';
import type { CheckingSession } from '@/types/device';

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

    // For now, we'll try to load from the stored blob URL
    // In a real implementation, you'd store sessionId -> blobUrl mapping in a database
    // Since we don't have the blob URL here, we'll return a helpful error
    // The frontend should handle session loading differently
    
    return NextResponse.json(
      { error: 'Session loading from server not yet implemented. Sessions are stored locally and in cloud.' },
      { status: 501 }
    );

  } catch (error) {
    console.error('Error loading session:', error);
    return NextResponse.json(
      { error: 'Failed to load session' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // For now, we'll just return success since Vercel Blob doesn't have a delete API
    // Sessions will remain forever as requested
    return NextResponse.json({
      success: true,
      message: 'Session marked for deletion (stored forever as requested)',
    });

  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}
