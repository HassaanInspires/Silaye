'use client';

import {
  Database,
  MessageSquare,
  WifiOff,
  Printer,
  BookOpen,
  Zap,
} from 'lucide-react';

// ─── Feature card definitions ─────────────────────────────────────────────────

interface BentoFeature {
  id: string;
  icon: React.ReactNode;
  title: string;
  titleUr: string;
  description: string;
  illustration: React.ReactNode;
  span?: 'wide' | 'normal';
}

// ─── Mini Illustrations (inline, static, no external images) ─────────────────

function MeasurementVaultIllustration() {
  return (
    <div className="mt-4 rounded-xl border border-border bg-secondary p-3 font-mono">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Ch. Aslam — Standard Fit
        </span>
        <span className="rounded-full border border-status-ready/30 bg-status-ready/10 px-2 py-0.5 text-[9px] font-semibold text-status-ready">
          Saved
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1 text-center">
        {[
          ['L', '42.50"'], ['C', '38.00"'], ['W', '34.25"'],
          ['T', '16.25"'], ['B', '24.00"'], ['G', '14.50"'],
        ].map(([label, val]) => (
          <div key={label} className="rounded-lg border border-border bg-card p-1.5">
            <p className="text-[9px] text-muted-foreground">{label}</p>
            <p className="text-xs font-bold text-primary">{val}</p>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1">
        {['.00', '.25', '.50', '.75'].map((pill) => (
          <div
            key={pill}
            className={`flex-1 rounded-md border py-0.5 text-center text-[9px] font-semibold ${
              pill === '.25'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground'
            }`}
          >
            {pill}
          </div>
        ))}
      </div>
    </div>
  );
}

function WhatsAppIllustration() {
  return (
    <div className="mt-4 rounded-xl bg-[#0c1317] p-3">
      <div className="mb-2 flex items-center gap-2">
        <div className="h-5 w-5 rounded-full bg-[#25D366]/20 border border-[#25D366]/30 flex items-center justify-center">
          <MessageSquare className="h-2.5 w-2.5 text-[#25D366]" />
        </div>
        <span className="text-[10px] font-semibold text-white/70">Silaye Master Tailors</span>
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-[#005c4b] px-3 py-2">
        <p className="urdu-data-text text-[10px] leading-relaxed text-white" dir="rtl">
          السلام علیکم محمد اسلم صاحب،<br />
          آپ کا آرڈر <strong>#DP-2026-0801</strong> تیار ہے۔<br />
          بقیہ رقم: <bdi dir="ltr">Rs. 2,500</bdi>
        </p>
      </div>
      <div className="mt-1.5 flex items-center gap-1">
        <button
          type="button"
          className="rounded-lg bg-[#25D366] px-2.5 py-1 text-[9px] font-bold text-white"
        >
          Send →
        </button>
        <span className="text-[9px] text-white/40">1-Tap dispatch</span>
      </div>
    </div>
  );
}

function OfflineSyncIllustration() {
  return (
    <div className="mt-4 space-y-1.5">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2">
        <WifiOff className="h-3.5 w-3.5 text-status-stitching flex-shrink-0" />
        <span className="text-[11px] text-muted-foreground">Offline — 3 orders queued locally</span>
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-status-ready/30 bg-status-ready/10 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-status-ready animate-pulse" />
        <span className="text-[11px] text-status-ready">Sync complete · All data saved</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
        <div className="h-full w-3/4 rounded-full bg-primary/60 transition-all" />
      </div>
      <p className="text-[9px] text-muted-foreground">75% synced — reconnecting…</p>
    </div>
  );
}

function ESCPOSIllustration() {
  return (
    <div className="mt-4 rounded-xl border border-border bg-secondary p-3 font-mono text-[9px] leading-snug text-muted-foreground">
      <p className="text-center font-bold text-foreground text-[10px]">SILAYE SLIP</p>
      <p className="text-center">Silaye Master Tailors</p>
      <div className="mt-1.5 border-t border-dashed border-border pt-1.5">
        <p>Order: #DP-2026-0801</p>
        <p>Cust: Ch. Aslam</p>
        <p>ITEM: SHALWAR KAMEEZ  QTY:2</p>
        <p>DELV: 28 Aug 2026</p>
      </div>
      <div className="mt-1.5 border-t border-dashed border-border pt-1.5">
        <p>L:42.50 | C:38.00 | W:34.25</p>
        <p>BAL DUE: Rs.2,500</p>
      </div>
      <div className="mt-1.5 flex justify-center gap-px border-t border-dashed border-border pt-1.5">
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className="bg-foreground"
            style={{ width: i % 3 === 0 ? 2 : 1, height: 12 }}
          />
        ))}
      </div>
    </div>
  );
}

function KhataIllustration() {
  return (
    <div className="mt-4 space-y-1.5">
      <div className="flex items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2">
        <span className="text-[10px] text-muted-foreground">Total Receivables</span>
        <span className="font-mono text-xs font-bold text-status-udhaar-pending">
          <bdi dir="ltr">Rs. 14,000</bdi>
        </span>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2">
        <span className="text-[10px] text-muted-foreground">Advance Deposits</span>
        <span className="font-mono text-xs font-bold text-status-advance-credit">
          <bdi dir="ltr">Rs. 3,500</bdi>
        </span>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
        <span className="text-[10px] font-semibold text-foreground">Net Position</span>
        <span className="font-mono text-xs font-bold text-foreground">
          <bdi dir="ltr">Rs. 10,500</bdi>
        </span>
      </div>
    </div>
  );
}

function EidRushIllustration() {
  const stages = [
    { label: 'Booked', labelUr: 'بک', color: 'bg-status-booked', active: false },
    { label: 'Cutting', labelUr: 'کٹائی', color: 'bg-status-cutting', active: false },
    { label: 'Stitching', labelUr: 'سلائی', color: 'bg-status-stitching', active: true },
    { label: 'Ready', labelUr: 'تیار', color: 'bg-status-ready', active: false },
  ];
  return (
    <div className="mt-4">
      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-status-overdue/40 bg-status-overdue/10 px-2.5 py-1">
        <Zap className="h-3 w-3 text-status-overdue" />
        <span className="text-[10px] font-bold text-status-overdue">EID RUSH PRIORITY</span>
      </div>
      <div className="flex items-center gap-0">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex flex-1 flex-col items-center">
            <div className="flex items-center w-full">
              {i > 0 && (
                <div className="flex-1 h-0.5 bg-border" />
              )}
              <div className={`relative flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${stage.active ? `${stage.color} shadow-[0_0_8px_rgba(245,158,11,0.5)]` : 'bg-secondary border border-border'}`}>
                {stage.active && <span className="absolute inset-0 rounded-full animate-ping bg-status-stitching/30" />}
                <span className={`h-2 w-2 rounded-full ${stage.active ? 'bg-white' : stage.color}`} />
              </div>
              {i < stages.length - 1 && (
                <div className={`flex-1 h-0.5 ${i < 2 ? 'bg-primary' : 'bg-border'}`} />
              )}
            </div>
            <p className="mt-1 text-[9px] text-muted-foreground text-center">{stage.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Bento features data ──────────────────────────────────────────────────────

const BENTO_FEATURES: BentoFeature[] = [
  {
    id: 'measurement-vault',
    icon: <Database className="h-5 w-5" />,
    title: 'Measurement Vault',
    titleUr: 'ناپ محفوظ کریں',
    description:
      'Every measurement — stored permanently. Auto-recalls on phone number lookup. Never miscalculate again.',
    illustration: <MeasurementVaultIllustration />,
    span: 'wide',
  },
  {
    id: 'whatsapp',
    icon: <MessageSquare className="h-5 w-5" />,
    title: '1-Click WhatsApp',
    titleUr: 'ایک کلک پیغام',
    description:
      'Dispatch bilingual booking receipts and ready-alert messages instantly. No typing, no mistakes.',
    illustration: <WhatsAppIllustration />,
  },
  {
    id: 'offline',
    icon: <WifiOff className="h-5 w-5" />,
    title: 'Offline Sync',
    titleUr: 'آف لائن کام',
    description:
      'Works on the shop floor with zero internet. Orders queue locally and sync the moment connection returns.',
    illustration: <OfflineSyncIllustration />,
  },
  {
    id: 'printing',
    icon: <Printer className="h-5 w-5" />,
    title: 'ESC/POS Printing',
    titleUr: 'تھرمل پرنٹنگ',
    description:
      'Print 58mm fabric staple tags and 80mm customer invoices with a single tap. Code 128 barcodes included.',
    illustration: <ESCPOSIllustration />,
  },
  {
    id: 'khata',
    icon: <BookOpen className="h-5 w-5" />,
    title: 'Khata Ledger',
    titleUr: 'کھاتہ بہی',
    description:
      'Full market receivables dashboard. Track udhaar, advance credits, and net position across all customers.',
    illustration: <KhataIllustration />,
  },
  {
    id: 'eid-rush',
    icon: <Zap className="h-5 w-5" />,
    title: 'Eid Rush Priority Queue',
    titleUr: 'عید رش قطار',
    description:
      'Tag high-priority orders. Visual Kanban pipeline keeps Eid deadlines visible and under control.',
    illustration: <EidRushIllustration />,
    span: 'wide',
  },
];

// ─── Bento card ───────────────────────────────────────────────────────────────

function BentoCard({ feature }: { feature: BentoFeature }) {
  return (
    <div
      className={`flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md ${
        feature.span === 'wide' ? 'md:col-span-2' : ''
      }`}
    >
      {/* Icon + title */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
          {feature.icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
          <p className="urdu-data-text text-sm text-muted-foreground" dir="rtl">
            {feature.titleUr}
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>

      {/* Illustration */}
      {feature.illustration}
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export function BentoGrid() {
  return (
    <section id="features" className="theme-linen bg-background py-24">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section header */}
        <div className="mb-16 text-center">
          {/* Gold divider pill */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              Core Features
            </span>
          </div>
          <h2 className="font-editorial text-3xl font-normal leading-[1.15] tracking-[-0.01em] text-foreground md:text-5xl">
            Every part of the trade,
            <br className="hidden md:block" />
            in one <em className="italic text-primary">calm</em> system.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            Built specifically for Pakistani tailors — bilingual, offline-first, and fast enough
            for a busy Eid season.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {BENTO_FEATURES.map((feature) => (
            <BentoCard key={feature.id} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
