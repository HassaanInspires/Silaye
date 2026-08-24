'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { ShalwarKameezMeasurements, StylePreferences } from '@/types/tailor';
import { FractionalPillSelector } from '@/components/tailor/fractional-pill-selector';
import { GarmentStyleChips } from '@/components/tailor/garment-style-chips';

// ---------------------------------------------------------------------------
// Bilingual field definitions (SPECS.md §2.2 + skills/urdu-typography.md §4.1)
// ---------------------------------------------------------------------------

interface FieldDefinition {
  key: keyof ShalwarKameezMeasurements;
  en: string;
  ur: string;
  min: number;
  max: number;
  required: boolean;
  step: number;
}

const KAMEEZ_FIELDS: ReadonlyArray<FieldDefinition> = [
  { key: 'kameez_length',   en: 'Length',        ur: 'لمبائی',         min: 20,  max: 60, required: true,  step: 0.25 },
  { key: 'chest',           en: 'Chest',         ur: 'چھاتی',          min: 20,  max: 70, required: true,  step: 0.25 },
  { key: 'waist',           en: 'Waist',         ur: 'کمر',            min: 20,  max: 70, required: true,  step: 0.25 },
  { key: 'hips',            en: 'Hips / Seat',   ur: 'ہپ / گھیرا',    min: 20,  max: 70, required: false, step: 0.25 },
  { key: 'shoulder_teera',  en: 'Shoulder',      ur: 'تیرا',           min: 10,  max: 30, required: true,  step: 0.25 },
  { key: 'sleeve_length',   en: 'Sleeve',        ur: 'بازو',           min: 10,  max: 38, required: true,  step: 0.25 },
  { key: 'armhole_moodha',  en: 'Armhole',       ur: 'موڈھا',          min: 5,   max: 25, required: false, step: 0.25 },
  { key: 'neck_gala',       en: 'Neck / Collar', ur: 'گلا / بین',      min: 8,   max: 25, required: true,  step: 0.25 },
  { key: 'daman_width',     en: 'Daman Width',   ur: 'دامن / گھیرا',  min: 12,  max: 45, required: true,  step: 0.25 },
  { key: 'bicep_dola',      en: 'Bicep',         ur: 'ڈولا',           min: 4,   max: 25, required: false, step: 0.25 },
  { key: 'cuff_width',      en: 'Cuff Width',    ur: 'کف چوڑائی',      min: 1,   max: 10, required: false, step: 0.25 },
  { key: 'cuff_length',     en: 'Cuff Circ.',    ur: 'کف گھیرا',       min: 5,   max: 20, required: false, step: 0.25 },
];

const SHALWAR_FIELDS: ReadonlyArray<FieldDefinition> = [
  { key: 'shalwar_length',  en: 'Shalwar Length',  ur: 'شلوار لمبائی',  min: 20,  max: 60, required: true,  step: 0.25 },
  { key: 'paincha',         en: 'Paincha',         ur: 'پائینچہ',        min: 4,   max: 20, required: true,  step: 0.25 },
  { key: 'aasan',           en: 'Aasan',           ur: 'آسن',            min: 8,   max: 35, required: true,  step: 0.25 },
  { key: 'shalwar_ghera',   en: 'Shalwar Ghera',   ur: 'شلوار گھیرا',   min: 10,  max: 40, required: false, step: 0.25 },
  { key: 'inseam',          en: 'Inseam / Fly',    ur: 'نالی',           min: 15,  max: 45, required: false, step: 0.25 },
];

/**
 * Primary field order for Enter/Tab keyboard cycling (per AGENT.md §4.1).
 * Includes the 9 standard fields + covers both garment sections in sequence.
 */
