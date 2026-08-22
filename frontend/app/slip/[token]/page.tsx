'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getStoredUser } from '@/lib/auth';
import { downloadSharedPayslipPdf } from '@/lib/payroll';

// A manager pastes a link like /slip/<token> into WhatsApp. Login is
// still required — the real ownership check (does this logged-in
// person actually own this payslip, or are they ADMIN) happens
// server-side; this page's only job is to fetch that one PDF and hand
// it to the browser.
export default function SharedPayslipPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      // Preserve the destination so login can send them straight back here.
      router.replace(`/login?next=/slip/${params.token}`);
      return;
    }

    let cancelled = false;
    downloadSharedPayslipPdf(params.token)
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        window.location.replace(url);
      })
      .catch(() => {
        if (!cancelled) setError('This payslip could not be found, or you don\u2019t have access to it.');
      });
    return () => {
      cancelled = true;
    };
  }, [params.token, router]);

  if (error) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center px-4 text-center">
        <p className="text-sm text-status-repair max-w-xs">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center gap-2 text-muted text-sm">
      <Loader2 className="w-4 h-4 animate-spin" /> Opening payslip…
    </main>
  );
}
