'use client';

// DEPRECATED — replaced by Sidebar.tsx

import { useSession } from '@/components/AuthProvider';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogOut, User, LayoutDashboard, Package, ArrowDownCircle, ArrowUpCircle, FileText, Truck, Settings, History, ClipboardList, Users, Menu, X, Globe, Anchor } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { WarehouseFilter } from './WarehouseFilter';
import { AnimatedThemeToggler } from './ui/animated-theme-toggler';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/authRoles';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
  { name: 'Customs', href: '/dashboard/customs', icon: Globe, roles: ['ADMIN', 'MANAGER'] },
  { name: 'Products', href: '/products', icon: Package, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
  { name: 'Receipts', href: '/receipts', icon: ArrowDownCircle, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
  { name: 'Deliveries', href: '/deliveries', icon: ArrowUpCircle, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
  { name: 'Requisitions', href: '/requisitions', icon: FileText, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
  { name: 'Transfers', href: '/transfers', icon: Truck, roles: ['ADMIN', 'MANAGER'] },
  { name: 'Adjustments', href: '/adjustments', icon: ClipboardList, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
  { name: 'Move History', href: '/ledger', icon: History, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
  { name: 'Users', href: '/admin/users', icon: Users, roles: ['ADMIN'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
];

export function TopBar() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userRole = (session?.user as any)?.role as Role | undefined;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    try {
      // Clear server session cookie used by middleware and server routes.
      await fetch('/api/auth/session', {
        method: 'DELETE',
        credentials: 'include',
        cache: 'no-store',
      });
    } catch (error) {
      console.error('Failed to clear server session cookie:', error);
    }

    try {
      await signOut(auth);
    } catch (error) {
      console.error('Firebase sign out failed:', error);
    }

    router.replace('/auth/signin');
    router.refresh();
  };

  // Filter navigation based on user role
  const visibleNavigation = navigation.filter((item) => {
    if (!userRole) return false;
    return item.roles.includes(userRole);
  });

  return (
    <>
      <div className="h-16 bg-card/40 backdrop-blur-xl border-b border-black/10 dark:border-white/10 flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-4 lg:gap-6">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            {mounted && (
              <img
                src={theme === 'dark' ? '/app_dark.png' : '/sm.png'}
                alt="StockMaster"
                className={
                  theme === 'dark'
                    ? 'h-8 lg:h-10 w-auto'
                    : 'h-8 lg:h-10 w-auto drop-shadow-[0_1px_6px_rgba(0,0,0,0.18)]'
                }
              />
            )}
            {!mounted && (
              <img src="/sm.png" alt="StockMaster" className="h-8 lg:h-10 w-auto drop-shadow-[0_1px_6px_rgba(0,0,0,0.18)]" />
            )}
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center gap-1">
            {visibleNavigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="relative group block"
                >
                  <div className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}>
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>
                  <span 
                    className={cn(
                      'absolute bottom-0 left-0 h-[3px] bg-primary transition-all duration-300 ease-in-out rounded-full',
                      isActive ? 'w-full' : 'w-0 group-hover:w-full'
                    )}
                  />
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 lg:gap-3">
          <div className="hidden md:block">
            <WarehouseFilter />
          </div>
          
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">
              {(session?.user as any)?.role || 'USER'}
            </span>
          </div>

          {mounted && (
            <AnimatedThemeToggler className="p-2 bg-background/50 hover:bg-muted border border-black/10 dark:border-white/10 rounded-lg transition-all duration-300 [&_svg]:w-4 [&_svg]:h-4 [&_svg]:text-foreground" />
          )}

          <button
            onClick={handleSignOut}
            className="hidden sm:flex items-center gap-2 px-3 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-all duration-300"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 bg-background/50 hover:bg-muted border border-black/10 dark:border-white/10 rounded-lg transition-all duration-300"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-foreground" />
            ) : (
              <Menu className="w-5 h-5 text-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-card/40 backdrop-blur-xl border-b border-black/10 dark:border-white/10 px-4 py-4 space-y-2">
          {/* Mobile Warehouse Filter */}
          <div className="md:hidden mb-3">
            <WarehouseFilter />
          </div>

          {/* Mobile Navigation */}
          {visibleNavigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 w-full border-l-4',
                  isActive
                    ? 'bg-primary/10 text-primary border-primary'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground border-transparent'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {/* Mobile User Role (visible on small screens) */}
          <div className="sm:hidden flex items-center gap-2 px-4 py-3 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg">
            <User className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-foreground">
              {(session?.user as any)?.role || 'USER'}
            </span>
          </div>

          {/* Mobile Sign Out */}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              handleSignOut();
            }}
            className="sm:hidden flex items-center gap-3 px-4 py-3 w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-all duration-300"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </>
  );
}
