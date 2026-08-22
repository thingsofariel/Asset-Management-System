'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ScanLine } from 'lucide-react';
import { api } from '@/lib/api';
import { saveSession } from '@/lib/auth';
import PasswordInput from '@/components/PasswordInput';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      saveSession(res.data.accessToken, res.data.user);
      // Honors a ?next= param (e.g. a shared payslip link at /slip/<token>
      // sends someone here first if they aren't logged in) so they land
      // back where they meant to go, not always on the dashboard.
      router.push(searchParams.get('next') || '/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not sign in. Check your email and password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="scan-frame w-full max-w-sm bg-surface border border-border rounded-lg p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-1 text-primary">
          <ScanLine className="w-5 h-5 text-accent" strokeWidth={2.5} />
          <span className="font-display font-medium text-sm tracking-wide uppercase text-muted">
            Asset & Inventory
          </span>
        </div>
        <h1 className="font-display font-bold text-2xl text-primary mb-6">Sign in</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text mb-1">
              Password
            </label>
            <PasswordInput
              id="password"
              required
              value={password}
              onChange={setPassword}
              className="rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-status-repair">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-medium rounded-md py-2 text-sm hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
