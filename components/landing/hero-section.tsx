'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Play, Scissors } from 'lucide-react';

// ─── Animated order counter ───────────────────────────────────────────────────

function useCountUp(target: number, duration: number = 2000): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();

    function tick(now: number) {
      const elapsed = Math.min(now - start, duration);
      const progress = elapsed / duration;
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (elapsed < duration) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}

// ─── Live order-queue floating preview card ───────────────────────────────────

const PREVIEW_ORDERS = [
  {
    id: '#DP-2026-0801',
    customer: 'Ch. Aslam',
    stage: 'IN_STITCHING',
    stageLabel: 'In Stitching',
    stageColor: 'text-status-stitching',
    stageDot: 'bg-status-stitching',
    garment: '2× Shalwar Kameez',
    due: 'Due Aug 28',
  },
  {
    id: '#DP-2026-0802',
    customer: 'Tariq Hussain',
    stage: 'READY_FOR_DELIVERY',
    stageLabel: 'Ready ✓',
    stageColor: 'text-status-ready',
    stageDot: 'bg-status-ready',
    garment: '1× Waistcoat',
    due: 'Due Today',
  },
  {
    id: '#DP-2026-0803',
    customer: 'Hafiz Saleem',
    stage: 'IN_CUTTING',
    stageLabel: 'Cutting',
    stageColor: 'text-status-cutting',
    stageDot: 'bg-status-cutting',
    garment: '1× Prince Suit',
    due: 'Due Sep 02',
  },
];

function WorkshopPreviewCard() {
  return (
    <div
      className="premium-glass-card relative mx-auto w-full max-w-sm overflow-hidden"
      aria-hidden="true"
    >
      {/* Mac-style desktop window header */}
      <div className="mac-window-header">
        <span className="mac-dot close" />
        <span className="mac-dot minimize" />
        <span className="mac-dot expand" />
        <span className="ml-3 flex-1 text-center text-[11px] text-white/30">
          silaye — live workshop queue
        </span>
      </div>

      {/* Card body */}
      <div className="p-4">
        {/* Card header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative h-6 w-6 shrink-0 flex items-center justify-center rounded-md border border-primary/30 bg-primary/10">
              <Scissors className="h-full w-full p-1 object-contain aspect-square text-primary" />
            </div>
            <span className="text-xs font-semibold text-foreground">Live Workshop Queue</span>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-status-ready/30 bg-status-ready/10 px-2 py-0.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-ready" />
            <span className="text-[10px] font-medium text-status-ready">Live</span>
          </div>
        </div>

        {/* Order rows */}
        <div className="space-y-2">
          {PREVIEW_ORDERS.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.03] px-3 py-2 backdrop-blur-sm"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${order.stageDot}`}
                  />
                  <span className="truncate text-xs font-medium text-foreground">
                    {order.customer}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{order.garment}</p>
              </div>
              <div className="ml-2 flex-shrink-0 text-right">
                <p className={`text-[10px] font-semibold ${order.stageColor}`}>
                  {order.stageLabel}
                </p>
                <p className="text-[10px] text-muted-foreground">{order.due}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Measurement snippet */}
        <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <p className="text-[10px] text-muted-foreground">Saved Measurement · Ch. Aslam</p>
          <div className="mt-1 flex gap-3">
            {[
              ['L', '42.50"'],
              ['C', '38.00"'],
              ['W', '34.25"'],
            ].map(([label, val]) => (
              <div key={label} className="text-center">
                <p className="text-[9px] text-muted-foreground">{label}</p>
                <p className="font-mono text-[10px] font-bold text-primary">{val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Proof metrics ─────────────────────────────────────────────────────────────

interface MetricProps {
  value: number;
  suffix: string;
  label: string;
  prefix?: string;
}

function ProofMetric({ value, suffix, label, prefix = '' }: MetricProps) {
  const count = useCountUp(value, 2200);
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-3">
      <p className="font-editorial text-2xl font-normal text-foreground md:text-3xl">
        {prefix}
        {count.toLocaleString('en-PK')}
        {suffix}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// ─── Main hero section ────────────────────────────────────────────────────────

export function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-ambient-dark">
      {/* Ambient radial gold glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-[140px]"
        style={{ background: 'radial-gradient(ellipse, rgba(200,169,126,0.25) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      {/* ── Navigation ── */}
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="relative h-9 w-9 shrink-0 flex items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
            <Scissors className="h-full w-full p-2 object-contain aspect-square text-primary" />
          </div>
          <div>
            <span className="font-editorial text-lg font-normal italic text-foreground">
              Silaye
            </span>
            <span className="urdu-display-text ml-2 text-sm text-primary">سِلائی</span>
          </div>
        </div>

        {/* Nav links — hidden on mobile */}
        <div className="hidden items-center gap-6 md:flex">
          {['Features', 'Pricing', 'Track Order'].map((label) => (
            <a
              key={label}
              href={label === 'Track Order' ? '/track/' : `#${label.toLowerCase()}`}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-all hover:bg-primary/20"
        >
          Open Workshop
          <ArrowRight className="h-4 w-4" />
        </Link>
      </nav>

      {/* ── Hero body ── */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 pb-20 pt-12 lg:pt-16">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          {/* Left column: copy */}
          <div className="flex flex-col items-start">
            {/* All-caps overline — muted gold, ultra-wide tracking */}
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold-muted">
              EST. FOR THE SOUTH ASIAN MASTER
            </p>

            {/* H1 — massive editorial serif, tightly tracked */}
            <h1 className="font-editorial text-6xl font-normal leading-[1.02] tracking-tighter text-obsidian-text md:text-8xl">
              Your workshop deserves more than a{' '}
              <em className="italic text-primary">notebook.</em>
            </h1>

            {/* Urdu subtitle */}
            <p
              className="urdu-data-text mt-5 text-base leading-urdu-data text-obsidian-text-muted md:text-lg"
              dir="rtl"
            >
              ماسٹر درزی اور کٹنگ ورکشاپس کے لیے جدید ترین ڈیجیٹل کسٹمر، ناپ اور کھاتہ مینجمنٹ
              سسٹم — آف لائن بھی۔
            </p>

            {/* English sub-copy */}
            <p className="mt-3 max-w-lg text-base text-muted-foreground">
              Intuitive measurement vault, production queue pipeline, 1-click WhatsApp receipts,
              and offline-first sync — built for the Pakistani tailor.
            </p>

            {/* CTA buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-gold-hover hover:shadow-primary/30 active:scale-95"
              >
                Register Workshop
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-semibold text-foreground transition-all hover:border-foreground/30 hover:bg-card active:scale-95"
              >
                <Play className="h-4 w-4 text-primary" />
                Watch 2-Min Demo
              </button>
            </div>

            {/* Proof metrics row */}
            <div className="mt-12 flex flex-wrap divide-x divide-border rounded-xl border border-border bg-card/60 backdrop-blur-sm">
              <ProofMetric prefix="Rs. " value={2800000} suffix="+" label="Revenue Tracked" />
              <ProofMetric value={98000} suffix="+" label="Suits Delivered" />
              <ProofMetric value={0} suffix="" label="Lost Orders" prefix="" />
            </div>
          </div>

          {/* Right column: floating premium glass terminal */}
          <div className="flex items-center justify-center lg:justify-end">
            <WorkshopPreviewCard />
          </div>
        </div>
      </div>

      {/* Scroll fade gradient */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-24"
        style={{ background: 'linear-gradient(to bottom, transparent, var(--surface-obsidian-bg))' }}
        aria-hidden="true"
      />
    </section>
  );
}
