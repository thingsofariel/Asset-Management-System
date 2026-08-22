'use client';

import { useEffect, useState, useCallback } from 'react';
import { Check, X, Play, CheckCheck, Paperclip } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import { useToast } from '@/components/ToastProvider';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import {
  listRequests,
  acceptRequest,
  denyRequest,
  startRequest,
  completeRequest,
  HelpdeskRequest,
  RequestStatus,
  STATUS_TABS,
  formatDateTime,
} from '@/lib/helpdesk';

export default function QueuePage() {
  const toast = useToast();
  const [requests, setRequests] = useState<HelpdeskRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<RequestStatus | ''>('OPEN');
  const [denyingId, setDenyingId] = useState<number | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    listRequests({ status: statusFilter || undefined })
      .then(setRequests)
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(load, [load]);

  // Live updates — connects to the SSE stream so a new submission shows
  // up without needing to refresh. Auth here is via a query-param token
  // rather than a header, since EventSource can't set one (see the
  // backend's SseAuthGuard for the other half of this).
  useEffect(() => {
    const token = window.localStorage.getItem('accessToken');
    if (!token) return;
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
    const source = new EventSource(`${base}/requests/stream?token=${token}`);

    // The backend frames each event with a `type` field via NestJS's
    // MessageEvent shape, which EventSource dispatches as a named event
    // — 'ping' keep-alives are ignored, 'new_request' triggers a toast + reload.
    const handler = (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        if (parsed?.publicCode) {
          toast.success(`New request: ${parsed.publicCode}`);
          load();
        }
      } catch {
        // ignore malformed frames rather than crash the listener
      }
    };
    source.addEventListener('new_request', handler);
    source.onerror = () => {};

    return () => source.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAccept(id: number) {
    await acceptRequest(id);
    toast.success('Request accepted');
    load();
  }

  async function handleStart(id: number) {
    await startRequest(id);
    toast.success('Marked in progress');
    load();
  }

  async function handleComplete(id: number) {
    await completeRequest(id);
    toast.success('Marked done — awaiting review');
    load();
  }

  async function handleDenyConfirm() {
    if (!denyingId || !denyReason.trim()) return;
    await denyRequest(denyingId, denyReason.trim());
    toast.success('Request denied');
    setDenyingId(null);
    setDenyReason('');
    load();
  }

  return (
    <main className="min-h-screen bg-bg pl-20">
      <AppHeader />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="font-display font-bold text-2xl text-primary mb-1">Request queue</h1>
        <p className="text-muted text-sm mb-6">Highest priority, oldest first.</p>

        <div className="flex gap-1 mb-5 border-b border-border">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                statusFilter === tab.value ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted py-8 text-center">Nothing here.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="bg-surface border border-border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-muted">{r.publicCode}</span>
                      <StatusBadge status={r.status} />
                      <PriorityBadge priority={r.priority} />
                    </div>
                    <p className="font-medium text-sm text-text">{r.fullName}</p>
                    <p className="text-xs text-muted">
                      {r.customCategoryText || r.category?.name || 'General issue'} · {formatDateTime(r.createdAt)}
                    </p>
                  </div>
                  {r.attachmentUrl && (
                    <a href={r.attachmentUrl} target="_blank" rel="noreferrer" className="text-muted">
                      <Paperclip className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <p className="text-sm text-text mb-3">{r.description}</p>

                <div className="flex gap-2">
                  {r.status === 'OPEN' && (
                    <>
                      <ActionButton icon={Check} label="Accept" onClick={() => handleAccept(r.id)} variant="primary" />
                      <ActionButton icon={X} label="Deny" onClick={() => setDenyingId(r.id)} variant="danger" />
                    </>
                  )}
                  {r.status === 'ACCEPTED' && (
                    <ActionButton icon={Play} label="Start work" onClick={() => handleStart(r.id)} variant="primary" />
                  )}
                  {r.status === 'IN_PROGRESS' && (
                    <ActionButton icon={CheckCheck} label="Mark done" onClick={() => handleComplete(r.id)} variant="primary" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {denyingId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-surface border border-border rounded-lg p-5 max-w-sm w-full">
            <h2 className="font-medium text-sm text-text mb-3">Reason for denying this request</h2>
            <textarea
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border px-3 py-2 text-sm bg-bg resize-none mb-3"
              placeholder="This helps the requester understand what to do instead."
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setDenyingId(null);
                  setDenyReason('');
                }}
                className="px-3 py-2 text-sm text-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleDenyConfirm}
                disabled={!denyReason.trim()}
                className="bg-status-repair text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
              >
                Confirm deny
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  variant,
}: {
  icon: typeof Check;
  label: string;
  onClick: () => void;
  variant: 'primary' | 'danger';
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ${
        variant === 'primary' ? 'bg-primary text-white' : 'border border-status-repair text-status-repair'
      }`}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}
