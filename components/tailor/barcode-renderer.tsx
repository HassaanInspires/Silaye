'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// 1. Code 128 Specification Pattern Table (107 Symbols)
// ============================================================================

/**
 * Code 128 symbol definitions.
 * Each string represents the widths of alternating bars and spaces:
 * [Bar1, Space1, Bar2, Space2, Bar3, Space3].
 * Index 106 (Stop) has a 4th bar: [Bar1, Space1, Bar2, Space2, Bar3, Space3, Bar4].
 */
const CODE128_PATTERNS: ReadonlyArray<string> = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112'
];

const START_CODE_B = 104;
const STOP_CODE = 106;
const QUIET_ZONE_MODULES = 10;

// ============================================================================
// 2. Pure Encoder Algorithm
// ============================================================================

export interface BarcodeModule {
  isBar: boolean;
  width: number;
}

/**
 * Encodes an ASCII string into Code 128 Set B binary module sequence.
 */
export function encodeCode128B(rawText: string): {
  modules: boolean[];
  totalModules: number;
  displayText: string;
} {
  // Sanitize text: keep ASCII printable characters (32 to 126)
  const clean = rawText.replace(/[^\x20-\x7E]/g, '') || 'DP-0000-0000';
  const symbols: number[] = [START_CODE_B];

  let checksum = START_CODE_B;
  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i) - 32;
    symbols.push(charCode);
    checksum += (i + 1) * charCode;
  }

  const checkDigit = checksum % 103;
  symbols.push(checkDigit);
  symbols.push(STOP_CODE);

  // Convert symbol indices to module booleans
  const modules: boolean[] = [];

  // Leading quiet zone
  for (let q = 0; q < QUIET_ZONE_MODULES; q++) {
    modules.push(false);
  }

  for (const symIndex of symbols) {
    const pattern = CODE128_PATTERNS[symIndex];
    if (!pattern) continue;

    let isBar = true;
    for (let p = 0; p < pattern.length; p++) {
      const width = parseInt(pattern[p], 10);
      for (let w = 0; w < width; w++) {
        modules.push(isBar);
      }
      isBar = !isBar;
    }
  }

  // Trailing quiet zone
  for (let q = 0; q < QUIET_ZONE_MODULES; q++) {
    modules.push(false);
  }

  return {
    modules,
    totalModules: modules.length,
    displayText: clean,
  };
}

// ============================================================================
// 3. React Barcode Component (SVG & Canvas)
// ============================================================================

export interface BarcodeRendererProps {
  /** The unique order number or token to encode (e.g., `#DP-2026-0801` or `DP-2026-0801`) */
  value: string;
  /** Output format: 'svg' (recommended for crisp vector printing) or 'canvas' */
  format?: 'svg' | 'canvas';
  /** Barcode bar height in pixels (default: 48) */
  height?: number;
  /** Width per module unit in pixels (default: 2) */
  moduleWidth?: number;
  /** Whether to show human-readable text below the bars (default: true) */
  displayValue?: boolean;
  /** Optional custom text label below the barcode (defaults to value) */
  labelText?: string;
  /** Bar color (default: #000000) */
  barColor?: string;
  /** Background color (default: transparent / #ffffff) */
  backgroundColor?: string;
  /** Additional CSS class names for styling */
  className?: string;
}

export function BarcodeRenderer({
  value,
  format = 'svg',
  height = 48,
  moduleWidth = 2,
  displayValue = true,
  labelText,
  barColor = '#000000',
  backgroundColor = 'transparent',
  className,
}: BarcodeRendererProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const { modules, totalModules, displayText } = React.useMemo(() => {
    return encodeCode128B(value);
  }, [value]);

  const totalWidth = totalModules * moduleWidth;
  const label = labelText || displayText;

  // Render to Canvas if requested
  React.useEffect(() => {
    if (format !== 'canvas' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset canvas dimensions
    canvas.width = totalWidth;
    canvas.height = height + (displayValue ? 16 : 0);

    // Background
    ctx.fillStyle = backgroundColor === 'transparent' ? '#FFFFFF' : backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw bars
    ctx.fillStyle = barColor;
    for (let i = 0; i < modules.length; i++) {
      if (modules[i]) {
        ctx.fillRect(i * moduleWidth, 0, moduleWidth, height);
      }
    }

    // Text label
    if (displayValue) {
      ctx.fillStyle = barColor;
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`*${label}*`, totalWidth / 2, height + 12);
    }
  }, [format, modules, moduleWidth, height, displayValue, label, barColor, backgroundColor, totalWidth]);

  // Aggregate adjacent bar modules into single <rect> elements for optimized SVG DOM
  const rects = React.useMemo(() => {
    if (format !== 'svg') return [];
    const elements: { x: number; width: number }[] = [];
    let currentX = 0;
    let inBar = false;
    let barStartX = 0;

    for (let i = 0; i < modules.length; i++) {
      const isBar = modules[i];
      if (isBar && !inBar) {
        inBar = true;
        barStartX = currentX;
      } else if (!isBar && inBar) {
        inBar = false;
        elements.push({
          x: barStartX,
          width: currentX - barStartX,
        });
      }
      currentX += moduleWidth;
    }

    if (inBar) {
      elements.push({
        x: barStartX,
        width: currentX - barStartX,
      });
    }

    return elements;
  }, [modules, moduleWidth, format]);

  if (format === 'canvas') {
    return (
      <div className={cn('inline-flex flex-col items-center justify-center', className)}>
        <canvas
          ref={canvasRef}
          aria-label={`Barcode: ${label}`}
          role="img"
          className="max-w-full"
        />
      </div>
    );
  }

  const svgHeight = height + (displayValue ? 18 : 0);

  return (
    <div
      className={cn('inline-flex flex-col items-center justify-center select-none', className)}
      role="img"
      aria-label={`Barcode ${label}`}
    >
      <svg
        viewBox={`0 0 ${totalWidth} ${svgHeight}`}
        width="100%"
        height={svgHeight}
        style={{ maxWidth: `${totalWidth}px` }}
        className="overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        {backgroundColor !== 'transparent' && (
          <rect
            x={0}
            y={0}
            width={totalWidth}
            height={svgHeight}
            fill={backgroundColor}
          />
        )}
        <g fill={barColor}>
          {rects.map((r, idx) => (
            <rect
              key={idx}
              x={r.x}
              y={0}
              width={r.width}
              height={height}
              shapeRendering="crispEdges"
            />
          ))}
        </g>
        {displayValue && (
          <text
            x={totalWidth / 2}
            y={height + 13}
            textAnchor="middle"
            fill={barColor}
            fontFamily="Courier, 'Courier New', monospace"
            fontSize="11"
            fontWeight="bold"
            letterSpacing="0.08em"
          >
            *{label}*
          </text>
        )}
      </svg>
    </div>
  );
}
