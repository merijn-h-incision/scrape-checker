import type { SessionMetadata, CheckingSession } from '@/types/device';

const SESSIONS_KEY = 'image-checker-sessions';
const MAX_SESSIONS = 10; // Keep last 10 sessions

export function saveSessionMetadata(session: CheckingSession): void {
  try {
    const metadata: SessionMetadata = {
      session_id: session.session_id,
      session_name: session.session_name,
      filename: session.filename,
      total_rows: session.total_rows,
      progress_percentage: session.progress_percentage,
      last_updated: session.last_updated,
      created_at: session.created_at,
    };

    const existingSessions = getRecentSessions();
    
    // Remove existing session with same ID if it exists
    const filteredSessions = existingSessions.filter(s => s.session_id !== session.session_id);
    
    // Add new session at the beginning
    const updatedSessions = [metadata, ...filteredSessions].slice(0, MAX_SESSIONS);
    
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(updatedSessions));
  } catch (error) {
    console.error('Failed to save session metadata:', error);
  }
}

export function getRecentSessions(): SessionMetadata[] {
  try {
    const stored = localStorage.getItem(SESSIONS_KEY);
    if (!stored) return [];
    
    const sessions: SessionMetadata[] = JSON.parse(stored);
    
    // Sort by last_updated (most recent first)
    return sessions.sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime());
  } catch (error) {
    console.error('Failed to load session metadata:', error);
    return [];
  }
}

export function getSessionMetadata(sessionId: string): SessionMetadata | null {
  try {
    const sessions = getRecentSessions();
    return sessions.find(s => s.session_id === sessionId) || null;
  } catch (error) {
    console.error('Failed to get session metadata:', error);
    return null;
  }
}

export function removeSessionMetadata(sessionId: string): void {
  try {
    const sessions = getRecentSessions();
    const filteredSessions = sessions.filter(s => s.session_id !== sessionId);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(filteredSessions));
  } catch (error) {
    console.error('Failed to remove session metadata:', error);
  }
}

export function updateSessionName(sessionId: string, newName: string): void {
  try {
    const sessions = getRecentSessions();
    const updatedSessions = sessions.map(s => 
      s.session_id === sessionId 
        ? { ...s, session_name: newName, last_updated: new Date().toISOString() }
        : s
    );
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(updatedSessions));
  } catch (error) {
    console.error('Failed to update session name:', error);
  }
}

export function clearAllSessions(): void {
  try {
    localStorage.removeItem(SESSIONS_KEY);
  } catch (error) {
    console.error('Failed to clear sessions:', error);
  }
}
