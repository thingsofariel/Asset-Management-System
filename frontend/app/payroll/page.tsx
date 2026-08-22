'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Wallet, Users, FileText, ChevronRight, Download, Loader2, AlertCircle } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import { getStoredUser } from '@/lib/auth';
import {
  listEmployees,
  listPayslips,
  getMyEmployeeRecord,
  getPayslip,
  downloadPayslipPdf,
  Employee,
  Payslip,
  formatIDR,
  monthName,
} from '@/lib/payroll';

export default function PayrollLandingPage() {
  const user = getStoredUser();
  return user?.role === 'ADMIN' ? <AdminOverview /> : <MyPayslips />;
}

// ---- ADMIN branch ----

function AdminOverview() {
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [payslips, setPayslips] = useState<Payslip[] | null>(null);

  useEffect(() => {
    listEmployees().then(setEmployees);
    listPayslips().then(setPayslips);
  }, []);

  const draftCount = payslips?.filter((p) => p.status === 'DRAFT').length ?? 0;

  return (
    <main className="min-h-screen bg-bg pl-20">
      <AppHeader />
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="font-display font-bold text-2xl text-primary mb-1">Payroll</h1>
        <p className="text-muted text-sm mb-6">Employee records and payslip management.</p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard label="Employees" value={employees?.length ?? '—'} />
          <StatCard label="Payslips on file" value={payslips?.length ?? '—'} />
          <StatCard label="Awaiting finalization" value={draftCount} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Link href="/payroll/employees" className="flex items-center gap-3 bg-surface border border-border rounded-lg p-5 hover:border-primary transition">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm text-text">Employees</p>
              <p className="text-xs text-muted">Add, edit, or remove employee records</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted" />
          </Link>
          <Link href="/payroll/payslips" className="flex items-center gap-3 bg-surface border border-border rounded-lg p-5 hover:border-primary transition">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm text-text">Payslips</p>
              <p className="text-xs text-muted">Create, finalize, and share payslips</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted" />
          </Link>
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="font-display font-bold text-2xl text-primary">{value}</p>
    </div>
  );
}

// ---- EMPLOYEE branch — ported from the original EmployeePortal ----

