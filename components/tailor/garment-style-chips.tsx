'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CollarStyle, DamanStyle, FrontPatti, PocketConfig } from '@/types/tailor';

// ---------------------------------------------------------------------------
// Option definitions
// ---------------------------------------------------------------------------

export interface StyleOption {
  id: string;
  en: string;
  ur: string;
}

export const COLLAR_OPTIONS: ReadonlyArray<StyleOption> = [
  { id: 'FULL_BAN', en: 'Full Ban', ur: 'فل بین' },
  { id: 'HALF_BAN', en: 'Half Ban', ur: 'ہاف بین' },
  { id: 'SHERWANI_CUT', en: 'Sherwani Cut', ur: 'شیروانی کٹ' },
  { id: 'SHIRT_COLLAR', en: 'Shirt Collar', ur: 'شرٹ کالر' },
  { id: 'GOL_GALA', en: 'Round Neck', ur: 'گول گلا' },
];

export const DAMAN_OPTIONS: ReadonlyArray<StyleOption> = [
  { id: 'GOL_DAMAN', en: 'Round Daman', ur: 'گول دامن' },
  { id: 'CHORAS_DAMAN', en: 'Square Daman', ur: 'چورس دامن' },
];

export const FRONT_PATTI_OPTIONS: ReadonlyArray<StyleOption> = [
  { id: 'GUM_PATTI', en: 'Concealed', ur: 'گم پٹی' },
  { id: 'CHORI_PATTI', en: 'Wide Placket', ur: 'چوڑی پٹی' },
  { id: 'BAREEK_PATTI', en: 'Narrow Placket', ur: 'باریک پٹی' },
  { id: 'DOUBLE_STITCH', en: 'Double Stitch', ur: 'ڈبل سلائی' },
];

export const POCKET_OPTIONS: ReadonlyArray<StyleOption> = [
  { id: 'FRONT_CHEST', en: 'Front Chest Pocket', ur: 'سامنے جیب' },
  { id: 'LEFT_SIDE', en: 'Left Side Pocket', ur: 'بائیں جیب' },
  { id: 'RIGHT_SIDE', en: 'Right Side Pocket', ur: 'دائیں جیب' },
  { id: 'SECRET_ZIP', en: 'Secret Mobile Zip', ur: 'موبائل زپ' },
];

export const POCKET_DISPLAY_MAP: Record<string, { en: string; ur: string }> = {
  FRONT_CHEST: { en: 'Front Chest Pocket', ur: 'سامنے جیب' },
  LEFT_SIDE: { en: 'Left Side Pocket', ur: 'بائیں جیب' },
  RIGHT_SIDE: { en: 'Right Side Pocket', ur: 'دائیں جیب' },
  SECRET_ZIP: { en: 'Secret Mobile Zip', ur: 'موبائل زپ' },
  FRONT_ONLY: { en: 'Front Pocket Only', ur: 'صرف سامنے جیب' },
  FRONT_ONE_SIDE: { en: 'Front + 1 Side Pocket', ur: 'ایک طرف جیب' },
  FRONT_TWO_SIDES: { en: 'Front + 2 Side Pockets', ur: 'دونوں طرف جیب' },
  TWO_SIDES_NO_FRONT: { en: '2 Side Pockets', ur: 'سائیڈ جیبیں' },
  SECRET_ZIPPER_POCKET: { en: 'Secret Zip', ur: 'موبائل زپ' },
};

/**
 * Helper to format multi-select pockets into clean human-readable bilingual strings
 */
