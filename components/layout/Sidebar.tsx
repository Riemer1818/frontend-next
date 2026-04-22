'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  Clock,
  Wallet,
  PieChart,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Companies', href: '/companies', icon: Building2 },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Time Entries', href: '/time-entries', icon: Clock },
  { name: 'Money', href: '/money', icon: Wallet },
];

export function Sidebar() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string>('loading...');

  useEffect(() => {
    // Get role from dev bypass or actual auth
    const devRole = process.env.NEXT_PUBLIC_DEV_USER_ROLE || process.env.DEV_USER_ROLE;
    if (devRole) {
      setUserRole(devRole);
    } else {
      // In production, this would fetch from session/API
      setUserRole('unknown');
    }
  }, []);

  return (
    <div className="flex h-screen w-64 flex-col bg-sidebar border-r border-sidebar-border">
      <div className="flex h-16 items-center justify-between px-6">
        <h1 className="text-2xl font-bold text-sidebar-foreground">riemer.fyi</h1>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Theme</p>
          <ThemeToggle />
        </div>
        <p className="text-xs text-muted-foreground">Logged in as {userRole}</p>
      </div>
    </div>
  );
}