function MyPayslips() {
  const [payslips, setPayslips] = useState<Payslip[] | null>(null);
  const [selected, setSelected] = useState<Payslip | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const [noEmployeeRecord, setNoEmployeeRecord] = useState(false);

  useEffect(() => {
    // Confirms this account is actually linked to an Employee record
    // before trying to list payslips — an EMPLOYEE-role user could in
    // principle exist without one (e.g. created via the general invite
    // flow rather than payroll onboarding), and that's a real state to
    // handle gracefully rather than let the payslip list call fail oddly.
    getMyEmployeeRecord()
      .then(() => listPayslips())
      .then((data) => {
        setPayslips(data);
        if (data.length > 0) loadDetail(data[0].payslipId);
      })
      .catch(() => setNoEmployeeRecord(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadDetail(payslipId: number) {
    setLoadingDetail(true);
    try {
      setSelected(await getPayslip(payslipId));
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleDownload() {
    if (!selected) return;
    setDownloading(true);
    setDownloadError(false);
    try {
      await downloadPayslipPdf(selected.payslipId);
    } catch {
      setDownloadError(true);
    } finally {
      setDownloading(false);
    }
  }

  if (noEmployeeRecord) {
    return (
      <main className="min-h-screen bg-bg pl-20 flex items-center justify-center">
        <AppHeader />
        <div className="text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-muted mx-auto mb-3" />
          <p className="text-sm text-muted">
            No payroll record is linked to your account yet. Ask an admin to set one up.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg pl-20">
      <AppHeader />
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-primary">My payslips</h1>
            <p className="text-xs text-muted">Slip Gaji</p>
          </div>
        </div>

        {payslips == null ? (
          <p className="text-sm text-muted flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </p>
        ) : payslips.length === 0 ? (
          <p className="text-sm text-muted py-10 text-center">No payslips available yet.</p>
        ) : (
          <div className="grid grid-cols-[280px_1fr] gap-6">
            <div className="space-y-2">
              {payslips.map((p) => (
                <button
                  key={p.payslipId}
                  onClick={() => loadDetail(p.payslipId)}
                  className={`w-full text-left rounded-lg border px-4 py-3 transition ${
                    selected?.payslipId === p.payslipId ? 'bg-primary text-white border-primary' : 'bg-surface border-border'
                  }`}
                >
                  <p className="font-medium text-sm">
                    {monthName(p.periodMonth)} {p.periodYear}
                  </p>
                  <p className={`text-xs ${selected?.payslipId === p.payslipId ? 'text-white/70' : 'text-muted'}`}>
                    {formatIDR(p.netPay)}
                  </p>
                </button>
              ))}
            </div>

            <div className="bg-surface border border-border rounded-lg overflow-hidden h-fit">
              {loadingDetail || !selected ? (
                <p className="text-sm text-muted p-8">Loading…</p>
              ) : (
                <>
                  <div className="bg-primary text-white px-6 py-5 flex justify-between items-start">
                    <div>
                      <p className="font-display text-lg">Slip Gaji</p>
                      <p className="text-xs text-white/70 mt-1">
                        Periode {monthName(selected.periodMonth)} {selected.periodYear}
                      </p>
                    </div>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/15">
                      {selected.status === 'DRAFT' ? 'Draf' : 'Disahkan'}
                    </span>
                  </div>
                  <div className="p-6">
                    <PayRow label="Gaji Pokok" value={selected.basicSalary} />
                    {selected.earningDetails?.map((e) => (
                      <PayRow key={e.earningId} label={e.label} value={e.amount} small />
                    ))}
                    <div className="h-px bg-border my-3" />
                    <PayRow label="Total Pendapatan" value={selected.totalEarnings} bold />
                    <div className="h-4" />
                    {selected.deductionDetails?.map((d) => (
                      <PayRow key={d.deductionId} label={d.label} value={d.amount} small negative />
                    ))}
                    <div className="h-px bg-border my-3" />
                    <PayRow label="Total Potongan" value={selected.totalDeductions} bold negative />

                    <div className="mt-6 bg-primary rounded-lg px-5 py-4 flex justify-between items-center">
                      <span className="text-xs font-semibold text-white/75 uppercase">Gaji Bersih</span>
                      <span className="font-display font-bold text-xl text-white">{formatIDR(selected.netPay)}</span>
                    </div>

                    {selected.status === 'DRAFT' ? (
                      <p className="text-center text-xs text-muted mt-4 border border-dashed border-border rounded-md py-3">
                        PDF belum tersedia — slip gaji ini masih dalam status draf.
                      </p>
                    ) : (
                      <>
                        <button
                          onClick={handleDownload}
                          disabled={downloading}
                          className="w-full mt-4 border border-primary text-primary rounded-md py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                          <Download className="w-4 h-4" /> {downloading ? 'Mengunduh…' : 'Unduh PDF'}
                        </button>
                        {downloadError && <p className="text-xs text-status-repair text-center mt-2">Gagal mengunduh PDF.</p>}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function PayRow({ label, value, bold, small, negative }: { label: string; value: string; bold?: boolean; small?: boolean; negative?: boolean }) {
  const n = Number(value);
  return (
    <div className={`flex justify-between ${small ? 'py-1.5 text-xs' : 'py-2 text-sm'} ${bold ? 'font-bold' : ''} ${negative ? 'text-status-repair' : 'text-text'}`}>
      <span className={small ? 'text-muted' : ''}>{label}</span>
      <span>
        {negative ? '−' : ''}
        {formatIDR(Math.abs(n))}
      </span>
    </div>
  );
}
