'use client';

import { useState, useEffect, useRef } from 'react';
import { ImageOff, Star, Check } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ImageThumbnailProps {
  src: string;
  alt: string;
  isSelected: boolean;
  isPrimary: boolean;
  onClick: () => void;
  className?: string;
}

export function ImageThumbnail({ 
  src, 
  alt, 
  isSelected, 
  isPrimary, 
  onClick, 
  className 
}: ImageThumbnailProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset states when src changes
  useEffect(() => {
    setLoading(true);
    setError(false);
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Add timeout to prevent infinite loading
    timeoutRef.current = setTimeout(() => {
      setLoading(false);
      setError(true);
    }, 8000); // 8 second timeout for thumbnails

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [src]);

  const handleLoad = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setLoading(false);
    setError(true);
  };

  // Check if image is already loaded (handles race condition)
  const handleImageRef = (img: HTMLImageElement | null) => {
    if (img && img.complete && img.naturalWidth > 0) {
      // Image already loaded - clear timeout and show image
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setLoading(false);
      setError(false);
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative rounded-lg overflow-hidden border-2 transition-all duration-200 group",
        isSelected 
          ? "border-primary ring-2 ring-primary/20 scale-105" 
          : "border-border hover:border-primary/50 hover:scale-102",
        "focus:outline-none focus:ring-2 focus:ring-ring",
        className
      )}
    >
      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
          <ImageOff className="w-4 h-4" />
        </div>
      )}
      
      {/* Image */}
      {!error && (
        <img
          ref={handleImageRef}
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "w-full h-full object-cover",
            loading && "opacity-0",
            !loading && "opacity-100 transition-opacity duration-200"
          )}
        />
      )}
      
      {/* Primary Badge */}
      {isPrimary && (
        <div className="absolute top-1 left-1 bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-xs font-medium flex items-center space-x-1">
          <Star className="w-2.5 h-2.5 fill-current" />
          <span>Primary</span>
        </div>
      )}
      
      {/* Selected Badge */}
      {isSelected && (
        <div className="absolute top-1 right-1 bg-success text-white rounded-full p-1">
          <Check className="w-3 h-3" />
        </div>
      )}
      
      {/* Hover Overlay */}
      <div className={cn(
        "absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-200",
        "group-hover:opacity-100",
        isSelected && "opacity-0"
      )} />
    </button>
  );
} 