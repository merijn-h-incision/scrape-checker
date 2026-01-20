import { useAppStore } from '@/store/useAppStore';

export function useAutoSave() {
  const { session, saveProgressToCloud } = useAppStore();

  // Manual save function only - autosave completely removed
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
    isAutoSaveActive: false,
    sessionId: session?.session_id
  };
}
