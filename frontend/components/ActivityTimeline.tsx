'use client';

import { useEffect, useState } from 'react';
import { ArrowLeftRight, Wrench, Paperclip } from 'lucide-react';
import { api } from '@/lib/api';
import { Asset, Movement } from '@/lib/types';

interface TimelineEvent {
  date: Date;
  icon: typeof ArrowLeftRight;
  label: string;
  detail?: string;
}

const MOVEMENT_LABELS: Record<string, string> = {
  INBOUND: 'Received into inventory',
  OUTBOUND: 'Disposed / written off',
  CHECKOUT: 'Checked out',
  CHECKIN: 'Checked in',
  TRANSFER: 'Transferred',
};

export default function ActivityTimeline({ asset }: { asset: Asset }) {
  const [movements, setMovements] = useState<Movement[]>([]);

  useEffect(() => {
    api.get('/movements', { params: { assetId: asset.id } }).then((res) => setMovements(res.data));
  }, [asset.id]);

  const events: TimelineEvent[] = [
    ...movements.map((m) => ({
      date: new Date(m.movementDate),
      icon: ArrowLeftRight,
      label: MOVEMENT_LABELS[m.movementType] ?? m.movementType,
      detail:
        m.movementType === 'CHECKOUT'
          ? m.toUser?.name
          : m.movementType === 'TRANSFER'
            ? `${m.fromLocation?.room ?? '—'} → ${m.toLocation?.room ?? '—'}`
            : m.notes ?? undefined,
    })),
    ...(asset.maintenanceLogs ?? []).map((log) => ({
      date: new Date(log.serviceDate),
      icon: Wrench,
      label: 'Maintenance service logged',
      detail: [log.vendorName, log.technicianName].filter(Boolean).join(' · ') || undefined,
    })),
    ...(asset.attachments ?? []).map((a) => ({
      date: new Date(a.createdAt),
      icon: Paperclip,
      label: `${a.fileType === 'PHOTO' ? 'Photo' : a.fileType === 'INVOICE' ? 'Invoice' : 'File'} attached`,
      detail: a.notes ?? undefined,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <h2 className="font-display font-medium text-primary mb-3">Activity</h2>
      {events.length === 0 ? (
        <p className="text-sm text-muted">No activity recorded yet.</p>
      ) : (
        <ul className="space-y-4">
          {events.map((event, i) => {
            const Icon = event.icon;
            return (
              <li key={i} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-bg border border-border flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-accent" />
                </div>
                <div className="min-w-0 pb-1">
                  <p className="text-sm text-text">{event.label}</p>
                  {event.detail && <p className="text-xs text-muted">{event.detail}</p>}
                  <p className="text-xs text-muted">{event.date.toLocaleString()}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
