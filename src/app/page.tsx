'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Upload, FileText, AlertCircle, CheckCircle2, Clock, Play, Trash2, ShieldAlert } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { parseCSVFile, createSessionFromDevices } from '@/utils/csvParser';
// Session management now handled via API
import { SessionNamingModal } from '@/components/SessionNamingModal';
import { AuthButton } from '@/components/AuthButton';
import type { SessionMetadata, DeviceData } from '@/types/device';

// Helper function to safely format dates
function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return 'Unknown date';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'Invalid date';
  }
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [recentSessions, setRecentSessions] = useState<SessionMetadata[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [resumeSessionId, setResumeSessionId] = useState('');
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [pendingSessionData, setPendingSessionData] = useState<{
    devices: DeviceData[];
    filename: string;
  } | null>(null);
  const router = useRouter();
  const { setSession } = useAppStore();

  // Load recent sessions from database on component mount
  useEffect(() => {
    const loadSessions = async () => {
      try {
        setIsLoadingSessions(true);
        const response = await fetch('/api/sessions');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setRecentSessions(data.sessions);
          }
        }
      } catch (error) {
        console.error('Failed to load sessions:', error);
      } finally {
        setIsLoadingSessions(false);
      }
    };
    
    loadSessions();
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadError('Please upload a CSV file.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const result = await parseCSVFile(file);
      
      if (result.errors.length > 0) {
        setUploadError(`CSV parsing errors: ${result.errors.join(', ')}`);
        return;
      }

      if (result.data.length === 0) {
        setUploadError('No valid device data found in the CSV file.');
        return;
      }

      // Store the parsed data and show naming modal
      setPendingSessionData({
        devices: result.data,
        filename: file.name
      });
      
      setUploadSuccess(`Successfully loaded ${result.data.length} devices!`);
      setShowNamingModal(true);

    } catch (error) {
      setUploadError(
        error instanceof Error 
          ? error.message 
          : 'Failed to process the CSV file. Please check the format.'
      );
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleResumeSession = useCallback(async (sessionMetadata: SessionMetadata) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      // Fetch the full session data from Postgres database
      const response = await fetch(`/api/sessions/${sessionMetadata.session_id}`, {
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load session data: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.session) {
        throw new Error('Invalid session data received');
      }

      const sessionData = data.session;
      console.log(`Loaded session ${sessionData.session_id} with ${sessionData.devices.length} devices, version ${sessionData._version}`);
      
      // Load the session into the store
      setSession(sessionData);
      
      // Navigate to the checking page
      router.push(`/check/${sessionMetadata.session_id}`);
    } catch (error) {
      console.error('Failed to resume session:', error);
      setUploadError(`Failed to load session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  }, [router, setSession]);

  const handleResumeBySessionId = useCallback(async () => {
    if (!resumeSessionId.trim()) {
      setUploadError('Please enter a session ID');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Load session directly from database by ID
      const response = await fetch(`/api/sessions/${resumeSessionId.trim()}`, {
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Session not found or inaccessible (${response.status})`);
      }
      
      const data = await response.json();
      
      if (!data.success || !data.session) {
        throw new Error('Invalid session data received');
      }

      setSession(data.session);
      router.push(`/check/${resumeSessionId.trim()}`);
    } catch (error) {
      console.error('Failed to resume session by ID:', error);
      setUploadError(`Failed to load session: ${error instanceof Error ? error.message : 'Session not found'}`);
    } finally {
      setIsUploading(false);
    }
  }, [router, resumeSessionId, setSession]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    // Confirm deletion
    if (!confirm('Move this session to Recently Deleted? It will be permanently deleted after 14 days.')) {
      return;
    }

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Reload sessions list after deletion
        const sessionsResponse = await fetch('/api/sessions');
        if (sessionsResponse.ok) {
          const data = await sessionsResponse.json();
          if (data.success) {
            setRecentSessions(data.sessions);
          }
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  }, []);

  const handleSessionNameConfirm = useCallback((sessionName: string) => {
    if (!pendingSessionData) return;

    // Create session with the chosen name
    const session = createSessionFromDevices(
      pendingSessionData.devices, 
      pendingSessionData.filename, 
      sessionName
    );
    
    setSession(session);
    
    // Clean up and navigate
    setShowNamingModal(false);
    setPendingSessionData(null);
    setUploadSuccess(null);
    
    router.push(`/check/${session.session_id}`);
  }, [pendingSessionData, setSession, router]);

  const handleSessionNameSkip = useCallback(() => {
    if (!pendingSessionData) return;

    // Create session with default name (filename)
    const session = createSessionFromDevices(
      pendingSessionData.devices, 
      pendingSessionData.filename
    );
    
    setSession(session);
    
    // Clean up and navigate
    setShowNamingModal(false);
    setPendingSessionData(null);
    setUploadSuccess(null);
    
    router.push(`/check/${session.session_id}`);
  }, [pendingSessionData, setSession, router]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-card rounded-lg border border-border shadow-lg p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">
                Authentication Required
              </h1>
              <p className="text-muted-foreground">
                This application is restricted to authorized users only.
                Please sign in with your organization&apos;s Google account to continue.
              </p>
            </div>
            <div className="flex justify-center">
              <AuthButton />
            </div>
            {uploadError && (
              <div className="flex items-center justify-center space-x-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-destructive">Access denied: {uploadError}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  Medical Device Image Checker
                </h1>
                <p className="text-sm text-muted-foreground">
                  Upload your device results CSV to start checking images
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/deleted')}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Recently Deleted</span>
              </button>
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-8">
          {/* Upload Area */}
          <div className="bg-card rounded-lg border border-border shadow-sm p-8">
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-foreground">
                  Upload Device Results
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Upload a CSV file from your scraping results (Stryker, Arthrex, etc.) 
                  to start the image checking process.
                </p>
              </div>


              {/* File Drop Zone */}
              <div
                className={`
                  relative border-2 border-dashed rounded-lg p-12 transition-colors
                  ${isDragOver 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                  }
                  ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                `}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <Upload className={`w-8 h-8 text-primary ${isUploading ? 'animate-pulse' : ''}`} />
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-foreground">
                      {isUploading ? 'Processing file...' : 'Drop your CSV file here'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse files
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports CSV files with device image data
                    </p>
                  </div>
                </div>

                <input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isUploading}
                />
              </div>

              {/* Status Messages */}
              {uploadError && (
                <div className="flex items-center justify-center space-x-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <p className="text-sm text-destructive">{uploadError}</p>
                </div>
              )}

              {uploadSuccess && (
                <div className="flex items-center justify-center space-x-2 p-4 bg-success/10 border border-success/20 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <p className="text-sm text-success">{uploadSuccess}</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Sessions */}
          {(isLoadingSessions || recentSessions.length > 0) && (
            <div className="bg-card rounded-lg border border-border shadow-sm p-6">
              <h3 className="text-lg font-medium text-foreground mb-4">
                Recent Sessions {isLoadingSessions && (
                  <span className="text-sm text-muted-foreground">(Loading...)</span>
                )}
              </h3>
              <div className="space-y-3">
                {isLoadingSessions && recentSessions.length === 0 ? (
                  <div className="flex items-center justify-center p-8 text-muted-foreground">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3"></div>
                    Loading sessions from database...
                  </div>
                ) : (
                  recentSessions.map((session) => (
                  <div
                    key={session.session_id}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <div>
                          <h4 className="text-sm font-medium text-foreground truncate">
                            {session.session_name}
                          </h4>
                          <div className="flex items-center space-x-4 mt-1">
                            <p className="text-xs text-muted-foreground">
                              {session.total_rows} devices
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {Math.round(session.progress_percentage)}% complete
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatDate(session.last_updated)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 bg-muted rounded-full h-1.5">
                        <div 
                          className="bg-primary h-1.5 rounded-full transition-all"
                          style={{ width: `${session.progress_percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleResumeSession(session)}
                        disabled={isUploading}
                        className="flex items-center space-x-1 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUploading ? (
                          <>
                            <div className="w-3 h-3 border border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                            <span>Loading...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3" />
                            <span>Continue</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteSession(session.session_id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Resume by Session ID */}
          <div className="bg-muted/30 rounded-lg p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">
              Resume Session by ID
            </h3>
            <div className="flex space-x-3">
              <input
                type="text"
                value={resumeSessionId}
                onChange={(e) => setResumeSessionId(e.target.value)}
                placeholder="Enter session ID (e.g., session_1234567890_abc123def)"
                className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
              <button
                onClick={handleResumeBySessionId}
                disabled={!resumeSessionId.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Resume
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Enter a session ID to resume work from any device or shared session
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-muted/30 rounded-lg p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">
              Expected CSV Format
            </h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Your CSV file should include these columns:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><code className="bg-muted px-1 rounded">product_name</code> - Device name</li>
                <li><code className="bg-muted px-1 rounded">manufacturer</code> - Company name</li>
                <li><code className="bg-muted px-1 rounded">manuf_number</code> - Model number</li>
                <li><code className="bg-muted px-1 rounded">image_urls</code> - Image URLs separated by {'" | "'}</li>
                <li><code className="bg-muted px-1 rounded">manual_urls</code> - Manual URLs (optional)</li>
              </ul>
              <p className="text-xs mt-3">
                Files are processed in batches of 10 devices for optimal performance.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-12">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <p className="text-center text-sm text-muted-foreground">
            Built for medical device image verification and quality control
          </p>
        </div>
      </footer>

      {/* Session Naming Modal */}
      {pendingSessionData && (
        <SessionNamingModal
          isOpen={showNamingModal}
          filename={pendingSessionData.filename}
          deviceCount={pendingSessionData.devices.length}
          defaultName={pendingSessionData.filename.replace('.csv', '')}
          onConfirm={handleSessionNameConfirm}
          onSkip={handleSessionNameSkip}
        />
      )}
    </div>
  );
}
