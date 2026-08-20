'use client';

import { Wallet } from 'lucide-react';
import AppHeader from '@/components/AppHeader';

// Phase 1 placeholder — same reasoning as the Help Desk one. Employee
// and payroll management pages come in Phase 3.
export default function PayrollPlaceholderPage() {
  return (
    <main className="min-h-screen bg-bg pl-20 flex items-center justify-center">
      <AppHeader />
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-6 h-6" strokeWidth={2} />
        </div>
        <h1 className="font-display font-bold text-xl text-primary mb-2">Payroll is on its way</h1>
        <p className="text-sm text-muted">
          Employee management and payslip pages are being ported into this app next. The backend
          for all of it is already live — invites, payslip creation, PDF generation, and CSV bulk
          import all work today.
        </p>
      </div>
    </main>
  );
}
