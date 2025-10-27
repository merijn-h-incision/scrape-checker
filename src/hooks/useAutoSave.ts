import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';

export function useAutoSave() {
  const { session, saveProgressToCloud } = useAppStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<string>('');
  const hasSessionRef = useRef<boolean>(false);

  useEffect(() => {
    // Track if we have a session to know when to start/stop interval
    const hasSession = !!session;
    
    if (!hasSession) {
      // Clear interval if no session
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        hasSessionRef.current = false;
      }
      return;
    }

    // Only create interval once when session first becomes available
    if (!intervalRef.current && hasSession && !hasSessionRef.current) {
      hasSessionRef.current = true;
      
      // Start auto-save interval (every 60 seconds)
      intervalRef.current = setInterval(async () => {
        // Get fresh session from store on every interval tick
        const currentSession = useAppStore.getState().session;
        
        if (currentSession && currentSession.last_updated !== lastSaveRef.current) {
          try {
            await saveProgressToCloud();
            lastSaveRef.current = currentSession.last_updated;
            console.log('Auto-saved session at:', new Date().toLocaleTimeString());
          } catch (error) {
            console.error('Auto-save failed:', error);
            // Show error to user
            alert('Auto-save failed. Please manually save your progress.');
          }
        }
      }, 60000); // 60 seconds
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        hasSessionRef.current = false;
      }
    };
  }, [session?.session_id]); // Only re-run when session ID changes (new session loaded)

  // Manual save function
  const saveNow = async () => {
    if (session) {
      try {
        await saveProgressToCloud();
        lastSaveRef.current = session.last_updated;
        console.log('Manual save completed at:', new Date().toLocaleTimeString());
      } catch (error) {
        console.error('Manual save failed:', error);
        throw error;
      }
    }
  };

  return {
    saveNow,
    isAutoSaveActive: !!intervalRef.current && !!session,
    sessionId: session?.session_id
  };
}
