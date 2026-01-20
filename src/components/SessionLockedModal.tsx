'use client';

import { X, Lock, Mail } from 'lucide-react';

interface SessionLockedModalProps {
  lockedBy: string;
  lockedAt: string;
  onClose: () => void;
}

/**
 * Modal shown when trying to open a session that's locked by another user
 */
export function SessionLockedModal({ lockedBy, lockedAt, onClose }: SessionLockedModalProps) {
  const lockedTime = new Date(lockedAt).toLocaleString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-blue-500 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-6 h-6" />
            <h2 className="text-xl font-semibold">Session In Use</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-full flex-shrink-0">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-gray-700 font-medium">
                This session is currently being edited by:
              </p>
              <p className="text-lg font-semibold text-blue-600 mt-1">
                {lockedBy}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Locked since:</span>
              <span className="font-medium">{lockedTime}</span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Sessions are automatically unlocked after 5 minutes of inactivity.
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-900">
              <strong>What you can do:</strong>
            </p>
            <ul className="text-sm text-blue-800 mt-2 space-y-1 ml-4 list-disc">
              <li>Contact {lockedBy} to coordinate access</li>
              <li>Wait for them to finish (locks expire after 5 minutes)</li>
              <li>Choose a different session to review</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-md transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
