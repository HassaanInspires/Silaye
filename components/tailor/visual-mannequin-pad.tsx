'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { ShalwarKameezMeasurements } from '@/types/tailor';

// ---------------------------------------------------------------------------
// Region → Measurement field mapping
// ---------------------------------------------------------------------------

type BodyRegionKey =
  | 'head_neck'
  | 'shoulder'
  | 'torso_upper'
  | 'torso_mid'
  | 'torso_lower'
  | 'arm_left'
  | 'arm_right'
  | 'hip_aasan'
  | 'lower_leg';

const REGION_FIELD_MAP: Record<BodyRegionKey, ReadonlyArray<keyof ShalwarKameezMeasurements>> = {
  head_neck:    ['neck_gala'],
  shoulder:     ['shoulder_teera', 'armhole_moodha'],
  torso_upper:  ['chest', 'bicep_dola'],
  torso_mid:    ['waist', 'hips'],
  torso_lower:  ['daman_width', 'kameez_length'],
  arm_left:     ['sleeve_length', 'cuff_width', 'cuff_length'],
  arm_right:    ['sleeve_length', 'cuff_width', 'cuff_length'],
  hip_aasan:    ['shalwar_length', 'shalwar_ghera', 'aasan'],
  lower_leg:    ['paincha', 'inseam'],
};

