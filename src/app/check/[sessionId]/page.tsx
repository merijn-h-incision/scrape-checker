'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Save, Cloud } from 'lucide-react';
import { useAppStore, useCurrentBatch } from '@/store/useAppStore';
import { useAutoSave } from '@/hooks/useAutoSave';
import { BatchHeader } from '@/components/BatchHeader';
import { DeviceRow } from '@/components/DeviceRow';
import { BatchControls } from '@/components/BatchControls';
import { ExportModal } from '@/components/ExportModal';
import { AuthButton } from '@/components/AuthButton';
import { ConflictResolutionModal } from '@/components/ConflictResolutionModal';
import { SessionLockedModal } from '@/components/SessionLockedModal';

export default function CheckPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const router = useRouter();
  const { session, current_batch, setCurrentBatch, saveProgress, exportResults, setSession } = useAppStore();
  const currentBatch = useCurrentBatch();
  const { saveNow, isAutoSaveActive } = useAutoSave();
  const [showExportModal, setShowExportModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionLocked, setSessionLocked] = useState<{
    lockedBy: string;
    lockedAt: string;
  } | null>(null);

  // Extract sessionId from params
  useEffect(() => {
    params.then(p => setSessionId(p.sessionId));
  }, [params]);

  // Load session if not already loaded (for direct URL access)
  useEffect(() => {
    if (!sessionId) return;
    
    // If we already have a session with matching ID, no need to load
    if (session && session.session_id === sessionId) return;
    
    // If no session or different session ID, try to load from Postgres
    const loadSession = async () => {
      setIsLoadingSession(true);
      setSessionLocked(null);
      try {
        const sessionResponse = await fetch(`/api/sessions/${sessionId}`, {
          cache: 'no-store'
        });
        
        if (sessionResponse.status === 423) {
          // Session is locked by another user
          const data = await sessionResponse.json();
          setSessionLocked({
            lockedBy: data.lockedBy,
            lockedAt: data.lockedAt,
          });
          setIsLoadingSession(false);
          return;
        }
        
        if (sessionResponse.ok) {
          const data = await sessionResponse.json();
          if (data.success && data.session) {
            setSession(data.session);
            console.log(`Session ${sessionId} loaded successfully from database`);
            return;
          }
        }
        
        // If not found, redirect to home
        console.warn(`Session ${sessionId} not found, redirecting to home`);
        router.push('/');
      } catch (error) {
        console.error('Failed to load session:', error);
        router.push('/');
      } finally {
        setIsLoadingSession(false);
      }
    };
    
    loadSession();
  }, [sessionId, session, router, setSession]);

  // Redirect if no session after loading attempt
  useEffect(() => {
    if (!isLoadingSession && !session && sessionId && !sessionLocked) {
      router.push('/');
    }
  }, [session, router, isLoadingSession, sessionId, sessionLocked]);

  // Heartbeat to maintain session lock (every 60 seconds)
  useEffect(() => {
    if (!sessionId || !session) return;

    const heartbeat = setInterval(async () => {
      try {
        await fetch(`/api/sessions/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'refresh' }),
        });
        console.log('Session lock refreshed');
      } catch (error) {
        console.error('Failed to refresh session lock:', error);
      }
    }, 60000); // Every 60 seconds

    return () => clearInterval(heartbeat);
  }, [sessionId, session]);

  // Unlock session when leaving page
  useEffect(() => {
    if (!sessionId || !session) return;

    const unlockSession = async () => {
      try {
        await fetch(`/api/sessions/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'unlock' }),
        });
        console.log('Session unlocked');
      } catch (error) {
        console.error('Failed to unlock session:', error);
      }
    };

    // Unlock on page unload
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable delivery during unload
      const data = JSON.stringify({ action: 'unlock' });
      navigator.sendBeacon(`/api/sessions/${sessionId}`, data);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Unlock when component unmounts (navigation away)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      unlockSession();
    };
  }, [sessionId, session]);

  // Auto-scroll to top when batch changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [current_batch]);

  // Save functions
  const handleSaveAndPause = useCallback(async () => {
    setIsSaving(true);
    try {
      await saveNow();
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [saveNow]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't handle if user is typing
      }

      switch (e.key) {
        case 'ArrowLeft':
        case 'p':
          if (current_batch > 1) {
            setCurrentBatch(current_batch - 1);
          }
          break;
        case 'ArrowRight':
        case 'n':
          if (session && current_batch < session.total_batches) {
            setCurrentBatch(current_batch + 1);
          }
          break;
        case 's':
          e.preventDefault();
          handleSaveAndPause();
          break;
        case 'e':
          e.preventDefault();
          setShowExportModal(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [current_batch, session, setCurrentBatch, saveProgress, handleSaveAndPause]);

  // Show session locked modal if applicable
  if (sessionLocked) {
    return (
      <SessionLockedModal
        lockedBy={sessionLocked.lockedBy}
        lockedAt={sessionLocked.lockedAt}
        onClose={() => router.push('/')}
      />
    );
  }

  // Show loading state - ALL HOOKS MUST BE CALLED BEFORE THIS POINT
  if (isLoadingSession || !sessionId || !session || !currentBatch) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  const handleBatchNavigation = (batchNumber: number) => {
    if (batchNumber >= 1 && batchNumber <= session.total_batches) {
      setCurrentBatch(batchNumber);
    }
  };

  const handleSaveAndNext = async () => {
    setIsSaving(true);
    try {
      await saveNow();
      if (current_batch < session.total_batches) {
        setCurrentBatch(current_batch + 1);
      }
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const hasUncheckedItems = currentBatch.devices.some(d => d.status === 'pending');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back to Upload</span>
              </button>
              
              <div className="border-l border-border pl-4">
                <h1 className="text-lg font-semibold text-foreground">
                  {session.session_name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Batch {current_batch} of {session.total_batches} • {session.total_rows} total devices
                </p>
                <p className="text-xs text-muted-foreground">
                  Session ID: {session.session_id}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Auto-save status indicator */}
              {isAutoSaveActive && (
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <Cloud className="w-3 h-3" />
                  <span>Auto-save active</span>
                </div>
              )}
              
              <button
                onClick={handleSaveAndPause}
                disabled={isSaving}
                className="flex items-center space-x-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className={`w-4 h-4 ${isSaving ? 'animate-pulse' : ''}`} />
                <span>{isSaving ? 'Saving...' : 'Save Progress'}</span>
              </button>
              
              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>

              <div className="border-l border-border pl-3">
                <AuthButton />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Batch Header */}
          <BatchHeader
            current={current_batch}
            total={session.total_batches}
            completed={currentBatch.completed_count}
            totalDevices={currentBatch.total_count}
            progress={session.progress_percentage}
            onNavigate={handleBatchNavigation}
          />

          {/* Device Rows */}
          <div className="space-y-6">
            {currentBatch.devices.map((device, index) => {
              const globalIndex = (current_batch - 1) * 10 + index;
              return (
                <DeviceRow
                  key={device.device_id || globalIndex}
                  device={device}
                  deviceIndex={globalIndex}
                  rowNumber={index + 1}
                />
              );
            })}
          </div>

          {/* Batch Controls */}
          <BatchControls
            currentBatch={current_batch}
            totalBatches={session.total_batches}
            hasUncheckedItems={hasUncheckedItems}
            onPrevious={() => handleBatchNavigation(current_batch - 1)}
            onSaveAndNext={handleSaveAndNext}
            onSaveAndPause={handleSaveAndPause}
          />
        </div>
      </main>


      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          onExport={(options) => {
            exportResults(options);
            setShowExportModal(false);
          }}
        />
      )}

      {/* Conflict Resolution Modal */}
      <ConflictResolutionModal />
    </div>
  );
} 