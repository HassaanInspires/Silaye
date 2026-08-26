'use client';

import { Check, Circle, Clock } from 'lucide-react';
import type { OrderStatus } from '@/types/tailor';

// ─── Tracking Stage Definitions ──────────────────────────────────────────────

export interface TrackingStage {
  index: number;
  label: string;
  labelUr: string;
  description: string;
}

export const TRACKING_STAGES: TrackingStage[] = [
  {
    index: 0,
    label: 'Booked',
    labelUr: 'آرڈر بک',
    description: 'Order received & logged in system',
  },
  {
    index: 1,
    label: 'Cutting',
    labelUr: 'کٹائی',
    description: 'Fabric cut by master craftsman',
  },
  {
    index: 2,
    label: 'Stitching',
    labelUr: 'سلائی',
    description: 'Garment assembled & stitched',
  },
  {
    index: 3,
    label: 'Ready',
    labelUr: 'تیار شدہ',
    description: 'Pressed, checked & ready for pickup',
  },
  {
    index: 4,
    label: 'Delivered',
    labelUr: 'حوالہ ہو چکا',
    description: 'Handed over to customer',
  },
];

/**
 * Maps internal OrderStatus values to a 0-4 stage index.
 */
export const STATUS_STEP_MAP: Record<OrderStatus, number> = {
  BOOKED: 0,
  FABRIC_RECEIVED: 0,
  IN_CUTTING: 1,
  IN_STITCHING: 2,
  KAJ_BUTTON: 2,
  PRESSING: 2,
  READY_FOR_TRIAL: 3,
  READY_FOR_DELIVERY: 3,
  COMPLETED: 4,
  CANCELLED: -1,
};

// ─── Countdown Helper ────────────────────────────────────────────────────────

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatCountdown(deliveryDate: string, trialDate: string | null): string {
  const daysToDelivery = getDaysUntil(deliveryDate);
  if (daysToDelivery < 0) return 'Delivery date passed';
  if (daysToDelivery === 0) return 'Due today!';
  if (daysToDelivery === 1) return 'Due tomorrow';

  if (trialDate) {
    const daysToTrial = getDaysUntil(trialDate);
    if (daysToTrial > 0 && daysToTrial <= 7) {
      return `Trial in ${daysToTrial} day${daysToTrial === 1 ? '' : 's'}`;
    }
  }

  return `Due in ${daysToDelivery} day${daysToDelivery === 1 ? '' : 's'}`;
}

// ─── Component Props ─────────────────────────────────────────────────────────

interface OrderProgressStepperProps {
  currentStatus: OrderStatus;
  deliveryDate: string;
  trialDate: string | null;
}

// ─── Vertical Timeline Component ─────────────────────────────────────────────

export function OrderProgressStepper({
  currentStatus,
  deliveryDate,
  trialDate,
}: OrderProgressStepperProps) {
  const activeStep = STATUS_STEP_MAP[currentStatus] ?? 0;
  const isCancelled = currentStatus === 'CANCELLED';
  const countdown = formatCountdown(deliveryDate, trialDate);

  if (isCancelled) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-red-700">
          Order Cancelled
        </p>
        <p className="mt-1 text-xs text-red-600">
          Please contact the workshop for more information.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 w-full">
      {TRACKING_STAGES.map((stage) => {
        const isPast = activeStep > stage.index;
        const isActive = activeStep === stage.index;
        const isFuture = activeStep < stage.index;
        const isLast = stage.index === TRACKING_STAGES.length - 1;

        return (
          <div key={stage.index} className="relative flex items-start gap-4">
            {/* Left Continuous Timeline Spine */}
            <div className="flex flex-col items-center flex-shrink-0 relative">
              {/* Step Marker */}
              <div className="relative z-10 flex items-center justify-center">
                {isPast && (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gold text-[#0B0C0E] shadow-sm">
                    <Check className="h-4 w-4 stroke-[2.5]" />
                  </div>
                )}

                {isActive && (
                  <div className="relative flex h-7 w-7 items-center justify-center">
                    <span className="absolute inset-0 rounded-full bg-gold/30 animate-ping" />
                    <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-gold text-[#0B0C0E] ring-2 ring-gold/50 animate-pulse shadow-md">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#0B0C0E]" />
                    </div>
                  </div>
                )}

                {isFuture && (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-neutral-300 bg-neutral-100 text-neutral-400">
                    <Circle className="h-2.5 w-2.5 fill-neutral-300 stroke-none" />
                  </div>
                )}
              </div>

              {/* Continuous Vertical Line to Next Step */}
              {!isLast && (
                <div
                  className={`w-0.5 min-h-[38px] flex-1 my-1 transition-all duration-300 ${
                    isPast
                      ? 'bg-gold'
                      : isFuture
                      ? 'border-l-2 border-dashed border-neutral-300'
                      : 'border-l-2 border-dashed border-neutral-300'
                  }`}
                />
              )}
            </div>

            {/* Right Step Content */}
            <div className={`pb-6 pt-0.5 flex-1 min-w-0 ${isLast ? 'pb-1' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`text-sm font-semibold transition-colors ${
                    isActive
                      ? 'text-neutral-900 font-bold'
                      : isPast
                      ? 'text-neutral-800'
                      : 'text-neutral-400'
                  }`}
                >
                  {stage.label}
                </p>
                <span
                  className={`urdu-data-text text-xs ${
                    isActive
                      ? 'text-gold-muted font-bold'
                      : isPast
                      ? 'text-neutral-600'
                      : 'text-neutral-400'
                  }`}
                  dir="rtl"
                >
                  {stage.labelUr}
                </span>
              </div>

              <p
                className={`mt-0.5 text-xs ${
                  isActive
                    ? 'text-neutral-700 font-medium'
                    : isPast
                    ? 'text-neutral-500'
                    : 'text-neutral-400'
                }`}
              >
                {stage.description}
              </p>

              {/* Active Step Badge */}
              {isActive && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 shadow-sm">
                  <Clock className="h-3.5 w-3.5 text-gold-muted animate-pulse" />
                  <span className="text-xs font-semibold text-neutral-900">{countdown}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
