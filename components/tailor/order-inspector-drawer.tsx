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
  Clock,
  Shirt,
  Sparkles,
  ExternalLink,
  Calendar,
  Layers,
  Phone,
  MapPin,
  Tag,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PIPELINE_COLUMNS } from '@/components/tailor/pipeline-board';
import { getDeliveryUrgency } from '@/components/tailor/order-card';
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

const STAGE_LABELS: Record<OrderStatus, { en: string; ur: string; variant: 'status-booked' | 'status-cutting' | 'status-stitching' | 'status-ready' | 'status-overdue' }> = {
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

const STYLE_LABELS: Record<string, string> = {
  // Collar
  FULL_BAN: 'Full Ban (مکمل بین)',
  HALF_BAN: 'Half Ban (ہاف بین)',
  SHERWANI_CUT: 'Sherwani Collar (شیروانی کٹ)',
  SHIRT_COLLAR: 'Shirt Collar (شرٹ کالر)',
  GOL_GALA: 'Gol Gala (گول گلا)',
  // Daman
  GOL_DAMAN: 'Gol Daman (گول دامن)',
  CHORAS_DAMAN: 'Choras Daman (چورس دامن)',
  // Pockets
  FRONT_CHEST: 'Front Chest Pocket (سامنے جیب)',
  LEFT_SIDE: 'Left Side Pocket (بائیں جیب)',
  RIGHT_SIDE: 'Right Side Pocket (دائیں جیب)',
  SECRET_ZIP: 'Secret Mobile Zip (موبائل زپ)',
  FRONT_ONLY: 'Front Pocket Only (صرف سامنے جیب)',
  FRONT_ONE_SIDE: 'Front + 1 Side Pocket (ایک طرف جیب)',
  FRONT_TWO_SIDES: 'Front + 2 Side Pockets (دونوں طرف جیب)',
  TWO_SIDES_NO_FRONT: '2 Side Pockets (سائیڈ جیبیں)',
  SECRET_ZIPPER_POCKET: 'Secret Zipper Pocket (موبائل زپ)',
  // Patti
  GUM_PATTI: 'Gum Patti (گم پٹی)',
  CHORI_PATTI: 'Chori Patti (چوڑی پٹی)',
  BAREEK_PATTI: 'Bareek Patti (باریک پٹی)',
  DOUBLE_STITCH: 'Double Stitch Patti',
  // Bottom
  SHALWAR_TRADITIONAL: 'Traditional Shalwar (روایتی شلوار)',
  SHALWAR_POCKET: 'Shalwar with Pocket (جیب والی)',
  TROUSER_PANT_CUT: 'Trouser Pant Cut (پینٹ کٹ)',
  CHURIDAR: 'Churidar (چوڑی دار)',
  // Stitch
  SINGLE_KANDHA: 'Single Kandha (سنگل کندھا)',
  DOUBLE_SILAI: 'Double Silai (ڈبل سلائی)',
  OVERLOCK_FINISH: 'Overlock Finish',
  HAND_TAILORED_TURPAI: 'Hand Turpai (ہاتھ کی ترپائی)',
  // Cuff
  GOL_CUFF: 'Gol Cuff (گول کف)',
  CHORAS_CUFF: 'Choras Cuff (چورس کف)',
  OPEN_CUFF: 'Open Cuff (کھلا کف)',
};

function formatMeasurement(val?: number): string {
  if (val === undefined || val === null) return '—';
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
    ur: '',
  };
  const stage = STAGE_LABELS[order.status] || {
    en: order.status,
    ur: '',
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
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 2. Right-Hand Slide-Out Drawer */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0F1115]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl p-6 overflow-y-auto flex flex-col justify-between transition-transform duration-300 ease-out animate-in slide-in-from-right"
        role="dialog"
        aria-modal="true"
        aria-label={`Order Details for #${order.order_number}`}
      >
        <div className="space-y-6">
          {/* =============================================================== */}
          {/* SECTION 1: HEADER & ORDER IDENTIFIERS                           */}
          {/* =============================================================== */}
          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyToken}
                  className="flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-2.5 py-1 text-xs font-mono font-bold text-gold hover:bg-gold/20 transition-colors"
                  title="Copy Order Token"
                >
                  <span>#{order.order_number}</span>
                  {copiedToken ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3 opacity-70" />
                  )}
                </button>

                {isEidRush && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    <Sparkles className="h-2.5 w-2.5" />
                    Eid Rush
                  </span>
                )}
              </div>

              <h2 className="text-lg font-bold text-white tracking-tight">
                {customer?.full_name || 'Walk-in Customer'}
              </h2>
              <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                <Phone className="h-3 w-3 text-gray-500" />
                <span>{customer?.phone || 'No phone'}</span>
                {customer?.city && (
                  <>
                    <span>•</span>
                    <span className="text-gray-400">{customer.city}</span>
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
              className="h-8 w-8 p-0 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              aria-label="Close Inspector Drawer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* =============================================================== */}
          {/* SECTION 2: STAGE ADVANCE CONTROLLER                             */}
          {/* =============================================================== */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Production Stage
              </span>
              <div className="flex items-center gap-1.5">
                <Badge variant={stage.variant} className="text-xs px-2.5 py-0.5">
                  {stage.en}
                </Badge>
                <span className="font-urdu-sans text-xs text-gray-400" dir="rtl">
                  {stage.ur}
                </span>
              </div>
            </div>

            {/* Stage Advance / Rollback Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isTerminalBooked || !onRollbackStage}
                onClick={() => onRollbackStage?.(order.id)}
                className="gap-1 border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Previous Stage</span>
              </Button>

              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={isTerminalCompleted || !onAdvanceStage}
                onClick={() => onAdvanceStage?.(order.id)}
                className="gap-1 bg-gold text-[#0B0C0E] hover:bg-gold-hover text-xs font-semibold shadow-[0_0_15px_rgba(212,175,55,0.2)] disabled:opacity-40"
              >
                <span>Advance Stage</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Delivery Urgency Strip */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5 text-gray-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-gold" />
                <span>Target: {order.delivery_date}</span>
              </span>
              <span
                className={cn(
                  'font-medium text-[11px] px-2 py-0.5 rounded-full border',
                  urgency.urgency === 'critical' &&
                    'border-rose-500/40 bg-rose-500/10 text-rose-300 animate-pulse',
                  urgency.urgency === 'warning' &&
                    'border-amber-500/40 bg-amber-500/10 text-amber-300',
                  urgency.urgency === 'safe' &&
                    'border-white/10 bg-white/5 text-gray-300'
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
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-300">
                  3×3 Measurement Matrix
                </span>
                <span className="text-[10px] text-gold font-mono">(Inches)</span>
              </div>
              <span className="font-urdu-serif text-xs text-gold/80" dir="rtl">
                پیمائش کا نقشہ
              </span>
            </div>

            {/* 3x3 Dense Grid */}
            <div className="grid grid-cols-3 gap-2">
              {/* 1. Kameez Length */}
              <div className="rounded-xl border border-white/10 bg-[#141619] p-2.5 text-center shadow-xs">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Length
                </span>
                <span className="font-urdu-sans text-[10px] text-gray-500 block leading-tight" dir="rtl">
                  لمبائی
                </span>
                <span className="font-mono text-sm font-bold text-gold mt-1 block">
                  <bdi dir="ltr">{formatMeasurement(measurements.kameez_length)}</bdi>
                </span>
              </div>

              {/* 2. Chest */}
              <div className="rounded-xl border border-white/10 bg-[#141619] p-2.5 text-center shadow-xs">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Chest
                </span>
                <span className="font-urdu-sans text-[10px] text-gray-500 block leading-tight" dir="rtl">
                  چھاتی
                </span>
                <span className="font-mono text-sm font-bold text-gold mt-1 block">
                  <bdi dir="ltr">{formatMeasurement(measurements.chest)}</bdi>
                </span>
              </div>

              {/* 3. Waist */}
              <div className="rounded-xl border border-white/10 bg-[#141619] p-2.5 text-center shadow-xs">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Waist
                </span>
                <span className="font-urdu-sans text-[10px] text-gray-500 block leading-tight" dir="rtl">
                  کمر
                </span>
                <span className="font-mono text-sm font-bold text-gold mt-1 block">
                  <bdi dir="ltr">{formatMeasurement(measurements.waist)}</bdi>
                </span>
              </div>

              {/* 4. Shoulder (Teera) */}
              <div className="rounded-xl border border-white/10 bg-[#141619] p-2.5 text-center shadow-xs">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Shoulder
                </span>
                <span className="font-urdu-sans text-[10px] text-gray-500 block leading-tight" dir="rtl">
                  تیرا
                </span>
                <span className="font-mono text-sm font-bold text-gold mt-1 block">
                  <bdi dir="ltr">{formatMeasurement(measurements.shoulder_teera)}</bdi>
                </span>
              </div>

              {/* 5. Sleeve */}
              <div className="rounded-xl border border-white/10 bg-[#141619] p-2.5 text-center shadow-xs">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Sleeve
                </span>
                <span className="font-urdu-sans text-[10px] text-gray-500 block leading-tight" dir="rtl">
                  بازو
                </span>
                <span className="font-mono text-sm font-bold text-gold mt-1 block">
                  <bdi dir="ltr">{formatMeasurement(measurements.sleeve_length)}</bdi>
                </span>
              </div>

              {/* 6. Neck (Gala) */}
              <div className="rounded-xl border border-white/10 bg-[#141619] p-2.5 text-center shadow-xs">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Neck
                </span>
                <span className="font-urdu-sans text-[10px] text-gray-500 block leading-tight" dir="rtl">
                  گلا
                </span>
                <span className="font-mono text-sm font-bold text-gold mt-1 block">
                  <bdi dir="ltr">{formatMeasurement(measurements.neck_gala)}</bdi>
                </span>
              </div>

              {/* 7. Daman */}
              <div className="rounded-xl border border-white/10 bg-[#141619] p-2.5 text-center shadow-xs">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Daman
                </span>
                <span className="font-urdu-sans text-[10px] text-gray-500 block leading-tight" dir="rtl">
                  دامن
                </span>
                <span className="font-mono text-sm font-bold text-gold mt-1 block">
                  <bdi dir="ltr">{formatMeasurement(measurements.daman_width)}</bdi>
                </span>
              </div>

              {/* 8. Shalwar Length */}
              <div className="rounded-xl border border-white/10 bg-[#141619] p-2.5 text-center shadow-xs">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Shalwar L.
                </span>
                <span className="font-urdu-sans text-[10px] text-gray-500 block leading-tight" dir="rtl">
                  شلوار
                </span>
                <span className="font-mono text-sm font-bold text-gold mt-1 block">
                  <bdi dir="ltr">{formatMeasurement(measurements.shalwar_length)}</bdi>
                </span>
              </div>

              {/* 9. Paincha */}
              <div className="rounded-xl border border-white/10 bg-[#141619] p-2.5 text-center shadow-xs">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Paincha
                </span>
                <span className="font-urdu-sans text-[10px] text-gray-500 block leading-tight" dir="rtl">
                  پائینچہ
                </span>
                <span className="font-mono text-sm font-bold text-gold mt-1 block">
                  <bdi dir="ltr">{formatMeasurement(measurements.paincha)}</bdi>
                </span>
              </div>
            </div>

            {/* Extra measurement specs row if available */}
            {(measurements.aasan || measurements.armhole_moodha) && (
              <div className="flex items-center justify-between text-[11px] text-gray-400 bg-white/[0.02] p-2 rounded-xl border border-white/5">
                {measurements.aasan && (
                  <span>
                    Aasan (آسن): <bdi dir="ltr" className="font-mono text-gray-200">{formatMeasurement(measurements.aasan)}</bdi>
                  </span>
                )}
                {measurements.armhole_moodha && (
                  <span>
                    Moodha (موڈھا): <bdi dir="ltr" className="font-mono text-gray-200">{formatMeasurement(measurements.armhole_moodha)}</bdi>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* =============================================================== */}
          {/* SECTION 4: FABRIC & GARMENT SPECS                               */}
          {/* =============================================================== */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Garment & Style Specs
              </span>
              <span className="text-xs font-semibold text-gray-200">
                <bdi dir="ltr">{order.quantity}x</bdi> {garment.en}
              </span>
            </div>

            {/* Fabric Details */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-gray-300">
                <span className="text-gray-400">Fabric Brand & Color:</span>
                <span className="font-medium text-white">
                  {order.fabric_brand ? `${order.fabric_brand} • ` : ''}
                  {order.fabric_color || 'Standard Fabric'}
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-300">
                <span className="text-gray-400">Fabric Source:</span>
                <span className="font-medium text-gold">
                  {order.fabric_provided_by === 'CUSTOMER'
                    ? 'Customer Supplied (گاہک کا اپنا)'
                    : 'Shop In-Stock (دکان کا مال)'}
                </span>
              </div>
            </div>

            {/* Style Choices Chips */}
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
              {styles.collar_style && (
                <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-gray-300">
                  {STYLE_LABELS[styles.collar_style] || styles.collar_style}
                </span>
              )}
              {styles.daman_style && (
                <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-gray-300">
                  {STYLE_LABELS[styles.daman_style] || styles.daman_style}
                </span>
              )}
              {styles.pockets && styles.pockets.length > 0 ? (
                styles.pockets.map((p) => (
                  <span
                    key={p}
                    className="rounded-lg border border-gold/30 bg-gold/10 px-2 py-1 text-[11px] text-gold"
                  >
                    {STYLE_LABELS[p] || p}
                  </span>
                ))
              ) : styles.pocket_config ? (
                <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-gray-300">
                  {STYLE_LABELS[styles.pocket_config] || styles.pocket_config}
                </span>
              ) : null}
              {styles.front_patti && (
                <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-gray-300">
                  {STYLE_LABELS[styles.front_patti] || styles.front_patti}
                </span>
              )}
            </div>

            {/* Workshop Personnel Assignment */}
            <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-white/5">
              <div className="flex items-center gap-1.5">
                <Scissors className="h-3 w-3 text-status-cutting" />
                <span>Cutter: {assignedCutter?.name || 'Unassigned'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="h-3 w-3 text-status-stitching" />
                <span>Stitcher: {assignedStitcher?.name || 'Unassigned'}</span>
              </div>
            </div>
          </div>

          {/* =============================================================== */}
          {/* SECTION 5: FINANCIALS & BILLING LEDGER                          */}
          {/* =============================================================== */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Financial Settlement
              </span>
              <span className="font-urdu-serif text-xs text-gold/80" dir="rtl">
                بل و حساب کتاب
              </span>
            </div>

            <div className="space-y-1.5 text-xs border-b border-white/5 pb-2.5">
              <div className="flex items-center justify-between text-gray-400">
                <span>Stitching & Charges:</span>
                <span className="font-mono text-gray-200">
                  <bdi dir="ltr">Rs. {order.total_amount.toLocaleString()}</bdi>
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-400">
                <span>Advance Deposit Paid:</span>
                <span className="font-mono text-emerald-400">
                  <bdi dir="ltr">- Rs. {order.advance_paid.toLocaleString()}</bdi>
                </span>
              </div>
            </div>

            {/* Net Balance Due */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-semibold text-gray-300">Balance Due:</span>
              {order.balance_due === 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Fully Paid (<bdi dir="ltr">Rs. 0</bdi>)</span>
                </span>
              ) : (
                <span className="font-mono text-sm font-bold text-rose-400">
                  <bdi dir="ltr">Rs. {order.balance_due.toLocaleString()}</bdi>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* FOOTER ACTIONS (WhatsApp + Thermal Print + Tracking Link)          */}
        {/* ================================================================= */}
        <div className="pt-6 border-t border-white/10 space-y-2.5 mt-6">
          <div className="grid grid-cols-2 gap-2.5">
            {/* WhatsApp Trigger */}
            <Button
              type="button"
              variant="default"
              size="md"
              onClick={() => onOpenWhatsApp?.(order)}
              className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-[0_0_15px_rgba(16,185,129,0.2)] text-xs"
            >
              <MessageSquare className="h-4 w-4" />
              <span>WhatsApp</span>
            </Button>

            {/* Print Thermal Slip Trigger */}
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => onOpenPrint?.(order)}
              className="gap-2 border-white/15 bg-white/5 hover:bg-white/10 text-gray-200 font-semibold text-xs"
            >
              <Printer className="h-4 w-4 text-gold" />
              <span>Print Slip</span>
            </Button>
          </div>

          {/* Public Tracking Portal Link */}
          <a
            href={`/track/${order.order_number}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-center text-xs text-gold hover:text-gold-hover pt-1 transition-colors"
          >
            <span>Open Public Customer Tracker</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </>
  );
}

export default OrderInspectorDrawer;
