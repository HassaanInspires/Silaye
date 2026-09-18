'use client';

import * as React from 'react';
import {
  CheckCircle2,
  Repeat,
  UserPlus,
  ClipboardList,
  Sparkles,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/language-provider';
import type { Customer, GarmentOrder } from '@/types/tailor';

export interface PostBookingSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: GarmentOrder | null;
  customer: Customer | null;
  onBookAnotherSameCustomer: () => void;
  onBookForNewCustomer: () => void;
  onViewQueue: () => void;
}

export function PostBookingSuccessModal({
  open,
  onOpenChange,
  order,
  customer,
  onBookAnotherSameCustomer,
  onBookForNewCustomer,
  onViewQueue,
}: PostBookingSuccessModalProps) {
  const { postBookingT, dir } = useLanguage();
  const isRtl = dir === 'rtl';

  if (!open || !order) return null;

  const handleAction = (action: () => void) => {
    onOpenChange(false);
    action();
  };

  const isFullyPaid = order.balance_due <= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="post-booking-success-modal"
        className="w-[95vw] max-w-lg border border-primary/30 bg-card p-5 sm:p-7 shadow-2xl rounded-2xl overflow-hidden"
        hideCloseButton={false}
      >
        {/* Subtle Ambient Radial Glow */}
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-36 w-72 rounded-full bg-primary/15 blur-3xl" />

        <div className="relative z-10 space-y-5">
          {/* Header Banner */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 border border-primary/40 text-primary shadow-xs animate-bounce">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-urdu-sans leading-urdu-heading">
              {postBookingT.title}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground font-urdu-sans max-w-sm leading-relaxed">
              {postBookingT.subtitle}
            </p>
          </div>

          {/* Quick Snapshot Card */}
          <div className="rounded-xl border border-border/70 bg-background/80 p-3.5 sm:p-4 space-y-2.5 text-xs sm:text-sm">
            <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
              <span className="text-muted-foreground font-urdu-sans">{postBookingT.orderNumber}</span>
              <span className="font-mono font-bold text-foreground">
                <bdi dir="ltr">#{order.order_number}</bdi>
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
              <span className="text-muted-foreground font-urdu-sans">{postBookingT.customer}</span>
              <span className="font-semibold text-foreground">
                {customer?.full_name || order.customer_id}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-urdu-sans">{postBookingT.advancePaid}</span>
                <span className="font-mono font-semibold text-foreground">
                  <bdi dir="ltr">Rs. {order.advance_paid.toLocaleString()}</bdi>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-urdu-sans">{postBookingT.balanceDue}</span>
                <span
                  className={`font-mono font-bold ${
                    isFullyPaid
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-rose-700 dark:text-rose-400'
                  }`}
                >
                  <bdi dir="ltr">Rs. {order.balance_due.toLocaleString()}</bdi>
                </span>
              </div>
            </div>
          </div>

          {/* Action Prompt */}
          <div className="pt-1">
            <p className="text-xs font-semibold text-foreground/80 font-urdu-sans mb-3 text-start">
              {postBookingT.nextStepPrompt}
            </p>

            <div className="space-y-2.5">
              {/* Option 1: Book Another Suit for Same Customer */}
              <button
                type="button"
                data-testid="post-booking-another-same-btn"
                onClick={() => handleAction(onBookAnotherSameCustomer)}
                className="w-full text-start group relative flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/15 transition-all focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs mt-0.5">
                  <Repeat className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm sm:text-base text-foreground font-urdu-sans leading-tight">
                      {postBookingT.bookAnotherSame}
                    </span>
                    {isRtl ? (
                      <ArrowLeft className="h-4 w-4 text-primary shrink-0 transition-transform group-hover:-translate-x-1" />
                    ) : (
                      <ArrowRight className="h-4 w-4 text-primary shrink-0 transition-transform group-hover:translate-x-1" />
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-muted-foreground font-urdu-sans mt-0.5 leading-normal">
                    {postBookingT.bookAnotherSameSub}
                  </p>
                </div>
              </button>

              {/* Option 2: Book for New Customer */}
              <button
                type="button"
                data-testid="post-booking-new-customer-btn"
                onClick={() => handleAction(onBookForNewCustomer)}
                className="w-full text-start group relative flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl border border-border bg-card hover:bg-accent/40 hover:border-primary/30 transition-all focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground shadow-xs mt-0.5">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm sm:text-base text-foreground font-urdu-sans leading-tight">
                      {postBookingT.bookNewCustomer}
                    </span>
                    {isRtl ? (
                      <ArrowLeft className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:-translate-x-1" />
                    ) : (
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-1" />
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-muted-foreground font-urdu-sans mt-0.5 leading-normal">
                    {postBookingT.bookNewCustomerSub}
                  </p>
                </div>
              </button>

              {/* Option 3: View Production Queue */}
              <button
                type="button"
                data-testid="post-booking-view-queue-btn"
                onClick={() => handleAction(onViewQueue)}
                className="w-full text-start group relative flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl border border-border bg-card hover:bg-accent/40 hover:border-primary/30 transition-all focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground shadow-xs mt-0.5">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm sm:text-base text-foreground font-urdu-sans leading-tight">
                      {postBookingT.viewQueue}
                    </span>
                    {isRtl ? (
                      <ArrowLeft className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:-translate-x-1" />
                    ) : (
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-1" />
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-muted-foreground font-urdu-sans mt-0.5 leading-normal">
                    {postBookingT.viewQueueSub}
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Close button */}
          <div className="pt-2 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs font-urdu-sans"
            >
              {postBookingT.close}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
