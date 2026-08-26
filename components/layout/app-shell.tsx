'use client';

import * as React from 'react';
import {
  Home,
  PlusCircle,
  ClipboardList,
  Users,
  Scissors,
  Wallet,
  Tag,
  Settings,
  Search,
  Wifi,
  WifiOff,
  RefreshCw,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { syncCoordinator, type SyncState } from '@/lib/sync-coordinator';

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
  labelUrdu: string;
  route: string;
}

// ---------------------------------------------------------------------------
// Navigation definition
// ---------------------------------------------------------------------------

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { icon: Home, label: 'Dashboard', labelUrdu: 'ڈیش بورڈ', route: '/dashboard' },
  { icon: ClipboardList, label: 'Production Queue', labelUrdu: 'ورکشاپ کیو', route: '/orders' },
  { icon: PlusCircle, label: 'New Booking', labelUrdu: 'نیا آرڈر', route: '/orders/new' },
  { icon: Wallet, label: 'Khata Ledger', labelUrdu: 'کھاتہ رجسٹر', route: '/khata' },
  { icon: Tag, label: 'Print Station', labelUrdu: 'پرنٹنگ کاؤنٹر', route: '/print' },
];

// ---------------------------------------------------------------------------
// Online/Offline heartbeat pill & Mutation Sync status
// ---------------------------------------------------------------------------

function ConnectionPill() {
  const [syncState, setSyncState] = React.useState<SyncState>(() => syncCoordinator.getState());

  React.useEffect(() => {
    // Initial fetch of queue counts and live subscription
    syncCoordinator.refreshQueueCounts();
    const unsubscribe = syncCoordinator.subscribe((state) => {
      setSyncState(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleManualSync = (e: React.MouseEvent) => {
    e.preventDefault();
    if (syncState.isOnline && !syncState.isSyncing) {
      syncCoordinator.processQueue();
    }
  };

  // 1. Syncing State
  if (syncState.isSyncing || syncState.status === 'SYNCING') {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-md transition-all duration-200',
          'border-gold/40 bg-gold/15 text-gold shadow-[0_0_15px_rgba(212,175,55,0.15)]'
        )}
        role="status"
        aria-live="polite"
        aria-label="Synchronizing offline mutations"
        title="Syncing pending changes with server..."
      >
        <RefreshCw className="h-3 w-3 animate-spin text-gold" aria-hidden="true" />
        <span>Syncing{syncState.pendingCount > 0 ? ` (${syncState.pendingCount})` : ''}...</span>
      </div>
    );
  }

  // 2. Offline State
  if (!syncState.isOnline || syncState.status === 'OFFLINE') {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-md transition-all duration-200',
          'border-amber-500/40 bg-amber-500/10 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
        )}
        role="status"
        aria-live="polite"
        aria-label={
          syncState.pendingCount > 0
            ? `Offline with ${syncState.pendingCount} queued changes`
            : 'Connection: Offline'
        }
        title={
          syncState.pendingCount > 0
            ? `${syncState.pendingCount} mutation(s) saved locally. Will sync automatically when online.`
            : 'Working offline. All changes saved locally.'
        }
      >
        <WifiOff className="h-3 w-3 text-amber-400" aria-hidden="true" />
        <span>
          Offline{syncState.pendingCount > 0 ? ` (${syncState.pendingCount} queued)` : ''}
        </span>
      </div>
    );
  }

  // 3. Online State with pending changes (Sync trigger)
  if (syncState.pendingCount > 0) {
    return (
      <button
        type="button"
        onClick={handleManualSync}
        className={cn(
          'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-md transition-all duration-200',
          'border-gold/30 bg-gold/10 text-gold hover:bg-gold/20 hover:border-gold/50 cursor-pointer shadow-[0_0_10px_rgba(212,175,55,0.1)]'
        )}
        role="status"
        aria-live="polite"
        title="Click to synchronize pending changes now"
      >
        <RefreshCw className="h-3 w-3 text-gold" aria-hidden="true" />
        <span>Sync Now ({syncState.pendingCount})</span>
      </button>
    );
  }

  // 4. Clean Online State
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-md transition-all duration-200',
        'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
      )}
      role="status"
      aria-live="polite"
      aria-label="Connection: Online"
      title="All changes synchronized"
    >
      <Wifi className="h-3 w-3 text-emerald-400" aria-hidden="true" />
      <span>Online</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar nav item
// ---------------------------------------------------------------------------

interface SidebarItemProps {
  item: NavItem;
  isActive: boolean;
  onNavigate?: () => void;
}

