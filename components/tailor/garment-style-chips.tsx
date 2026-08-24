'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { CollarStyle, DamanStyle, PocketConfig, FrontPatti } from '@/types/tailor';

// ---------------------------------------------------------------------------
// Bilingual label maps  (English + Urdu, verified vocabulary from skills/urdu-typography.md)
// ---------------------------------------------------------------------------

const collarLabels: Record<CollarStyle, { en: string; ur: string }> = {
  FULL_BAN: { en: 'Full Ban', ur: 'فل بین' },
  HALF_BAN: { en: 'Half Ban', ur: 'ہاف بین' },
  SHERWANI_CUT: { en: 'Sherwani', ur: 'شیروانی کٹ' },
  SHIRT_COLLAR: { en: 'Shirt Collar', ur: 'شرٹ کالر' },
  GOL_GALA: { en: 'Round Neck', ur: 'گول گلا' },
};

const damanLabels: Record<DamanStyle, { en: string; ur: string }> = {
  GOL_DAMAN: { en: 'Round Daman', ur: 'گول دامن' },
  CHORAS_DAMAN: { en: 'Square Daman', ur: 'چورس دامن' },
};

const pocketLabels: Record<PocketConfig, { en: string; ur: string }> = {
  FRONT_ONLY: { en: 'Front Only', ur: 'صرف آگے' },
  FRONT_ONE_SIDE: { en: 'One Side', ur: 'ایک طرف' },
  FRONT_TWO_SIDES: { en: 'Two Sides', ur: 'دونوں طرف' },
  TWO_SIDES_NO_FRONT: { en: 'Side Pockets', ur: 'سائیڈ جیبیں' },
  SECRET_ZIPPER_POCKET: { en: 'Secret Zip', ur: 'موبائل زپ' },
};

const frontPattiLabels: Record<FrontPatti, { en: string; ur: string }> = {
  GUM_PATTI: { en: 'Concealed', ur: 'گم پٹی' },
  CHORI_PATTI: { en: 'Wide Placket', ur: 'چوڑی پٹی' },
  BAREEK_PATTI: { en: 'Narrow Placket', ur: 'باریک پٹی' },
  DOUBLE_STITCH: { en: 'Double Stitch', ur: 'ڈبل سلائی' },
};

// ---------------------------------------------------------------------------
// Generic chip button
// ---------------------------------------------------------------------------

interface StyleChipProps {
  isActive: boolean;
  onClick: () => void;
  label: { en: string; ur: string };
}

function StyleChip({ isActive, onClick, label }: StyleChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        'flex flex-col items-center gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isActive
          ? 'border-primary bg-primary/10 text-primary shadow-[0_0_0_1px_var(--accent-gold-primary)]'
          : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
      )}
    >
      {/* English label — LTR, standard font */}
      <span className="text-xs font-medium leading-tight">{label.en}</span>
      {/* Urdu label — RTL, Noto Sans Arabic, line-height 1.65 to prevent vertical clipping */}
      <span
        dir="rtl"
        lang="ur"
        className="font-urdu-sans text-[0.65rem] leading-urdu-data"
      >
        {label.ur}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Chip group
// ---------------------------------------------------------------------------

interface ChipGroupProps<T extends string> {
  label: string;
  options: ReadonlyArray<T>;
  value: T;
  labelMap: Record<T, { en: string; ur: string }>;
  onChange: (value: T) => void;
}

function ChipGroup<T extends string>({
  label,
  options,
  value,
  labelMap,
  onChange,
}: ChipGroupProps<T>) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((option) => (
          <StyleChip
            key={option}
            isActive={value === option}
            onClick={() => onChange(option)}
            label={labelMap[option]}
          />
        ))}
      </div>
    </fieldset>
  );
}

// ---------------------------------------------------------------------------
// Exported props & component
// ---------------------------------------------------------------------------

export interface GarmentStyleSelections {
  collarStyle: CollarStyle;
  damanStyle: DamanStyle;
  pocketConfig: PocketConfig;
  frontPatti: FrontPatti;
}

export interface GarmentStyleChipsProps extends GarmentStyleSelections {
  onChange: <K extends keyof GarmentStyleSelections>(
    key: K,
    value: GarmentStyleSelections[K]
  ) => void;
  className?: string;
}

export function GarmentStyleChips({
  collarStyle,
  damanStyle,
  pocketConfig,
  frontPatti,
  onChange,
  className,
}: GarmentStyleChipsProps) {
  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <ChipGroup<CollarStyle>
        label="Collar Style / گلا"
        options={['FULL_BAN', 'HALF_BAN', 'SHERWANI_CUT', 'SHIRT_COLLAR', 'GOL_GALA']}
        value={collarStyle}
        labelMap={collarLabels}
        onChange={(v) => onChange('collarStyle', v)}
      />
      <ChipGroup<DamanStyle>
        label="Daman Style / دامن"
        options={['GOL_DAMAN', 'CHORAS_DAMAN']}
        value={damanStyle}
        labelMap={damanLabels}
        onChange={(v) => onChange('damanStyle', v)}
      />
      <ChipGroup<PocketConfig>
        label="Pocket Config / جیب"
        options={[
          'FRONT_ONLY',
          'FRONT_ONE_SIDE',
          'FRONT_TWO_SIDES',
          'TWO_SIDES_NO_FRONT',
          'SECRET_ZIPPER_POCKET',
        ]}
        value={pocketConfig}
        labelMap={pocketLabels}
        onChange={(v) => onChange('pocketConfig', v)}
      />
      <ChipGroup<FrontPatti>
        label="Front Patti / پٹی"
        options={['GUM_PATTI', 'CHORI_PATTI', 'BAREEK_PATTI', 'DOUBLE_STITCH']}
        value={frontPatti}
        labelMap={frontPattiLabels}
        onChange={(v) => onChange('frontPatti', v)}
      />
    </div>
  );
}

export default GarmentStyleChips;