/** Given an active measurement field, returns which SVG region should glow. */
function getActiveRegion(
  activeField: keyof ShalwarKameezMeasurements | null
): BodyRegionKey | null {
  if (!activeField) return null;
  for (const [region, fields] of Object.entries(REGION_FIELD_MAP) as [BodyRegionKey, ReadonlyArray<keyof ShalwarKameezMeasurements>][]) {
    if ((fields as ReadonlyArray<string>).includes(activeField)) {
      return region;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// SVG Body Diagram paths
// Coordinate space: viewBox="0 0 120 300"
// Simple geometric silhouette — compatible with static-export (pure inline SVG)
// ---------------------------------------------------------------------------

interface RegionPathProps {
  d: string;
  isActive: boolean;
  label: string;
}

function RegionPath({ d, isActive, label }: RegionPathProps) {
  return (
    <path
      d={d}
      aria-label={label}
      className="transition-all duration-300"
      fill={isActive ? 'rgba(200,169,126,0.18)' : 'rgba(255,255,255,0.03)'}
      stroke={isActive ? 'var(--accent-gold-primary)' : 'var(--surface-obsidian-border)'}
      strokeWidth={isActive ? '1.5' : '0.75'}
    />
  );
}

interface RegionEllipseProps {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  isActive: boolean;
  label: string;
}

function RegionEllipse({ cx, cy, rx, ry, isActive, label }: RegionEllipseProps) {
  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx={rx}
      ry={ry}
      aria-label={label}
      className="transition-all duration-300"
      fill={isActive ? 'rgba(200,169,126,0.18)' : 'rgba(255,255,255,0.03)'}
      stroke={isActive ? 'var(--accent-gold-primary)' : 'var(--surface-obsidian-border)'}
      strokeWidth={isActive ? '1.5' : '0.75'}
    />
  );
}

// ---------------------------------------------------------------------------
// Active field tooltip label
// ---------------------------------------------------------------------------

const FIELD_LABELS: Partial<Record<keyof ShalwarKameezMeasurements, { en: string; ur: string }>> = {
  kameez_length:  { en: 'Length',        ur: 'لمبائی' },
  chest:          { en: 'Chest',         ur: 'چھاتی' },
  waist:          { en: 'Waist',         ur: 'کمر' },
  hips:           { en: 'Hips',          ur: 'ہپ / گھیرا' },
  shoulder_teera: { en: 'Shoulder',      ur: 'تیرا' },
  sleeve_length:  { en: 'Sleeve',        ur: 'بازو' },
  armhole_moodha: { en: 'Armhole',       ur: 'موڈھا' },
  neck_gala:      { en: 'Neck / Collar', ur: 'گلا / بین' },
  daman_width:    { en: 'Daman Width',   ur: 'دامن / گھیرا' },
  bicep_dola:     { en: 'Bicep',         ur: 'ڈولا' },
  cuff_width:     { en: 'Cuff Width',    ur: 'کف چوڑائی' },
  cuff_length:    { en: 'Cuff Circ.',    ur: 'کف گھیرا' },
  shalwar_length: { en: 'Shalwar Len',   ur: 'شلوار لمبائی' },
  paincha:        { en: 'Paincha',       ur: 'پائینچہ' },
  aasan:          { en: 'Aasan',         ur: 'آسن' },
  shalwar_ghera:  { en: 'Shalwar Ghera', ur: 'شلوار گھیرا' },
  inseam:         { en: 'Inseam',        ur: 'نالی' },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface VisualMannequinPadProps {
  /** The currently focused measurement input field. */
  activeField: keyof ShalwarKameezMeasurements | null;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VisualMannequinPad({ activeField, className }: VisualMannequinPadProps) {
  const activeRegion = getActiveRegion(activeField);
  const activeLabel = activeField ? FIELD_LABELS[activeField] : null;

  const isActive = (region: BodyRegionKey): boolean => activeRegion === region;

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-4',
        className
      )}
      role="figure"
      aria-label="Body measurement diagram"
    >
      {/* Header */}
      <div className="flex w-full items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Body Diagram
        </span>
        <span
          dir="rtl"
          lang="ur"
          className="font-urdu-sans text-[0.65rem] leading-urdu-data text-muted-foreground"
        >
          جسم کا نقشہ
        </span>
      </div>

      {/* Active field indicator */}
      <div
        className={cn(
          'flex min-h-[2rem] w-full items-center justify-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-all',
          activeLabel
            ? 'border-primary/40 bg-primary/10 text-primary'
            : 'border-border bg-card-elevated text-muted-foreground'
        )}
        aria-live="polite"
        aria-label={activeLabel ? `Active measurement: ${activeLabel.en}` : 'No active measurement'}
      >
        {activeLabel ? (
          <>
            <span className="font-semibold">{activeLabel.en}</span>
            <span className="text-border">·</span>
            <span
              dir="rtl"
              lang="ur"
              className="font-urdu-sans text-[0.65rem] leading-urdu-data"
            >
              {activeLabel.ur}
            </span>
          </>
        ) : (
          <span>Focus a measurement field</span>
        )}
      </div>

      {/* SVG Mannequin */}
      <svg
        viewBox="0 0 120 310"
        className="w-full max-w-[160px]"
        aria-hidden="true"
        role="img"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* ── HEAD / NECK ── */}
        {/* Head (circle) */}
        <RegionEllipse
          cx={60}
          cy={18}
          rx={14}
          ry={16}
          isActive={isActive('head_neck')}
          label="Neck / Collar region"
        />
        {/* Neck connector */}
        <RegionPath
          d="M53 33 L67 33 L65 42 L55 42 Z"
          isActive={isActive('head_neck')}
          label="Neck connector"
        />

        {/* ── SHOULDERS ── */}
        {/* Left shoulder cap */}
        <RegionPath
          d="M20 50 Q10 48 8 58 L20 60 Z"
          isActive={isActive('shoulder')}
          label="Left shoulder"
        />
        {/* Right shoulder cap */}
        <RegionPath
          d="M100 50 Q110 48 112 58 L100 60 Z"
          isActive={isActive('shoulder')}
          label="Right shoulder"
        />
        {/* Shoulder bar (across top torso) */}
        <RegionPath
          d="M20 42 L100 42 L100 55 L20 55 Z"
          isActive={isActive('shoulder')}
          label="Shoulder span"
        />

        {/* ── TORSO UPPER (Chest / Bicep) ── */}
        <RegionPath
          d="M22 55 L98 55 L96 95 L24 95 Z"
          isActive={isActive('torso_upper')}
          label="Chest region"
        />

        {/* ── ARMS ── */}
        {/* Left arm */}
        <RegionPath
          d="M8 58 L20 60 L18 130 L6 128 Z"
          isActive={isActive('arm_left')}
          label="Left arm sleeve"
        />
        {/* Left cuff */}
        <RegionEllipse
          cx={12}
          cy={133}
          rx={7}
          ry={4}
          isActive={isActive('arm_left')}
          label="Left cuff"
        />
        {/* Right arm */}
        <RegionPath
          d="M112 58 L100 60 L102 130 L114 128 Z"
          isActive={isActive('arm_right')}
          label="Right arm sleeve"
        />
        {/* Right cuff */}
        <RegionEllipse
          cx={108}
          cy={133}
          rx={7}
          ry={4}
          isActive={isActive('arm_right')}
          label="Right cuff"
        />

        {/* ── TORSO MID (Waist / Hips) ── */}
        <RegionPath
          d="M24 95 L96 95 L100 130 L20 130 Z"
          isActive={isActive('torso_mid')}
          label="Waist and hips region"
        />

        {/* ── TORSO LOWER (Daman / Kameez Length) ── */}
        <RegionPath
          d="M20 130 L100 130 L104 175 L16 175 Z"
          isActive={isActive('torso_lower')}
          label="Daman and kameez length region"
        />

        {/* Kameez hem line */}
        <line
          x1="16"
          y1="175"
          x2="104"
          y2="175"
          stroke={activeRegion === 'torso_lower' ? 'var(--accent-gold-primary)' : 'var(--surface-obsidian-border)'}
          strokeWidth={activeRegion === 'torso_lower' ? '1.5' : '0.75'}
          strokeDasharray="3 2"
          className="transition-all duration-300"
        />

        {/* ── HIP / AASAN ── */}
        <RegionPath
          d="M16 175 L104 175 L108 215 L12 215 Z"
          isActive={isActive('hip_aasan')}
          label="Hip, Aasan and Shalwar length region"
        />

        {/* ── LOWER LEG (Paincha) ── */}
        {/* Left leg */}
        <RegionPath
          d="M12 215 L56 215 L54 300 L14 300 Z"
          isActive={isActive('lower_leg')}
          label="Left leg and paincha"
        />
        {/* Right leg */}
        <RegionPath
          d="M64 215 L108 215 L106 300 L66 300 Z"
          isActive={isActive('lower_leg')}
          label="Right leg and paincha"
        />

        {/* Crotch divider */}
        <line
          x1="60"
          y1="215"
          x2="60"
          y2="230"
          stroke={activeRegion === 'hip_aasan' || activeRegion === 'lower_leg' ? 'var(--accent-gold-primary)' : 'var(--surface-obsidian-border)'}
          strokeWidth="0.75"
          className="transition-all duration-300"
        />

        {/* Paincha openings (bottom of legs) */}
        <RegionEllipse
          cx={34}
          cy={300}
          rx={20}
          ry={4}
          isActive={isActive('lower_leg')}
          label="Left paincha opening"
        />
        <RegionEllipse
          cx={86}
          cy={300}
          rx={20}
          ry={4}
          isActive={isActive('lower_leg')}
          label="Right paincha opening"
        />

        {/* ── MEASUREMENT GUIDE LINES (subtle dashed indicators) ── */}
        {/* Chest width guide */}
        {isActive('torso_upper') && (
          <g>
            <line x1="24" y1="70" x2="96" y2="70" stroke="var(--accent-gold-primary)" strokeWidth="0.5" strokeDasharray="2 2" />
            <line x1="24" y1="67" x2="24" y2="73" stroke="var(--accent-gold-primary)" strokeWidth="0.75" />
            <line x1="96" y1="67" x2="96" y2="73" stroke="var(--accent-gold-primary)" strokeWidth="0.75" />
          </g>
        )}
        {/* Shoulder width guide */}
        {isActive('shoulder') && (
          <g>
            <line x1="20" y1="47" x2="100" y2="47" stroke="var(--accent-gold-primary)" strokeWidth="0.5" strokeDasharray="2 2" />
            <line x1="20" y1="44" x2="20" y2="50" stroke="var(--accent-gold-primary)" strokeWidth="0.75" />
            <line x1="100" y1="44" x2="100" y2="50" stroke="var(--accent-gold-primary)" strokeWidth="0.75" />
          </g>
        )}
        {/* Paincha width guide */}
        {isActive('lower_leg') && (
          <g>
            <line x1="14" y1="295" x2="54" y2="295" stroke="var(--accent-gold-primary)" strokeWidth="0.5" strokeDasharray="2 2" />
            <line x1="66" y1="295" x2="106" y2="295" stroke="var(--accent-gold-primary)" strokeWidth="0.5" strokeDasharray="2 2" />
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="flex w-full items-center justify-center gap-4 text-[0.6rem] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm border border-border bg-white/5" />
          Inactive
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm border border-primary bg-primary/15" />
          Active
        </span>
      </div>
    </div>
  );
}

export default VisualMannequinPad;
