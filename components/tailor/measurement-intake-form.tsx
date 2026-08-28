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
  enLabel: string;
  urLabel: string;
  min: number;
  max: number;
  required: boolean;
  step: number;
}

const KAMEEZ_FIELDS: ReadonlyArray<FieldDefinition> = [
  { key: 'kameez_length',   enLabel: 'Length',        urLabel: 'لمبائی',         min: 20,  max: 60, required: true,  step: 0.25 },
  { key: 'chest',           enLabel: 'Chest',         urLabel: 'چھاتی',          min: 20,  max: 70, required: true,  step: 0.25 },
  { key: 'waist',           enLabel: 'Waist',         urLabel: 'کمر',            min: 20,  max: 70, required: true,  step: 0.25 },
  { key: 'hips',            enLabel: 'Hips / Seat',   urLabel: 'ہپ / گھیرا',    min: 20,  max: 70, required: false, step: 0.25 },
  { key: 'shoulder_teera',  enLabel: 'Shoulder',      urLabel: 'تیرا',           min: 10,  max: 30, required: true,  step: 0.25 },
  { key: 'sleeve_length',   enLabel: 'Sleeve',        urLabel: 'بازو',           min: 10,  max: 38, required: true,  step: 0.25 },
  { key: 'armhole_moodha',  enLabel: 'Armhole',       urLabel: 'موڈھا',          min: 5,   max: 25, required: false, step: 0.25 },
  { key: 'neck_gala',       enLabel: 'Neck / Collar', urLabel: 'گلا / بین',      min: 8,   max: 25, required: true,  step: 0.25 },
  { key: 'daman_width',     enLabel: 'Daman Width',   urLabel: 'دامن / گھیرا',  min: 12,  max: 45, required: true,  step: 0.25 },
  { key: 'bicep_dola',      enLabel: 'Bicep',         urLabel: 'ڈولا',           min: 4,   max: 25, required: false, step: 0.25 },
  { key: 'cuff_width',      enLabel: 'Cuff Width',    urLabel: 'کف چوڑائی',      min: 1,   max: 10, required: false, step: 0.25 },
  { key: 'cuff_length',     enLabel: 'Cuff Circ.',    urLabel: 'کف گھیرا',       min: 5,   max: 20, required: false, step: 0.25 },
];

const SHALWAR_FIELDS: ReadonlyArray<FieldDefinition> = [
  { key: 'shalwar_length',  enLabel: 'Shalwar Length',  urLabel: 'شلوار لمبائی',  min: 20,  max: 60, required: true,  step: 0.25 },
  { key: 'paincha',         enLabel: 'Paincha',         urLabel: 'پائینچہ',        min: 4,   max: 20, required: true,  step: 0.25 },
  { key: 'aasan',           enLabel: 'Aasan',           urLabel: 'آسن',            min: 8,   max: 35, required: true,  step: 0.25 },
  { key: 'shalwar_ghera',   enLabel: 'Shalwar Ghera',   urLabel: 'شلوار گھیرا',   min: 10,  max: 40, required: false, step: 0.25 },
  { key: 'inseam',          enLabel: 'Inseam / Fly',    urLabel: 'نالی',           min: 15,  max: 45, required: false, step: 0.25 },
];

/**
 * Primary field order for Enter/Tab keyboard cycling.
 * Covers the standard fields in natural tailoring workflow sequence.
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
// Helpers
// ---------------------------------------------------------------------------

export function formatDisplayValue(val?: number): string {
  if (val === undefined || val === null || isNaN(val) || val === 0) return '0"';
  const integerPart = Math.floor(val);
  const fractionPart = Math.round((val - integerPart) * 100) / 100;

  let fracSymbol = '';
  if (Math.abs(fractionPart - 0.25) < 0.01) fracSymbol = ' ¼';
  else if (Math.abs(fractionPart - 0.5) < 0.01) fracSymbol = ' ½';
  else if (Math.abs(fractionPart - 0.75) < 0.01) fracSymbol = ' ¾';
  else if (fractionPart > 0) fracSymbol = `.${Math.round(fractionPart * 100)}`;

  return `${integerPart}${fracSymbol}"`;
}

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
// MeasurementRow Sub-component (Flat 2-Column Ledger Row)
// ---------------------------------------------------------------------------

interface MeasurementRowProps {
  field: FieldDefinition;
  value: number;
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
  const [isFocused, setIsFocused] = React.useState(false);
  const [rawInput, setRawInput] = React.useState<string>(() =>
    value > 0 ? String(Math.floor(value)) : ''
  );

  // Synchronize local input text when value changes externally while not actively typing
  React.useEffect(() => {
    if (!isFocused) {
      setRawInput(value > 0 ? String(Math.floor(value)) : '');
    }
  }, [value, isFocused]);

  const fractionPart = Math.round((value - Math.floor(value || 0)) * 100) / 100;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;

    // Allow empty string, digits, and decimal point
    if (!/^\d*\.?\d*$/.test(text)) {
      return;
    }

    setRawInput(text);

    if (text === '' || text === '.') {
      onChange(0);
      return;
    }

    const parsed = parseFloat(text);
    if (!isNaN(parsed)) {
      if (text.includes('.')) {
        // Decimal entered: auto-split into base and fraction
        onChange(parsed);
      } else {
        // Integer entered: preserve active fraction
        const newTotal = parsed + fractionPart;
        onChange(newTotal);
      }
    }
  };

  const handleFractionChange = (newFrac: number) => {
    const base = value > 0 ? Math.floor(value) : parseInt(rawInput, 10) || 0;
    const newTotal = base + newFrac;
    if (base > 0 && rawInput !== String(base)) {
      setRawInput(String(base));
    }
    onChange(newTotal);
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur();
    // Normalize input display to integer base on blur
    if (value > 0) {
      setRawInput(String(Math.floor(value)));
    } else {
      setRawInput('');
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 py-2.5 border-b border-white/5 transition-colors',
        isActive && 'bg-white/[0.02]'
      )}
    >
      {/* Tier 1: Bilingual Labels & Live Gold Preview */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'text-xs font-bold uppercase tracking-wider transition-colors',
              isActive ? 'text-gold' : 'text-gray-200'
            )}
          >
            {field.enLabel}
            {!field.required && (
              <span className="ml-1 text-[10px] font-normal lowercase text-gray-500">(opt)</span>
            )}
          </span>
          <span
            dir="rtl"
            lang="ur"
            className={cn(
              'text-[11px] font-urdu-sans transition-colors',
              isActive ? 'text-gold/90' : 'text-gray-400'
            )}
          >
            {field.urLabel}
          </span>
        </div>
        <span className="font-mono text-xs font-bold text-gold">
          <bdi dir="ltr">{formatDisplayValue(value)}</bdi>
        </span>
      </div>

      {/* Tier 2: Composite Controls */}
      <div className="flex items-center gap-2 w-full">
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          dir="ltr"
          value={rawInput}
          onChange={handleInputChange}
          onFocus={() => {
            setIsFocused(true);
            onFocus();
          }}
          onBlur={handleBlur}
          onKeyDown={onKeyDown}
          placeholder="0"
          className={cn(
            'h-9 w-20 text-center font-mono text-sm font-semibold bg-[#0B0C0E] border border-white/15 rounded-lg text-white placeholder:text-gray-600 focus:border-gold focus:ring-1 focus:ring-gold transition-all outline-none shrink-0',
            isActive && 'border-gold ring-1 ring-gold shadow-[0_0_8px_rgba(212,175,55,0.2)]'
          )}
          aria-label={`${field.enLabel} / ${field.urLabel}`}
        />
        <div className="flex-1 h-9 min-w-0">
          <FractionalPillSelector
            value={fractionPart}
            onChange={handleFractionChange}
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section Heading
// ---------------------------------------------------------------------------

