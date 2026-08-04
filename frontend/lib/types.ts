export type AssetType = 'FIXED' | 'ELECTRONIC';
export type AssetStatus = 'GOOD' | 'REQUIRES_MAINTENANCE' | 'UNDER_REPAIR' | 'UNSERVICEABLE' | 'DISPOSED';

export interface Category {
  id: string;
  name: string;
  assetType: AssetType;
}

export interface Location {
  id: string;
  building?: string | null;
  floor?: string | null;
  room: string;
}

export interface Department {
  id: string;
  name: string;
}

export interface Asset {
  id: string;
  assetCode: string;
  name: string;
  categoryId: string;
  category?: Category;
  assetType: AssetType;
  brand?: string | null;
  serialNumber?: string | null;
  specifications?: Record<string, string> | null;
  purchaseDate?: string | null;
  purchaseCost?: number | null;
  warrantyExpiry?: string | null;
  locationId?: string | null;
  location?: Location | null;
  departmentId?: string | null;
  department?: Department | null;
  currentHolderId?: string | null;
  status: AssetStatus;
  qrImageUrl?: string | null;
  createdAt: string;
  attachments?: Attachment[];
  maintenanceSchedules?: MaintenanceSchedule[];
  maintenanceLogs?: MaintenanceLog[];
}

export interface Attachment {
  id: string;
  assetId: string;
  fileUrl: string;
  fileType: 'PHOTO' | 'INVOICE' | 'OTHER';
  notes?: string | null;
  createdAt: string;
}

export interface MaintenanceSchedule {
  id: string;
  assetId: string;
  asset?: { id: string; name: string; assetCode: string; status?: AssetStatus };
  intervalMonths: number;
  lastServiceDate?: string | null;
  nextDueDate: string;
  isActive: boolean;
}

export interface MaintenanceLog {
  id: string;
  assetId: string;
  scheduleId?: string | null;
  serviceDate: string;
  vendorName?: string | null;
  technicianName?: string | null;
  partsReplaced?: string | null;
  cost?: number | null;
  notes?: string | null;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  relatedAsset?: { id: string; name: string; assetCode: string } | null;
  isRead: boolean;
  createdAt: string;
}

export const STATUS_LABELS: Record<AssetStatus, string> = {
  GOOD: 'Good',
  REQUIRES_MAINTENANCE: 'Requires Maintenance',
  UNDER_REPAIR: 'Under Repair',
  UNSERVICEABLE: 'Unserviceable',
  DISPOSED: 'Disposed',
};

export const STATUS_COLORS: Record<AssetStatus, string> = {
  GOOD: 'text-status-good bg-status-good/10',
  REQUIRES_MAINTENANCE: 'text-status-maintenance bg-status-maintenance/10',
  UNDER_REPAIR: 'text-status-repair bg-status-repair/10',
  UNSERVICEABLE: 'text-status-scrap bg-status-scrap/10',
  DISPOSED: 'text-status-scrap bg-status-scrap/10',
};
