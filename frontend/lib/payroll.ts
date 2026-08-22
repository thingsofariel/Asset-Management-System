import { api } from './api';

export type EmploymentStatus = 'PERMANENT' | 'CONTRACT' | 'FREELANCE' | 'INTERN';
export type PayslipStatus = 'DRAFT' | 'FINALIZED' | 'SENT' | 'ARCHIVED';
export type EarningCategory = 'ALLOWANCE' | 'BONUS' | 'OVERTIME' | 'INCENTIVE' | 'OTHER';
export type DeductionCategory = 'BPJS_HEALTH' | 'BPJS_PENSION' | 'PPH21_TAX' | 'ABSENCE_PENALTY' | 'SALARY_ADVANCE' | 'OTHER';

export interface Employee {
  employeeId: number;
  jobTitle: string;
  employmentStatus: EmploymentStatus;
  bankAccountNo: string;
  createdAt: string;
  user: { id: string; fullName: string; email: string; role: 'ADMIN' | 'EMPLOYEE'; avatarUrl: string | null; status: string };
}

export interface LineItem {
  label: string;
  category?: string;
  amount: number;
}

export interface Payslip {
  payslipId: number;
  employeeId: number;
  periodMonth: number;
  periodYear: number;
  issueDate: string;
  issueLocation: string;
  basicSalary: string;
  totalEarnings: string;
  totalDeductions: string;
  netPay: string;
  authorizedSignatory: string;
  status: PayslipStatus;
  shareToken: string | null;
  employee?: { user: { fullName: string } };
  earningDetails?: { earningId: number; label: string; amount: string }[];
  deductionDetails?: { deductionId: number; label: string; amount: string }[];
}

// ---- Employees (ADMIN only, enforced server-side) ----

export async function listEmployees(): Promise<Employee[]> {
  return (await api.get('/employees')).data;
}

export async function getMyEmployeeRecord(): Promise<Employee> {
  return (await api.get('/employees/me')).data;
}

export interface CreateEmployeeInput {
  fullName: string;
  email: string;
  jobTitle: string;
  bankAccountNo: string;
  employmentStatus?: EmploymentStatus;
}

// No password here — this goes through the same admin-invite flow as
// everywhere else in the app. The response's inviteLink has to be
// shared with the new hire manually (there's no automatic mailer yet).
export async function createEmployee(data: CreateEmployeeInput) {
  return (await api.post('/employees', data)).data as { employee: Employee; inviteLink: string };
}

export async function updateEmployee(employeeId: number, data: Partial<CreateEmployeeInput>) {
  return (await api.patch(`/employees/${employeeId}`, data)).data;
}

export async function deleteEmployee(employeeId: number) {
  return api.delete(`/employees/${employeeId}`);
}

// ---- Payslips ----

export async function listPayslips(params?: { employeeId?: number }): Promise<Payslip[]> {
  return (await api.get('/payslips', { params })).data;
}

export async function getPayslip(payslipId: number): Promise<Payslip> {
  return (await api.get(`/payslips/${payslipId}`)).data;
}

export interface CreatePayslipInput {
  employeeId: number;
  periodMonth: number;
  periodYear: number;
  issueDate: string;
  issueLocation: string;
  basicSalary: number;
  authorizedSignatory: string;
  earnings: LineItem[];
  deductions: LineItem[];
}

export async function createPayslip(data: CreatePayslipInput): Promise<Payslip> {
  return (await api.post('/payslips', data)).data;
}

export async function finalizePayslip(payslipId: number): Promise<Payslip> {
  return (await api.patch(`/payslips/${payslipId}/finalize`, {})).data;
}

export async function markPayslipSent(payslipId: number): Promise<Payslip> {
  return (await api.patch(`/payslips/${payslipId}/mark-sent`, {})).data;
}

export async function getShareLink(payslipId: number): Promise<{ link: string }> {
  return (await api.post(`/payslips/${payslipId}/share-link`, {})).data;
}

// Fetched as a blob with the auth header attached manually, since a
// plain <a href> or window.open() can't send custom headers — this
// keeps the JWT out of the URL entirely.
export async function downloadPayslipPdf(payslipId: number): Promise<void> {
  const res = await api.get(`/payslips/${payslipId}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `payslip-${payslipId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadSharedPayslipPdf(shareToken: string): Promise<Blob> {
  const res = await api.get(`/payslips/share/${shareToken}/pdf`, { responseType: 'blob' });
  return res.data;
}

export async function bulkImportPayslips(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return (await api.post('/payslips/bulk-import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })).data;
}

export async function bulkImportStatus(batchId: string) {
  return (await api.get(`/payslips/bulk-import/${batchId}/status`)).data;
}

export function formatIDR(amount: string | number): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return 'Rp ' + value.toLocaleString('id-ID', { minimumFractionDigits: 0 });
}

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
export function monthName(month: number): string {
  return MONTH_NAMES_ID[month - 1] ?? String(month);
}
