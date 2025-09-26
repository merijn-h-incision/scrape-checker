import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';

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

    // Delete the session file from Vercel Blob storage
    const filename = `sessions/${sessionId}.json`;
    
    await del(filename, {
      token: process.env.SCRAPE_BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json({
      success: true,
      message: `Session ${sessionId} deleted successfully`,
    });

  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}
