'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { clearSession, getStoredUser } from '@/lib/auth';
import NotificationBell from './NotificationBell';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/assets', label: 'Assets' },
  { href: '/maintenance', label: 'Maintenance' },
  { href: '/settings', label: 'Settings' },
];

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getStoredUser();

  function handleLogout() {
    clearSession();
    router.push('/login');
  }

  return (
    <header className="bg-primary text-white">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="font-display font-bold text-lg">Asset & Inventory</span>
          <nav className="hidden sm:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = pathname === link.href || pathname?.startsWith(link.href + '/');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md text-sm transition ${
                    active ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <NotificationBell />
          {user && <span className="text-white/80 hidden sm:inline">{user.name}</span>}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-white/80 hover:text-white transition"
          >
            <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
