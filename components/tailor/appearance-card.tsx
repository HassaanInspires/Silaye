'use client';

import * as React from 'react';
import { Sun, Moon, Contrast } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useTheme } from '@/lib/theme-provider';

export interface AppearanceCardProps {
  className?: string;
  compact?: boolean;
}

/**
 * AppearanceCard provides an authentic bilingual 2-way segmented theme switcher:
 * - Light Mode / دن کا موڈ (Sun icon)
 * - Dark Mode / رات کا موڈ (Moon icon)
 * Matches the Silaye Workshop Settings design specification.
 */
export function AppearanceCard({ className, compact = false }: AppearanceCardProps) {
  const { theme, setTheme, isMounted } = useTheme();

  // Graceful SSR hydration default: if not yet mounted on client, default visual to 'dark'
  const activeTheme = isMounted ? theme : 'dark';

  const segmentedControl = (
    <div className="grid grid-cols-2 p-1.5 rounded-xl bg-black/30 border border-white/10 gap-1.5">
      {/* Light Mode Segment */}
      <button
        type="button"
        onClick={() => setTheme('light')}
        aria-pressed={activeTheme === 'light'}
        className={cn(
          'h-11 min-h-[44px] flex items-center justify-center gap-2 px-3 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer select-none',
          activeTheme === 'light'
            ? 'bg-gold text-[#18181B] shadow-[0_1px_3px_rgba(0,0,0,0.1)] font-bold'
            : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
        )}
      >
        <span>Light Mode / دن کا موڈ</span>
        <Sun className="h-4 w-4 shrink-0" />
      </button>

      {/* Dark Mode Segment */}
      <button
        type="button"
        onClick={() => setTheme('dark')}
        aria-pressed={activeTheme === 'dark'}
        className={cn(
          'h-11 min-h-[44px] flex items-center justify-center gap-2 px-3 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer select-none',
          activeTheme === 'dark'
            ? 'bg-gold text-[#18181B] shadow-[0_1px_3px_rgba(0,0,0,0.1)] font-bold'
            : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
        )}
      >
        <span>Dark Mode / رات کا موڈ</span>
        <Moon className="h-4 w-4 shrink-0" />
      </button>
    </div>
  );

  if (compact) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Contrast className="h-4 w-4 text-gold" />
            <h3 className="text-xs font-semibold text-white tracking-wide uppercase">Appearance</h3>
          </div>
          <span className="font-urdu-serif text-xs text-gold/80" dir="rtl">
            (ظاہری شکل)
          </span>
        </div>
        <p className="text-xs text-gray-400">Choose your app theme.</p>
        {segmentedControl}
      </div>
    );
  }

  return (
    <Card className={cn('border-white/5 bg-[#0B0C0E]/70 backdrop-blur-xl', className)}>
      <CardHeader>
        <CardTitle className="text-base text-white flex items-center gap-2">
          <Contrast className="h-4 w-4 text-gold" />
          <span>Appearance</span>
          <span className="font-urdu-serif text-xs text-gold/80 -mt-0.5" dir="rtl">
            (ظاہری شکل)
          </span>
        </CardTitle>
        <CardDescription className="text-xs text-gray-400">
          Choose your app theme.
        </CardDescription>
      </CardHeader>

      <CardContent>{segmentedControl}</CardContent>
    </Card>
  );
}

export default AppearanceCard;
