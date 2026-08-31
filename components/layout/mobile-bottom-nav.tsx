'use client';

import * as React from 'react';
import Link from 'next/link';
import { Home, Scissors, BookOpen, Settings, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getNavLayoutPreference,
  type NavLayoutPreference,
  NAV_LAYOUT_CHANGED_EVENT,
} from '@/lib/nav-preferences';

export interface MobileBottomNavProps {
  activeRoute?: string;
  navLayout?: NavLayoutPreference;
}

interface MobileTabItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  labelUrdu: string;
  route: string;
}

const MOBILE_TABS_LEFT: ReadonlyArray<MobileTabItem> = [
  { icon: Home, label: 'Home', labelUrdu: 'ہوم', route: '/dashboard' },
  { icon: Scissors, label: 'Orders', labelUrdu: 'آرڈرز', route: '/orders' },
];

const MOBILE_TABS_RIGHT: ReadonlyArray<MobileTabItem> = [
  { icon: BookOpen, label: 'Khata', labelUrdu: 'کھاتہ', route: '/khata' },
  { icon: Settings, label: 'More', labelUrdu: 'سیٹنگز', route: '/settings' },
];

/**
 * Checks if a bottom navigation tab route matches the active route.
 */
function isTabActive(tabRoute: string, currentPath: string): boolean {
  if (!currentPath) return false;
  const normalized = currentPath.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  const target = tabRoute.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';

  if (target === '/dashboard') {
    return normalized === '/dashboard';
  }
  if (target === '/orders') {
    // Active for /orders or subpaths, but NOT /orders/new (which belongs to the elevated FAB)
    return normalized === '/orders' || (normalized.startsWith('/orders/') && normalized !== '/orders/new');
  }
  if (target === '/khata') {
    return normalized === '/khata' || normalized.startsWith('/khata/');
  }
  if (target === '/settings') {
    return normalized === '/settings' || normalized.startsWith('/settings/');
  }
  return normalized === target;
}

export function MobileBottomNav({ activeRoute = '', navLayout }: MobileBottomNavProps) {
  const [mountedPath, setMountedPath] = React.useState<string>(activeRoute);
  const [layoutState, setLayoutState] = React.useState<NavLayoutPreference>(
    () => navLayout || 'tabs'
  );

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setMountedPath(window.location.pathname);
      setLayoutState(navLayout || getNavLayoutPreference());

      const handleLayoutChange = () => {
        setLayoutState(getNavLayoutPreference());
      };
      window.addEventListener(NAV_LAYOUT_CHANGED_EVENT, handleLayoutChange);
      return () => {
        window.removeEventListener(NAV_LAYOUT_CHANGED_EVENT, handleLayoutChange);
      };
    }
  }, [activeRoute, navLayout]);

  const effectiveLayout = navLayout || layoutState;

  if (effectiveLayout === 'drawer') {
    return null;
  }

  const currentPath = mountedPath || activeRoute;
  const isFabActive = currentPath === '/orders/new' || currentPath.startsWith('/orders/new');

  return (
    <nav
      aria-label="Mobile Navigation"
      className={cn(
        'md:hidden fixed bottom-0 left-0 right-0 z-40',
        'bg-[#0E1013]/95 backdrop-blur-xl border-t border-gold/15',
        'shadow-[0_-4px_25px_rgba(0,0,0,0.6)] pb-safe'
      )}
    >
      <div className="grid grid-cols-5 items-center justify-items-center px-1 pt-1.5 pb-1 max-w-lg mx-auto">
        {/* Left Tabs (Home, Orders) */}
        {MOBILE_TABS_LEFT.map((tab) => {
          const isActive = isTabActive(tab.route, currentPath);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.route}
              href={tab.route}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center min-w-[54px] min-h-[48px] px-1 py-1 rounded-xl transition-all duration-200 group',
                isActive
                  ? 'text-gold bg-gold/10 border border-gold/20 shadow-[0_0_12px_rgba(212,175,55,0.15)]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] border border-transparent'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 transition-transform duration-200',
                  isActive ? 'text-gold scale-110' : 'text-gray-400 group-hover:text-gray-200'
                )}
              />
              <span className="flex items-center gap-0.5 mt-0.5">
                <span className="font-urdu-sans text-[11px] leading-none" dir="rtl">
                  {tab.labelUrdu}
                </span>
              </span>
              {isActive ? (
                <span className="h-1 w-1 rounded-full bg-gold shadow-[0_0_6px_rgba(212,175,55,0.9)] mt-0.5" />
              ) : (
                <span className="h-1 w-1 mt-0.5 opacity-0" />
              )}
            </Link>
          );
        })}

        {/* Center Slot: Elevated Gold Action FAB */}
        <div className="flex flex-col items-center justify-center relative min-w-[54px]">
          <Link
            href="/orders/new"
            aria-label="Book New Suit / نیا سوٹ بک کریں"
            title="Book New Suit / نیا سوٹ بک کریں"
            className={cn(
              '-translate-y-4 h-14 w-14 rounded-full',
              'bg-gradient-to-tr from-gold via-amber-400 to-amber-500 text-black',
              'flex items-center justify-center shadow-[0_0_25px_rgba(212,175,55,0.4)]',
              'border-4 border-[#0B0C0E] active:scale-95 transition-all duration-200',
              isFabActive && 'ring-2 ring-gold shadow-[0_0_30px_rgba(212,175,55,0.6)] scale-105'
            )}
          >
            <Plus className="h-6 w-6 stroke-[2.5] text-[#0B0C0E]" />
          </Link>
          <span
            className={cn(
              'font-urdu-sans text-[10px] font-semibold -mt-3 transition-colors',
              isFabActive ? 'text-gold' : 'text-gray-400'
            )}
            dir="rtl"
          >
            نیا سوٹ
          </span>
        </div>

        {/* Right Tabs (Khata, Settings) */}
        {MOBILE_TABS_RIGHT.map((tab) => {
          const isActive = isTabActive(tab.route, currentPath);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.route}
              href={tab.route}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center min-w-[54px] min-h-[48px] px-1 py-1 rounded-xl transition-all duration-200 group',
                isActive
                  ? 'text-gold bg-gold/10 border border-gold/20 shadow-[0_0_12px_rgba(212,175,55,0.15)]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] border border-transparent'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 transition-transform duration-200',
                  isActive ? 'text-gold scale-110' : 'text-gray-400 group-hover:text-gray-200'
                )}
              />
              <span className="flex items-center gap-0.5 mt-0.5">
                <span className="font-urdu-sans text-[11px] leading-none" dir="rtl">
                  {tab.labelUrdu}
                </span>
              </span>
              {isActive ? (
                <span className="h-1 w-1 rounded-full bg-gold shadow-[0_0_6px_rgba(212,175,55,0.9)] mt-0.5" />
              ) : (
                <span className="h-1 w-1 mt-0.5 opacity-0" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default MobileBottomNav;