const CYCLE_FIELD_ORDER: ReadonlyArray<keyof ShalwarKameezMeasurements> = [
  'kameez_length',
  'chest',
  'waist',
  'shoulder_teera',
  'sleeve_length',
  'neck_gala',
  'daman_width',
  'shalwar_length',
  'paincha',
  'aasan',
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MeasurementIntakeFormProps {
  measurements: ShalwarKameezMeasurements;
  stylePreferences: StylePreferences;
  onMeasurementChange: (key: keyof ShalwarKameezMeasurements, value: number) => void;
  onStyleChange: <K extends keyof StylePreferences>(key: K, value: StylePreferences[K]) => void;
  /** Field that should receive visual highlight (driven by external focus state). */
  activeMeasurementField?: keyof ShalwarKameezMeasurements | null;
  /** Called whenever a measurement input receives or loses focus. */
  onFieldFocus?: (field: keyof ShalwarKameezMeasurements | null) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// MeasurementRow sub-component
// ---------------------------------------------------------------------------

interface MeasurementRowProps {
  field: FieldDefinition;
  value: number | undefined;
  isActive: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (value: number) => void;
  onFocus: () => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

function MeasurementRow({
  field,
  value,
  isActive,
  inputRef,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
}: MeasurementRowProps) {
  const displayValue = value ?? 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseFloat(e.target.value);
    if (!isNaN(raw)) {
      onChange(raw);
    }
  };

  return (
    <div
      className={cn(
        'group flex flex-col gap-1.5 rounded-xl border p-3 transition-colors',
        isActive
          ? 'border-primary/60 bg-primary/5 shadow-[0_0_0_1px_var(--accent-gold-primary)]'
          : 'border-border bg-card hover:border-border-subtle'
      )}
    >
      {/* Bilingual label row */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          {/* English label — LTR, standard sans */}
          <span
            className={cn(
              'text-xs font-semibold leading-tight transition-colors',
              isActive ? 'text-primary' : 'text-foreground'
            )}
          >
            {field.en}
            {!field.required && (
              <span className="ml-1 font-normal text-muted-foreground">(opt)</span>
            )}
          </span>
          {/* Urdu label — RTL, Noto Sans Arabic, line-height 1.65 to prevent clipping */}
          <span
            dir="rtl"
            lang="ur"
            className="font-urdu-sans text-[0.65rem] leading-urdu-data text-muted-foreground"
          >
            {field.ur}
          </span>
        </div>

        {/* Measurement value display (isolated LTR for digit safety) */}
        <bdi
          className={cn(
            'font-mono text-sm font-bold tabular-nums transition-colors',
            isActive ? 'text-primary' : 'text-foreground/70'
          )}
        >
          {displayValue.toFixed(2)}&quot;
        </bdi>
      </div>

      {/* Input + Fractional Pills */}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="number"
          dir="ltr"
          inputMode="decimal"
          min={field.min}
          max={field.max}
          step={field.step}
          value={displayValue}
          required={field.required}
          aria-label={`${field.en} / ${field.ur}`}
          aria-describedby={`${field.key}-unit`}
          onChange={handleInputChange}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          className={cn(
            'h-9 w-full rounded-lg border bg-card-elevated px-3 text-sm font-medium text-foreground tabular-nums shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
            isActive ? 'border-primary/60' : 'border-border'
          )}
        />
        <span
          id={`${field.key}-unit`}
          className="shrink-0 text-xs text-muted-foreground"
          aria-hidden="true"
        >
          &quot;
        </span>
        <FractionalPillSelector
          value={displayValue}
          onChange={onChange}
          className="shrink-0"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section heading
// ---------------------------------------------------------------------------

interface SectionHeadingProps {
  en: string;
  ur: string;
}

function SectionHeading({ en, ur }: SectionHeadingProps) {
  return (
    <div className="flex items-baseline justify-between border-b border-border pb-2">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        {en}
      </h3>
      <span
        dir="rtl"
        lang="ur"
        className="font-urdu-serif text-base leading-urdu-display text-primary"
      >
        {ur}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function MeasurementIntakeForm({
  measurements,
  stylePreferences,
  onMeasurementChange,
  onStyleChange,
  activeMeasurementField,
  onFieldFocus,
  className,
}: MeasurementIntakeFormProps) {
  // Build a stable map of refs keyed by measurement field name
  const inputRefs = React.useRef<Map<keyof ShalwarKameezMeasurements, React.RefObject<HTMLInputElement | null>>>(
    new Map()
  );

  const getRef = (key: keyof ShalwarKameezMeasurements): React.RefObject<HTMLInputElement | null> => {
    if (!inputRefs.current.has(key)) {
      inputRefs.current.set(key, React.createRef<HTMLInputElement>());
    }
    return inputRefs.current.get(key)!;
  };

  /**
   * On Enter (or Tab when onKeyDown intercepts it), advance to the next field
   * in CYCLE_FIELD_ORDER. Wraps around from last to first.
   */
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentKey: keyof ShalwarKameezMeasurements
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentIndex = CYCLE_FIELD_ORDER.indexOf(currentKey);
      if (currentIndex === -1) return;
      const nextIndex = (currentIndex + 1) % CYCLE_FIELD_ORDER.length;
      const nextKey = CYCLE_FIELD_ORDER[nextIndex];
      const nextRef = inputRefs.current.get(nextKey);
      nextRef?.current?.focus();
    }
  };

  const renderFieldRow = (field: FieldDefinition) => {
    const rawValue = measurements[field.key];
    const value = typeof rawValue === 'number' ? rawValue : 0;
    const isActive = activeMeasurementField === field.key;

    return (
      <MeasurementRow
        key={field.key}
        field={field}
        value={value}
        isActive={isActive}
        inputRef={getRef(field.key)}
        onChange={(v) => onMeasurementChange(field.key, v)}
        onFocus={() => onFieldFocus?.(field.key)}
        onBlur={() => onFieldFocus?.(null)}
        onKeyDown={(e) => handleKeyDown(e, field.key)}
      />
    );
  };

  return (
    <div className={cn('flex flex-col gap-8', className)}>
      {/* ================================================================
          KAMEEZ / قمیض SECTION
          ================================================================ */}
      <section aria-label="Kameez Measurements" className="flex flex-col gap-4">
        <SectionHeading en="Kameez / Kurta" ur="قمیض / کرتہ" />

        {/* Primary required fields — 2-column grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {KAMEEZ_FIELDS.filter((f) => f.required).map(renderFieldRow)}
        </div>

        {/* Optional fields — collapsed by default, 2-col */}
        <details className="group">
          <summary className="mb-3 flex cursor-pointer select-none list-none items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            <span className="flex h-4 w-4 items-center justify-center rounded border border-border text-[0.6rem] group-open:rotate-90 transition-transform">
              ▶
            </span>
            Optional Kameez Fields
            <span dir="rtl" lang="ur" className="font-urdu-sans text-[0.6rem] leading-urdu-data">
              اضافی پیمائش
            </span>
          </summary>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {KAMEEZ_FIELDS.filter((f) => !f.required).map(renderFieldRow)}
          </div>
        </details>
      </section>

      {/* ================================================================
          GARMENT STYLE CHIPS
          ================================================================ */}
      <section aria-label="Style Preferences" className="flex flex-col gap-4">
        <SectionHeading en="Style Preferences" ur="کٹ اور سٹائل" />
        <GarmentStyleChips
          collarStyle={stylePreferences.collar_style}
          damanStyle={stylePreferences.daman_style}
          pocketConfig={stylePreferences.pocket_config}
          frontPatti={stylePreferences.front_patti}
          onChange={(key, value) => {
            if (key === 'collarStyle') onStyleChange('collar_style', value as StylePreferences['collar_style']);
            else if (key === 'damanStyle') onStyleChange('daman_style', value as StylePreferences['daman_style']);
            else if (key === 'pocketConfig') onStyleChange('pocket_config', value as StylePreferences['pocket_config']);
            else if (key === 'frontPatti') onStyleChange('front_patti', value as StylePreferences['front_patti']);
          }}
        />
      </section>

      {/* ================================================================
          SHALWAR / شلوار SECTION
          ================================================================ */}
      <section aria-label="Shalwar Measurements" className="flex flex-col gap-4">
        <SectionHeading en="Shalwar / Trouser" ur="شلوار / پاجامہ" />

        {/* Primary shalwar fields */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SHALWAR_FIELDS.filter((f) => f.required).map(renderFieldRow)}
        </div>

        {/* Optional shalwar fields */}
        <details className="group">
          <summary className="mb-3 flex cursor-pointer select-none list-none items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            <span className="flex h-4 w-4 items-center justify-center rounded border border-border text-[0.6rem] group-open:rotate-90 transition-transform">
              ▶
            </span>
            Optional Shalwar Fields
            <span dir="rtl" lang="ur" className="font-urdu-sans text-[0.6rem] leading-urdu-data">
              اضافی پیمائش
            </span>
          </summary>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SHALWAR_FIELDS.filter((f) => !f.required).map(renderFieldRow)}
          </div>
        </details>
      </section>
    </div>
  );
}

export default MeasurementIntakeForm;
