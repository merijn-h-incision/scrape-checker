'use client';

import { useState } from 'react';
import { X, Download, FileText, Settings } from 'lucide-react';
import type { ExportOptions } from '@/types/device';

interface ExportModalProps {
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
}

export function ExportModal({ onClose, onExport }: ExportModalProps) {
  const [options, setOptions] = useState<ExportOptions>({
    include_all_images: false,
    include_manuals: true,
    only_completed: true,
    include_notes: true
  });

  const handleExport = () => {
    onExport(options);
  };

  const updateOption = (key: keyof ExportOptions, value: boolean) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-2">
            <Download className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Export Results</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Export Options</span>
            </h3>

            {/* Device Filter */}
            <div className="space-y-3">
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={options.only_completed}
                  onChange={(e) => updateOption('only_completed', e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-primary focus:ring-primary border-border rounded"
                />
                <div>
                  <span className="text-sm font-medium text-foreground">
                    Only completed devices
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Export only devices that have been approved or custom selected
                  </p>
                </div>
              </label>
            </div>

            {/* Image Options */}
            <div className="space-y-3">
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={options.include_all_images}
                  onChange={(e) => updateOption('include_all_images', e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-primary focus:ring-primary border-border rounded"
                />
                <div>
                  <span className="text-sm font-medium text-foreground">
                    Include all image URLs
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Include both selected image and alternative images
                  </p>
                </div>
              </label>
            </div>

            {/* Manual Options */}
            <div className="space-y-3">
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={options.include_manuals}
                  onChange={(e) => updateOption('include_manuals', e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-primary focus:ring-primary border-border rounded"
                />
                <div>
                  <span className="text-sm font-medium text-foreground">
                    Include manual URLs
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Include links to device manuals and documentation
                  </p>
                </div>
              </label>
            </div>

            {/* Notes Options */}
            <div className="space-y-3">
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={options.include_notes}
                  onChange={(e) => updateOption('include_notes', e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-primary focus:ring-primary border-border rounded"
                />
                <div>
                  <span className="text-sm font-medium text-foreground">
                    Include checker notes
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Include any notes added during the checking process
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="text-sm font-medium text-foreground mb-2">Export Preview</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>• Core device information (name, manufacturer, model)</p>
              <p>• Device status and selection information</p>
              {options.include_all_images ? (
                <p>• Selected image URL + all alternative images</p>
              ) : (
                <p>• Selected image URL only</p>
              )}
              {options.include_manuals && <p>• Manual and documentation URLs</p>}
              {options.include_notes && <p>• Checker notes and comments</p>}
              {options.only_completed && <p>• Only approved/custom selected devices</p>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
} 