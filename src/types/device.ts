export interface DeviceData {
  // Core device information
  product_name: string;
  manufacturer: string;
  manuf_number: string;
  gmdn_terms: string;
  device_id: string;
  
  // Search information
  search_query: string;
  image_query: string;
  manual_query: string;
  official_product_name: string;
  
  // Image URLs (pipe-separated in CSV)
  image_url: string;  // Primary image
  image_urls: string; // All images (pipe-separated)
  
  // Manual URLs (pipe-separated in CSV)
  manual_url: string;   // Primary manual
  manual_urls: string;  // All manuals (pipe-separated)
  
  // Checking status (added by app)
  status?: DeviceStatus;
  selected_image_url?: string;
  selected_manual_url?: string;
  checker_notes?: string;
  batch_id?: number;
  row_index?: number;
  
  // Material categorization (added by app)
  material_category?: string;
  material_subcategory?: string;
}

export type DeviceStatus = 'pending' | 'approved' | 'custom_selected' | 'skipped' | 'rejected';

export interface CheckingSession {
  id: string;
  session_id: string;
  session_name: string; // User-friendly session name
  filename: string;
  total_rows: number;
  total_batches: number;
  current_batch: number;
  completed_batches: number[];
  progress_percentage: number;
  devices: DeviceData[];
  created_at: string;
  last_updated: string;
  blob_url?: string; // URL returned from Vercel Blob
}

export interface BatchInfo {
  batch_number: number;
  devices: DeviceData[];
  completed_count: number;
  total_count: number;
  is_current: boolean;
  is_completed: boolean;
}

export interface ImageInfo {
  url: string;
  is_primary: boolean;
  is_selected: boolean;
  loading_error?: boolean;
}

export interface ExportOptions {
  include_all_images: boolean;
  include_manuals: boolean;
  only_completed: boolean;
  include_notes: boolean;
}

export interface SessionMetadata {
  session_id: string;
  session_name: string;
  filename: string;
  total_rows: number;
  progress_percentage: number;
  last_updated: string;
  created_at: string;
  blob_url?: string; // URL to blob storage for resuming sessions
}

// Store state interface
export interface AppState {
  session: CheckingSession | null;
  current_batch: number;
  selected_device_index: number;
  is_loading: boolean;
  error: string | null;
}

// Action types for state management
export interface AppActions {
  setSession: (session: CheckingSession) => void;
  updateDevice: (deviceIndex: number, updates: Partial<DeviceData>) => void;
  setCurrentBatch: (batchNumber: number) => void;
  setSelectedDevice: (deviceIndex: number) => void;
  markBatchComplete: (batchNumber: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  exportResults: (options: ExportOptions) => void;
  saveProgress: () => Promise<void>;
  loadProgress: (sessionId: string) => Promise<void>;
  saveProgressToCloud: () => Promise<void>;
  loadProgressFromCloud: (sessionId: string) => Promise<void>;
}

// CSV parsing types
export interface CSVParseResult {
  data: DeviceData[];
  errors: string[];
  meta: {
    delimiter: string;
    linebreak: string;
    aborted: boolean;
    truncated: boolean;
    cursor: number;
  };
} 