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
  Headset,
  Wallet,
  Tag,
  FileBarChart,
} from 'lucide-react';
import { clearSession, getStoredUser } from '@/lib/auth';
import { api } from '@/lib/api';
import NotificationBell from './NotificationBell';
import GlobalSearch from './GlobalSearch';
import ThemeToggle from './ThemeToggle';

// The three domains this app now covers. Both roles can move between
// all three — what differs by role is which pages exist *within* a
// domain once you're in it (an EMPLOYEE gets a self-service view, an
// ADMIN gets the full admin one), not whether the domain itself is
// reachable at all.
const domains = [
  { key: 'assets', href: '/dashboard', icon: Boxes, label: 'Assets' },
  { key: 'helpdesk', href: '/helpdesk', icon: Headset, label: 'Help Desk' },
  { key: 'payroll', href: '/payroll', icon: Wallet, label: 'Payroll' },
] as const;

// Assets' own sub-navigation — unchanged from before, just now shown
// contextually (only while inside the assets domain) rather than
// always-on, since it doesn't make sense to see "Maintenance" and
// "Movements" while looking at Help Desk.
const assetsNavLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/assets', label: 'Assets', icon: Boxes },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/movements', label: 'Movements', icon: ArrowLeftRight },
  { href: '/audits', label: 'Audits', icon: ClipboardCheck },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
];

// ADMIN-only — an EMPLOYEE hitting any of these pages would just be
// blocked by the backend's RBAC, so there's no point showing the icons.
// EMPLOYEE still reaches /helpdesk itself via the domain switcher above,
// which shows submit/track links instead of this admin sub-nav.
const helpdeskNavLinks = [
  { href: '/helpdesk', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/helpdesk/queue', label: 'Queue', icon: Headset },
  { href: '/helpdesk/categories', label: 'Categories', icon: Tag },
  { href: '/helpdesk/reports', label: 'Reports', icon: FileBarChart },
];

function currentDomain(pathname: string | null): (typeof domains)[number]['key'] {
  if (pathname?.startsWith('/helpdesk')) return 'helpdesk';
  if (pathname?.startsWith('/payroll')) return 'payroll';
  return 'assets';
}

function NavIcon({
  href,
  label,
  icon: Icon,
  active,
  badgeCount,
  size = 'md',
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
  badgeCount?: number;
  size?: 'md' | 'sm';
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={`relative flex items-center justify-center rounded-xl transition ${
        size === 'sm' ? 'w-9 h-9' : 'w-11 h-11'
      } ${active ? 'bg-white text-primary' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
    >
      <Icon className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} strokeWidth={2} />
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
  const domain = currentDomain(pathname);

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
        title="Home"
        aria-label="Home"
        className="mb-4 w-10 h-10 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/15 transition"
      >
        <ScanLine className="w-5 h-5 text-accent" strokeWidth={2.5} />
      </Link>

      {/* Domain switcher — smaller icons, always visible, distinct from
          the contextual sub-nav below it. */}
      <nav className="flex flex-col items-center gap-1.5 mb-4 pb-4 border-b border-white/10 w-full">
        {domains.map((d) => (
          <NavIcon key={d.key} href={d.href} label={d.label} icon={d.icon} active={domain === d.key} size="sm" />
        ))}
      </nav>

      <button
        onClick={() => window.dispatchEvent(new Event('open-global-search'))}
        title="Search (Ctrl/Cmd+K)"
        aria-label="Search"
        className="w-11 h-11 mb-2 flex items-center justify-center rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition"
      >
        <Search className="w-5 h-5" strokeWidth={2} />
      </button>

      {domain === 'assets' && (
        <nav className="flex flex-col items-center gap-2">
          {assetsNavLinks.map((link) => (
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
      )}

      {domain === 'helpdesk' && getStoredUser()?.role === 'ADMIN' && (
        <nav className="flex flex-col items-center gap-2">
          {helpdeskNavLinks.map((link) => (
            <NavIcon
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
              active={pathname === link.href || pathname?.startsWith(link.href + '/')}
            />
          ))}
        </nav>
      )}

      <div className="flex-1" />

      <div className="flex flex-col items-center gap-2 text-white/60">
        <NotificationBell />
        <ThemeToggle />
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
