'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { api } from '@/lib/api';
import { Notification } from '@/lib/types';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch {
      // silently ignore — not critical to page function
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000); // poll every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function markRead(id: string) {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }

  async function markAllRead() {
    await api.patch('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 transition"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-status-repair text-white text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-full bottom-0 ml-3 w-80 bg-surface border border-border rounded-lg shadow-lg z-50 text-text">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-medium text-sm">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-accent hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted text-center">No notifications yet</p>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.isRead && markRead(n.id)}
                className={`w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-bg transition ${
                  n.isRead ? 'opacity-60' : ''
                }`}
              >
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted mt-0.5">{n.message}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
