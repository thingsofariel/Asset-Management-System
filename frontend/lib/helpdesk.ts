import { api } from './api';

// Mirrors the unified backend's Prisma enums — uppercase, unlike the
// original Help Desk frontend which used lowercase strings and numeric
// priority (1/2/3). Every value here had to change shape, not just name.
export type RequestStatus = 'OPEN' | 'ACCEPTED' | 'DENIED' | 'IN_PROGRESS' | 'DONE' | 'CLOSED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface HelpdeskCategory {
  id: number;
  name: string;
  parentId: number | null;
  defaultPriority: Priority;
}

export interface HelpdeskRequest {
  id: number;
  publicCode: string;
  fullName: string;
  email: string;
  phone: string;
  categoryId: number | null;
  customCategoryText: string | null;
  description: string;
  attachmentUrl: string | null;
  status: RequestStatus;
  priority: Priority;
  denialReason: string | null;
  createdAt: string;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  closedAt: string | null;
  category?: { name: string } | null;
  review?: { rating: number; comment: string | null } | null;
}

export const STATUS_META: Record<RequestStatus, { label: string; dot: string; text: string; soft: string }> = {
  OPEN: { label: 'Waiting for review', dot: 'bg-request-open', text: 'text-request-open', soft: 'bg-request-open/10' },
  ACCEPTED: { label: 'Accepted', dot: 'bg-request-accepted', text: 'text-request-accepted', soft: 'bg-request-accepted/10' },
  DENIED: { label: 'Not accepted', dot: 'bg-request-denied', text: 'text-request-denied', soft: 'bg-request-denied/10' },
  IN_PROGRESS: { label: 'In progress', dot: 'bg-request-progress', text: 'text-request-progress', soft: 'bg-request-progress/10' },
  DONE: { label: 'Resolved — awaiting your review', dot: 'bg-request-done', text: 'text-request-done', soft: 'bg-request-done/10' },
  CLOSED: { label: 'Closed', dot: 'bg-request-closed', text: 'text-request-closed', soft: 'bg-request-closed/10' },
};

export const PRIORITY_META: Record<Priority, { label: string; dot: string; text: string; soft: string }> = {
  LOW: { label: 'Low', dot: 'bg-request-closed', text: 'text-request-closed', soft: 'bg-request-closed/10' },
  MEDIUM: { label: 'Medium', dot: 'bg-request-accepted', text: 'text-request-accepted', soft: 'bg-request-accepted/10' },
  HIGH: { label: 'High', dot: 'bg-request-denied', text: 'text-request-denied', soft: 'bg-request-denied/10' },
};

export const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'HIGH', label: 'High — blocking my work' },
  { value: 'MEDIUM', label: 'Medium — annoying but workable' },
  { value: 'LOW', label: 'Low — minor, whenever works' },
];

export const STATUS_TABS: { value: RequestStatus | ''; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'DONE', label: 'Done' },
  { value: 'DENIED', label: 'Denied' },
  { value: 'CLOSED', label: 'Closed' },
  { value: '', label: 'All' },
];

export const MAX_DESCRIPTION_LENGTH = 1000;
export const MAX_UPLOAD_MB = 10;
export const ACCEPTED_FILE_TYPES = '.doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,.png,.jpg,.jpeg,.webp,.gif';

export function formatDateTime(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatFullDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

// ---- Public (no auth) ----

export async function getCategories(): Promise<HelpdeskCategory[]> {
  const res = await api.get('/helpdesk/categories');
  return res.data;
}

export async function createRequest(formData: FormData) {
  const res = await api.post('/requests', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data as { message: string; publicCode: string; hubLink: string; request: HelpdeskRequest };
}

export async function lookupRequest(code: string): Promise<HelpdeskRequest> {
  const res = await api.get(`/requests/lookup/${encodeURIComponent(code)}`);
  return res.data;
}

export async function submitReview(code: string, data: { rating: number; comment?: string }) {
  const res = await api.post(`/requests/lookup/${encodeURIComponent(code)}/review`, data);
  return res.data;
}

// ---- Admin (ADMIN role required) ----

export async function listRequests(params: { status?: RequestStatus; priority?: Priority }): Promise<HelpdeskRequest[]> {
  const res = await api.get('/requests', { params });
  return res.data;
}

export const acceptRequest = (id: number) => api.patch(`/requests/${id}/accept`, {});
export const denyRequest = (id: number, reason: string) => api.patch(`/requests/${id}/deny`, { reason });
export const startRequest = (id: number) => api.patch(`/requests/${id}/start`, {});
export const completeRequest = (id: number) => api.patch(`/requests/${id}/complete`, {});

export const createCategory = (data: { name: string; parentId?: number | null; defaultPriority: Priority }) =>
  api.post('/helpdesk/categories', data);
export const updateCategory = (id: number, data: { name?: string; defaultPriority?: Priority }) =>
  api.patch(`/helpdesk/categories/${id}`, data);

export async function dashboardStats(month?: string) {
  const res = await api.get('/helpdesk/reports/dashboard', { params: month ? { month } : undefined });
  return res.data;
}

export interface ReportRow {
  no: number;
  fullName: string;
  phone: string;
  email: string;
  issueType: string;
  description: string;
  attachmentUrl: string | null;
  publicCode: string;
  status: RequestStatus;
  createdAt: string;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  closedAt: string | null;
}

export async function reportRows(params: { month?: string; status?: RequestStatus | '' }) {
  const res = await api.get('/helpdesk/reports/requests', {
    params: { month: params.month, status: params.status || undefined },
  });
  return res.data as { month: string; status: string; rows: ReportRow[] };
}

export async function exportReport(params: { month?: string; status?: RequestStatus | '' }) {
  const res = await api.get('/helpdesk/reports/export', {
    params: { month: params.month, status: params.status || undefined },
    responseType: 'blob',
  });
  const disposition = res.headers['content-disposition'] || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : 'helpdesk-report.xlsx';

  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
