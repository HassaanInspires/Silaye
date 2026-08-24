'use client';

import { CheckCircle2, Circle, Clock } from 'lucide-react';
import type { OrderStatus } from '@/types/tailor';

// ─── Public-facing stage definitions ────────────────────────────────────────

interface TrackingStage {
  index: number;
  label: string;
  labelUr: string;
  description: string;
}

const TRACKING_STAGES: TrackingStage[] = [
  {
    index: 0,
    label: 'Booked',
    labelUr: 'آرڈر بک',
    description: 'Order received & logged',
  },
  {
    index: 1,
    label: 'In Cutting',
    labelUr: 'کٹائی جاری',
    description: 'Fabric is being cut by master cutter',
  },
  {
    index: 2,
    label: 'In Stitching',
    labelUr: 'سلائی جاری',
    description: 'Garment is being stitched',
  },
  {
    index: 3,
    label: 'Ready for Pickup',
    labelUr: 'وصولی کے لیے تیار',
    description: 'Your garment is pressed & ready',
  },
  {
    index: 4,
    label: 'Delivered',
    labelUr: 'حوالہ ہو چکا',
    description: 'Order handed over — enjoy!',
  },
];

/**
 * Maps internal OrderStatus values to a public 0-4 step index.
 * Intermediate technical statuses collapse into the nearest visible stage.
 */
const STATUS_STEP_MAP: Record<OrderStatus, number> = {
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

// ─── Countdown helper ────────────────────────────────────────────────────────

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
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

// ─── Component ───────────────────────────────────────────────────────────────

interface OrderProgressStepperProps {
  currentStatus: OrderStatus;
  deliveryDate: string;
  trialDate: string | null;
}

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
      <div className="rounded-xl border border-status-overdue/30 bg-status-overdue/10 px-6 py-4 text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-status-overdue">
          Order Cancelled
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Please contact the shop for details.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Desktop horizontal stepper */}
      <div className="hidden sm:flex items-start gap-0">
        {TRACKING_STAGES.map((stage) => {
          const isCompleted = activeStep > stage.index;
          const isActive = activeStep === stage.index;
          const isFuture = activeStep < stage.index;
          const isLast = stage.index === TRACKING_STAGES.length - 1;

          return (
            <div key={stage.index} className="flex flex-col items-center flex-1 min-w-0">
              {/* Node + connector row */}
              <div className="flex items-center w-full">
                {/* Left connector line */}
                {stage.index > 0 && (
                  <div
                    className={`flex-1 h-0.5 transition-colors duration-500 ${
                      isCompleted || isActive
                        ? 'bg-primary'
                        : 'border-t-2 border-dashed border-border'
                    }`}
                  />
                )}

                {/* Step node */}
                <div className="relative flex-shrink-0">
                  {isActive && (
                    <span className="absolute inset-0 rounded-full animate-ping bg-primary/40" />
                  )}
                  <div
                    className={`relative flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                      isCompleted
                        ? 'border-primary bg-primary text-primary-foreground'
                        : isActive
                        ? 'border-primary bg-background text-primary shadow-[0_0_16px_rgba(200,169,126,0.5)]'
                        : 'border-border bg-background text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isActive ? (
                      <span className="h-3 w-3 rounded-full bg-primary" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </div>
                </div>

                {/* Right connector line */}
                {!isLast && (
                  <div
                    className={`flex-1 h-0.5 transition-colors duration-500 ${
                      isCompleted
                        ? 'bg-primary'
                        : 'border-t-2 border-dashed border-border'
                    }`}
                  />
                )}
              </div>

              {/* Label block */}
              <div className="mt-3 px-1 text-center">
                <p
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    isCompleted
                      ? 'text-primary'
                      : isActive
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {stage.label}
                </p>
                <p
                  className="mt-0.5 urdu-data-text text-[10px] text-muted-foreground"
                  dir="rtl"
                >
                  {stage.labelUr}
                </p>

                {/* Active stage pill */}
                {isActive && (
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5">
                    <Clock className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-medium text-primary">{countdown}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile vertical stepper */}
      <div className="flex sm:hidden flex-col gap-0">
        {TRACKING_STAGES.map((stage) => {
          const isCompleted = activeStep > stage.index;
          const isActive = activeStep === stage.index;
          const isLast = stage.index === TRACKING_STAGES.length - 1;

          return (
            <div key={stage.index} className="flex gap-4">
              {/* Spine: node + vertical line */}
              <div className="flex flex-col items-center">
                {/* Node */}
                <div className="relative flex-shrink-0">
                  {isActive && (
                    <span className="absolute inset-0 rounded-full animate-ping bg-primary/40" />
                  )}
                  <div
                    className={`relative flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                      isCompleted
                        ? 'border-primary bg-primary text-primary-foreground'
                        : isActive
                        ? 'border-primary bg-background text-primary shadow-[0_0_12px_rgba(200,169,126,0.5)]'
                        : 'border-border bg-background text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : isActive ? (
                      <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    ) : (
                      <Circle className="h-3.5 w-3.5" />
                    )}
                  </div>
                </div>
                {/* Vertical connector */}
                {!isLast && (
                  <div
                    className={`mt-1 w-0.5 flex-1 min-h-[28px] ${
                      isCompleted
                        ? 'bg-primary'
                        : 'border-l-2 border-dashed border-border'
                    }`}
                  />
                )}
              </div>

              {/* Content */}
              <div className="pb-6 pt-0.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={`text-sm font-semibold ${
                      isCompleted
                        ? 'text-primary'
                        : isActive
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {stage.label}
                  </p>
                  <span
                    className="urdu-data-text text-xs text-muted-foreground"
                    dir="rtl"
                  >
                    {stage.labelUr}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {stage.description}
                </p>
                {isActive && (
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1">
                    <Clock className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium text-primary">{countdown}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
