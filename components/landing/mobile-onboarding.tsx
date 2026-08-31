'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Scissors,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  WifiOff,
  MessageSquare,
  ShieldCheck,
  Check,
} from 'lucide-react';

export function MobileOnboardingFlow() {
  const [activeIndex, setActiveIndex] = React.useState<number>(0);
  const touchStartX = React.useRef<number | null>(null);
  const touchEndX = React.useRef<number | null>(null);

  const SWIPE_THRESHOLD = 45; // minimum swipe delta in pixels

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const deltaX = touchStartX.current - touchEndX.current;

    if (deltaX > SWIPE_THRESHOLD && activeIndex < 2) {
      // Swiped left -> advance card
      setActiveIndex((prev) => Math.min(prev + 1, 2));
    } else if (deltaX < -SWIPE_THRESHOLD && activeIndex > 0) {
      // Swiped right -> previous card
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <div
      className="fixed inset-0 h-[100dvh] min-h-screen min-h-screen-safe w-full bg-[#0B0C0E] text-foreground flex flex-col justify-between overflow-hidden relative select-none z-50"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Ambient Lighting Halos */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-gold/15 rounded-full blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 w-[250px] h-[250px] bg-primary/5 rounded-full blur-2xl"
        aria-hidden="true"
      />

      {/* ─── Top Header ──────────────────────────────────────────────────────── */}
      <header className="relative z-20 flex items-center justify-between px-6 pt-safe pb-2">
        {/* Balanced spacer on the left to ensure true center alignment for scissors logo */}
        <div className="w-24 shrink-0" />

        {/* Centered Gold Scissors Brand Logo (Fixed 36x36px aspect-square) */}
        <div className="relative h-9 w-9 shrink-0 flex items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold shadow-[0_0_15px_rgba(212,175,55,0.2)]">
          <Scissors className="h-full w-full p-2 object-contain aspect-square" />
        </div>

        {/* Top-Right Sign In Action */}
        <div className="w-24 shrink-0 flex justify-end">
          <Link
            href="/login?tab=login"
            className="text-xs font-semibold text-gold/90 hover:text-gold transition-colors py-1 px-2.5 rounded-lg hover:bg-gold/10 active:scale-95"
          >
            لاگ ان / Sign In
          </Link>
        </div>
      </header>

      {/* ─── 3 Cinematic Feature Cards Track ─────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-4 overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-out will-change-transform"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {/* ─── Card 1: Smart Measurement Vault ───────────────────────────── */}
          <div className="w-full shrink-0 flex flex-col items-center justify-center text-center px-2">
            {/* Category Pill */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gold shadow-[0_0_12px_rgba(212,175,55,0.15)] mb-3">
              <Scissors className="h-3 w-3" />
              <span>Digital Measurement Vault</span>
            </div>

            {/* Urdu Title & Subtitle */}
            <h2 className="font-urdu-serif text-2xl font-bold text-white mb-1.5 leading-snug" dir="rtl">
              ناپ کی ڈیجیٹل تجوری
            </h2>
            <p className="font-urdu-sans text-xs text-gray-400 max-w-xs mb-5 leading-urdu-data" dir="rtl">
              کبھی ناپ گم نہ ہو۔ تمام کسٹمرز کا کلاؤڈ ریکارڈ ایک کلک پر۔
            </p>

            {/* Visual Glass Mockup */}
            <div className="premium-glass-card rounded-2xl border border-white/10 p-4 w-full max-w-xs shadow-2xl space-y-3 bg-[#121316]/90 backdrop-blur-xl text-left">
              {/* Customer Profile Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-gold/15 flex items-center justify-center text-[11px] font-bold text-gold">
                    HS
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-200">Haji Saleem (حاجی سلیم)</p>
                    <p className="text-[10px] text-gray-500 font-mono">0300-5551234 • Wah Cantt</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                  Verified
                </span>
              </div>

              {/* 3x2 Measurement Matrix Mock */}
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="rounded-lg bg-[#0B0C0E]/60 border border-gold/30 p-1.5">
                  <span className="block text-[9px] text-gray-400 font-urdu-sans" dir="rtl">لمبائی</span>
                  <span className="text-xs font-bold text-gold font-mono">42.50&quot;</span>
                </div>
                <div className="rounded-lg bg-[#0B0C0E]/60 border border-white/5 p-1.5">
                  <span className="block text-[9px] text-gray-400 font-urdu-sans" dir="rtl">چھاتی</span>
                  <span className="text-xs font-bold text-gray-200 font-mono">38.00&quot;</span>
                </div>
                <div className="rounded-lg bg-[#0B0C0E]/60 border border-white/5 p-1.5">
                  <span className="block text-[9px] text-gray-400 font-urdu-sans" dir="rtl">کمر</span>
                  <span className="text-xs font-bold text-gray-200 font-mono">34.25&quot;</span>
                </div>
                <div className="rounded-lg bg-[#0B0C0E]/60 border border-white/5 p-1.5">
                  <span className="block text-[9px] text-gray-400 font-urdu-sans" dir="rtl">کالر</span>
                  <span className="text-xs font-bold text-gray-200 font-mono">16.00&quot;</span>
                </div>
                <div className="rounded-lg bg-[#0B0C0E]/60 border border-white/5 p-1.5">
                  <span className="block text-[9px] text-gray-400 font-urdu-sans" dir="rtl">تیرا</span>
                  <span className="text-xs font-bold text-gray-200 font-mono">18.50&quot;</span>
                </div>
                <div className="rounded-lg bg-[#0B0C0E]/60 border border-white/5 p-1.5">
                  <span className="block text-[9px] text-gray-400 font-urdu-sans" dir="rtl">بازو</span>
                  <span className="text-xs font-bold text-gray-200 font-mono">24.00&quot;</span>
                </div>
              </div>

              {/* Style Chip Footer */}
              <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-white/5">
                <span className="font-urdu-sans" dir="rtl">شیروانی کالر • گول دامن</span>
                <span className="text-gold font-medium">2 سائیڈ جیب</span>
              </div>
            </div>
          </div>

          {/* ─── Card 2: 1-Click WhatsApp Receipts ─────────────────────────── */}
          <div className="w-full shrink-0 flex flex-col items-center justify-center text-center px-2">
            {/* Category Pill */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)] mb-3">
              <MessageSquare className="h-3 w-3" />
              <span>1-Click WhatsApp Receipts</span>
            </div>

            {/* Urdu Title & Subtitle */}
            <h2 className="font-urdu-serif text-2xl font-bold text-white mb-1.5 leading-snug" dir="rtl">
              واٹس ایپ رسیدیں
            </h2>
            <p className="font-urdu-sans text-xs text-gray-400 max-w-xs mb-5 leading-urdu-data" dir="rtl">
              بکنگ اور سوٹ تیار ہوتے ہی کسٹمر کو فوری خودکار سلپ بھیجیں۔
            </p>

            {/* Visual Glass Mockup */}
            <div className="rounded-2xl border border-emerald-500/30 bg-[#0c1317]/95 p-4 w-full max-w-xs shadow-[0_0_30px_rgba(16,185,129,0.15)] space-y-2.5 text-left backdrop-blur-xl">
              {/* WhatsApp Mock Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[10px] font-bold">
                    WA
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-200">Silaye Master Workshop</p>
                    <p className="text-[9px] text-emerald-400">● Online</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-gray-400">#DP-2026-0801</span>
              </div>

              {/* Chat Bubble Mock */}
              <div className="rounded-xl bg-[#005c4b] p-3 text-white text-xs space-y-1.5 shadow-md">
                <p className="font-urdu-sans text-[11px] leading-snug" dir="rtl">
                  السلام علیکم حاجی صاحب! آپ کا سوٹ تیار ہو چکا ہے۔
                </p>
                <div className="rounded-lg bg-black/20 p-1.5 text-[10px] space-y-0.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total:</span>
                    <span className="font-bold">Rs. 3,500</span>
                  </div>
                  <div className="flex justify-between text-emerald-200">
                    <span>Balance Due:</span>
                    <span className="font-bold">Rs. 0 (Paid)</span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1 text-[9px] text-emerald-200 pt-0.5">
                  <span>10:42 AM</span>
                  <span className="text-cyan-300 font-bold">✓✓</span>
                </div>
              </div>

              {/* Instant Automation Badge */}
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-emerald-400/90 pt-1">
                <CheckCircle2 className="h-3 w-3" />
                <span>خودکار سلپ ڈیلیوری • Zero SMS Cost</span>
              </div>
            </div>
          </div>

          {/* ─── Card 3: Offline Khata & Production ─────────────────────────── */}
          <div className="w-full shrink-0 flex flex-col items-center justify-center text-center px-2">
            {/* Category Pill */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)] mb-3">
              <WifiOff className="h-3 w-3" />
              <span>Offline Khata & Workflow</span>
            </div>

            {/* Urdu Title & Subtitle */}
            <h2 className="font-urdu-serif text-2xl font-bold text-white mb-1.5 leading-snug" dir="rtl">
              آف لائن کھاتہ اور ورک فلو
            </h2>
            <p className="font-urdu-sans text-xs text-gray-400 max-w-xs mb-5 leading-urdu-data" dir="rtl">
              انٹرنیٹ کے بغیر بلنگ، ادھار کھاتہ، اور سلائی ٹریکنگ۔
            </p>

            {/* Visual Glass Mockup */}
            <div className="premium-glass-card rounded-2xl border border-amber-500/30 bg-[#121316]/90 p-4 w-full max-w-xs shadow-[0_0_30px_rgba(245,158,11,0.15)] space-y-3 text-left backdrop-blur-xl">
              {/* Pipeline Stage Chips */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">
                  Live Production Pipeline
                </span>
                <div className="grid grid-cols-3 gap-1 text-[10px] font-medium text-center">
                  <div className="rounded-lg bg-white/5 border border-white/10 py-1.5 text-gray-300">
                    <span className="block font-urdu-sans" dir="rtl">کٹائی</span>
                    <span className="text-[9px] text-emerald-400">✓ Done</span>
                  </div>
                  <div className="rounded-lg bg-amber-500/20 border border-amber-500/50 py-1.5 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                    <span className="block font-urdu-sans" dir="rtl">سلائی</span>
                    <span className="text-[9px] text-amber-400 animate-pulse">⚡ Active</span>
                  </div>
                  <div className="rounded-lg bg-white/5 border border-white/10 py-1.5 text-gray-500">
                    <span className="block font-urdu-sans" dir="rtl">تیار</span>
                    <span className="text-[9px]">Queue</span>
                  </div>
                </div>
              </div>

              {/* Offline Sync State Pill */}
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-2 flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Offline DB Synchronized</span>
                </div>
                <span className="text-gray-400 font-mono">0 Queued</span>
              </div>

              {/* Total Udhaar Metric */}
              <div className="flex items-center justify-between border-t border-white/5 pt-2 text-xs">
                <span className="text-gray-400 font-urdu-sans" dir="rtl">واجب الادا ادھار:</span>
                <span className="font-mono font-bold text-rose-400">Rs. 68,500</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Bottom Action Area & Interactive Dot Indicators ─────────────────── */}
      <div className="relative z-20 px-6 pb-safe pt-2 space-y-3.5 w-full max-w-md mx-auto">
        {/* Dynamic Dot Indicators (● ○ ○) */}
        <div className="flex items-center justify-center gap-2 mb-2" role="tablist" aria-label="Onboarding slide indicators">
          {[0, 1, 2].map((idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                activeIndex === idx
                  ? 'w-7 bg-gold shadow-[0_0_12px_rgba(212,175,55,0.4)]'
                  : 'w-2 bg-white/20 hover:bg-white/40'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
              aria-selected={activeIndex === idx}
            />
          ))}
        </div>

        {/* Primary Gold CTA */}
        <Link
          href="/login?tab=register"
          className="w-full h-12 bg-gold text-[#0B0C0E] hover:bg-gold-hover active:scale-[0.98] font-bold rounded-xl flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(212,175,55,0.25)] transition-all text-sm"
        >
          <span>نیا ڈیجیٹل کھاتہ بنائیں / Open Workshop</span>
          <ArrowRight className="h-4 w-4" />
        </Link>

        {/* Secondary Ghost CTA */}
        <Link
          href="/login?tab=login"
          className="w-full h-11 border border-white/10 bg-white/[0.04] text-gray-300 hover:text-white hover:bg-white/[0.08] active:scale-[0.98] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all"
        >
          <span>پہلے سے اکاؤنٹ ہے؟ لاگ ان کریں / Sign In</span>
        </Link>
      </div>
    </div>
  );
}
