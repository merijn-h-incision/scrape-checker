import Papa from 'papaparse';
import type { DeviceData, CSVParseResult, CheckingSession } from '@/types/device';

export function parseCSVFile(file: File): Promise<CSVParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      transform: (value: string) => value.trim(),
      complete: (results) => {
        try {
          const devices = validateAndTransformDevices(results.data as Record<string, unknown>[]);
          resolve({
            data: devices,
            errors: results.errors.map(err => err.message),
            meta: results.meta
          });
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      }
    });
  });
}

function validateAndTransformDevices(rawData: Record<string, unknown>[]): DeviceData[] {
  return rawData.map((row) => {
    // Get image URLs and handle empty cases gracefully
    const imageUrls = row.image_urls?.split('|').map((url: string) => url.trim()).filter(Boolean) || [];
    
    // If no image URLs, we'll still create the device but with empty image fields
    // This allows the user to see the device in the interface even if no images are available

    return {
      product_name: row.product_name || '',
      manufacturer: row.manufacturer || '',
      manuf_number: row.manuf_number || '',
      gmdn_terms: row.gmdn_terms || '',
      device_id: row.device_id || '',
      search_query: row.search_query || '',
      image_query: row.image_query || '',
      manual_query: row.manual_query || '',
      official_product_name: row.official_product_name || '',
      image_url: row.image_url || imageUrls[0] || '',
      image_urls: row.image_urls || '',
      manual_url: row.manual_url || '',
      manual_urls: row.manual_urls || '',
      status: 'pending' as const,
      selected_image_url: row.image_url || imageUrls[0] || ''
    };
  });
}

export function createSessionFromDevices(devices: DeviceData[], filename: string): CheckingSession {
  const sessionId = generateSessionId();
  const totalBatches = Math.ceil(devices.length / 10);
  
  return {
    id: sessionId,
    filename: filename.replace('.csv', ''),
    total_rows: devices.length,
    total_batches: totalBatches,
    current_batch: 1,
    completed_batches: [],
    progress_percentage: 0,
    devices,
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString()
  };
}

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function getImageUrls(device: DeviceData): string[] {
  if (!device.image_urls) return [];
  return device.image_urls
    .split('|')
    .map(url => url.trim())
    .filter(Boolean);
}

export function getManualUrls(device: DeviceData): string[] {
  if (!device.manual_urls) return [];
  return device.manual_urls
    .split('|')
    .map(url => url.trim())
    .filter(Boolean);
}

export function validateImageUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function formatDeviceTitle(device: DeviceData): string {
  const parts = [
    device.product_name,
    device.manufacturer,
    device.manuf_number
  ].filter(Boolean);
  
  return parts.join(' - ');
}

export function calculateBatchProgress(devices: DeviceData[], batchNumber: number): {
  completed: number;
  total: number;
  percentage: number;
} {
  const startIndex = (batchNumber - 1) * 10;
  const endIndex = Math.min(startIndex + 10, devices.length);
  const batchDevices = devices.slice(startIndex, endIndex);
  
  const completed = batchDevices.filter(d => 
    d.status === 'approved' || d.status === 'custom_selected'
  ).length;
  
  return {
    completed,
    total: batchDevices.length,
    percentage: (completed / batchDevices.length) * 100
  };
}

export function getStatusColor(status: DeviceData['status']): string {
  switch (status) {
    case 'approved':
      return 'bg-success text-white';
    case 'custom_selected':
      return 'bg-primary text-white';
    case 'skipped':
      return 'bg-muted text-muted-foreground';
    case 'flagged':
      return 'bg-warning text-white';
    default:
      return 'bg-accent text-accent-foreground';
  }
}

export function getStatusLabel(status: DeviceData['status']): string {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'custom_selected':
      return 'Custom';
    case 'skipped':
      return 'Skipped';
    case 'flagged':
      return 'Flagged';
    default:
      return 'Pending';
  }
} 