import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { AppState, AppActions, CheckingSession, DeviceData, ExportOptions } from '@/types/device';

interface AppStore extends AppState, AppActions {
  conflictError: {
    currentVersion: number;
    attemptedVersion: number;
  } | null;
  setConflictError: (error: { currentVersion: number; attemptedVersion: number } | null) => void;
  hasUnsavedChanges: boolean;
  lastSavedAt: string | null;
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial state
  session: null,
  current_batch: 1,
  selected_device_index: 0,
  is_loading: false,
  error: null,
  conflictError: null,
  hasUnsavedChanges: false,
  lastSavedAt: null,

  // Actions
  setSession: (session: CheckingSession) => {
    const batches = Math.ceil(session.devices.length / 10);
    const updatedSession = {
      ...session,
      session_id: session.session_id || uuidv4(),
      total_batches: batches,
      _version: session._version || 1, // Initialize version if not present
      devices: session.devices.map((device, index) => ({
        ...device,
        batch_id: Math.floor(index / 10) + 1,
        row_index: (index % 10) + 1,
        status: device.status || 'pending',
        selected_image_url: device.selected_image_url || device.image_url,
        selected_manual_url: device.selected_manual_url !== undefined
            ? device.selected_manual_url
            : device.manual_url,
        custom_image_url: device.custom_image_url || '',
        custom_type: device.custom_type || '',
        material_category: device.material_category || '',
        material_subcategory: device.material_subcategory || ''
      }))
    };
    
    set({ 
      session: updatedSession, 
      current_batch: updatedSession.current_batch || 1,
      selected_device_index: 0,
      error: null,
      conflictError: null,
      hasUnsavedChanges: false,
      lastSavedAt: null,
    });
  },

  updateDevice: (deviceIndex: number, updates: Partial<DeviceData>) => {
    const { session } = get();
    if (!session) return;

    const updatedDevices = [...session.devices];
    updatedDevices[deviceIndex] = { ...updatedDevices[deviceIndex], ...updates };

    // Calculate progress
    const completedCount = updatedDevices.filter(d => 
      d.status === 'approved' || d.status === 'custom_selected' || d.status === 'rejected'
    ).length;
    const progress = (completedCount / updatedDevices.length) * 100;

    const updatedSession = {
      ...session,
      devices: updatedDevices,
      progress_percentage: progress,
      last_updated: new Date().toISOString()
    };

    set({ session: updatedSession, hasUnsavedChanges: true });
  },

  setCurrentBatch: (batchNumber: number) => {
    const { session } = get();
    if (!session) return;

    const deviceIndex = (batchNumber - 1) * 10;
    set({ 
      current_batch: batchNumber,
      selected_device_index: deviceIndex,
      hasUnsavedChanges: true,
      session: {
        ...session,
        current_batch: batchNumber
      }
    });
  },

  setSelectedDevice: (deviceIndex: number) => {
    set({ selected_device_index: deviceIndex });
  },

  markBatchComplete: (batchNumber: number) => {
    const { session } = get();
    if (!session) return;

    const completedBatches = [...(session.completed_batches || [])];
    if (!completedBatches.includes(batchNumber)) {
      completedBatches.push(batchNumber);
    }

    set({
      session: {
        ...session,
        completed_batches: completedBatches,
        last_updated: new Date().toISOString()
      }
    });
  },

