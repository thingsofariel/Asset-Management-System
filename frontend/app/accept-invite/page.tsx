'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ScanLine, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { saveSession } from '@/lib/auth';
import PasswordInput from '@/components/PasswordInput';

// This page didn't exist at all until now — every invite link ever
// generated (Settings > Users, Payroll > Employees) pointed here and
// 404'd. POST /auth/accept-invite itself was built and tested from the
// start; the frontend page that actually calls it was simply never built.
export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-bg px-4">
        <div className="max-w-sm w-full bg-surface border border-border rounded-lg p-8 text-center">
          <p className="text-sm text-status-repair">
            This link is missing its invite token — check that you copied the whole URL.
          </p>
        </div>
      </main>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/accept-invite', { token, password });
      saveSession(res.data.accessToken, res.data.user);
      setDone(true);
      setTimeout(() => router.push('/dashboard'), 1200);
    } catch (err: any) {
      // The backend distinguishes three cases (invalid/used, already
      // active, expired) with different status codes — its message is
      // already specific enough to show directly rather than genericizing it.
      setError(err?.response?.data?.message ?? 'Could not activate your account. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-bg px-4">
        <div className="max-w-sm w-full bg-surface border border-border rounded-lg p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-status-good mx-auto mb-3" />
          <p className="text-sm text-text">Account activated — signing you in…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm bg-surface border border-border rounded-lg p-8">
        <div className="flex items-center gap-2 mb-1 text-primary">
          <ScanLine className="w-5 h-5 text-accent" strokeWidth={2.5} />
          <span className="font-display font-medium text-sm tracking-wide uppercase text-muted">
            Asset & Inventory
          </span>
        </div>
        <h1 className="font-display font-bold text-2xl text-primary mb-1">Set your password</h1>
        <p className="text-sm text-muted mb-6">This activates your account — you'll be signed in right after.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="8+ characters"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-text mb-1">
              Confirm password
            </label>
            <PasswordInput
              id="confirmPassword"
              required
              value={confirmPassword}
              onChange={setConfirmPassword}
              className="rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Type it again"
              autoComplete="new-password"
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
            {loading ? 'Activating…' : 'Activate account'}
          </button>
        </form>
      </div>
    </main>
  );
}
