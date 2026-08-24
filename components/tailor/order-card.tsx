'use client';

import * as React from 'react';
import {
  Scissors,
  User,
  Clock,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Shirt,
  Sparkles,
  MessageSquare,
  Printer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GarmentOrder, Customer, Staff, OrderStatus } from '@/types/tailor';
import { Button } from '@/components/ui/button';

export interface OrderCardProps {
  order: GarmentOrder;
  customer?: Customer;
  assignedCutter?: Staff | null;
  assignedStitcher?: Staff | null;
  onAdvance?: (orderId: string) => void;
  onRollback?: (orderId: string) => void;
  onOpenWhatsApp?: (order: GarmentOrder) => void;
  onOpenPrint?: (order: GarmentOrder) => void;
  isAdvancing?: boolean;
  className?: string;
  compact?: boolean;
}

const GARMENT_LABELS: Record<string, { en: string; ur: string }> = {
  MEN_SHALWAR_KAMEEZ: { en: 'Shalwar Kameez', ur: 'مردانہ شلوار قمیض' },
  MEN_KURTA: { en: 'Men Kurta', ur: 'مردانہ کرتہ' },
  WAISTCOAT: { en: 'Waistcoat', ur: 'واسکٹ' },
  PRINCE_SUIT: { en: 'Prince Suit', ur: 'پرنس سوٹ' },
  TROUSER_SHIRT: { en: 'Trouser Shirt', ur: 'پینٹ شرٹ' },
  WOMEN_SUIT: { en: 'Ladies Suit', ur: 'زنانہ سوٹ' },
};

