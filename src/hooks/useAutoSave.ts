import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';

const AUTOSAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useAutoSave() {
  const { session, saveProgressToCloud } = useAppStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedVersionRef = useRef<number | null>(null);

  useEffect(() => {
    if (!session) {
      // Clear interval if no session
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      lastSavedVersionRef.current = null;
      return;
    }

    // Track the initial version so we know what's already saved
    if (lastSavedVersionRef.current === null) {
      lastSavedVersionRef.current = session._version || 1;
    }

    // Only create interval once per session
    if (!intervalRef.current) {
      intervalRef.current = setInterval(async () => {
        const currentSession = useAppStore.getState().session;
        if (!currentSession) return;

        // Only save if there are unsaved changes
        const hasUnsavedChanges = useAppStore.getState().hasUnsavedChanges;
        if (!hasUnsavedChanges) return;

        try {
          await saveProgressToCloud();
          console.log('Auto-saved session at:', new Date().toLocaleTimeString());
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }, AUTOSAVE_INTERVAL);
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [session?.session_id, saveProgressToCloud]);

  // Manual save function
  const saveNow = async () => {
    if (session) {
      try {
        await saveProgressToCloud();
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
