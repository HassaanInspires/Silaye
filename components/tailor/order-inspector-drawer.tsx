'use client';

import * as React from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Printer,
  Copy,
  Check,
  Scissors,
  User,
  Phone,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PIPELINE_COLUMNS } from '@/components/tailor/pipeline-board';
import { getDeliveryUrgency } from '@/components/tailor/order-card';
import { useLanguage } from '@/lib/language-provider';
import type {
  GarmentOrder,
  Customer,
  Staff,
  OrderStatus,
  ShalwarKameezMeasurements,
  StylePreferences,
} from '@/types/tailor';

export interface OrderInspectorDrawerProps {
  open: boolean;
  onClose: () => void;
  order: GarmentOrder | null;
  customer?: Customer | null;
  assignedCutter?: Staff | null;
  assignedStitcher?: Staff | null;
  onAdvanceStage?: (orderId: string) => void;
  onRollbackStage?: (orderId: string) => void;
  onOpenWhatsApp?: (order: GarmentOrder) => void;
  onOpenPrint?: (order: GarmentOrder) => void;
}

const GARMENT_DISPLAY_NAMES: Record<string, { en: string; ur: string }> = {
  MEN_SHALWAR_KAMEEZ: { en: 'Men Shalwar Kameez', ur: 'مردانہ شلوار قمیض' },
  MEN_KURTA: { en: 'Men Kurta Trouser', ur: 'مردانہ کرتہ پاجامہ' },
  WAISTCOAT: { en: 'Waistcoat', ur: 'واسکٹ' },
  PRINCE_SUIT: { en: 'Prince Suit', ur: 'پرنس سوٹ' },
  TROUSER_SHIRT: { en: 'Trouser Shirt', ur: 'پینٹ شرٹ' },
  WOMEN_SUIT: { en: 'Ladies Suit', ur: 'زنانہ سوٹ' },
};

const STAGE_LABELS: Record<
  OrderStatus,
  { en: string; ur: string; variant: 'status-booked' | 'status-cutting' | 'status-stitching' | 'status-ready' | 'status-overdue' }
> = {
  BOOKED: { en: 'Booked', ur: 'بک شدہ', variant: 'status-booked' },
  FABRIC_RECEIVED: { en: 'Fabric Received', ur: 'کپڑا موصول', variant: 'status-booked' },
  IN_CUTTING: { en: 'In Cutting', ur: 'کٹائی جاری', variant: 'status-cutting' },
  IN_STITCHING: { en: 'In Stitching', ur: 'سلائی جاری', variant: 'status-stitching' },
  KAJ_BUTTON: { en: 'Kaj & Button', ur: 'کاج و بٹن', variant: 'status-stitching' },
  PRESSING: { en: 'Pressing', ur: 'استری و پیکنگ', variant: 'status-ready' },
  READY_FOR_TRIAL: { en: 'Ready for Trial', ur: 'ٹرائل تیار', variant: 'status-ready' },
  READY_FOR_DELIVERY: { en: 'Ready for Pickup', ur: 'ڈلیوری تیار', variant: 'status-ready' },
  COMPLETED: { en: 'Completed', ur: 'مکمل شدہ', variant: 'status-ready' },
  CANCELLED: { en: 'Cancelled', ur: 'منسوخ شدہ', variant: 'status-overdue' },
};

