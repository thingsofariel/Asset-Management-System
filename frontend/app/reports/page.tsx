'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '@/lib/api';
import AppHeader from '@/components/AppHeader';
import { DepreciationRow, MaintenanceCostRow } from '@/lib/types';

export default function ReportsPage() {
  const [depreciation, setDepreciation] = useState<DepreciationRow[]>([]);
  const [costs, setCosts] = useState<MaintenanceCostRow[]>([]);

  useEffect(() => {
    api.get('/reports/depreciation').then((res) => setDepreciation(res.data));
    api.get('/reports/maintenance-costs').then((res) => setCosts(res.data));
  }, []);

  const totalBookValue = depreciation.reduce((sum, r) => sum + r.bookValue, 0);
  const totalCost = costs.reduce((sum, r) => sum + r.total, 0);

  return (
    <main className="min-h-screen bg-bg">
      <AppHeader />
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <h1 className="font-display font-bold text-2xl text-primary">Reports</h1>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-medium text-primary">Maintenance Cost Analysis</h2>
            <p className="text-sm text-muted">Total: IDR Rp{totalCost.toFixed(2)}</p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-5">
            {costs.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={costs}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                  <Bar dataKey="total" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted text-center py-8">
                No maintenance costs logged yet — figures appear here once service logs with a cost
                are recorded.
              </p>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-medium text-primary">Depreciation Estimate</h2>
            <p className="text-sm text-muted">Total book value: ${totalBookValue.toFixed(2)}</p>
          </div>
          <p className="text-xs text-muted mb-3">
            Straight-line estimate using default useful-life assumptions (10 years for fixed
            assets, 4 years for electronics). Treat as an estimate, not an accounting record.
          </p>
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted text-xs uppercase tracking-wide">
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3">Purchase Cost</th>
                  <th className="px-4 py-3">Useful Life</th>
                  <th className="px-4 py-3">Annual Depreciation</th>
                  <th className="px-4 py-3">Book Value</th>
                </tr>
              </thead>
              <tbody>
                {depreciation.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted">
                      No assets with purchase cost and date recorded yet.
                    </td>
                  </tr>
                )}
                {depreciation.map((row) => (
                  <tr key={row.assetId} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-primary">{row.name}</p>
                      <p className="font-mono text-xs text-muted">{row.assetCode}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">${row.purchaseCost.toFixed(2)}</td>
                    <td className="px-4 py-3 text-muted">{row.usefulLifeYears} yrs</td>
                    <td className="px-4 py-3 text-muted">${row.annualDepreciation.toFixed(2)}</td>
                    <td className="px-4 py-3 font-medium">${row.bookValue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
