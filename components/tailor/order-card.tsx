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
import { useLanguage } from '@/lib/language-provider';
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

const STAGE_LABELS: Record<OrderStatus, { en: string; ur: string }> = {
  BOOKED: { en: 'Booked', ur: 'بک شدہ' },
  FABRIC_RECEIVED: { en: 'Fabric Received', ur: 'کپڑا موصول' },
  IN_CUTTING: { en: 'In Cutting', ur: 'کٹائی جاری' },
  IN_STITCHING: { en: 'In Stitching', ur: 'سلائی جاری' },
  KAJ_BUTTON: { en: 'Kaj & Button', ur: 'کاج و بٹن' },
  PRESSING: { en: 'Pressing', ur: 'استری و پیکنگ' },
  READY_FOR_TRIAL: { en: 'Ready for Trial', ur: 'ٹرائل تیار' },
  READY_FOR_DELIVERY: { en: 'Ready for Delivery', ur: 'ڈلیوری تیار' },
  COMPLETED: { en: 'Completed', ur: 'مکمل شدہ' },
  CANCELLED: { en: 'Cancelled', ur: 'منسوخ شدہ' },
};

/**
 * Calculates delivery urgency based on target delivery date vs current time.
 */
export function getDeliveryUrgency(deliveryDateStr: string, language: 'ur' | 'en' = 'en'): {
  urgency: 'safe' | 'warning' | 'critical';
  label: string;
  daysDiff: number;
} {
  if (!deliveryDateStr || isNaN(new Date(deliveryDateStr).getTime())) {
    return {
      urgency: 'safe',
      label: language === 'ur' ? 'تاریخ نامعلوم' : 'Date unassigned',
      daysDiff: 999,
    };
  }

  const now = new Date();
  const delivery = new Date(deliveryDateStr);
  // Reset time portions for pure day comparisons
  const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const deliveryDateOnly = new Date(delivery.getFullYear(), delivery.getMonth(), delivery.getDate()).getTime();
  
  const diffDays = Math.round((deliveryDateOnly - nowDateOnly) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      urgency: 'critical',
      label: language === 'ur' ? `${Math.abs(diffDays)} دن تاخیر` : `${Math.abs(diffDays)}d overdue`,
      daysDiff: diffDays,
    };
  }
  if (diffDays === 0) {
    return {
      urgency: 'critical',
      label: language === 'ur' ? 'آج ڈلیوری' : 'Due Today',
      daysDiff: 0,
    };
  }
  if (diffDays === 1) {
    return {
      urgency: 'warning',
      label: language === 'ur' ? 'کل ڈلیوری' : 'Due Tomorrow',
      daysDiff: 1,
    };
  }
  if (diffDays === 2) {
    return {
      urgency: 'warning',
      label: language === 'ur' ? '2 دن میں ڈلیوری' : 'Due in 2 days',
      daysDiff: 2,
    };
  }
  return {
    urgency: 'safe',
    label: language === 'ur'
      ? `ہدف ${delivery.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
      : `Due ${delivery.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
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
}: OrderCardProps) {
  const { language, ordersQueueT } = useLanguage();
  const urgencyInfo = getDeliveryUrgency(order.delivery_date, language);
  const garment = GARMENT_LABELS[order.garment_type] || { en: order.garment_type, ur: order.garment_type };
  const garmentName = language === 'ur' ? garment.ur : garment.en;

  const isTerminalCompleted = order.status === 'COMPLETED';
  const isTerminalBooked = order.status === 'BOOKED';

  // Fabric swatch color guessing or default
  const fabricColorName = order.fabric_color || ordersQueueT.standardFabric;
  const isEidRush = order.fabric_notes?.toLowerCase().includes('eid') || order.fabric_notes?.toLowerCase().includes('urgent');

  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 transition-all duration-200 hover:border-gold-primary/50 hover:shadow-md',
        urgencyInfo.urgency === 'critical' && !isTerminalCompleted && 'border-rose-500/40 bg-rose-500/10',
        className
      )}
    >
      {/* 1. Header: Order Number, Garment Qty, Delivery Deadline Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-semibold tracking-wider text-primary">
              <bdi dir="ltr">#{order.order_number}</bdi>
            </span>
            {isEidRush && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-medium text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <Sparkles className="h-2.5 w-2.5" />
                <span className={language === 'ur' ? "font-urdu-serif" : ""}>{ordersQueueT.eidRush}</span>
              </span>
            )}
          </div>
          <h4 className={cn("mt-0.5 text-sm font-semibold text-foreground truncate", language === 'ur' ? "font-urdu-serif" : "")}>
            <bdi dir="ltr">{customer?.full_name || ordersQueueT.walkInCustomer}</bdi>
          </h4>
          <span className="text-xs text-muted-foreground font-mono">
            {customer?.phone ? <bdi dir="ltr">{customer.phone}</bdi> : ordersQueueT.noPhone}
          </span>
        </div>

        {/* Urgency Badge */}
        {!isTerminalCompleted ? (
          <div
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap shrink-0',
              urgencyInfo.urgency === 'critical' &&
                'border-rose-500/50 bg-rose-500/15 text-rose-600 dark:text-rose-300 animate-pulse',
              urgencyInfo.urgency === 'warning' &&
                'border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300',
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
            <span className={language === 'ur' ? "font-urdu-serif" : ""}>{urgencyInfo.label}</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1 rounded-full border border-status-ready/30 bg-status-ready/10 px-2 py-0.5 text-[11px] font-medium text-status-ready shrink-0">
            <CheckCircle2 className="h-3 w-3" />
            <span className={language === 'ur' ? "font-urdu-serif" : ""}>{STAGE_LABELS.COMPLETED[language]}</span>
          </div>
        )}
      </div>

      {/* 2. Garment Details & Fabric */}
      <div className="mt-3 space-y-1.5 border-t border-border/40 pt-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className={cn("flex items-center gap-1 font-medium text-foreground", language === 'ur' ? "font-urdu-serif" : "")}>
            <Shirt className="h-3.5 w-3.5 text-muted-foreground" />
            <bdi dir="ltr">{order.quantity}×</bdi> {garmentName}
          </span>
        </div>

        {/* Fabric thumbnail & color tag */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-gold-primary/70 ring-1 ring-gold-primary/30 shrink-0" />
          <span className="truncate max-w-[220px]" title={fabricColorName} dir="ltr">
            {order.fabric_brand ? `${order.fabric_brand} • ` : ''}
            {fabricColorName}
          </span>
        </div>
      </div>

      {/* 3. Assigned Personnel */}
      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground bg-muted/20 p-2 rounded-lg border border-border/40">
        <div className="flex items-center gap-1" title="Master Cutter">
          <Scissors className="h-3 w-3 text-status-cutting shrink-0" />
          <span className="truncate max-w-[100px]">
            {assignedCutter?.name || ordersQueueT.unassignedCraftsman}
          </span>
        </div>
        <span className="text-border">•</span>
        <div className="flex items-center gap-1" title="Stitcher">
          <User className="h-3 w-3 text-status-stitching shrink-0" />
          <span className="truncate max-w-[100px]">
            {assignedStitcher?.name || ordersQueueT.unassignedCraftsman}
          </span>
        </div>
      </div>

      {/* 4. Financial Status */}
      <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-xs">
        <div>
          <span className={cn("text-[11px] text-muted-foreground", language === 'ur' ? "font-urdu-serif" : "")}>
            {ordersQueueT.totalLabel}{' '}
          </span>
          <bdi dir="ltr" className="font-mono font-medium text-foreground">
            Rs. {order.total_amount.toLocaleString()}
          </bdi>
        </div>

        {order.balance_due > 0 ? (
          <div className="flex items-center gap-1">
            <span className={cn("text-[10px] text-amber-700 dark:text-amber-400 font-medium", language === 'ur' ? "font-urdu-serif" : "")}>
              {ordersQueueT.balanceShort}
            </span>
            <bdi dir="ltr" className="font-mono text-xs font-semibold text-rose-600 dark:text-rose-400">
              Rs. {order.balance_due.toLocaleString()}
            </bdi>
          </div>
        ) : (
          <span className={cn("inline-flex items-center rounded-full bg-status-ready/15 px-2 py-0.5 text-[10px] font-semibold text-status-ready border border-status-ready/30", language === 'ur' ? "font-urdu-serif" : "")}>
            {ordersQueueT.fullyPaid}
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
              title={ordersQueueT.rollbackAction}
              className="h-7 w-7 p-0 flex-shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />
              <span className="sr-only">{ordersQueueT.rollbackAction}</span>
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
              title={ordersQueueT.printBtn}
              className="h-7 w-7 p-0 flex-shrink-0 text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="sr-only">{ordersQueueT.printBtn}</span>
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
              title={ordersQueueT.whatsappInquiry}
              className="h-7 w-7 p-0 flex-shrink-0 text-emerald-600 dark:text-emerald-500 hover:text-emerald-500 hover:bg-emerald-500/15 cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="sr-only">{ordersQueueT.whatsappInquiry}</span>
            </Button>
          )}

          <div className="flex-1 text-center">
            <span className={cn("text-[10px] uppercase tracking-wider font-semibold text-muted-foreground", language === 'ur' ? "font-urdu-serif" : "")}>
              {STAGE_LABELS[order.status]?.[language] || order.status}
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
              title={ordersQueueT.advanceAction}
              className="h-7 px-2.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-gold-hover cursor-pointer"
            >
              <span className={language === 'ur' ? "font-urdu-serif" : ""}>{ordersQueueT.advanceAction}</span>
              <ChevronRight className="h-3.5 w-3.5 ml-0.5 rtl:rotate-180" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default OrderCard;
