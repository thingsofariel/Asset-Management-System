'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { reportRows, exportReport, ReportRow, RequestStatus, STATUS_TABS, formatFullDateTime } from '@/lib/helpdesk';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function HelpdeskReportsPage() {
  const [month, setMonth] = useState(currentMonth());
  const [status, setStatus] = useState<RequestStatus | ''>('');
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    reportRows({ month, status })
      .then((res) => setRows(res.rows))
      .finally(() => setLoading(false));
  }, [month, status]);

  async function handleExport() {
    setExporting(true);
    try {
      await exportReport({ month, status });
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg pl-20">
      <AppHeader />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-bold text-2xl text-primary mb-1">Reports</h1>
            <p className="text-muted text-sm">Monthly request history, exportable to Excel.</p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 bg-primary text-white rounded-md px-4 py-2.5 text-sm font-medium disabled:opacity-60"
          >
            <Download className="w-4 h-4" /> {exporting ? 'Exporting…' : 'Export .xlsx'}
          </button>
        </div>

        <div className="flex gap-3 mb-5">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-md border border-border px-3 py-2 text-sm bg-surface"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as RequestStatus | '')}
            className="rounded-md border border-border px-3 py-2 text-sm bg-surface"
          >
            {STATUS_TABS.map((tab) => (
              <option key={tab.value} value={tab.value}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-bg text-xs text-muted uppercase">
                <tr>
                  <th className="text-left px-4 py-2">Request</th>
                  <th className="text-left px-4 py-2">Requester</th>
                  <th className="text-left px-4 py-2">Issue type</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.publicCode}>
                    <td className="px-4 py-2 font-mono text-xs">{r.publicCode}</td>
                    <td className="px-4 py-2">{r.fullName}</td>
                    <td className="px-4 py-2">{r.issueType}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-2 text-xs text-muted">{formatFullDateTime(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <p className="text-sm text-muted text-center py-8">No requests for this period.</p>}
          </div>
        )}
      </div>
    </main>
  );
}
