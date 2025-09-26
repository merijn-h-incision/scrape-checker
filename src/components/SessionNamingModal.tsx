'use client';

import { useState, useEffect } from 'react';
import { X, FileText, ArrowRight } from 'lucide-react';

interface SessionNamingModalProps {
  isOpen: boolean;
  filename: string;
  deviceCount: number;
  defaultName: string;
  onConfirm: (sessionName: string) => void;
  onSkip: () => void;
}

export function SessionNamingModal({
  isOpen,
  filename,
  deviceCount,
  defaultName,
  onConfirm,
  onSkip
}: SessionNamingModalProps) {
  const [sessionName, setSessionName] = useState(defaultName);

  // Reset session name when modal opens
  useEffect(() => {
    if (isOpen) {
      setSessionName(defaultName);
    }
  }, [isOpen, defaultName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(sessionName.trim() || defaultName);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onSkip();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onSkip}
      />
      
      {/* Modal */}
      <div 
        className="relative bg-card border border-border rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Name Your Session
              </h2>
              <p className="text-sm text-muted-foreground">
                Give this review session a memorable name
              </p>
            </div>
          </div>
          <button
            onClick={onSkip}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File Info */}
        <div className="bg-muted/30 rounded-lg p-4 mb-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">File:</span>
              <span className="font-medium text-foreground">{filename}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Devices:</span>
              <span className="font-medium text-foreground">{deviceCount}</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="session-name" className="block text-sm font-medium text-foreground mb-2">
              Session Name
            </label>
            <input
              id="session-name"
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder={defaultName}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty to use &quot;{defaultName}&quot;
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onSkip}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
