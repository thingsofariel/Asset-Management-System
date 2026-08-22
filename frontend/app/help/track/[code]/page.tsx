'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Star, Loader2 } from 'lucide-react';
import { lookupRequest, submitReview, HelpdeskRequest, formatFullDateTime } from '@/lib/helpdesk';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';

const TIMELINE_STEPS: { key: keyof HelpdeskRequest; label: string }[] = [
  { key: 'createdAt', label: 'Submitted' },
  { key: 'acceptedAt', label: 'Accepted' },
  { key: 'startedAt', label: 'Work started' },
  { key: 'completedAt', label: 'Resolved' },
  { key: 'closedAt', label: 'Closed' },
];

export default function RequestTrackingPage() {
  const params = useParams<{ code: string }>();
  const [request, setRequest] = useState<HelpdeskRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  function load() {
    lookupRequest(params.code)
      .then(setRequest)
      .catch((err) => setError(err?.response?.data?.message ?? 'Could not find that request.'));
  }
  useEffect(load, [params.code]);

  async function handleReview(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) return;
    setSubmittingReview(true);
    try {
      await submitReview(params.code, { rating, comment: comment || undefined });
      setReviewSubmitted(true);
      load();
    } catch {
      setError('Could not submit your review — please try again.');
    } finally {
      setSubmittingReview(false);
    }
  }

  if (error) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center px-4">
        <p className="text-status-repair text-sm">{error}</p>
      </main>
    );
  }

  if (!request) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-muted animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-10">
      <div className="max-w-lg mx-auto bg-surface border border-border rounded-xl p-8">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-sm text-muted">{request.publicCode}</span>
          <StatusBadge status={request.status} />
        </div>
        <h1 className="font-display font-bold text-lg text-primary mb-3">
          {request.customCategoryText || request.category?.name || 'General issue'}
        </h1>
        <div className="flex items-center gap-2 mb-4">
          <PriorityBadge priority={request.priority} />
        </div>
        <p className="text-sm text-text mb-6">{request.description}</p>

        {request.status === 'DENIED' && request.denialReason && (
          <div className="bg-request-denied/10 text-request-denied text-sm rounded-md p-3 mb-6">
            <strong>Not accepted:</strong> {request.denialReason}
          </div>
        )}

        <div className="space-y-3 mb-6">
          {TIMELINE_STEPS.map((step) => {
            const value = request[step.key] as string | null;
            return (
              <div key={step.key} className="flex items-center gap-3 text-sm">
                <span className={`w-2 h-2 rounded-full shrink-0 ${value ? 'bg-request-accepted' : 'bg-border'}`} />
                <span className={value ? 'text-text' : 'text-muted'}>{step.label}</span>
                {value && <span className="text-muted ml-auto text-xs">{formatFullDateTime(value)}</span>}
              </div>
            );
          })}
        </div>

        {request.review && (
          <div className="border-t border-border pt-5">
            <p className="text-sm font-medium text-text mb-1">Your review</p>
            <div className="flex gap-0.5 mb-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < request.review!.rating ? 'fill-request-accepted text-request-accepted' : 'text-border'}`}
                />
              ))}
            </div>
            {request.review.comment && <p className="text-sm text-muted">{request.review.comment}</p>}
          </div>
        )}

        {request.status === 'DONE' && !request.review && !reviewSubmitted && (
          <form onSubmit={handleReview} className="border-t border-border pt-5">
            <p className="text-sm font-medium text-text mb-2">How did we do?</p>
            <div className="flex gap-1 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <button type="button" key={i} onClick={() => setRating(i + 1)}>
                  <Star className={`w-6 h-6 ${i < rating ? 'fill-request-accepted text-request-accepted' : 'text-border'}`} />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Any comments? (optional)"
              rows={2}
              className="w-full rounded-md border border-border px-3 py-2 text-sm bg-bg resize-none mb-3"
            />
            <button
              type="submit"
              disabled={rating === 0 || submittingReview}
              className="bg-primary text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {submittingReview ? 'Submitting…' : 'Submit review'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
