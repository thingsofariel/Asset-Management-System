'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Copy, Check } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import { useToast } from '@/components/ToastProvider';
import {
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  Employee,
  EmploymentStatus,
  CreateEmployeeInput,
} from '@/lib/payroll';

const EMPTY_FORM: CreateEmployeeInput = { fullName: '', email: '', jobTitle: '', bankAccountNo: '', employmentStatus: 'PERMANENT' };

export default function EmployeesPage() {
  const toast = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<CreateEmployeeInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState<CreateEmployeeInput>(EMPTY_FORM);
  const [rowError, setRowError] = useState<{ id: number | null; text: string }>({ id: null, text: '' });
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function load() {
    listEmployees().then(setEmployees);
  }
  useEffect(load, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setInviteLink(null);
    try {
      const res = await createEmployee(form);
      setForm(EMPTY_FORM);
      setInviteLink(res.inviteLink);
      toast.success(`"${res.employee.user.fullName}" added — copy the invite link below`);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not add employee.');
    } finally {
      setSaving(false);
    }
  }

  function openEdit(emp: Employee) {
    setEditing(emp);
    setEditForm({
      fullName: emp.user.fullName,
      email: emp.user.email,
      jobTitle: emp.jobTitle,
      bankAccountNo: emp.bankAccountNo,
      employmentStatus: emp.employmentStatus,
    });
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await updateEmployee(editing.employeeId, editForm);
      toast.success('Employee updated');
      setEditing(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not update employee.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(emp: Employee) {
    if (!confirm(`Remove "${emp.user.fullName}"? This can't be undone.`)) return;
    setDeletingId(emp.employeeId);
    setRowError({ id: null, text: '' });
    try {
      await deleteEmployee(emp.employeeId);
      load();
    } catch (err: any) {
      // The backend blocks deletion when payslip/audit history exists —
      // that specific message matters, so it's surfaced per-row rather
      // than as a generic toast.
      setRowError({ id: emp.employeeId, text: err?.response?.data?.message ?? 'Could not remove employee.' });
    } finally {
      setDeletingId(null);
    }
  }

  function copyLink() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="min-h-screen bg-bg pl-20">
      <AppHeader />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-bold text-2xl text-primary mb-1">Employees</h1>
            <p className="text-muted text-sm">{employees.length} on record</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-primary text-white rounded-md px-4 py-2.5 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Add employee
          </button>
        </div>

        <div className="bg-surface border border-border rounded-lg divide-y divide-border">
          {employees.map((emp) => (
            <div key={emp.employeeId} className="px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-text">{emp.user.fullName}</p>
                  <p className="text-xs text-muted">
                    {emp.jobTitle} · {emp.user.email}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(emp)} className="p-2 text-muted hover:text-text">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(emp)}
                    disabled={deletingId === emp.employeeId}
                    className="p-2 text-muted hover:text-status-repair disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {rowError.id === emp.employeeId && <p className="text-xs text-status-repair mt-2">{rowError.text}</p>}
            </div>
          ))}
          {employees.length === 0 && <p className="text-sm text-muted px-5 py-8 text-center">No employees yet.</p>}
        </div>
      </div>

      {showAdd && (
        <Modal onClose={() => { setShowAdd(false); setInviteLink(null); }} title="Add employee">
          {inviteLink ? (
            <div>
              <p className="text-sm text-muted mb-3">Share this link with them to set up their login:</p>
              <div className="flex items-center gap-2 bg-bg border border-border rounded-md px-3 py-2 mb-4">
                <span className="flex-1 truncate text-sm text-muted">{inviteLink}</span>
                <button onClick={copyLink} className="text-accent shrink-0">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <button onClick={() => { setShowAdd(false); setInviteLink(null); }} className="w-full bg-primary text-white rounded-md py-2.5 text-sm font-medium">
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleAdd} className="space-y-3">
              <EmployeeFormFields form={form} setForm={setForm} />
              <button disabled={saving} className="w-full bg-primary text-white rounded-md py-2.5 text-sm font-medium disabled:opacity-60">
                {saving ? 'Adding…' : 'Add and send invite'}
              </button>
            </form>
          )}
        </Modal>
      )}

      {editing && (
        <Modal onClose={() => setEditing(null)} title={`Edit ${editing.user.fullName}`}>
          <form onSubmit={handleEditSave} className="space-y-3">
            <EmployeeFormFields form={editForm} setForm={setEditForm} />
            <button disabled={saving} className="w-full bg-primary text-white rounded-md py-2.5 text-sm font-medium disabled:opacity-60">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </Modal>
      )}
    </main>
  );
}

function EmployeeFormFields({
  form,
  setForm,
}: {
  form: CreateEmployeeInput;
  setForm: React.Dispatch<React.SetStateAction<CreateEmployeeInput>>;
}) {
  return (
    <>
      <input
        value={form.fullName}
        onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
        placeholder="Full name"
        className="w-full rounded-md border border-border px-3 py-2 text-sm bg-bg"
      />
      <input
        value={form.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        placeholder="Email"
        className="w-full rounded-md border border-border px-3 py-2 text-sm bg-bg"
      />
      <input
        value={form.jobTitle}
        onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
        placeholder="Job title"
        className="w-full rounded-md border border-border px-3 py-2 text-sm bg-bg"
      />
      <input
        value={form.bankAccountNo}
        onChange={(e) => setForm((f) => ({ ...f, bankAccountNo: e.target.value }))}
        placeholder="Bank account number"
        className="w-full rounded-md border border-border px-3 py-2 text-sm bg-bg"
      />
      <select
        value={form.employmentStatus}
        onChange={(e) => setForm((f) => ({ ...f, employmentStatus: e.target.value as EmploymentStatus }))}
        className="w-full rounded-md border border-border px-3 py-2 text-sm bg-bg"
      >
        <option value="PERMANENT">Permanent</option>
        <option value="CONTRACT">Contract</option>
        <option value="FREELANCE">Freelance</option>
        <option value="INTERN">Intern</option>
      </select>
    </>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-surface border border-border rounded-lg p-5 max-w-sm w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-sm text-text">{title}</h2>
          <button onClick={onClose} className="text-muted text-sm">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
