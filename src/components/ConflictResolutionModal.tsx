'use client';

import { useAppStore } from '@/store/useAppStore';
import { X, AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Modal that appears when a save conflict is detected
 * Offers options to refresh and reload the latest version
 */
export function ConflictResolutionModal() {
  const { conflictError, session, setConflictError, loadProgressFromCloud, setError } = useAppStore();

  if (!conflictError || !session) return null;

  const handleRefresh = async () => {
    try {
      setError(null);
      setConflictError(null);
      
      // Reload the session from the server to get the latest version
      await loadProgressFromCloud(session.session_id);
      
      alert('Session refreshed successfully. Please review your changes and save again.');
    } catch (error) {
      console.error('Failed to refresh session:', error);
      alert('Failed to refresh session. Please try again or reload the page.');
    }
  };

  const handleDismiss = () => {
    setConflictError(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-orange-500 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" />
            <h2 className="text-xl font-semibold">Save Conflict Detected</h2>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-gray-700 space-y-2">
            <p className="font-medium">
              Your session has been updated by another user or device.
            </p>
            <p className="text-sm text-gray-600">
              The session you're working on has been modified since you last loaded it. 
              This typically happens when:
            </p>
            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 ml-2">
              <li>You're working on the same session from multiple devices</li>
              <li>Another user has updated the session</li>
              <li>You have multiple browser tabs open with the same session</li>
            </ul>
          </div>

          <div className="bg-gray-100 p-3 rounded-md text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-gray-600">Your version:</span>
              <span className="font-mono font-medium">{conflictError.attemptedVersion}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Current version:</span>
              <span className="font-mono font-medium text-orange-600">{conflictError.currentVersion}</span>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> To prevent data loss, please refresh the session to get the latest changes. 
              You may need to re-apply your recent edits.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end">
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-orange-500 text-white hover:bg-orange-600 rounded-md transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Session
          </button>
        </div>
      </div>
    </div>
  );
}
