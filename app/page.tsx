import Link from 'next/link';
import { ArrowRight, Scissors } from 'lucide-react';
import { HeroSection } from '@/components/landing/hero-section';
import { BentoGrid } from '@/components/landing/bento-grid';
import { PricingSection } from '@/components/landing/pricing-section';

// ─── Paradigm shift — Notebook Day vs Silaye Way ──────────────────────────────

function ParadigmShiftSection() {
  const OLD_WAYS = [
    'Illegible pencil measurements in a notebook',
    'Fabric lost under the counter',
    'Disputed advance balances, no audit trail',
    '20 phone calls a day — "Taiyar hua?"',
    'Deadlines missed during Eid rush',
    'No record of garment cuts after delivery',
  ];

  const NEW_WAYS = [
    'Permanent digital measurement card per customer',
    'Barcoded thermal fabric tags, always traceable',
    'Immutable digital Khata ledger, zero disputes',
    'Automated WhatsApp alerts — no calls needed',
    'Eid Rush priority queue with deadline countdown',
    'Style preferences saved forever, recalled instantly',
  ];

  return (
    <section className="bg-obsidian-bg py-24">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mb-12 text-center">
          <h2 className="font-editorial text-3xl font-normal leading-[1.15] tracking-[-0.01em] text-obsidian-text md:text-5xl">
            The same craft.{' '}
            <em className="italic text-primary">A different</em> system.
          </h2>
          <p className="mt-4 text-base text-obsidian-text-muted">
            What the old way costs you — and what Silaye gives you back.
          </p>
        </div>

        {/* Comparison grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Old way */}
          <div className="rounded-2xl border border-obsidian-border bg-obsidian-card p-6">
            <div className="mb-5 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-muted-foreground" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                The Notebook Day
              </h3>
            </div>
            <ul className="space-y-3">
              {OLD_WAYS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-muted-foreground opacity-50" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Silaye way */}
          <div className="rounded-2xl border border-primary/30 bg-obsidian-card-elevated p-6 shadow-[0_0_40px_rgba(200,169,126,0.07)]">
            <div className="mb-5 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
                The Silaye Way
              </h3>
            </div>
            <ul className="space-y-3">
              {NEW_WAYS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  <span className="text-sm text-obsidian-text">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Mobile showcase ──────────────────────────────────────────────────────────

function MobileShowcaseSection() {
  const mobileFeatures = [
    "Fast measurement intake at customer's body",
    'Tap-to-call and instant WhatsApp from shop floor',
    'Works fully offline — no bazaar WiFi needed',
    'Daily delivery counter always visible',
  ];

  return (
    <section className="bg-obsidian-card py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
          {/* Phone mock (pure CSS) */}
          <div className="flex justify-center order-2 md:order-1">
            <div className="relative w-48">
              {/* Phone frame */}
              <div className="rounded-[2rem] border-2 border-obsidian-border bg-obsidian-bg p-3 shadow-2xl">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="h-1.5 w-8 rounded-full bg-obsidian-border" />
                  <span className="h-2.5 w-2.5 rounded-full bg-obsidian-border" />
                </div>
                {/* Mini measurement form mock */}
                <div className="space-y-1.5 rounded-xl bg-obsidian-card-elevated p-3">
                  <p className="text-[9px] font-semibold text-primary uppercase tracking-wider">
                    New Measurement
                  </p>
                  {[
                    ['لمبائی', '42.50"'],
                    ['چھاتی', '38.00"'],
                    ['کمر', '34.25"'],
                  ].map(([label, val]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-lg border border-obsidian-border bg-obsidian-bg px-2 py-1.5"
                    >
                      <span className="urdu-data-text text-[10px] text-muted-foreground" dir="rtl">
                        {label}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-primary">
                        {val}
                      </span>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="w-full rounded-lg bg-primary py-1.5 text-[10px] font-bold text-primary-foreground"
                  >
                    Save Measurements
                  </button>
                </div>
                {/* Kanban mini strip */}
                <div className="mt-2 grid grid-cols-4 gap-1">
                  {['Booked', 'Cut', 'Stitch', 'Ready'].map((s, i) => (
                    <div
                      key={s}
                      className={`rounded-md p-1 text-center text-[8px] font-semibold ${
                        i === 2
                          ? 'bg-status-stitching/20 text-status-stitching border border-status-stitching/30'
                          : 'border border-obsidian-border text-muted-foreground'
                      }`}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              </div>
              {/* Ambient glow */}
              <div
                className="pointer-events-none absolute -inset-8 rounded-[3rem] opacity-20 blur-3xl"
                style={{ background: 'radial-gradient(ellipse, rgba(200,169,126,0.4) 0%, transparent 70%)' }}
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Copy */}
          <div className="order-1 md:order-2">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5">
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                Mobile-First
              </span>
            </div>
            <h2 className="font-editorial text-3xl font-normal leading-[1.15] tracking-tight text-obsidian-text md:text-4xl">
              The workshop,{' '}
              <em className="italic text-primary">on the move.</em>
            </h2>
            <p className="mt-4 text-base text-obsidian-text-muted">
              Install as a mobile app on Android. Take measurements, advance payments, and
              WhatsApp confirmations — all without sitting behind a counter.
            </p>
            <ul className="mt-6 space-y-3">
              {mobileFeatures.map((feat) => (
                <li key={feat} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  <span className="text-sm text-obsidian-text-muted">{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

interface Testimonial {
  name: string;
  shop: string;
  city: string;
  quote: string;
  quoteUr: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Master Rafiq',
    shop: 'Rafiq Tailors',
    city: 'Tariq Road, Karachi',
    quote: 'Saved 3 hours every evening that I used to waste on reconciling the khata notebook.',
    quoteUr: 'ہر شام کے 3 گھنٹے بچ گئے جو پہلے کھاتہ ملانے میں ضائع ہوتے تھے۔',
  },
  {
    name: 'Ustad Tariq Mehmood',
    shop: 'Mehmood Fabrics & Tailors',
    city: 'Anarkali, Lahore',
    quote: 'No more fabric mix-ups during wedding season. Every tag has the measurement right on it.',
    quoteUr: 'شادی کے سیزن میں کپڑا غلط ہونا بند ہو گیا۔ ہر ٹیگ پر ناپ موجود ہے۔',
  },
  {
    name: 'Haji Muhammad Saleem',
    shop: 'Al-Saleem Bespoke',
    city: 'Saddar, Rawalpindi',
    quote: 'Eid rush used to feel like chaos. Now the queue is visible and every deadline is tracked.',
    quoteUr: 'عید کا رش افرا تفری لگتی تھی۔ اب قطار نظر آتی ہے اور ہر ڈیڈ لائن نظر میں ہے۔',
  },
];

function TestimonialsSection() {
  return (
    <section className="theme-linen bg-background py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <h2 className="font-editorial text-3xl font-normal leading-[1.15] tracking-[-0.01em] text-foreground md:text-5xl">
            Words from the people{' '}
            <em className="italic text-primary">holding the scissors.</em>
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            From neighbourhood workshops to wedding-season powerhouses.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              {/* Urdu quote */}
              <blockquote
                className="urdu-data-text text-sm leading-urdu-data text-foreground"
                dir="rtl"
                lang="ur"
              >
                &ldquo;{t.quoteUr}&rdquo;
              </blockquote>

              {/* English quote */}
              <p className="mt-3 text-sm italic text-muted-foreground">&ldquo;{t.quote}&rdquo;</p>

              {/* Author */}
              <div className="mt-5 border-t border-border pt-4">
                <p className="text-sm font-semibold text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.shop}</p>
                <p className="text-xs text-muted-foreground">{t.city}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Footer CTA ───────────────────────────────────────────────────────────────

function FooterCTA() {
  return (
    <section className="bg-obsidian-bg py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        {/* Nastaliq display headline */}
        <p
          className="urdu-display-text mb-4 text-2xl text-primary md:text-3xl"
          dir="rtl"
          lang="ur"
        >
          آپ کا فن لازوال ہے۔ آپ کا نظام بھی ہونا چاہیے۔
        </p>
        <h2 className="font-editorial text-3xl font-normal leading-[1.15] tracking-[-0.01em] text-obsidian-text md:text-5xl">
          Your craft is <em className="italic text-primary">timeless.</em>
          <br className="hidden md:block" />
          Your system should be too.
        </h2>
        <p className="mt-4 text-base text-obsidian-text-muted">
          Join master craftsmen across Pakistan who manage their workshop with Silaye.
          Start your 14-day free trial today.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-gold-hover hover:shadow-primary/30 active:scale-95"
          >
            Open Your Digital Workshop
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/track/DP-2026-0801"
            className="text-sm text-obsidian-text-muted underline-offset-2 hover:text-obsidian-text hover:underline"
          >
            See Live Order Tracker →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Site footer ──────────────────────────────────────────────────────────────

function SiteFooter() {
  return (
    <footer className="border-t border-obsidian-border bg-obsidian-bg px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="relative h-9 w-9 shrink-0 flex items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
              <Scissors className="h-full w-full p-2 object-contain aspect-square text-primary" />
            </div>
            <div>
              <span className="font-editorial text-base italic text-obsidian-text">Silaye</span>
              <span className="urdu-display-text ml-2 text-sm text-primary">سِلائی</span>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-obsidian-text-muted">
            {[
              ['Features', '#features'],
              ['Pricing', '#pricing'],
              ['Track Order', '/track/'],
              ['Open Workshop', '/login'],
            ].map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className="transition-colors hover:text-obsidian-text"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Locale note */}
          <div className="flex items-center gap-3 text-xs text-obsidian-text-muted">
            <span>English</span>
            <span>/</span>
            <span className="urdu-data-text" dir="rtl">اردو</span>
          </div>
        </div>

        <div className="mt-8 border-t border-obsidian-border pt-6 text-xs text-obsidian-text-muted">
          <p>© 2026 Silaye Workshop OS · Built for Pakistani Bespoke Tailors</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main className="min-h-screen bg-obsidian-bg">
      {/* Section 1: Obsidian Dark Hero */}
      <HeroSection />

      {/* Section 2: Raw Linen Bento Grid */}
      <BentoGrid />

      {/* Section 3: Paradigm Shift comparison */}
      <ParadigmShiftSection />

      {/* Section 4: Mobile Showcase */}
      <MobileShowcaseSection />

      {/* Section 5: Social Proof / Testimonials */}
      <TestimonialsSection />

      {/* Section 6: Pricing Tiers */}
      <PricingSection />

      {/* Section 7: Footer CTA */}
      <FooterCTA />

      {/* Site Footer */}
      <SiteFooter />
    </main>
  );
}
