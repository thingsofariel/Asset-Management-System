'use client';

import { useEffect, useState } from 'react';
import { Plus, Download, Link2, Check, Send, Upload, Trash2 } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import { useToast } from '@/components/ToastProvider';
import {
  listPayslips,
  listEmployees,
  createPayslip,
  finalizePayslip,
  markPayslipSent,
  getShareLink,
  downloadPayslipPdf,
  bulkImportPayslips,
  Payslip,
  Employee,
  LineItem,
  formatIDR,
  monthName,
} from '@/lib/payroll';

const STATUS_LABEL: Record<Payslip['status'], string> = {
  DRAFT: 'Draft',
  FINALIZED: 'Finalized',
  SENT: 'Sent',
  ARCHIVED: 'Archived',
};

const emptyForm = () => ({
  employeeId: '',
  periodMonth: String(new Date().getMonth() + 1),
  periodYear: String(new Date().getFullYear()),
  issueDate: new Date().toISOString().slice(0, 10),
  issueLocation: 'Kupang',
  basicSalary: '',
  authorizedSignatory: '',
  earnings: [] as LineItem[],
  deductions: [] as LineItem[],
});

export default function PayslipsPage() {
  const toast = useToast();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [rowError, setRowError] = useState<{ id: number | null; text: string }>({ id: null, text: '' });

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function load() {
    listPayslips().then(setPayslips);
  }
  useEffect(() => {
    load();
    listEmployees().then(setEmployees);
  }, []);

  // Creates the payslip, then immediately finalizes it (generates the
  // PDF) in the same submit action — same deliberate UX decision as
  // the original: one form, one ready payslip, no separate
  // draft/finalize step for HR to remember.
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await createPayslip({
        employeeId: Number(form.employeeId),
        periodMonth: Number(form.periodMonth),
        periodYear: Number(form.periodYear),
        issueDate: form.issueDate,
        issueLocation: form.issueLocation,
        basicSalary: Number(form.basicSalary),
        authorizedSignatory: form.authorizedSignatory,
        earnings: form.earnings.filter((r) => r.label && r.amount),
        deductions: form.deductions.filter((r) => r.label && r.amount),
      });
      try {
        await finalizePayslip(created.payslipId);
        toast.success('Payslip created and finalized');
      } catch (finalizeErr: any) {
        // The payslip record exists (as DRAFT) even though finalize
        // failed — surface that clearly rather than pretending nothing happened.
        toast.error(`Created, but finalizing failed: ${finalizeErr?.response?.data?.message ?? 'unknown error'}. Saved as draft.`);
      }
      setForm(emptyForm());
      setShowCreate(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not create payslip.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload(p: Payslip) {
    setBusyId(p.payslipId);
    setRowError({ id: null, text: '' });
    try {
      await downloadPayslipPdf(p.payslipId);
    } catch {
      setRowError({ id: p.payslipId, text: 'Could not download the PDF.' });
    } finally {
      setBusyId(null);
    }
  }

  // Access to the link itself is still fully gated server-side (owner
  // or ADMIN only) — this button just fetches/copies the URL.
  async function handleCopyLink(p: Payslip) {
    setBusyId(p.payslipId);
    try {
      const { link } = await getShareLink(p.payslipId);
      await navigator.clipboard.writeText(link);
      setCopiedId(p.payslipId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setRowError({ id: p.payslipId, text: 'Could not create a share link.' });
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkSent(p: Payslip) {
    setBusyId(p.payslipId);
    try {
      await markPayslipSent(p.payslipId);
      load();
    } catch {
      setRowError({ id: p.payslipId, text: 'Could not mark as sent.' });
    } finally {
      setBusyId(null);
    }
  }

  async function handleBulkImport(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setImportMessage(null);
    try {
      const res = await bulkImportPayslips(file);
      setImportMessage({ type: 'success', text: res.message ?? `${res.queuedCount} row(s) queued.` });
      setFile(null);
      load();
    } catch (err: any) {
      setImportMessage({ type: 'error', text: err?.response?.data?.error ?? err?.response?.data?.message ?? 'Import failed.' });
    } finally {
      setUploading(false);
    }
  }

  function addRow(kind: 'earnings' | 'deductions') {
    setForm((f) => ({ ...f, [kind]: [...f[kind], { label: '', amount: 0 }] }));
  }
  function updateRow(kind: 'earnings' | 'deductions', idx: number, field: 'label' | 'amount', value: string) {
    setForm((f) => ({
      ...f,
      [kind]: f[kind].map((row, i) => (i === idx ? { ...row, [field]: field === 'amount' ? Number(value) : value } : row)),
    }));
  }
  function removeRow(kind: 'earnings' | 'deductions', idx: number) {
    setForm((f) => ({ ...f, [kind]: f[kind].filter((_, i) => i !== idx) }));
  }

  return (
    <main className="min-h-screen bg-bg pl-20">
      <AppHeader />
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display font-bold text-2xl text-primary">Payslips</h1>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-primary text-white rounded-md px-4 py-2.5 text-sm font-medium">
            <Plus className="w-4 h-4" /> Create payslip
          </button>
        </div>

        <form onSubmit={handleBulkImport} className="bg-surface border border-border rounded-lg p-4 mb-6 flex items-center gap-3">
          <Upload className="w-4 h-4 text-muted shrink-0" />
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="flex-1 text-sm text-muted"
          />
          <button disabled={!file || uploading} className="bg-primary text-white rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50">
            {uploading ? 'Uploading…' : 'Bulk import CSV'}
          </button>
        </form>
        {importMessage && (
          <p className={`text-sm mb-6 ${importMessage.type === 'error' ? 'text-status-repair' : 'text-status-good'}`}>{importMessage.text}</p>
        )}

        <div className="bg-surface border border-border rounded-lg divide-y divide-border">
          {payslips.map((p) => (
            <div key={p.payslipId} className="px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-text">
                    {p.employee?.user.fullName} — {monthName(p.periodMonth)} {p.periodYear}
                  </p>
                  <p className="text-xs text-muted">
                    {STATUS_LABEL[p.status]} · {formatIDR(p.netPay)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {p.status !== 'DRAFT' && (
                    <>
                      <IconButton icon={Download} onClick={() => handleDownload(p)} disabled={busyId === p.payslipId} title="Download PDF" />
                      <IconButton
                        icon={copiedId === p.payslipId ? Check : Link2}
                        onClick={() => handleCopyLink(p)}
                        disabled={busyId === p.payslipId}
                        title="Copy share link"
                      />
                    </>
                  )}
                  {p.status === 'FINALIZED' && (
                    <IconButton icon={Send} onClick={() => handleMarkSent(p)} disabled={busyId === p.payslipId} title="Mark as sent" />
                  )}
                </div>
              </div>
              {rowError.id === p.payslipId && <p className="text-xs text-status-repair mt-2">{rowError.text}</p>}
            </div>
          ))}
          {payslips.length === 0 && <p className="text-sm text-muted px-5 py-8 text-center">No payslips yet.</p>}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="bg-surface border border-border rounded-lg p-6 max-w-lg w-full my-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-sm text-text">Create payslip</h2>
              <button onClick={() => setShowCreate(false)} className="text-muted text-sm">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <select
                value={form.employeeId}
                onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
                className="w-full rounded-md border border-border px-3 py-2 text-sm bg-bg"
              >
                <option value="">Select employee…</option>
                {employees.map((emp) => (
                  <option key={emp.employeeId} value={emp.employeeId}>
                    {emp.user.fullName}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-3">
                <input
                  value={form.periodMonth}
                  onChange={(e) => setForm((f) => ({ ...f, periodMonth: e.target.value }))}
                  type="number"
                  min={1}
                  max={12}
                  placeholder="Month (1-12)"
                  className="rounded-md border border-border px-3 py-2 text-sm bg-bg"
                />
                <input
                  value={form.periodYear}
                  onChange={(e) => setForm((f) => ({ ...f, periodYear: e.target.value }))}
                  type="number"
                  placeholder="Year"
                  className="rounded-md border border-border px-3 py-2 text-sm bg-bg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  value={form.issueDate}
                  onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))}
                  type="date"
                  className="rounded-md border border-border px-3 py-2 text-sm bg-bg"
                />
                <input
                  value={form.issueLocation}
                  onChange={(e) => setForm((f) => ({ ...f, issueLocation: e.target.value }))}
                  placeholder="Issue location"
                  className="rounded-md border border-border px-3 py-2 text-sm bg-bg"
                />
              </div>

              <input
                value={form.basicSalary}
                onChange={(e) => setForm((f) => ({ ...f, basicSalary: e.target.value }))}
                type="number"
                placeholder="Basic salary (IDR)"
                className="w-full rounded-md border border-border px-3 py-2 text-sm bg-bg"
              />
              <input
                value={form.authorizedSignatory}
                onChange={(e) => setForm((f) => ({ ...f, authorizedSignatory: e.target.value }))}
                placeholder="Authorized signatory"
                className="w-full rounded-md border border-border px-3 py-2 text-sm bg-bg"
              />

              <LineItemEditor label="Earnings" rows={form.earnings} onAdd={() => addRow('earnings')} onUpdate={(i, f, v) => updateRow('earnings', i, f, v)} onRemove={(i) => removeRow('earnings', i)} />
              <LineItemEditor label="Deductions" rows={form.deductions} onAdd={() => addRow('deductions')} onUpdate={(i, f, v) => updateRow('deductions', i, f, v)} onRemove={(i) => removeRow('deductions', i)} />

              <button disabled={saving || !form.employeeId} className="w-full bg-primary text-white rounded-md py-2.5 text-sm font-medium disabled:opacity-60">
                {saving ? 'Creating…' : 'Create and finalize'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function LineItemEditor({
  label,
  rows,
  onAdd,
  onUpdate,
  onRemove,
}: {
  label: string;
  rows: LineItem[];
  onAdd: () => void;
  onUpdate: (idx: number, field: 'label' | 'amount', value: string) => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-medium text-muted">{label}</p>
        <button type="button" onClick={onAdd} className="text-xs text-accent">
          + Add
        </button>
      </div>
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2 mb-1.5">
          <input
            value={row.label}
            onChange={(e) => onUpdate(i, 'label', e.target.value)}
            placeholder="Label"
            className="flex-1 rounded-md border border-border px-2 py-1.5 text-xs bg-bg"
          />
          <input
            value={row.amount || ''}
            onChange={(e) => onUpdate(i, 'amount', e.target.value)}
            type="number"
            placeholder="Amount"
            className="w-28 rounded-md border border-border px-2 py-1.5 text-xs bg-bg"
          />
          <button type="button" onClick={() => onRemove(i)} className="text-muted">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

function IconButton({ icon: Icon, onClick, disabled, title }: { icon: typeof Download; onClick: () => void; disabled?: boolean; title: string }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} className="p-2 text-muted hover:text-primary disabled:opacity-50">
      <Icon className="w-4 h-4" />
    </button>
  );
}