  setLoading: (loading: boolean) => {
    set({ is_loading: loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  setConflictError: (error: { currentVersion: number; attemptedVersion: number } | null) => {
    set({ conflictError: error });
  },

  exportResults: (options: ExportOptions) => {
    const { session } = get();
    if (!session) return;

    let devicesToExport = session.devices;

    if (options.only_completed) {
      devicesToExport = devicesToExport.filter(d => 
        d.status === 'approved' || d.status === 'custom_selected' || d.status === 'rejected'
      );
    }

    const exportData = devicesToExport.map(device => {
      const result: Record<string, unknown> = {
        product_name: device.product_name,
        manufacturer: device.manufacturer,
        manuf_number: device.manuf_number,
        gmdn_terms: device.gmdn_terms,
        custom_type: device.custom_type || '',
        device_id: device.device_id,
        search_query: device.search_query,
        official_product_name: device.official_product_name,
        status: device.status || 'pending',
        'MATERIAL CATEGORY': device.material_category || '',
        'MATERIAL SUBCATEGORY': device.material_subcategory || ''
      };

      if (options.include_all_images) {
        result.image_urls = device.image_urls;
        result.selected_image_url = device.status === 'rejected' ? '' : device.selected_image_url;
        result.custom_image_url = device.custom_image_url || '';
      } else {
        const finalImageUrl = device.status === 'rejected' ? '' : (device.selected_image_url || device.image_url);
        result.image_url = finalImageUrl;
        if (device.custom_image_url) {
          result.custom_image_url = device.custom_image_url;
        }
      }

      if (options.include_manuals) {
        result.manual_url = device.selected_manual_url ?? device.manual_url;
        result.manual_urls = device.manual_urls;
        result.selected_manual_url = device.selected_manual_url;
      }

      result.checker_notes = device.checker_notes || '';

      return result;
    });

    const csvContent = convertToCSV(exportData);
    downloadCSV(csvContent, `${session.filename}_checked.csv`);
  },

  saveProgress: async () => {
    const { session } = get();
    if (session) {
      set({
        session: {
          ...session,
          last_updated: new Date().toISOString()
        }
      });
    }
  },

  loadProgress: async (sessionId: string) => {
    set({ is_loading: true, error: null });
    try {
      await get().loadProgressFromCloud(sessionId);
    } catch (error) {
      console.error('Error loading progress:', error);
      set({ error: 'Failed to load session' });
    } finally {
      set({ is_loading: false });
    }
  },

  saveProgressToCloud: async () => {
    const { session } = get();
    if (!session) {
      console.warn('[SAVE] No session available');
      return;
    }

    const saveTimestamp = new Date().toISOString();
    const currentVersion = session._version || 1;
    
    console.log(`[SAVE START] Session ${session.session_id} - version ${currentVersion}, ${session.devices.length} devices, progress: ${session.progress_percentage.toFixed(1)}%`);

    try {
      const sessionToSave = {
        ...session,
        last_updated: saveTimestamp
      };

      // Compress the data to reduce payload size (7.9MB -> ~1-2MB)
      const jsonString = JSON.stringify(sessionToSave);
      const originalSize = new Blob([jsonString]).size;
      console.log(`[SAVE] Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);

      const encoder = new TextEncoder();
      const jsonBytes = encoder.encode(jsonString);
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(jsonBytes);
          controller.close();
        }
      });
      
      const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
      const compressedBlob = await new Response(compressedStream).blob();
      const compressedSize = compressedBlob.size;
      console.log(`[SAVE] Compressed size: ${(compressedSize / 1024 / 1024).toFixed(2)} MB (${((1 - compressedSize / originalSize) * 100).toFixed(1)}% reduction)`);

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/gzip',
          'Content-Encoding': 'gzip',
        },
        body: compressedBlob,
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle conflict error (409)
        if (response.status === 409 && errorData.error === 'CONFLICT') {
          console.error('[SAVE CONFLICT] Version mismatch detected:', errorData);
          set({
            conflictError: {
              currentVersion: errorData.currentVersion,
              attemptedVersion: errorData.attemptedVersion,
            },
            error: 'Your changes conflict with recent updates. Please refresh and try again.'
          });
          throw new Error('CONFLICT: ' + errorData.message);
        }

        throw new Error(`Server returned ${response.status}: ${errorData.message || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log(`[SAVE SUCCESS] Session ${session.session_id} saved (version ${currentVersion} → ${result.version})`);

      // Update local session with new version and timestamp
      set({
        session: {
          ...session,
          last_updated: result.lastSaved,
          _version: result.version,
        },
        conflictError: null, // Clear any previous conflict errors
        hasUnsavedChanges: false,
        lastSavedAt: new Date().toISOString(),
      });

    } catch (error) {
      console.error('[SAVE ERROR] Failed to save session:', error);
      console.error('[SAVE ERROR] Session ID:', session.session_id);
      console.error('[SAVE ERROR] Device count:', session.devices.length);
      throw error;
    }
  },

  loadProgressFromCloud: async (sessionId: string) => {
    console.log(`[LOAD START] Loading session ${sessionId}`);
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Session not found');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load session');
      }

      const result = await response.json();
      
      if (!result.success || !result.session) {
        throw new Error('Invalid session data received');
      }

      console.log(`[LOAD SUCCESS] Session ${sessionId} loaded (version ${result.session._version})`);
      
      // Use setSession to properly initialize the session
      get().setSession(result.session);

    } catch (error) {
      console.error('[LOAD ERROR] Failed to load session:', error);
      throw error;
    }
  }
}));

// Utility functions
function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header] ?? '';
        return typeof value === 'string' && (value.includes(',') || value.includes('"'))
          ? `"${value.replace(/"/g, '""')}"` 
          : value;
      }).join(',')
    )
  ];

  return csvRows.join('\n');
}

function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Utility hooks
export const useCurrentBatch = () => {
  const { session, current_batch } = useAppStore();
  
  if (!session) return null;
  
  const startIndex = (current_batch - 1) * 10;
  const endIndex = Math.min(startIndex + 10, session.devices.length);
  const devices = session.devices.slice(startIndex, endIndex);
  
  return {
    batch_number: current_batch,
    devices,
    completed_count: devices.filter(d => d.status === 'approved' || d.status === 'custom_selected' || d.status === 'rejected').length,
    total_count: devices.length,
    is_completed: devices.every(d => d.status === 'approved' || d.status === 'custom_selected' || d.status === 'rejected' || d.status === 'skipped')
  };
};

export const useCurrentDevice = () => {
  const { session, selected_device_index } = useAppStore();
  
  if (!session || selected_device_index >= session.devices.length) {
    return null;
  }
  
  return session.devices[selected_device_index];
};