export function formatPocketSelection(
  pockets?: string[] | null,
  pocketConfig?: PocketConfig | string | null
): { en: string; ur: string } {
  if (pockets && pockets.length > 0) {
    const en = pockets.map((p) => POCKET_DISPLAY_MAP[p]?.en || p).join(' + ');
    const ur = pockets.map((p) => POCKET_DISPLAY_MAP[p]?.ur || p).join('، ');
    return { en, ur };
  }
  if (pocketConfig && POCKET_DISPLAY_MAP[pocketConfig]) {
    return POCKET_DISPLAY_MAP[pocketConfig];
  }
  return { en: 'Front + 1 Side Pocket', ur: 'ایک طرف جیب' };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GarmentStyleChipsProps {
  collarStyle?: CollarStyle | string;
  damanStyle?: DamanStyle | string;
  frontPatti?: FrontPatti | string;
  pockets?: string[];
  pocketConfig?: PocketConfig;
  onChange: (
    key: 'collar_style' | 'daman_style' | 'front_patti' | 'pockets' | 'collarStyle' | 'damanStyle' | 'frontPatti' | 'pocketConfig',
    value: any
  ) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GarmentStyleChips({
  collarStyle = 'FULL_BAN',
  damanStyle = 'CHORAS_DAMAN',
  frontPatti = 'GUM_PATTI',
  pockets = ['FRONT_CHEST', 'RIGHT_SIDE'],
  onChange,
  className,
}: GarmentStyleChipsProps) {
  const handlePocketToggle = (pocketId: string) => {
    const current = pockets || [];
    const next = current.includes(pocketId)
      ? current.filter((id) => id !== pocketId)
      : [...current, pocketId];
    onChange('pockets', next);
  };

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {/* 1. COLLAR / NECK ROW (Single-Select Radio) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Collar / Neck
          </span>
          <span dir="rtl" lang="ur" className="font-urdu-sans text-xs text-primary/80">
            گلا اور بین
          </span>
        </div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Collar / Neck selection">
          {COLLAR_OPTIONS.map((opt) => {
            const isSelected = collarStyle === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => {
                  onChange('collar_style', opt.id);
                  onChange('collarStyle', opt.id);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer select-none',
                  isSelected
                    ? 'border-gold bg-gold/15 text-gold shadow-[0_0_12px_rgba(212,175,55,0.15)] font-semibold'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-gray-200'
                )}
              >
                {isSelected && <Check className="h-3.5 w-3.5 text-gold shrink-0" />}
                <span>{opt.en}</span>
                <span dir="rtl" lang="ur" className="font-urdu-sans text-[10px] opacity-80">
                  ({opt.ur})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. DAMAN ROW (Single-Select Radio) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Daman Cut
          </span>
          <span dir="rtl" lang="ur" className="font-urdu-sans text-xs text-primary/80">
            دامن کا کٹ
          </span>
        </div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Daman Cut selection">
          {DAMAN_OPTIONS.map((opt) => {
            const isSelected = damanStyle === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => {
                  onChange('daman_style', opt.id);
                  onChange('damanStyle', opt.id);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer select-none',
                  isSelected
                    ? 'border-gold bg-gold/15 text-gold shadow-[0_0_12px_rgba(212,175,55,0.15)] font-semibold'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-gray-200'
                )}
              >
                {isSelected && <Check className="h-3.5 w-3.5 text-gold shrink-0" />}
                <span>{opt.en}</span>
                <span dir="rtl" lang="ur" className="font-urdu-sans text-[10px] opacity-80">
                  ({opt.ur})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. FRONT PATTI ROW (Single-Select Radio) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Front Patti
          </span>
          <span dir="rtl" lang="ur" className="font-urdu-sans text-xs text-primary/80">
            سامنے کی پٹی
          </span>
        </div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Front Patti selection">
          {FRONT_PATTI_OPTIONS.map((opt) => {
            const isSelected = frontPatti === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => {
                  onChange('front_patti', opt.id);
                  onChange('frontPatti', opt.id);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer select-none',
                  isSelected
                    ? 'border-gold bg-gold/15 text-gold shadow-[0_0_12px_rgba(212,175,55,0.15)] font-semibold'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-gray-200'
                )}
              >
                {isSelected && <Check className="h-3.5 w-3.5 text-gold shrink-0" />}
                <span>{opt.en}</span>
                <span dir="rtl" lang="ur" className="font-urdu-sans text-[10px] opacity-80">
                  ({opt.ur})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. POCKETS ROW (Multi-Select Checkboxes) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            Pockets <span className="text-[10px] text-gold font-normal lowercase">(Multi-Select)</span>
          </span>
          <span dir="rtl" lang="ur" className="font-urdu-sans text-xs text-primary/80">
            جیب کی ترتیبات
          </span>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Pocket choices multi-selection">
          {POCKET_OPTIONS.map((opt) => {
            const isSelected = (pockets || []).includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                onClick={() => handlePocketToggle(opt.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer select-none',
                  isSelected
                    ? 'border-gold bg-gold/15 text-gold shadow-[0_0_12px_rgba(212,175,55,0.15)] font-semibold'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-gray-200'
                )}
              >
                {isSelected && <Check className="h-3.5 w-3.5 text-gold shrink-0" />}
                <span>{opt.en}</span>
                <span dir="rtl" lang="ur" className="font-urdu-sans text-[10px] opacity-80">
                  ({opt.ur})
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default GarmentStyleChips;
