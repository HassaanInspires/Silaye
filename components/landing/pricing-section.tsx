'use client';

import { useState } from 'react';
import { Check, Zap } from 'lucide-react';

// ─── Pricing tier data ─────────────────────────────────────────────────────────

interface PricingTier {
  id: string;
  name: string;
  nameUr: string;
  tagline: string;
  monthlyPKR: number;
  highlight: boolean;
  badge?: string;
  features: string[];
  cta: string;
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'solo',
    name: 'Solo Master',
    nameUr: 'سولو ماسٹر',
    tagline: 'For the independent craftsman',
    monthlyPKR: 1500,
    highlight: false,
    features: [
      '100 Active Orders',
      '1 Counter Terminal',
      'Measurement Vault',
      'Khata Ledger',
      '1-Click WhatsApp',
      'Thermal Tag Printing (58mm)',
      'Offline Sync',
    ],
    cta: 'Start Free Trial',
  },
  {
    id: 'professional',
    name: 'Multi-Counter Workshop',
    nameUr: 'ورکشاپ پلان',
    tagline: 'For the growing workshop',
    monthlyPKR: 2800,
    highlight: true,
    badge: 'Most Popular',
    features: [
      'Unlimited Active Orders',
      'Up to 5 Counter Terminals',
      'Everything in Solo Master',
      '80mm Invoice Printing',
      'WhatsApp Bulk Reminders',
      'Eid Rush Priority Queue',
      'Public Order Tracking URL',
      'Priority Support',
    ],
    cta: 'Open Your Workshop',
  },
  {
    id: 'enterprise',
    name: 'Enterprise Bazaar Chain',
    nameUr: 'انٹرپرائز چین',
    tagline: 'For multi-branch operations',
    monthlyPKR: 7000,
    highlight: false,
    features: [
      'Unlimited Orders & Branches',
      'Unlimited Counter Terminals',
      'Everything in Professional',
      'Multi-Branch Dashboard',
      'REST API Access',
      'Dedicated Account Manager',
      'Custom Branding & Receipts',
      'SLA Uptime Guarantee',
    ],
    cta: 'Contact Sales',
  },
];

// ─── Annual discount rate ─────────────────────────────────────────────────────

const ANNUAL_DISCOUNT = 0.20;

function formatPKR(amount: number): string {
  return `Rs. ${Math.round(amount).toLocaleString('en-PK')}`;
}

// ─── Single pricing card ──────────────────────────────────────────────────────

interface PricingCardProps {
  tier: PricingTier;
  isAnnual: boolean;
}

function PricingCard({ tier, isAnnual }: PricingCardProps) {
  const displayMonthly = isAnnual
    ? tier.monthlyPKR * (1 - ANNUAL_DISCOUNT)
    : tier.monthlyPKR;

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 transition-transform hover:-translate-y-0.5 ${
        tier.highlight
          ? 'border-primary bg-card shadow-[0_0_40px_rgba(200,169,126,0.1)]'
          : 'border-border bg-card'
      }`}
    >
      {/* Popular badge */}
      {tier.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-primary px-3 py-1 shadow-sm">
            <Zap className="h-3 w-3 text-primary-foreground" />
            <span className="text-xs font-bold text-primary-foreground">{tier.badge}</span>
          </div>
        </div>
      )}

      {/* Tier identity */}
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-foreground">{tier.name}</h3>
        <p className="urdu-data-text text-sm text-muted-foreground mt-0.5" dir="rtl">
          {tier.nameUr}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{tier.tagline}</p>
      </div>

      {/* Price block */}
      <div className="mb-6 border-t border-border pt-5">
        <div className="flex items-baseline gap-1">
          <span className="font-editorial text-4xl font-normal text-foreground">
            <bdi dir="ltr">{formatPKR(displayMonthly)}</bdi>
          </span>
          <span className="text-sm text-muted-foreground">/mo</span>
        </div>
        {isAnnual ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Billed annually ·{' '}
            <span className="text-status-advance-credit font-semibold">
              Save {formatPKR(tier.monthlyPKR * 12 * ANNUAL_DISCOUNT)}/yr
            </span>
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">Billed monthly · Cancel anytime</p>
        )}
      </div>

      {/* Feature list */}
      <ul className="mb-8 flex-1 space-y-2.5">
        {tier.features.map((feat) => (
          <li key={feat} className="flex items-start gap-2.5">
            <Check
              className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                tier.highlight ? 'text-primary' : 'text-status-advance-credit'
              }`}
            />
            <span className="text-sm text-muted-foreground">{feat}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        type="button"
        className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all active:scale-95 ${
          tier.highlight
            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-gold-hover'
            : 'border border-border bg-card text-foreground hover:border-foreground/30 hover:bg-secondary'
        }`}
      >
        {tier.cta}
      </button>
    </div>
  );
}

// ─── Billing toggle ───────────────────────────────────────────────────────────

interface BillingToggleProps {
  isAnnual: boolean;
  onToggle: (isAnnual: boolean) => void;
}

function BillingToggle({ isAnnual, onToggle }: BillingToggleProps) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-border bg-card p-1">
      <button
        type="button"
        onClick={() => onToggle(false)}
        className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
          !isAnnual
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onToggle(true)}
        className={`relative rounded-full px-5 py-2 text-sm font-semibold transition-all ${
          isAnnual
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        Annually
        {!isAnnual && (
          <span className="absolute -top-2.5 -right-1 rounded-full bg-status-advance-credit px-1.5 py-0.5 text-[9px] font-bold text-white">
            −20%
          </span>
        )}
      </button>
    </div>
  );
}

// ─── Main pricing section ─────────────────────────────────────────────────────

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section
      id="pricing"
      className="bg-obsidian-bg py-24"
    >
      <div className="mx-auto max-w-6xl px-6">
        {/* Section header */}
        <div className="mb-12 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              Transparent Pricing
            </span>
          </div>
          <h2 className="font-editorial text-3xl font-normal leading-[1.15] tracking-[-0.01em] text-obsidian-text md:text-5xl">
            Pricing without{' '}
            <em className="italic text-primary">complications.</em>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-obsidian-text-muted">
            PKR billing. No hidden fees. No foreign exchange surprises.
            Start free for 14 days — no credit card required.
          </p>

          {/* Billing toggle */}
          <div className="mt-8">
            <BillingToggle isAnnual={isAnnual} onToggle={setIsAnnual} />
          </div>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:items-start">
          {PRICING_TIERS.map((tier) => (
            <PricingCard key={tier.id} tier={tier} isAnnual={isAnnual} />
          ))}
        </div>

        {/* Footer note */}
        <p className="mt-10 text-center text-xs text-obsidian-text-muted">
          All plans include 14-day free trial. Pricing in Pakistani Rupees (PKR).
          Annual plans billed as a single payment.
        </p>
      </div>
    </section>
  );
}
