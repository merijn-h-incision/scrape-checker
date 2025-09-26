'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { BatchCarousel } from './BatchCarousel';

interface BatchHeaderProps {
  current: number;
  total: number;
  completed: number;
  totalDevices: number;
  progress: number;
  onNavigate: (batchNumber: number) => void;
}

export function BatchHeader({ 
  current, 
  total, 
  completed, 
  totalDevices, 
  progress, 
  onNavigate 
}: BatchHeaderProps) {
  const batchProgress = totalDevices > 0 ? (completed / totalDevices) * 100 : 0;

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
      <div className="space-y-4">
        {/* Batch Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-foreground">
              Batch {current} of {total}
            </h2>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onNavigate(current - 1)}
                disabled={current <= 1}
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-lg border transition-colors",
                  current <= 1
                    ? "border-border bg-muted text-muted-foreground cursor-not-allowed"
                    : "border-border hover:bg-accent hover:border-primary"
                )}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => onNavigate(current + 1)}
                disabled={current >= total}
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-lg border transition-colors",
                  current >= total
                    ? "border-border bg-muted text-muted-foreground cursor-not-allowed"
                    : "border-border hover:bg-accent hover:border-primary"
                )}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              Overall Progress
            </p>
            <p className="text-lg font-medium text-foreground">
              {progress.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-3">
          {/* Current Batch Progress */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Current Batch</span>
              <span className="text-foreground font-medium">
                {completed}/{totalDevices} devices checked
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary rounded-full h-2 transition-all duration-300"
                style={{ width: `${batchProgress}%` }}
              />
            </div>
          </div>

          {/* Overall Progress */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="text-foreground font-medium">
                {progress.toFixed(1)}% complete
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-secondary rounded-full h-2 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Batch Carousel Navigation */}
        <BatchCarousel 
          currentBatch={current}
          totalBatches={total}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
} 