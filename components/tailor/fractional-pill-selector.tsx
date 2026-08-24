'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FractionalPillSelectorProps {
  /** The current measurement value (e.g. 42.25). Only the decimal is controlled. */
  value: number;
  /** Called with the updated value when a pill is selected. */
  onChange: (next: number) => void;
  className?: string;
}

const FRACTIONS: ReadonlyArray<{ label: string; value: number }> = [
  { label: '.00', value: 0.0 },
  { label: '.25', value: 0.25 },
  { label: '.50', value: 0.5 },
  { label: '.75', value: 0.75 },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FractionalPillSelector({ value, onChange, className }: FractionalPillSelectorProps) {
  /**
   * Isolate the decimal portion of the current value for active state comparison.
   * Math.round is used to avoid floating-point noise (e.g. 0.9999999... vs 1.0).
   */
  const currentDecimal = Math.round((value - Math.floor(value)) * 100) / 100;

  const handleSelect = (fraction: number) => {
    const integerPart = Math.floor(value);
    onChange(integerPart + fraction);
  };

  return (
    <div
      className={cn('flex items-center gap-1', className)}
      role="group"
      aria-label="Fractional inch selector"
    >
      {FRACTIONS.map((frac) => {
        const isActive = Math.abs(currentDecimal - frac.value) < 0.001;
        return (
          <button
            key={frac.label}
            type="button"
            /**
             * tabIndex={-1} per acceptance criteria:
             * Fractional pill buttons must not steal keyboard focus during form tab navigation.
             */
            tabIndex={-1}
            onClick={() => handleSelect(frac.value)}
            aria-pressed={isActive}
            aria-label={`Set fraction to ${frac.label}`}
            className={cn(
              'h-7 min-w-[2.75rem] rounded-md border px-1.5 text-xs font-medium transition-colors focus:outline-none',
              isActive
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
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
