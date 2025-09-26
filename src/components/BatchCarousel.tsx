'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';

interface BatchCarouselProps {
  currentBatch: number;
  totalBatches: number;
  onNavigate: (batchNumber: number) => void;
}

export function BatchCarousel({ currentBatch, totalBatches, onNavigate }: BatchCarouselProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const batchesPerPage = 50;
  const totalPages = Math.ceil(totalBatches / batchesPerPage);

  // Calculate which page the current batch is on
  useEffect(() => {
    const pageForCurrentBatch = Math.floor((currentBatch - 1) / batchesPerPage);
    setCurrentPage(pageForCurrentBatch);
  }, [currentBatch]);

  // Calculate the batches to display for the current page
  const startBatch = currentPage * batchesPerPage + 1;
  const endBatch = Math.min(startBatch + batchesPerPage - 1, totalBatches);
  const batchesOnCurrentPage = Array.from(
    { length: endBatch - startBatch + 1 }, 
    (_, i) => startBatch + i
  );

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPage = (pageIndex: number) => {
    setCurrentPage(pageIndex);
  };

  return (
    <div className="pt-2 border-t border-border">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">
          Quick Jump to Batch: {startBatch}-{endBatch} of {totalBatches}
        </p>
        
        {/* Page Navigation */}
        {totalPages > 1 && (
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 0}
              className={cn(
                "flex items-center justify-center w-6 h-6 rounded border transition-colors text-xs",
                currentPage === 0
                  ? "border-border bg-muted text-muted-foreground cursor-not-allowed"
                  : "border-border hover:bg-accent hover:border-primary"
              )}
              title="Previous 50 batches"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            
            <span className="text-xs text-muted-foreground px-2">
              Page {currentPage + 1} of {totalPages}
            </span>
            
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages - 1}
              className={cn(
                "flex items-center justify-center w-6 h-6 rounded border transition-colors text-xs",
                currentPage === totalPages - 1
                  ? "border-border bg-muted text-muted-foreground cursor-not-allowed"
                  : "border-border hover:bg-accent hover:border-primary"
              )}
              title="Next 50 batches"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Batch Grid for Current Page */}
      <div className="grid grid-cols-10 gap-2">
        {batchesOnCurrentPage.map((batchNum) => (
          <button
            key={batchNum}
            onClick={() => onNavigate(batchNum)}
            className={cn(
              "w-8 h-8 rounded-lg text-xs font-medium transition-colors",
              batchNum === currentBatch
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-accent border border-border hover:border-primary"
            )}
            title={`Go to batch ${batchNum}`}
          >
            {batchNum}
          </button>
        ))}
      </div>

      {/* Page Dots/Indicators for quick navigation (only show if more than 3 pages) */}
      {totalPages > 3 && (
        <div className="flex justify-center mt-3 space-x-1">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => goToPage(i)}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                i === currentPage
                  ? "bg-primary"
                  : "bg-muted hover:bg-accent"
              )}
              title={`Go to batches ${i * batchesPerPage + 1}-${Math.min((i + 1) * batchesPerPage, totalBatches)}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
