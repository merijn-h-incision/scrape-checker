import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import type { CheckingSession } from '@/types/device';

export async function POST(request: NextRequest) {
  try {
    const sessionData: CheckingSession = await request.json();
    
    if (!sessionData.session_id) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Create filename for the session
    const filename = `sessions/${sessionData.session_id}.json`;
    
    // Convert session data to JSON blob
    const sessionBlob = new Blob([JSON.stringify(sessionData, null, 2)], {
      type: 'application/json',
    });

    // Upload to Vercel Blob storage
    const blob = await put(filename, sessionBlob, {
      access: 'public',
      token: process.env.SCRAPE_BLOB_READ_WRITE_TOKEN,
      allowOverwrite: true, // Allow overwriting existing sessions for progress updates
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
      sessionId: sessionData.session_id,
      lastSaved: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error saving session:', error);
    return NextResponse.json(
      { error: 'Failed to save session' },
      { status: 500 }
    );
  }
}
