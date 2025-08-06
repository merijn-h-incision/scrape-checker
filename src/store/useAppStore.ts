import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState, AppActions, CheckingSession, DeviceData, ExportOptions } from '@/types/device';

interface AppStore extends AppState, AppActions {}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      session: null,
      current_batch: 1,
      selected_device_index: 0,
      is_loading: false,
      error: null,

      // Actions
      setSession: (session: CheckingSession) => {
        const batches = Math.ceil(session.devices.length / 10);
        const updatedSession = {
          ...session,
          total_batches: batches,
          devices: session.devices.map((device, index) => ({
            ...device,
            batch_id: Math.floor(index / 10) + 1,
            row_index: (index % 10) + 1,
            status: device.status || 'pending',
            selected_image_url: device.selected_image_url || device.image_url,
            selected_manual_url: device.selected_manual_url || device.manual_url,
            material_category: device.material_category || '',
            material_subcategory: device.material_subcategory || ''
          }))
        };
        
        set({ 
          session: updatedSession, 
          current_batch: updatedSession.current_batch || 1,
          selected_device_index: 0,
          error: null 
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

        set({
          session: {
            ...session,
            devices: updatedDevices,
            progress_percentage: progress,
            last_updated: new Date().toISOString()
          }
        });
      },

      setCurrentBatch: (batchNumber: number) => {
        const { session } = get();
        if (!session) return;

        const deviceIndex = (batchNumber - 1) * 10;
        set({ 
          current_batch: batchNumber,
          selected_device_index: deviceIndex,
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

      exportResults: (options: ExportOptions) => {
        const { session } = get();
        if (!session) return;

        let devicesToExport = session.devices;

        // Filter devices based on options
        if (options.only_completed) {
          devicesToExport = devicesToExport.filter(d => 
            d.status === 'approved' || d.status === 'custom_selected' || d.status === 'rejected'
          );
        }

                  // Prepare export data
        const exportData = devicesToExport.map(device => {
          const result: Record<string, unknown> = {
            product_name: device.product_name,
            manufacturer: device.manufacturer,
            manuf_number: device.manuf_number,
            gmdn_terms: device.gmdn_terms,
            device_id: device.device_id,
            search_query: device.search_query,
            official_product_name: device.official_product_name,
            status: device.status || 'pending',
            'MATERIAL CATEGORY': device.material_category || '',
            'MATERIAL SUBCATEGORY': device.material_subcategory || ''
          };

          // Handle image URLs based on options
          if (options.include_all_images) {
            result.image_urls = device.image_urls;
            result.selected_image_url = device.selected_image_url;
          } else {
            result.image_url = device.selected_image_url || device.image_url;
          }

          // Include manuals if requested
          if (options.include_manuals) {
            result.manual_url = device.selected_manual_url || device.manual_url;
            result.manual_urls = device.manual_urls;
            result.selected_manual_url = device.selected_manual_url;
          }

          // Include notes if requested
          if (options.include_notes && device.checker_notes) {
            result.checker_notes = device.checker_notes;
          }

          return result;
        });

        // Convert to CSV and download
        const csvContent = convertToCSV(exportData);
        downloadCSV(csvContent, `${session.filename}_checked.csv`);
      },

      saveProgress: () => {
        // Progress is automatically saved via persist middleware
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

      loadProgress: () => {
        // This will be handled by the persist middleware
        // Additional loading logic can be added here if needed
        set({ is_loading: true });
        
        // Simulate loading delay
        setTimeout(() => {
          set({ is_loading: false });
        }, 1000);
      }
    }),
    {
      name: 'image-checker-session',
      partialize: (state) => ({
        session: state.session,
        current_batch: state.current_batch,
        selected_device_index: state.selected_device_index
      })
    }
  )
);

// Utility functions
function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header] ?? '';
        // Escape commas and quotes in CSV values
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