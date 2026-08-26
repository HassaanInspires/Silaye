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
      className="premium-glass-card relative flex flex-col p-8 transition-transform hover:-translate-y-1"
      style={
        tier.highlight
          ? {
              border: '1px solid rgba(212, 175, 55, 0.5)',
              boxShadow: '0 0 40px rgba(212, 175, 55, 0.15)',
            }
          : undefined
      }
    >
      {/* Popular badge */}
      {tier.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-gold bg-gold px-3.5 py-1 shadow-lg shadow-gold/25">
            <Zap className="h-3 w-3 fill-current text-[#0B0C0E]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0B0C0E]">
              {tier.badge}
            </span>
          </div>
        </div>
      )}

      {/* Tier identity */}
      <div className="mb-6">
        <h3 className="font-editorial text-2xl tracking-tight text-foreground">{tier.name}</h3>
        <p className="urdu-data-text mt-0.5 text-sm text-muted-foreground" dir="rtl">
          {tier.nameUr}
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground">{tier.tagline}</p>
      </div>

      {/* Price block */}
      <div className="mb-6 border-t border-white/10 pt-5">
        <div className="flex items-baseline gap-1">
          <span className="font-editorial text-4xl font-normal text-foreground md:text-5xl">
            <bdi dir="ltr">{formatPKR(displayMonthly)}</bdi>
          </span>
          <span className="text-sm text-muted-foreground">/mo</span>
        </div>
        {isAnnual ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Billed annually ·{' '}
            <span className="font-semibold text-status-advance-credit">
              Save {formatPKR(tier.monthlyPKR * 12 * ANNUAL_DISCOUNT)}/yr
            </span>
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-muted-foreground">Billed monthly · Cancel anytime</p>
        )}
      </div>

      {/* Feature list */}
      <ul className="mb-8 flex-1 space-y-3">
        {tier.features.map((feat) => (
          <li key={feat} className="flex items-start gap-2.5">
            <Check
              className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                tier.highlight ? 'text-primary' : 'text-primary/70'
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
            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-gold-hover hover:shadow-primary/30'
            : 'border border-white/10 bg-white/5 text-foreground hover:border-white/20 hover:bg-white/10'
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
    <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-sm">
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
          <span className="absolute -right-1 -top-2.5 rounded-full bg-status-advance-credit px-1.5 py-0.5 text-[9px] font-bold text-white">
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
      className="bg-ambient-dark px-6 py-32"
    >
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <div className="mb-16 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              Transparent Pricing
            </span>
          </div>
          <h2 className="font-editorial text-4xl tracking-tight text-obsidian-text md:text-5xl">
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
        <p className="mt-12 text-center text-xs text-obsidian-text-muted">
          All plans include 14-day free trial. Pricing in Pakistani Rupees (PKR).
          Annual plans billed as a single payment.
        </p>
      </div>
    </section>
  );
}
