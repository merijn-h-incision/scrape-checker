'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Save, Cloud } from 'lucide-react';
import { useAppStore, useCurrentBatch } from '@/store/useAppStore';
import { useAutoSave } from '@/hooks/useAutoSave';
import { BatchHeader } from '@/components/BatchHeader';
import { DeviceRow } from '@/components/DeviceRow';
import { BatchControls } from '@/components/BatchControls';
import { ExportModal } from '@/components/ExportModal';

export default function CheckPage() {
  const router = useRouter();
  const { session, current_batch, setCurrentBatch, saveProgress, exportResults } = useAppStore();
  const currentBatch = useCurrentBatch();
  const { saveNow, isAutoSaveActive } = useAutoSave();
  const [showExportModal, setShowExportModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Redirect if no session
  useEffect(() => {
    if (!session) {
      router.push('/');
    }
  }, [session, router]);

  // Auto-scroll to top when batch changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [current_batch]);

  // Save functions
  const handleSaveAndPause = async () => {
    setIsSaving(true);
    try {
      await saveNow();
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

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

  if (!session || !currentBatch) {
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

            <div className="flex items-center space-x-2">
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
    </div>
  );
} 