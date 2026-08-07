'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmWord = 'DELETE',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmWord?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState('');

  if (!open) return null;

  const matches = typed === confirmWord;

  function handleConfirm() {
    if (!matches) return;
    setTyped('');
    onConfirm();
  }

  function handleCancel() {
    setTyped('');
    onCancel();
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-[90] flex items-center justify-center px-4"
      onClick={handleCancel}
    >
      <div className="bg-surface rounded-lg p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 text-status-repair mb-2">
          <AlertTriangle className="w-5 h-5" />
          <h2 className="font-display font-medium text-primary">{title}</h2>
        </div>
        <p className="text-sm text-muted mb-4">{message}</p>
        <p className="text-xs text-muted mb-1">
          Type <span className="font-mono font-medium text-text">{confirmWord}</span> to confirm.
        </p>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
          className="w-full rounded-md border border-border px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-status-repair"
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <button onClick={handleCancel} className="text-sm text-muted hover:text-text px-3 py-2">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!matches}
            className="bg-status-repair text-white text-sm px-4 py-2 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