function SidebarItem({ item, isActive, onNavigate }: SidebarItemProps) {
  const Icon = item.icon;
  return (
    <a
      href={item.route}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-150',
        isActive
          ? 'border border-gold/20 bg-gold/10 text-gold shadow-[0_0_20px_rgba(212,175,55,0.08)]'
          : 'border border-transparent text-gray-400 hover:border-white/5 hover:bg-white/[0.04] hover:text-gray-100'
      )}
    >
      <div className="flex items-center gap-3">
        <Icon
          className={cn(
            'h-4 w-4 transition-colors',
            isActive ? 'text-gold' : 'text-gray-400 group-hover:text-gray-200'
          )}
        />
        <span>{item.label}</span>
      </div>
      <span
        className={cn(
          'font-urdu-sans text-xs opacity-70 transition-opacity group-hover:opacity-100',
          isActive ? 'text-gold' : 'text-gray-500'
        )}
        dir="rtl"
      >
        {item.labelUrdu}
      </span>
    </a>
  );
}

// ---------------------------------------------------------------------------
// App Shell
// ---------------------------------------------------------------------------

export function AppShell({ children, activeRoute = '' }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState<boolean>(false);
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
    <div className="min-h-screen bg-ambient-dark text-foreground flex flex-col md:flex-row font-sans">
      {/* ------------------------------------------------------------------ */}
      {/* DESKTOP SIDEBAR (Fixed Glass Panel)                                  */}
      {/* ------------------------------------------------------------------ */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col justify-between border-r border-white/5 bg-[#0B0C0E]/60 p-5 backdrop-blur-2xl md:flex"
        aria-label="Main navigation"
      >
        <div className="flex flex-col gap-6">
          {/* Brand Logo & Header */}
          <div className="flex items-center justify-between px-1">
            <a href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold shadow-[0_0_15px_rgba(212,175,55,0.15)] transition-transform group-hover:scale-105">
                <Scissors className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-editorial text-xl font-medium tracking-tight text-white group-hover:text-gold transition-colors">
                  Silaye
                </span>
                <span className="font-urdu-serif text-xs text-gold/80 -mt-1" dir="rtl">
                  سلائے ماسٹر
                </span>
              </div>
            </a>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium tracking-wider text-gray-400 uppercase">
              Pro
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-1.5">
            <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Workspace
            </span>
            {NAV_ITEMS.map((item) => (
              <SidebarItem
                key={item.route}
                item={item}
                isActive={activeRoute === item.route}
              />
            ))}
          </nav>
        </div>

        {/* Bottom Panel / Shop Info */}
        <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
          <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15 text-xs font-bold text-gold">
                WM
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-200">Wah Cantt Main</span>
                <span className="text-[10px] text-gray-500">Master Counter</span>
              </div>
            </div>
            <Sparkles className="h-3.5 w-3.5 text-gold/60" />
          </div>
        </div>
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/* MOBILE DRAWER (Glass Sheet)                                         */}
      {/* ------------------------------------------------------------------ */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex w-72 max-w-xs flex-1 flex-col justify-between border-r border-white/10 bg-[#0B0C0E]/95 p-6 backdrop-blur-2xl shadow-2xl">
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <a href="/dashboard" className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
                    <Scissors className="h-4 w-4" />
                  </div>
                  <span className="font-editorial text-xl font-medium text-white">Silaye</span>
                </a>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex flex-col gap-1.5">
                {NAV_ITEMS.map((item) => (
                  <SidebarItem
                    key={item.route}
                    item={item}
                    isActive={activeRoute === item.route}
                    onNavigate={() => setMobileMenuOpen(false)}
                  />
                ))}
              </nav>
            </div>

            <div className="border-t border-white/5 pt-4">
              <ConnectionPill />
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MAIN CONTENT AREA WITH COMMAND BAR                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-1 flex-col min-w-0 md:pl-64">
        {/* Top Command Bar (Glass Effect) */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-white/5 bg-[#0B0C0E]/60 px-4 md:px-8 backdrop-blur-2xl shadow-sm">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 md:hidden hover:bg-white/10"
              aria-label="Open navigation menu"
            >
              <Menu className="h-4 w-4" />
            </button>

            {/* Customer / Order search */}
            <div className="w-64 md:w-80 lg:w-96">
              <Input
                ref={searchRef}
                type="search"
                placeholder="Search customer, order… ( / )"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
                className="h-9 md:h-10 text-xs md:text-sm bg-[#0B0C0E]/40"
                aria-label="Search customers and orders"
              />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex">
              <ConnectionPill />
            </div>

            {/* New Booking CTA */}
            <a href="/orders/new">
              <Button
                variant="default"
                size="sm"
                className="gap-1.5 whitespace-nowrap bg-gold text-[#0B0C0E] hover:bg-gold-hover font-semibold shadow-[0_0_20px_rgba(212,175,55,0.2)]"
              >
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">New Booking</span>
                <span className="sm:hidden">New</span>
              </Button>
            </a>
          </div>
        </header>

        {/* Scrollable Main Viewport */}
        <main className="flex-1 p-4 md:p-8" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppShell;
