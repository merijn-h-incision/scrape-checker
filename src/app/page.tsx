'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { parseCSVFile, createSessionFromDevices } from '@/utils/csvParser';

export default function HomePage() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const router = useRouter();
  const { setSession, setLoading } = useAppStore();

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

      const session = createSessionFromDevices(result.data, file.name);
      setSession(session);
      
      setUploadSuccess(`Successfully loaded ${result.data.length} devices!`);
      
      // Navigate to checking interface after a short delay
      setTimeout(() => {
        router.push(`/check/${session.id}`);
      }, 1500);

    } catch (error) {
      setUploadError(
        error instanceof Error 
          ? error.message 
          : 'Failed to process the CSV file. Please check the format.'
      );
    } finally {
      setIsUploading(false);
    }
  }, [setSession, router]);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
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
                <li><code className="bg-muted px-1 rounded">image_urls</code> - Image URLs separated by " | "</li>
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
    </div>
  );
}
