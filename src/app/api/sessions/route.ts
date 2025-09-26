import { put, list } from '@vercel/blob';
import { NextResponse } from 'next/server';
import type { CheckingSession } from '@/types/device';

// POST - Save session to blob
export async function POST(request: Request) {
  try {
    const sessionData: CheckingSession = await request.json();
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
      lastSaved: sessionData.last_updated,
    });
  } catch (error) {
    console.error('Error saving session:', error);
    return NextResponse.json(
      { error: 'Failed to save session' },
      { status: 500 }
    );
  }
}

// GET - List all sessions from blob storage
export async function GET() {
  try {
    const { blobs } = await list({
      prefix: 'sessions/',
      token: process.env.SCRAPE_BLOB_READ_WRITE_TOKEN,
    });

    // Fetch metadata from each session file
    const sessionPromises = blobs.map(async (blob) => {
      try {
        const response = await fetch(blob.url);
        const sessionData: CheckingSession = await response.json();
        
        return {
          session_id: sessionData.session_id,
          session_name: sessionData.session_name,
          filename: sessionData.filename,
          total_rows: sessionData.total_rows,
          progress_percentage: sessionData.progress_percentage,
          last_updated: sessionData.last_updated,
          created_at: sessionData.created_at,
          blob_url: blob.url,
        };
      } catch (error) {
        console.error(`Failed to fetch session from ${blob.url}:`, error);
        return null;
      }
    });

    const sessions = await Promise.all(sessionPromises);
    const validSessions = sessions.filter(session => session !== null);

    // Sort by last_updated (most recent first)
    validSessions.sort((a, b) => new Date(b!.last_updated).getTime() - new Date(a!.last_updated).getTime());

    return NextResponse.json({
      success: true,
      sessions: validSessions,
      total: validSessions.length,
    });
  } catch (error) {
    console.error('Error listing sessions:', error);
    return NextResponse.json(
      { error: 'Failed to list sessions' },
      { status: 500 }
    );
  }
}