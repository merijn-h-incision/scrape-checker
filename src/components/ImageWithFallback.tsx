'use client';

import { useState, useEffect, useRef } from 'react';
import { ImageOff, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}

export function ImageWithFallback({ 
  src, 
  alt, 
  className,
  fallbackClassName 
}: ImageWithFallbackProps) {
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
    }, 10000); // 10 second timeout

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

  if (!src) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-muted text-muted-foreground",
        className,
        fallbackClassName
      )}>
        <div className="text-center space-y-2">
          <ImageOff className="w-8 h-8 mx-auto" />
          <p className="text-xs">No image</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
      
      {error && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground",
          fallbackClassName
        )}>
          <div className="text-center space-y-2">
            <ImageOff className="w-8 h-8 mx-auto" />
            <p className="text-xs">Failed to load</p>
          </div>
        </div>
      )}
      
      <img
        ref={handleImageRef}
        src={src}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "w-full h-full object-cover",
          (loading || error) && "opacity-0",
          !loading && !error && "opacity-100 transition-opacity duration-200"
        )}
      />
    </div>
  );
} 