const STYLE_LABELS: Record<string, { en: string; ur: string }> = {
  // Collar
  FULL_BAN: { en: 'Full Ban', ur: 'مکمل بین' },
  HALF_BAN: { en: 'Half Ban', ur: 'ہاف بین' },
  SHERWANI_CUT: { en: 'Sherwani Collar', ur: 'شیروانی کٹ' },
  SHIRT_COLLAR: { en: 'Shirt Collar', ur: 'شرٹ کالر' },
  GOL_GALA: { en: 'Gol Gala', ur: 'گول گلا' },
  // Daman
  GOL_DAMAN: { en: 'Gol Daman', ur: 'گول دامن' },
  CHORAS_DAMAN: { en: 'Choras Daman', ur: 'چورس دامن' },
  // Pockets
  FRONT_CHEST: { en: 'Front Chest Pocket', ur: 'سامنے جیب' },
  LEFT_SIDE: { en: 'Left Side Pocket', ur: 'بائیں جیب' },
  RIGHT_SIDE: { en: 'Right Side Pocket', ur: 'دائیں جیب' },
  SECRET_ZIP: { en: 'Secret Mobile Zip', ur: 'موبائل زپ' },
  FRONT_ONLY: { en: 'Front Pocket Only', ur: 'صرف سامنے جیب' },
  FRONT_ONE_SIDE: { en: 'Front + 1 Side Pocket', ur: 'ایک طرف جیب' },
  FRONT_TWO_SIDES: { en: 'Front + 2 Side Pockets', ur: 'دونوں طرف جیب' },
  TWO_SIDES_NO_FRONT: { en: '2 Side Pockets', ur: 'سائیڈ جیبیں' },
  SECRET_ZIPPER_POCKET: { en: 'Secret Zipper Pocket', ur: 'موبائل زپ' },
  // Patti
  GUM_PATTI: { en: 'Gum Patti', ur: 'گم پٹی' },
  CHORI_PATTI: { en: 'Chori Patti', ur: 'چوڑی پٹی' },
  BAREEK_PATTI: { en: 'Bareek Patti', ur: 'باریک پٹی' },
  DOUBLE_STITCH: { en: 'Double Stitch Patti', ur: 'ڈبل سلائی پٹی' },
  // Bottom
  SHALWAR_TRADITIONAL: { en: 'Traditional Shalwar', ur: 'روایتی شلوار' },
  SHALWAR_POCKET: { en: 'Shalwar with Pocket', ur: 'جیب والی شلوار' },
  TROUSER_PANT_CUT: { en: 'Trouser Pant Cut', ur: 'پینٹ کٹ' },
  CHURIDAR: { en: 'Churidar', ur: 'چوڑی دار' },
  // Stitch
  SINGLE_KANDHA: { en: 'Single Kandha', ur: 'سنگل کندھا' },
  DOUBLE_SILAI: { en: 'Double Silai', ur: 'ڈبل سلائی' },
  OVERLOCK_FINISH: { en: 'Overlock Finish', ur: 'اوور لاک' },
  HAND_TAILORED_TURPAI: { en: 'Hand Turpai', ur: 'ہاتھ کی ترپائی' },
  // Cuff
  GOL_CUFF: { en: 'Gol Cuff', ur: 'گول کف' },
  CHORAS_CUFF: { en: 'Choras Cuff', ur: 'چورس کف' },
  OPEN_CUFF: { en: 'Open Cuff', ur: 'کھلا کف' },
};

function formatMeasurement(val?: number): string {
  if (val === undefined || val === null || val === 0) return '—';
  return `${val}"`;
}