interface SectionHeadingProps {
  en: string;
  ur: string;
}

function SectionHeading({ en, ur }: SectionHeadingProps) {
  return (
    <div className="flex items-baseline justify-between border-b border-white/10 pb-2">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        {en}
      </h3>
      <span
        dir="rtl"
        lang="ur"
        className="font-urdu-serif text-sm leading-urdu-display text-gold"
      >
        {ur}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
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
   * Advance to the next field in CYCLE_FIELD_ORDER on Enter.
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
          KAMEEZ / قمیض SECTION (Card-Free 2-Column Ledger)
          ================================================================ */}
      <section aria-label="Kameez Measurements" className="flex flex-col gap-4">
        <SectionHeading en="Kameez / Kurta" ur="قمیض / کرتہ" />

        {/* Primary required fields — 2-column ledger */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          {KAMEEZ_FIELDS.filter((f) => f.required).map(renderFieldRow)}
        </div>

        {/* Optional fields — collapsed by default, 2-column ledger */}
        <details className="group mt-2">
          <summary className="mb-3 flex cursor-pointer select-none list-none items-center gap-2 text-xs font-medium text-gray-400 transition-colors hover:text-white">
            <span className="flex h-4 w-4 items-center justify-center rounded border border-white/10 text-[0.6rem] group-open:rotate-90 transition-transform">
              ▶
            </span>
            Optional Kameez Fields
            <span dir="rtl" lang="ur" className="font-urdu-sans text-[0.65rem] text-gray-500">
              اضافی پیمائش
            </span>
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
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
          frontPatti={stylePreferences.front_patti}
          pockets={stylePreferences.pockets || []}
          pocketConfig={stylePreferences.pocket_config}
          onChange={(key, value) => {
            if (key === 'collar_style' || key === 'collarStyle') {
              onStyleChange('collar_style', value as StylePreferences['collar_style']);
            } else if (key === 'daman_style' || key === 'damanStyle') {
              onStyleChange('daman_style', value as StylePreferences['daman_style']);
            } else if (key === 'front_patti' || key === 'frontPatti') {
              onStyleChange('front_patti', value as StylePreferences['front_patti']);
            } else if (key === 'pockets') {
              onStyleChange('pockets', value as string[]);
            } else if (key === 'pocketConfig') {
              onStyleChange('pocket_config', value as StylePreferences['pocket_config']);
            }
          }}
        />
      </section>

      {/* ================================================================
          SHALWAR / شلوار SECTION (Card-Free 2-Column Ledger)
          ================================================================ */}
      <section aria-label="Shalwar Measurements" className="flex flex-col gap-4">
        <SectionHeading en="Shalwar / Trouser" ur="شلوار / پاجامہ" />

        {/* Primary shalwar fields — 2-column ledger */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          {SHALWAR_FIELDS.filter((f) => f.required).map(renderFieldRow)}
        </div>

        {/* Optional shalwar fields — 2-column ledger */}
        <details className="group mt-2">
          <summary className="mb-3 flex cursor-pointer select-none list-none items-center gap-2 text-xs font-medium text-gray-400 transition-colors hover:text-white">
            <span className="flex h-4 w-4 items-center justify-center rounded border border-white/10 text-[0.6rem] group-open:rotate-90 transition-transform">
              ▶
            </span>
            Optional Shalwar Fields
            <span dir="rtl" lang="ur" className="font-urdu-sans text-[0.65rem] text-gray-500">
              اضافی پیمائش
            </span>
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            {SHALWAR_FIELDS.filter((f) => !f.required).map(renderFieldRow)}
          </div>
        </details>
      </section>
    </div>
  );
}

export default MeasurementIntakeForm;
