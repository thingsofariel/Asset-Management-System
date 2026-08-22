'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export default function TrackRequestPage() {
  const router = useRouter();
  const [code, setCode] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim()) router.push(`/help/track/${encodeURIComponent(code.trim().toUpperCase())}`);
  }

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="max-w-sm w-full bg-surface border border-border rounded-xl p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
          <Search className="w-5 h-5" strokeWidth={2} />
        </div>
        <h1 className="font-display font-bold text-xl text-primary mb-1">Track your request</h1>
        <p className="text-sm text-muted mb-6">Enter the Request ID you received when you submitted it.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="REQ-XXXXXXXX"
            className="w-full text-center rounded-md border border-border px-3 py-2.5 text-sm bg-bg tracking-wider font-mono"
          />
          <button className="w-full bg-primary text-white rounded-md py-2.5 text-sm font-medium">Look up</button>
        </form>
      </div>
    </main>
  );
}