const STAGE_LABELS: Record<OrderStatus, string> = {
  BOOKED: 'Booked',
  FABRIC_RECEIVED: 'Fabric Received',
  IN_CUTTING: 'In Cutting',
  IN_STITCHING: 'In Stitching',
  KAJ_BUTTON: 'Kaj & Button',
  PRESSING: 'Pressing',
  READY_FOR_TRIAL: 'Ready for Trial',
  READY_FOR_DELIVERY: 'Ready for Delivery',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

/**
 * Calculates delivery urgency based on target delivery date vs current time.
 */
export function getDeliveryUrgency(deliveryDateStr: string): {
  urgency: 'safe' | 'warning' | 'critical';
  label: string;
  daysDiff: number;
} {
  const now = new Date();
  const delivery = new Date(deliveryDateStr);
  // Reset time portions for pure day comparisons
  const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const deliveryDateOnly = new Date(delivery.getFullYear(), delivery.getMonth(), delivery.getDate()).getTime();
  
  const diffDays = Math.round((deliveryDateOnly - nowDateOnly) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      urgency: 'critical',
      label: `${Math.abs(diffDays)}d overdue`,
      daysDiff: diffDays,
    };
  }
  if (diffDays === 0) {
    return {
      urgency: 'critical',
      label: 'Due Today',
      daysDiff: 0,
    };
  }
  if (diffDays === 1) {
    return {
      urgency: 'warning',
      label: 'Due Tomorrow',
      daysDiff: 1,
    };
  }
  if (diffDays === 2) {
    return {
      urgency: 'warning',
      label: 'Due in 2 days',
      daysDiff: 2,
    };
  }
  return {
    urgency: 'safe',
    label: `Due ${delivery.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
    daysDiff: diffDays,
  };
}

export function OrderCard({
  order,
  customer,
  assignedCutter,
  assignedStitcher,
  onAdvance,
  onRollback,
  onOpenWhatsApp,
  onOpenPrint,
  isAdvancing = false,
  className,
  compact = false,
}: OrderCardProps) {
  const urgencyInfo = getDeliveryUrgency(order.delivery_date);
  const garment = GARMENT_LABELS[order.garment_type] || { en: order.garment_type, ur: '' };

  const isTerminalCompleted = order.status === 'COMPLETED';
  const isTerminalBooked = order.status === 'BOOKED';

  // Fabric swatch color guessing or default
  const fabricColorName = order.fabric_color || 'Standard Fabric';
  const isEidRush = order.fabric_notes?.toLowerCase().includes('eid') || order.fabric_notes?.toLowerCase().includes('urgent');

  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 transition-all duration-200 hover:border-gold-primary/50 hover:shadow-md',
        urgencyInfo.urgency === 'critical' && !isTerminalCompleted && 'border-rose-500/40 bg-rose-950/10',
        className
      )}
    >
      {/* 1. Header: Order Number, Garment Qty, Delivery Deadline Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-semibold tracking-wider text-primary">
              #{order.order_number}
            </span>
            {isEidRush && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-medium text-amber-300 border border-amber-500/30">
                <Sparkles className="h-2.5 w-2.5" />
                Eid Rush
              </span>
            )}
          </div>
          <h4 className="mt-0.5 text-sm font-semibold text-foreground">
            {customer?.full_name || 'Walk-in Customer'}
          </h4>
          <span className="text-xs text-muted-foreground">
            {customer?.phone || 'No phone'}
          </span>
        </div>

        {/* Urgency Badge */}
        {!isTerminalCompleted ? (
          <div
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
              urgencyInfo.urgency === 'critical' &&
                'border-rose-500/50 bg-rose-500/10 text-rose-400 animate-pulse',
              urgencyInfo.urgency === 'warning' &&
                'border-amber-500/40 bg-amber-500/10 text-amber-400',
              urgencyInfo.urgency === 'safe' &&
                'border-border/80 bg-muted/30 text-muted-foreground'
            )}
          >
            {urgencyInfo.urgency === 'critical' ? (
              <AlertCircle className="h-3 w-3" />
            ) : urgencyInfo.urgency === 'warning' ? (
              <AlertTriangle className="h-3 w-3" />
            ) : (
              <Clock className="h-3 w-3" />
            )}
            <span>{urgencyInfo.label}</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1 rounded-full border border-status-ready/30 bg-status-ready/10 px-2 py-0.5 text-[11px] font-medium text-status-ready">
            <CheckCircle2 className="h-3 w-3" />
            <span>Delivered</span>
          </div>
        )}
      </div>

      {/* 2. Garment Details & Fabric */}
      <div className="mt-3 space-y-1.5 border-t border-border/40 pt-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 font-medium text-foreground">
            <Shirt className="h-3.5 w-3.5 text-muted-foreground" />
            {order.quantity}× {garment.en}
          </span>
          <span className="font-urdu-sans text-xs text-muted-foreground" dir="rtl">
            {garment.ur}
          </span>
        </div>

        {/* Fabric thumbnail & color tag */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-gold-primary/70 ring-1 ring-gold-primary/30" />
          <span className="truncate max-w-[200px]" title={fabricColorName}>
            {order.fabric_brand ? `${order.fabric_brand} • ` : ''}
            {fabricColorName}
          </span>
        </div>
      </div>

      {/* 3. Assigned Personnel */}
      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground bg-muted/20 p-2 rounded-lg border border-border/40">
        <div className="flex items-center gap-1" title="Master Cutter">
          <Scissors className="h-3 w-3 text-status-cutting" />
          <span className="truncate max-w-[90px]">
            {assignedCutter?.name || 'Unassigned'}
          </span>
        </div>
        <span className="text-border">•</span>
        <div className="flex items-center gap-1" title="Stitcher">
          <User className="h-3 w-3 text-status-stitching" />
          <span className="truncate max-w-[90px]">
            {assignedStitcher?.name || 'Unassigned'}
          </span>
        </div>
      </div>

      {/* 4. Financial Status */}
      <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-xs">
        <div>
          <span className="text-[11px] text-muted-foreground">Total: </span>
          <span className="font-mono font-medium text-foreground">
            Rs. {order.total_amount.toLocaleString()}
          </span>
        </div>

        {order.balance_due > 0 ? (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-amber-400/90 font-medium">Bal:</span>
            <span className="font-mono text-xs font-semibold text-rose-400">
              Rs. {order.balance_due.toLocaleString()}
            </span>
          </div>
        ) : (
          <span className="inline-flex items-center rounded-full bg-status-ready/15 px-2 py-0.5 text-[10px] font-semibold text-status-ready border border-status-ready/30">
            Fully Paid
          </span>
        )}
      </div>

      {/* 5. Stage Advance / Rollback / Print / WhatsApp Action Footer */}
      {(onAdvance || onRollback || onOpenWhatsApp || onOpenPrint) && (
        <div className="mt-3 flex items-center gap-1.5 border-t border-border/50 pt-2.5">
          {onRollback && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isTerminalBooked || isAdvancing}
              onClick={(e) => {
                e.stopPropagation();
                onRollback(order.id);
              }}
              title="Roll back stage"
              className="h-7 w-7 p-0 flex-shrink-0 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="sr-only">Rollback</span>
            </Button>
          )}

          {onOpenPrint && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onOpenPrint(order);
              }}
              title="Print 58mm Fabric Tag / 80mm Slip"
              className="h-7 w-7 p-0 flex-shrink-0 text-primary hover:text-primary hover:bg-primary/10"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="sr-only">Print Thermal Tag</span>
            </Button>
          )}

          {onOpenWhatsApp && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onOpenWhatsApp(order);
              }}
              title="WhatsApp Receipt & Alert"
              className="h-7 w-7 p-0 flex-shrink-0 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-950/30"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="sr-only">WhatsApp Receipt</span>
            </Button>
          )}

          <div className="flex-1 text-center">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              {STAGE_LABELS[order.status] || order.status}
            </span>
          </div>

          {onAdvance && (
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={isTerminalCompleted || isAdvancing}
              onClick={(e) => {
                e.stopPropagation();
                onAdvance(order.id);
              }}
              title="Advance to next stage"
              className="h-7 px-2.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-gold-hover"
            >
              <span>Advance</span>
              <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default OrderCard;
