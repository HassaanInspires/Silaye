'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FractionalPillSelectorProps {
  /** The current fractional decimal part (e.g. 0, 0.25, 0.5, 0.75) or full measurement value */
  value: number;
  /** Called with the selected fraction value (0, 0.25, 0.5, or 0.75) */
  onChange: (fraction: number) => void;
  className?: string;
}

const FRACTIONS: ReadonlyArray<{ label: string; value: number }> = [
  { label: '0', value: 0.0 },
  { label: '¼', value: 0.25 },
  { label: '½', value: 0.5 },
  { label: '¾', value: 0.75 },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FractionalPillSelector({
  value,
  onChange,
  className,
}: FractionalPillSelectorProps) {
  /**
   * Isolate the decimal portion of the current value for active state comparison.
   * Math.round is used to prevent floating-point noise (e.g. 0.25000000000000006).
   */
  const currentDecimal = Math.round((value - Math.floor(value || 0)) * 100) / 100;

  return (
    <div
      className={cn(
        'flex h-9 items-center rounded-lg bg-card-elevated p-1 border border-border w-full',
        className
      )}
      role="group"
      aria-label="Fractional inch selector"
    >
      {FRACTIONS.map((frac) => {
        const isActive = Math.abs(currentDecimal - frac.value) < 0.01;
        return (
          <button
            key={frac.label}
            type="button"
            /**
             * tabIndex={-1} per keyboard navigation directives:
             * Fractional pill buttons must not steal keyboard focus during form tab navigation.
             */
            tabIndex={-1}
            onClick={() => onChange(frac.value)}
            aria-pressed={isActive}
            aria-label={`Set fraction to ${frac.label}`}
            className={cn(
              'flex-1 h-full text-xs font-semibold rounded-md transition-all flex items-center justify-center select-none focus:outline-none cursor-pointer',
              isActive
                ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/60'
            )}
          >
            {frac.label}
          </button>
        );
      })}
    </div>
  );
}

export default FractionalPillSelector;
