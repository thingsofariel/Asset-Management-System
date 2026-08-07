'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LogOut,
  Settings,
  ScanLine,
  Search,
  LayoutDashboard,
  Boxes,
  Wrench,
  ArrowLeftRight,
  ClipboardCheck,
  BarChart3,
} from 'lucide-react';
import { clearSession } from '@/lib/auth';
import { api } from '@/lib/api';
import NotificationBell from './NotificationBell';
import GlobalSearch from './GlobalSearch';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/assets', label: 'Assets', icon: Boxes },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/movements', label: 'Movements', icon: ArrowLeftRight },
  { href: '/audits', label: 'Audits', icon: ClipboardCheck },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
];

function NavIcon({
  href,
  label,
  icon: Icon,
  active,
  badgeCount,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
  badgeCount?: number;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={`relative w-11 h-11 flex items-center justify-center rounded-xl transition ${
        active ? 'bg-white text-primary' : 'text-white/60 hover:text-white hover:bg-white/10'
      }`}
    >
      <Icon className="w-5 h-5" strokeWidth={2} />
      {!!badgeCount && (
        <span className="absolute -top-0.5 -right-0.5 bg-status-repair text-white text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center">
          {badgeCount > 9 ? '9+' : badgeCount}
        </span>
      )}
    </Link>
  );
}

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    function loadUnread() {
      api
        .get('/notifications')
        .then((res) => setUnreadCount(res.data.filter((n: any) => !n.isRead).length))
        .catch(() => {});
    }
    loadUnread();
    const interval = setInterval(loadUnread, 60_000); // poll every minute
    return () => clearInterval(interval);
  }, []);

  function handleLogout() {
    clearSession();
    router.push('/login');
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-20 bg-primary flex flex-col items-center py-5 z-40">
      <Link
        href="/dashboard"
        title="Asset & Inventory"
        aria-label="Asset & Inventory home"
        className="mb-6 w-10 h-10 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/15 transition"
      >
        <ScanLine className="w-5 h-5 text-accent" strokeWidth={2.5} />
      </Link>

      <button
        onClick={() => window.dispatchEvent(new Event('open-global-search'))}
        title="Search (Ctrl/Cmd+K)"
        aria-label="Search"
        className="w-11 h-11 mb-2 flex items-center justify-center rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition"
      >
        <Search className="w-5 h-5" strokeWidth={2} />
      </button>

      <nav className="flex flex-col items-center gap-2">
        {navLinks.map((link) => (
          <NavIcon
            key={link.href}
            href={link.href}
            label={link.label}
            icon={link.icon}
            active={pathname === link.href || pathname?.startsWith(link.href + '/')}
            // Every notification today originates from maintenance alerts, so
            // that's the one menu that reflects the unread count for now.
            badgeCount={link.href === '/maintenance' ? unreadCount : undefined}
          />
        ))}
      </nav>

      <div className="flex-1" />

      <div className="flex flex-col items-center gap-2 text-white/60">
        <NotificationBell />
        <NavIcon href="/settings" label="Settings" icon={Settings} active={!!pathname?.startsWith('/settings')} />
        <button
          onClick={handleLogout}
          title="Sign out"
          aria-label="Sign out"
          className="w-11 h-11 flex items-center justify-center rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition"
        >
          <LogOut className="w-5 h-5" strokeWidth={2} />
        </button>
      </div>
      <GlobalSearch />
    </aside>
  );
}
