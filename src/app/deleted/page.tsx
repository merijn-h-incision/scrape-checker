'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Trash2, RotateCcw, AlertCircle, Clock, ArrowLeft } from 'lucide-react';
import { AuthButton } from '@/components/AuthButton';
import type { SessionMetadata } from '@/types/device';

// Helper function to safely format dates
function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return 'Unknown date';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Invalid date';
  }
}

export default function DeletedSessionsPage() {
  const { data: session, status } = useSession();
  const [deletedSessions, setDeletedSessions] = useState<SessionMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const router = useRouter();

  // Load deleted sessions
  useEffect(() => {
    loadDeletedSessions();
  }, []);

  const loadDeletedSessions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/sessions/deleted');
      
      if (!response.ok) {
        throw new Error('Failed to load deleted sessions');
      }

      const data = await response.json();
      setDeletedSessions(data.sessions || []);
    } catch (error) {
      console.error('Error loading deleted sessions:', error);
      setError(error instanceof Error ? error.message : 'Failed to load deleted sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (sessionId: string) => {
    if (!confirm('Restore this session?')) return;

    setRestoringId(sessionId);
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      });

      if (!response.ok) {
        throw new Error('Failed to restore session');
      }

      // Remove from deleted list
      setDeletedSessions(prev => prev.filter(s => s.session_id !== sessionId));
      
      // Show success message
      alert('Session restored successfully!');
    } catch (error) {
      console.error('Error restoring session:', error);
      alert(error instanceof Error ? error.message : 'Failed to restore session');
    } finally {
      setRestoringId(null);
    }
  };

  const getDaysRemainingColor = (days: number | undefined) => {
    if (!days) return 'text-gray-600';
    if (days <= 3) return 'text-red-600';
    if (days <= 7) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back to Home</span>
              </button>
              <div className="border-l border-gray-300 h-6" />
              <div className="flex items-center gap-2">
                <Trash2 className="w-6 h-6 text-gray-700" />
                <h1 className="text-2xl font-bold text-gray-900">Recently Deleted</h1>
              </div>
            </div>
            <AuthButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-yellow-900">Automatic Deletion</h3>
              <p className="text-sm text-yellow-800 mt-1">
                Sessions in Recently Deleted are permanently removed after 14 days. 
                Restore them before the countdown expires to keep your work.
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Loading deleted sessions...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && deletedSessions.length === 0 && (
          <div className="text-center py-12">
            <Trash2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Deleted Sessions</h3>
            <p className="text-gray-600">
              Deleted sessions will appear here for 14 days before being permanently removed.
            </p>
          </div>
        )}

        {/* Deleted Sessions List */}
        {!isLoading && !error && deletedSessions.length > 0 && (
          <div className="space-y-4">
            {deletedSessions.map((sessionMeta) => (
              <div
                key={sessionMeta.session_id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Session Name & Filename */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {sessionMeta.session_name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-3">
                      {sessionMeta.filename}
                    </p>

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Devices:</span>
                        <span>{sessionMeta.device_count || sessionMeta.total_rows}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Progress:</span>
                        <span>{Number(sessionMeta.progress_percentage || 0).toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Deleted:</span>
                        <span>{formatDate(sessionMeta.deleted_at)}</span>
                      </div>
                      {sessionMeta.days_remaining !== undefined && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span className={`font-medium ${getDaysRemainingColor(sessionMeta.days_remaining)}`}>
                            {sessionMeta.days_remaining} days remaining
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleRestore(sessionMeta.session_id)}
                      disabled={restoringId === sessionMeta.session_id}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {restoringId === sessionMeta.session_id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Restoring...</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-4 h-4" />
                          <span>Restore</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                {Number(sessionMeta.progress_percentage || 0) > 0 && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 transition-all duration-300"
                        style={{ width: `${sessionMeta.progress_percentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
