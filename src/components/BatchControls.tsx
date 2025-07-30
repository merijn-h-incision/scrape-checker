'use client';

import { ArrowLeft, ArrowRight, Save, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface BatchControlsProps {
  currentBatch: number;
  totalBatches: number;
  hasUncheckedItems: boolean;
  onPrevious: () => void;
  onSaveAndNext: () => void;
  onSaveAndPause: () => void;
}

export function BatchControls({
  currentBatch,
  totalBatches,
  hasUncheckedItems,
  onPrevious,
  onSaveAndNext,
  onSaveAndPause
}: BatchControlsProps) {
  const isFirstBatch = currentBatch <= 1;
  const isLastBatch = currentBatch >= totalBatches;

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Previous Button */}
        <button
          onClick={onPrevious}
          disabled={isFirstBatch}
          className={cn(
            "flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors",
            isFirstBatch
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-accent hover:bg-accent/80 text-foreground"
          )}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Previous Batch</span>
        </button>

        {/* Center Controls */}
        <div className="flex items-center space-x-4">
          {hasUncheckedItems && (
            <div className="flex items-center space-x-2 px-3 py-2 bg-warning/10 border border-warning/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span className="text-sm text-warning">
                Some devices are not checked
              </span>
            </div>
          )}

          <button
            onClick={onSaveAndPause}
            className="flex items-center space-x-2 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Progress</span>
          </button>
        </div>

        {/* Next Button */}
        <button
          onClick={onSaveAndNext}
          disabled={isLastBatch}
          className={cn(
            "flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors",
            isLastBatch
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          <span>{isLastBatch ? 'Completed' : 'Save & Next'}</span>
          {!isLastBatch && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
} 