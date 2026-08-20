'use client';

import { Headset } from 'lucide-react';
import AppHeader from '@/components/AppHeader';

// Phase 1 placeholder — the Help Desk domain is reachable and wired
// into navigation, but its real pages (request queue, categories,
// reports) haven't been ported into this app yet. That's Phase 2.
export default function HelpdeskPlaceholderPage() {
  return (
    <main className="min-h-screen bg-bg pl-20 flex items-center justify-center">
      <AppHeader />
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
          <Headset className="w-6 h-6" strokeWidth={2} />
        </div>
        <h1 className="font-display font-bold text-xl text-primary mb-2">Help Desk is on its way</h1>
        <p className="text-sm text-muted">
          The request queue, categories, and reports pages are being ported into this app next.
          The backend for all of it is already live.
        </p>
      </div>
    </main>
  );
}
