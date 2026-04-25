'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from '@/components/AuthProvider';
import { useTheme } from 'next-themes';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart2,
  BookOpen,
  Box,
  Briefcase,
  Building2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  LogOut,
  Map,
  Menu,
  Navigation,
  Package,
  PackageCheck,
  PackageX,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  Sun,
  Moon,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react';

type Role = 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VENDOR' | 'TRANSPORT';

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  devOnly?: boolean;
};

const brandClass = 'text-blue-600 dark:text-blue-400';

const getRoleColor = (role?: string | null) => {
  switch (role) {
    case 'ADMIN':
      return 'bg-purple-600';
    case 'MANAGER':
      return 'bg-blue-600';
    case 'OPERATOR':
      return 'bg-emerald-600';
    case 'VENDOR':
      return 'bg-amber-600';
    case 'TRANSPORT':
      return 'bg-cyan-600';
    default:
      return 'bg-slate-500';
  }
};

const isActivePath = (pathname: string, href: string) => {
  if (href === '/') return pathname === '/';
  if (href === '/dashboard') return pathname === '/dashboard';
  if (href === '/settings') return pathname === '/settings';
  return pathname === href || pathname.startsWith(href + '/');
};

export default function Sidebar() {
  const pathname = usePathname() || '/';
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  const user = session?.user as any;
  const role = (user?.role as Role | undefined) || undefined;
  const email = (user?.email as string | undefined) || undefined;
  const name = (user?.name as string | undefined) || 'User';
  const primaryWarehouseId = (user?.primaryWarehouseId as string | null | undefined) || null;

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isDev =
    process.env.NODE_ENV === 'development' || (typeof email === 'string' && email.toLowerCase().includes('dev'));

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sidebar_collapsed');
      if (stored === '1') setCollapsed(true);
      if (stored === '0') setCollapsed(false);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('sidebar_collapsed', collapsed ? '1' : '0');
    } catch {
      // ignore
    }
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navItems: NavItem[] = useMemo(() => {
    if (!role) return [];

    if (role === 'ADMIN') {
      // ADMIN / SCM Head — Control tower focus, admin tools grouped
      return [
        { label: 'Control Tower',      href: '/dashboard',           icon: Map },
        { label: 'Risk Events',        href: '/dashboard/audit',     icon: AlertTriangle },
        { label: 'Inventory',          href: '/products',            icon: Box },
        { label: 'Inbound / Outbound', href: '/receipts',            icon: PackageCheck },
        { label: 'Operations',         href: '/transfers',           icon: ArrowLeftRight },
        { label: 'Ledger',             href: '/ledger',              icon: BookOpen },
        { label: 'Settings & Admin',   href: '/settings',            icon: Settings },
        { label: 'Users',              href: '/admin/users',         icon: Users },
      ];

    }

    if (role === 'MANAGER') {
      const wh = primaryWarehouseId || null;
      // MANAGER — warehouse operations focus
      return [
        { label: 'Overview',           href: '/dashboard',                                    icon: BarChart2 },
        ...(wh ? [
          { label: 'Dock Schedule',    href: `/dashboard/warehouses/${wh}/docks`,             icon: Clock },
        ] : []),
        { label: 'Inbound',            href: '/receipts',            icon: PackageCheck },
        { label: 'Outbound',           href: '/deliveries',          icon: PackageX },
        { label: 'Transfers',          href: '/transfers',           icon: ArrowLeftRight },
        { label: 'Requisitions',       href: '/requisitions',        icon: ClipboardList },
        { label: 'Risk Events',        href: '/dashboard/audit',     icon: AlertTriangle },
        { label: 'Ledger',             href: '/ledger',              icon: BookOpen },
      ];
    }

    if (role === 'OPERATOR') {
      // OPERATOR — task-queue only, no dashboards or risk data
      return [
        { label: 'My Tasks',           href: '/dashboard',           icon: CheckSquare },
        { label: 'Validate Receipts',  href: '/receipts',            icon: PackageCheck },
        { label: 'Deliveries',         href: '/deliveries',          icon: PackageX },
        { label: 'Adjustments',        href: '/adjustments',         icon: SlidersHorizontal },
        { label: 'Ledger',             href: '/ledger',              icon: BookOpen },
      ];
    }

    if (role === 'VENDOR') {
      return [
        { label: 'Vendor Portal',      href: '/vendor',              icon: ShoppingCart },
      ];
    }

    if (role === 'TRANSPORT') {
      return [
        { label: 'Driver Portal',      href: '/driver/SHP-4521',     icon: Navigation },
      ];
    }

    return [];
  }, [role, primaryWarehouseId]);


  const visibleNav = navItems.filter((item) => (item.devOnly ? isDev : true));
  const widthClass = collapsed ? 'w-16' : 'w-60';

  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch('/api/auth/session', {
        method: 'DELETE',
        credentials: 'include',
        cache: 'no-store',
      });
    } catch {
      // ignore
    }
    try {
      await signOut(auth);
    } finally {
      window.location.href = '/auth/signin';
    }
  };

  const SidebarInner = (
    <aside
      className={[
        'h-screen flex flex-col border-r border-black/10 dark:border-white/10',
        'bg-slate-50 dark:bg-slate-900',
        'sticky top-0',
        widthClass,
      ].join(' ')}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-3 border-b border-black/10 dark:border-white/10">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 min-w-0"
          title="SupplyMind"
        >
          <Truck className={['h-5 w-5 shrink-0', brandClass].join(' ')} />
          {!collapsed && (
            <span className={['font-semibold truncate', brandClass].join(' ')}>
              SupplyMind
            </span>
          )}
        </Link>

        {/* Collapse toggle (desktop only) */}
        <button
          type="button"
          className="hidden md:inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed((v) => !v)}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        <ul className="space-y-1 px-2">
          {visibleNav.map((item) => {
            const active = isActivePath(pathname, item.href);
            const ItemIcon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={[
                    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    collapsed ? 'justify-center' : '',
                    active
                      ? 'bg-blue-600/10 text-blue-700 dark:text-blue-300 border-l-[3px] border-blue-600 font-semibold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10',
                  ].join(' ')}
                >
                  <ItemIcon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom */}
      <div className="border-t border-black/10 dark:border-white/10 p-3">
        <div className={['flex items-center', collapsed ? 'justify-center' : 'gap-3'].join(' ')}>
          <div
            className={[
              'h-9 w-9 rounded-full flex items-center justify-center text-white font-semibold shrink-0',
              getRoleColor(role),
            ].join(' ')}
            title={collapsed ? `${name} (${role || 'USER'})` : undefined}
          >
            {(name?.trim()?.[0] || 'U').toUpperCase()}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-slate-900 dark:text-slate-50 truncate">{name}</span>
                {role && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-200 shrink-0">
                    {role}
                  </span>
                )}
              </div>
              {email && <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{email}</div>}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={collapsed ? 'Toggle Theme' : undefined}
          className={[
            'mt-3 w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-300',
            'bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-black/10 dark:hover:bg-white/20',
            collapsed ? 'justify-center' : '',
          ].join(' ')}
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5 shrink-0" />
          ) : (
            <Moon className="h-5 w-5 shrink-0" />
          )}
          {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          title={collapsed ? 'Sign out' : undefined}
          className={[
            'mt-3 w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-300',
            'bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50 disabled:cursor-not-allowed',
            collapsed ? 'justify-center' : '',
          ].join(' ')}
        >
          {loggingOut ? (
            <svg className="animate-spin h-5 w-5 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <LogOut className="h-5 w-5 shrink-0" />
          )}
          {!collapsed && <span>{loggingOut ? 'Signing out...' : 'Sign out'}</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile hamburger (in page content area) */}
      <button
        type="button"
        className="md:hidden fixed top-3 left-3 z-50 inline-flex items-center justify-center h-10 w-10 rounded-lg bg-background/80 backdrop-blur border border-black/10 dark:border-white/10"
        aria-label="Open navigation"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop sidebar */}
      <div className="hidden md:block">{SidebarInner}</div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-60 animate-[slideIn_180ms_ease-out]">
            {SidebarInner}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateX(-12px);
            opacity: 0.6;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
