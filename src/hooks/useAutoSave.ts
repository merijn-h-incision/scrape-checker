import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';

export function useAutoSave() {
  const { session, saveProgressToCloud } = useAppStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<string>('');

  useEffect(() => {
    if (!session) {
      // Clear interval if no session
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start auto-save interval (every 60 seconds)
    intervalRef.current = setInterval(async () => {
      if (session && session.last_updated !== lastSaveRef.current) {
        try {
          await saveProgressToCloud();
          lastSaveRef.current = session.last_updated;
          console.log('Auto-saved session at:', new Date().toLocaleTimeString());
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }
    }, 60000); // 60 seconds

    // Cleanup on unmount or session change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [session, saveProgressToCloud]); // Re-run when session changes

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
