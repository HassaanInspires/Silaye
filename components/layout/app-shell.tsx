'use client';

import * as React from 'react';
import {
  PlusCircle,
  ClipboardList,
  Users,
  Scissors,
  Wallet,
  Tag,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AppShellProps {
  children: React.ReactNode;
  /** Currently active route segment, used to highlight the active nav item. */
  activeRoute?: string;
}

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  route: string;
}

// ---------------------------------------------------------------------------
// Navigation definition
// ---------------------------------------------------------------------------

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { icon: PlusCircle, label: 'New Order', route: '/dashboard/new' },
  { icon: ClipboardList, label: 'Orders', route: '/dashboard/orders' },
  { icon: Users, label: 'Customers', route: '/dashboard/customers' },
  { icon: Scissors, label: 'Workshop', route: '/dashboard/workshop' },
  { icon: Wallet, label: 'Khata', route: '/dashboard/khata' },
  { icon: Tag, label: 'Print Tag', route: '/dashboard/print' },
  { icon: Settings, label: 'Settings', route: '/dashboard/settings' },
];

// ---------------------------------------------------------------------------
// Online/Offline heartbeat pill
// ---------------------------------------------------------------------------

function ConnectionPill() {
  const [isOnline, setIsOnline] = React.useState<boolean>(true);

  React.useEffect(() => {
    // Initialise with actual browser state
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        isOnline
          ? 'border-status-ready/40 bg-status-ready/10 text-status-ready'
          : 'border-status-overdue/40 bg-status-overdue/10 text-status-overdue'
      )}
      role="status"
      aria-live="polite"
      aria-label={isOnline ? 'Connection: Online' : 'Connection: Offline'}
    >
      {isOnline ? (
        <Wifi className="h-3 w-3" aria-hidden="true" />
      ) : (
        <WifiOff className="h-3 w-3" aria-hidden="true" />
      )}
      <span>{isOnline ? 'Online' : 'Offline'}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar nav item
// ---------------------------------------------------------------------------

interface SidebarItemProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}

function SidebarItem({ item, isActive, collapsed }: SidebarItemProps) {
  const Icon = item.icon;
  return (
    <a
      href={item.route}
      aria-current={isActive ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-card-elevated hover:text-foreground',
        collapsed && 'justify-center px-2'
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-primary')} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </a>
  );
}

// ---------------------------------------------------------------------------
// App Shell
// ---------------------------------------------------------------------------

export function AppShell({ children, activeRoute = '' }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState<boolean>(false);
  const [searchValue, setSearchValue] = React.useState<string>('');

  // Global '/' shortcut focuses the search input
  const searchRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ------------------------------------------------------------------ */}
      {/* TOP COMMAND BAR                                                      */}
      {/* ------------------------------------------------------------------ */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-card px-4 shadow-sm">
        {/* Brand logo */}
        <span className="font-editorial text-lg font-normal italic text-primary select-none whitespace-nowrap">
          Silaye
        </span>

        <div className="mx-2 h-5 w-px bg-border" aria-hidden="true" />

        {/* Customer / Order search */}
        <div className="flex flex-1 items-center">
          <Input
            ref={searchRef}
            type="search"
            placeholder="Search customer, order… ( / )"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            className="max-w-sm"
            aria-label="Search customers and orders"
          />
        </div>

        {/* Connection status */}
        <ConnectionPill />

        {/* New Booking CTA */}
        <Button variant="default" size="sm" className="gap-1.5 whitespace-nowrap">
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
          New Booking
        </Button>

        {/* Settings */}
        <Button variant="ghost" size="icon" aria-label="Open settings">
          <Settings className="h-4 w-4" />
        </Button>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* BODY: SIDEBAR + MAIN VIEWPORT                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            'flex flex-col border-r border-border bg-card transition-[width] duration-200 ease-in-out',
            sidebarCollapsed ? 'w-16' : 'w-56'
          )}
          aria-label="Main navigation"
        >
          {/* Nav items */}
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden p-2 pt-3">
            {NAV_ITEMS.map((item) => (
              <SidebarItem
                key={item.route}
                item={item}
                isActive={activeRoute === item.route}
                collapsed={sidebarCollapsed}
              />
            ))}
          </nav>

          {/* Collapse toggle */}
          <div className="border-t border-border p-2">
            <button
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className={cn(
                'flex w-full items-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-card-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                sidebarCollapsed ? 'justify-center' : 'justify-end'
              )}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>
        </aside>

        {/* Main workspace viewport */}
        <main className="flex-1 overflow-y-auto p-6" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppShell;