export function OrderInspectorDrawer({
  open,
  onClose,
  order,
  customer,
  assignedCutter,
  assignedStitcher,
  onAdvanceStage,
  onRollbackStage,
  onOpenWhatsApp,
  onOpenPrint,
}: OrderInspectorDrawerProps) {
  const { language, dir, ordersQueueT } = useLanguage();
  const [copiedToken, setCopiedToken] = React.useState(false);

  // Close on Escape key press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !order) return null;

  const garment = GARMENT_DISPLAY_NAMES[order.garment_type] || {
    en: order.garment_type,
    ur: order.garment_type,
  };
  const stage = STAGE_LABELS[order.status] || {
    en: order.status,
    ur: order.status,
    variant: 'status-booked',
  };
  const urgency = getDeliveryUrgency(order.delivery_date);
  const isTerminalCompleted = order.status === 'COMPLETED';
  const isTerminalBooked = order.status === 'BOOKED' || order.status === 'FABRIC_RECEIVED';
  const isEidRush =
    order.fabric_notes?.toLowerCase().includes('eid') ||
    order.fabric_notes?.toLowerCase().includes('urgent');

  const measurements: ShalwarKameezMeasurements = order.snapshot_measurements || {
    kameez_length: 0,
    chest: 0,
    waist: 0,
    shoulder_teera: 0,
    sleeve_length: 0,
    neck_gala: 0,
    daman_width: 0,
    shalwar_length: 0,
    paincha: 0,
    aasan: 0,
  };

  const styles: Partial<StylePreferences> = order.snapshot_styles || {};

  const handleCopyToken = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(order.order_number);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  return (
    <>
      {/* 1. Backdrop Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 2. Right-Hand Slide-Out Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 z-50 w-full max-w-md bg-card/95 backdrop-blur-2xl border-border shadow-2xl p-5 sm:p-6 overflow-y-auto flex flex-col justify-between transition-transform duration-300 ease-out animate-in text-foreground",
          dir === 'rtl'
            ? 'left-0 border-r slide-in-from-left'
            : 'right-0 border-l slide-in-from-right'
        )}
        role="dialog"
        aria-modal="true"
        aria-label={`Order Details for #${order.order_number}`}
      >
        <div className="space-y-5">
          {/* =============================================================== */}
          {/* SECTION 1: HEADER & ORDER IDENTIFIERS                           */}
          {/* =============================================================== */}
          <div className="flex items-start justify-between border-b border-border pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyToken}
                  className="flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-2.5 py-1 text-xs font-mono font-bold text-gold hover:bg-gold/20 transition-colors cursor-pointer"
                  title={ordersQueueT.copyOrderToken}
                >
                  <bdi dir="ltr">#{order.order_number}</bdi>
                  {copiedToken ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <Copy className="h-3 w-3 opacity-70" />
                  )}
                </button>

                {isEidRush && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                    <Sparkles className="h-2.5 w-2.5" />
                    {ordersQueueT.eidRush}
                  </span>
                )}
              </div>

              <h2 className={cn("text-lg font-bold text-foreground tracking-tight", language === 'ur' ? 'font-urdu-serif' : '')}>
                {customer?.full_name || ordersQueueT.walkInCustomer}
              </h2>

              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                {customer?.phone ? (
                  <a
                    href={`tel:${customer.phone}`}
                    className="inline-flex items-center gap-1 hover:text-gold hover:underline"
                  >
                    <Phone className="h-3 w-3 text-muted-foreground/70" />
                    <bdi dir="ltr">{customer.phone}</bdi>
                  </a>
                ) : (
                  <span>{ordersQueueT.noPhone}</span>
                )}
                {customer?.city && (
                  <>
                    <span>•</span>
                    <span className="text-muted-foreground">{customer.city}</span>
                  </>
                )}
              </div>
            </div>

            {/* Clean Close Trigger */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40"
              aria-label="Close Inspector Drawer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* =============================================================== */}
          {/* SECTION 2: STAGE ADVANCE CONTROLLER                             */}
          {/* =============================================================== */}
          <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className={cn("text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", language === 'ur' ? 'font-urdu-serif' : '')}>
                {ordersQueueT.productionStage}
              </span>
              <Badge variant={stage.variant} className="text-xs px-2.5 py-0.5">
                {language === 'ur' ? stage.ur : stage.en}
              </Badge>
            </div>

            {/* Stage Advance / Rollback Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isTerminalBooked || !onRollbackStage}
                onClick={() => onRollbackStage?.(order.id)}
                className="gap-1 border-border bg-card hover:bg-muted/40 text-xs font-medium text-foreground disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />
                <span className={cn(language === 'ur' ? 'font-urdu-serif' : '')}>{ordersQueueT.previousStage}</span>
              </Button>

              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={isTerminalCompleted || !onAdvanceStage}
                onClick={() => onAdvanceStage?.(order.id)}
                className="gap-1 bg-gold text-neutral-950 hover:bg-gold-hover text-xs font-semibold shadow-xs disabled:opacity-40"
              >
                <span className={cn(language === 'ur' ? 'font-urdu-serif' : '')}>{ordersQueueT.advanceStage}</span>
                <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
              </Button>
            </div>

            {/* Delivery Urgency Strip */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50 text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-gold" />
                <span>{ordersQueueT.targetDelivery} <bdi dir="ltr">{order.delivery_date}</bdi></span>
              </span>
              <span
                className={cn(
                  'font-medium text-[11px] px-2 py-0.5 rounded-full border',
                  urgency.urgency === 'critical' &&
                    'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300 animate-pulse',
                  urgency.urgency === 'warning' &&
                    'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
                  urgency.urgency === 'safe' &&
                    'border-border bg-card text-muted-foreground'
                )}
              >
                {urgency.label}
              </span>
            </div>
          </div>

          {/* =============================================================== */}
          {/* SECTION 3: 3×3 MEASUREMENT MATRIX                               */}
          {/* =============================================================== */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className={cn("text-xs font-bold uppercase tracking-wider text-foreground", language === 'ur' ? 'font-urdu-serif' : '')}>
                  {ordersQueueT.measurementMatrixTitle}
                </span>
                <span className="text-[10px] text-gold font-mono">{ordersQueueT.inches}</span>
              </div>
            </div>

            {/* 3x3 Dense Grid */}
            <div className="grid grid-cols-3 gap-2">
              {/* 1. Kameez Length */}
              <div className="rounded-xl border border-border bg-card p-2.5 text-center shadow-2xs hover:border-gold/30 transition-colors">
                <span className={cn("block text-[10px] font-semibold text-muted-foreground", language === 'ur' ? 'font-urdu-serif' : '')}>
                  {ordersQueueT.length}
                </span>
                <span className="font-mono text-sm font-bold text-gold mt-1 block">
                  <bdi dir="ltr">{formatMeasurement(measurements.kameez_length)}</bdi>
                </span>
              </div>

              {/* 2. Chest */}
              <div className="rounded-xl border border-border bg-card p-2.5 text-center shadow-2xs hover:border-gold/30 transition-colors">
                <span className={cn("block text-[10px] font-semibold text-muted-foreground", language === 'ur' ? 'font-urdu-serif' : '')}>
                  {ordersQueueT.chest}
                </span>
                <span className="font-mono text-sm font-bold text-gold mt-1 block">
                  <bdi dir="ltr">{formatMeasurement(measurements.chest)}</bdi>
                </span>
              </div>

              {/* 3. Waist */}
              <div className="rounded-xl border border-border bg-card p-2.5 text-center shadow-2xs hover:border-gold/30 transition-colors">
                <span className={cn("block text-[10px] font-semibold text-muted-foreground", language === 'ur' ? 'font-urdu-serif' : '')}>
                  {ordersQueueT.waist}
                </span>
                <span className="font-mono text-sm font-bold text-gold mt-1 block">
                  <bdi dir="ltr">{formatMeasurement(measurements.waist)}</bdi>
                </span>
              </div>

              {/* 4. Shoulder (Teera) */}
              <div className="rounded-xl border border-border bg-card p-2.5 text-center shadow-2xs hover:border-gold/30 transition-colors">
                <span className={cn("block text-[10px] font-semibold text-muted-foreground", language === 'ur' ? 'font-urdu-serif' : '')}>
                  {ordersQueueT.shoulder}
                </span>
                <span className="font-mono text-sm font-bold text-gold mt-1 block">
                  <bdi dir="ltr">{formatMeasurement(measurements.shoulder_teera)}</bdi>
                </span>
              </div>

              {/* 5. Sleeve */}
              <div className="rounded-xl border border-border bg-card p-2.5 text-center shadow-2xs hover:border-gold/30 transition-colors">
                <span className={cn("block text-[10px] font-semibold text-muted-foreground", language === 'ur' ? 'font-urdu-serif' : '')}>
                  {ordersQueueT.sleeve}
                </span>
                <span className="font-mono text-sm font-bold text-gold mt-1 block">
                  <bdi dir="ltr">{formatMeasurement(measurements.sleeve_length)}</bdi>
                </span>
              </div>

              {/* 6. Neck (Gala) */}
              <div className="rounded-xl border border-border bg-card p-2.5 text-center shadow-2xs hover:border-gold/30 transition-colors">
                <span className={cn("block text-[10px] font-semibold text-muted-foreground", language === 'ur' ? 'font-urdu-serif' : '')}>
                  {ordersQueueT.neck}
                </span>
                <span className="font-mono text-sm font-bold text-gold mt-1 block">
                  <bdi dir="ltr">{formatMeasurement(measurements.neck_gala)}</bdi>
                </span>
              </div>

              {/* 7. Daman */}
              <div className="rounded-xl border border-border bg-card p-2.5 text-center shadow-2xs hover:border-gold/30 transition-colors">
                <span className={cn("block text-[10px] font-semibold text-muted-foreground", language === 'ur' ? 'font-urdu-serif' : '')}>
                  {ordersQueueT.daman}
                </span>
                <span className="font-mono text-sm font-bold text-gold mt-1 block">
                  <bdi dir="ltr">{formatMeasurement(measurements.daman_width)}</bdi>
                </span>
              </div>

              {/* 8. Shalwar Length */}
              <div className="rounded-xl border border-border bg-card p-2.5 text-center shadow-2xs hover:border-gold/30 transition-colors">
                <span className={cn("block text-[10px] font-semibold text-muted-foreground", language === 'ur' ? 'font-urdu-serif' : '')}>
                  {ordersQueueT.shalwarLength}
                </span>
                <span className="font-mono text-sm font-bold text-gold mt-1 block">
                  <bdi dir="ltr">{formatMeasurement(measurements.shalwar_length)}</bdi>
                </span>
              </div>

              {/* 9. Paincha */}
              <div className="rounded-xl border border-border bg-card p-2.5 text-center shadow-2xs hover:border-gold/30 transition-colors">
                <span className={cn("block text-[10px] font-semibold text-muted-foreground", language === 'ur' ? 'font-urdu-serif' : '')}>
                  {ordersQueueT.paincha}
                </span>
                <span className="font-mono text-sm font-bold text-gold mt-1 block">
                  <bdi dir="ltr">{formatMeasurement(measurements.paincha)}</bdi>
                </span>
              </div>
            </div>

            {/* Extra measurement specs row if available */}
            {(measurements.aasan || measurements.armhole_moodha) && (
              <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-card p-2.5 rounded-xl border border-border">
                {measurements.aasan && (
                  <span>
                    {ordersQueueT.aasan}: <bdi dir="ltr" className="font-mono text-foreground font-semibold">{formatMeasurement(measurements.aasan)}</bdi>
                  </span>
                )}
                {measurements.armhole_moodha && (
                  <span>
                    {ordersQueueT.moodha}: <bdi dir="ltr" className="font-mono text-foreground font-semibold">{formatMeasurement(measurements.armhole_moodha)}</bdi>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* =============================================================== */}
          {/* SECTION 4: FABRIC & GARMENT SPECS                               */}
          {/* =============================================================== */}
          <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className={cn("text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", language === 'ur' ? 'font-urdu-serif' : '')}>
                {ordersQueueT.garmentSpecs}
              </span>
              <span className="text-xs font-semibold text-foreground">
                <bdi dir="ltr">{order.quantity}×</bdi> {garment[language]}
              </span>
            </div>

            {/* Fabric Details */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-foreground">
                <span className="text-muted-foreground">{ordersQueueT.fabricBrandColor}</span>
                <span className="font-medium">
                  {order.fabric_brand ? `${order.fabric_brand} • ` : ''}
                  {order.fabric_color || ordersQueueT.standardFabric}
                </span>
              </div>
              <div className="flex items-center justify-between text-foreground">
                <span className="text-muted-foreground">{ordersQueueT.fabricSource}</span>
                <span className="font-medium text-gold">
                  {order.fabric_provided_by === 'CUSTOMER'
                    ? ordersQueueT.customerSupplied
                    : ordersQueueT.shopSupplied}
                </span>
              </div>
            </div>

            {/* Style Choices Chips */}
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/50">
              {styles.collar_style && (
                <span className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] text-foreground font-medium">
                  {STYLE_LABELS[styles.collar_style]?.[language] || styles.collar_style}
                </span>
              )}
              {styles.daman_style && (
                <span className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] text-foreground font-medium">
                  {STYLE_LABELS[styles.daman_style]?.[language] || styles.daman_style}
                </span>
              )}
              {styles.pockets && styles.pockets.length > 0 ? (
                styles.pockets.map((p) => (
                  <span
                    key={p}
                    className="rounded-lg border border-gold/30 bg-gold/10 px-2.5 py-1 text-[11px] text-gold font-medium"
                  >
                    {STYLE_LABELS[p]?.[language] || p}
                  </span>
                ))
              ) : styles.pocket_config ? (
                <span className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] text-foreground font-medium">
                  {STYLE_LABELS[styles.pocket_config]?.[language] || styles.pocket_config}
                </span>
              ) : null}
              {styles.front_patti && (
                <span className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] text-foreground font-medium">
                  {STYLE_LABELS[styles.front_patti]?.[language] || styles.front_patti}
                </span>
              )}
            </div>

            {/* Workshop Personnel Assignment */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/50">
              <div className="flex items-center gap-1.5">
                <Scissors className="h-3 w-3 text-gold" />
                <span>{ordersQueueT.cutter} {assignedCutter?.name || ordersQueueT.unassigned}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="h-3 w-3 text-gold" />
                <span>{ordersQueueT.stitcher} {assignedStitcher?.name || ordersQueueT.unassigned}</span>
              </div>
            </div>
          </div>

          {/* =============================================================== */}
          {/* SECTION 5: FINANCIALS & BILLING LEDGER                          */}
          {/* =============================================================== */}
          <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className={cn("text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", language === 'ur' ? 'font-urdu-serif' : '')}>
                {ordersQueueT.billingSettlement}
              </span>
            </div>

            <div className="space-y-1.5 text-xs border-b border-border/50 pb-2.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{ordersQueueT.stitchingCharges}</span>
                <span className="font-mono text-foreground font-semibold">
                  <bdi dir="ltr">Rs. {order.total_amount.toLocaleString()}</bdi>
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{ordersQueueT.advanceDeposit}</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  <bdi dir="ltr">- Rs. {order.advance_paid.toLocaleString()}</bdi>
                </span>
              </div>
            </div>

            {/* Net Balance Due */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-semibold text-foreground">{ordersQueueT.netBalanceDue}</span>
              {order.balance_due === 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>{ordersQueueT.paid} (<bdi dir="ltr">Rs. 0</bdi>)</span>
                </span>
              ) : (
                <span className="font-mono text-sm font-bold text-rose-600 dark:text-rose-400">
                  <bdi dir="ltr">Rs. {order.balance_due.toLocaleString()}</bdi>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* FOOTER ACTIONS (WhatsApp + Thermal Print + Tracking Link)          */}
        {/* ================================================================= */}
        <div className="pt-5 border-t border-border space-y-2.5 mt-5">
          <div className="grid grid-cols-2 gap-2.5">
            {/* WhatsApp Trigger */}
            <Button
              type="button"
              variant="default"
              size="md"
              onClick={() => onOpenWhatsApp?.(order)}
              className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-xs text-xs"
            >
              <MessageSquare className="h-4 w-4" />
              <span className={cn(language === 'ur' ? 'font-urdu-serif' : '')}>{ordersQueueT.whatsappInquiry}</span>
            </Button>

            {/* Print Thermal Slip Trigger */}
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => onOpenPrint?.(order)}
              className="gap-2 border-border bg-card hover:bg-muted/40 text-foreground font-semibold text-xs"
            >
              <Printer className="h-4 w-4 text-gold" />
              <span className={cn(language === 'ur' ? 'font-urdu-serif' : '')}>{ordersQueueT.printSlip}</span>
            </Button>
          </div>

          {/* Public Tracking Portal Link */}
          <a
            href={`/track/${order.order_number}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-center text-xs text-gold hover:text-gold-hover pt-1 transition-colors"
          >
            <span className={cn(language === 'ur' ? 'font-urdu-serif' : '')}>{ordersQueueT.openPublicTracker}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </>
  );
}

export default OrderInspectorDrawer;
