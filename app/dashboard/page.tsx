'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Scissors,
  Clock,
  AlertTriangle,
  Wallet,
  PlusCircle,
  Search,
  Printer,
  ChevronRight,
  MessageSquare,
  Sparkles,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  CheckCircle,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PIPELINE_COLUMNS } from '@/components/tailor/pipeline-board';
import { getDeliveryUrgency } from '@/components/tailor/order-card';
import { WhatsAppReceiptModal } from '@/components/tailor/whatsapp-receipt-modal';
import { ThermalSlipModal } from '@/components/tailor/thermal-slip-modal';
import { ordersDb, customersDb, shopsDb } from '@/lib/db';
import { isDemoMode, mockShop as defaultMockShop } from '@/lib/mock-data';
import { useLanguage } from '@/lib/language-provider';
import type { GarmentOrder, Customer, Shop, OrderStatus } from '@/types/tailor';


// ---------------------------------------------------------------------------
// Helper Mappings
// ---------------------------------------------------------------------------

const GARMENT_DISPLAY_NAMES: Record<string, string> = {
  MEN_SHALWAR_KAMEEZ: 'Men Shalwar Kameez',
  MEN_KURTA: 'Men Kurta Trouser',
  WAISTCOAT: 'Waistcoat',
  PRINCE_SUIT: 'Prince Suit',
  TROUSER_SHIRT: 'Trouser Shirt',
  WOMEN_SUIT: 'Ladies Suit',
};

const STAGE_BADGE_CONFIG: Record<
  OrderStatus,
  { label: string; labelUrdu: string; variant: 'status-booked' | 'status-cutting' | 'status-stitching' | 'status-ready' | 'status-overdue' }
> = {
  BOOKED: { label: 'Booked', labelUrdu: 'بک شدہ', variant: 'status-booked' },
  FABRIC_RECEIVED: { label: 'Fabric In', labelUrdu: 'کپڑا موصول', variant: 'status-booked' },
  IN_CUTTING: { label: 'In Cutting', labelUrdu: 'کٹائی جاری', variant: 'status-cutting' },
  IN_STITCHING: { label: 'In Stitching', labelUrdu: 'سلائی جاری', variant: 'status-stitching' },
  KAJ_BUTTON: { label: 'Kaj & Button', labelUrdu: 'کاج و بٹن', variant: 'status-stitching' },
  PRESSING: { label: 'Pressing', labelUrdu: 'استری و پیکنگ', variant: 'status-ready' },
  READY_FOR_TRIAL: { label: 'Trial Ready', labelUrdu: 'ٹرائل تیار', variant: 'status-ready' },
  READY_FOR_DELIVERY: { label: 'Ready for Pickup', labelUrdu: 'ڈلیوری تیار', variant: 'status-ready' },
  COMPLETED: { label: 'Completed', labelUrdu: 'مکمل شدہ', variant: 'status-ready' },
  CANCELLED: { label: 'Cancelled', labelUrdu: 'منسوخ شدہ', variant: 'status-overdue' },
};

export default function DashboardPage() {
  const { language, dir, t } = useLanguage();
  const [orders, setOrders] = React.useState<GarmentOrder[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);

  const [shop, setShop] = React.useState<Shop | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  // Modal states for 1-click interactions
  const [whatsAppModalOpen, setWhatsAppModalOpen] = React.useState<boolean>(false);
  const [selectedWhatsAppOrder, setSelectedWhatsAppOrder] = React.useState<GarmentOrder | null>(null);

  const [printModalOpen, setPrintModalOpen] = React.useState<boolean>(false);
  const [selectedPrintOrder, setSelectedPrintOrder] = React.useState<GarmentOrder | null>(null);

  // Live repository initialization
  React.useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      setIsLoading(true);
      try {
        let currentShop: Shop | null = null;
        try {
          currentShop = await shopsDb.getCurrentShop();
        } catch (shopErr) {
          console.warn('Dashboard shop resolution notice:', shopErr);
        }

        if (!isMounted) return;
        setShop(currentShop || defaultMockShop);

        const targetShopId = currentShop?.id || defaultMockShop.id;
        let loadedOrders: GarmentOrder[] = [];
        let loadedCustomers: Customer[] = [];

        try {
          const results = await Promise.allSettled([
            ordersDb.getByShopId(targetShopId),
            customersDb.getByShopId(targetShopId),
          ]);

          if (results[0].status === 'fulfilled' && Array.isArray(results[0].value)) {
            loadedOrders = results[0].value;
          } else if (results[0].status === 'rejected') {
            console.warn('Orders query handled fallback:', results[0].reason);
          }

          if (results[1].status === 'fulfilled' && Array.isArray(results[1].value)) {
            loadedCustomers = results[1].value;
          } else if (results[1].status === 'rejected') {
            console.warn('Customers query handled fallback:', results[1].reason);
          }
        } catch (dataErr) {
          console.warn('Dashboard repository settled notice:', dataErr);
        }

        if (isMounted) {
          setOrders(loadedOrders);
          setCustomers(loadedCustomers);
        }
      } catch (err) {
        console.warn('Dashboard top-level data fetch error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Customer map lookup
  const customerMap = React.useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach((c) => map.set(c.id, c));
    return map;
  }, [customers]);

  // Today ISO date string (YYYY-MM-DD)
  const todayStr = React.useMemo(() => new Date().toISOString().split('T')[0], []);

  // Derived KPI Calculations
  const activeOrders = React.useMemo(() => {
    return orders.filter((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
  }, [orders]);

  const activeOrdersValue = React.useMemo(() => {
    return activeOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  }, [activeOrders]);

  const inCutCount = React.useMemo(() => {
    return orders.filter((o) => o.status === 'IN_CUTTING').length;
  }, [orders]);

  const inStitchCount = React.useMemo(() => {
    return orders.filter((o) => o.status === 'IN_STITCHING').length;
  }, [orders]);

  const dueTodayOrders = React.useMemo(() => {
    return activeOrders.filter((o) => o.delivery_date === todayStr);
  }, [activeOrders, todayStr]);

  const dueTodayValue = React.useMemo(() => {
    return dueTodayOrders.reduce((sum, o) => sum + (o.balance_due || 0), 0);
  }, [dueTodayOrders]);

  const overdueOrders = React.useMemo(() => {
    return activeOrders.filter((o) => o.delivery_date < todayStr);
  }, [activeOrders, todayStr]);

  const overdueValue = React.useMemo(() => {
    return overdueOrders.reduce((sum, o) => sum + (o.balance_due || 0), 0);
  }, [overdueOrders]);

  const unsettledKhataTotal = React.useMemo(() => {
    return customers
      .filter((c) => (c.current_khata_balance || 0) > 0)
      .reduce((sum, c) => sum + c.current_khata_balance, 0);
  }, [customers]);

  const debtorsCount = React.useMemo(() => {
    return customers.filter((c) => (c.current_khata_balance || 0) > 0).length;
  }, [customers]);

  const inProgressCount = React.useMemo(() => {
    return orders.filter((o) =>
      ['IN_CUTTING', 'IN_STITCHING', 'KAJ_BUTTON', 'PRESSING'].includes(o.status)
    ).length;
  }, [orders]);

  const readyOrders = React.useMemo(() => {
    return orders.filter(
      (o) => o.status === 'READY_FOR_DELIVERY' || o.status === 'READY_FOR_TRIAL'
    );
  }, [orders]);

  // Urgent Orders List (Due today, tomorrow, or in progress)
  const urgentOrders = React.useMemo(() => {
    return activeOrders.slice(0, 5);
  }, [activeOrders]);

  const handleOpenWhatsApp = (order: GarmentOrder) => {
    setSelectedWhatsAppOrder(order);
    setWhatsAppModalOpen(true);
  };

  const handleOpenPrint = (order: GarmentOrder) => {
    setSelectedPrintOrder(order);
    setPrintModalOpen(true);
  };

  const handleFocusSearch = () => {
    const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement | null;
    if (searchInput) {
      searchInput.focus();
      searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Advance order to next stage in pipeline for mobile feed
  const handleSingleOrderAdvance = (orderId: string) => {
    const currentOrder = orders.find((o) => o.id === orderId);
    if (!currentOrder || currentOrder.status === 'COMPLETED') return;

    const currentCol = PIPELINE_COLUMNS.find((col) =>
      col.statuses.includes(currentOrder.status)
    );
    if (!currentCol) return;

    const nextStatus = currentCol.nextStatus;
    if (nextStatus === currentOrder.status) return;

    const updatedOrder: GarmentOrder = {
      ...currentOrder,
      status: nextStatus,
      actual_delivery_date:
        nextStatus === 'COMPLETED' ? new Date().toISOString() : currentOrder.actual_delivery_date,
      updated_at: new Date().toISOString(),
    };

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? updatedOrder : o))
    );

    // Persist status change
    ordersDb.updateStatus(orderId, nextStatus).catch((err) => {
      console.warn('Failed to persist status change:', err);
    });
  };

  const getNextStatusInfo = (currentStatus: OrderStatus) => {
    const currentCol = PIPELINE_COLUMNS.find((col) =>
      col.statuses.includes(currentStatus)
    );
    if (!currentCol || currentCol.nextStatus === currentStatus || currentStatus === 'COMPLETED') {
      return null;
    }
    const nextCol = PIPELINE_COLUMNS.find((col) => col.statuses.includes(currentCol.nextStatus));
    return {
      nextStatus: currentCol.nextStatus,
      labelUrdu: nextCol ? `${nextCol.labelUrdu} →` : 'اگلا مرحلہ →',
      labelEn: nextCol ? nextCol.label : 'Advance',
    };
  };

  return (
    <AppShell activeRoute="/dashboard">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* ================================================================ */}
        {/* MOBILE VIEWPORT ONLY (md:hidden)                                 */}
        {/* ================================================================ */}
        <div className="block md:hidden space-y-3">
          {/* Block 1: Glance Strip with Tactile Border & Tonal Indicators */}
          <div className="h-16 rounded-2xl border border-border bg-card px-2.5 sm:px-4 flex items-center justify-between shadow-sm">
            {/* Ready for Pickup */}
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className={cn('text-[10px] sm:text-[11px] font-bold text-emerald-700 dark:text-emerald-300 leading-tight truncate', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                  {t.readySuits}
                </span>
                <span className="font-mono text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 truncate leading-none mt-0.5">
                  {readyOrders.length}
                </span>
              </div>
            </div>

            <div className="h-7 w-px bg-border/60 shrink-0 mx-1" />

            {/* Suits in Progress */}
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 shrink-0">
                <Scissors className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className={cn('text-[10px] sm:text-[11px] font-bold text-sky-700 dark:text-sky-300 leading-tight truncate', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                  {t.workshopActive}
                </span>
                <span className="font-mono text-sm sm:text-base font-bold text-sky-600 dark:text-sky-400 truncate leading-none mt-0.5">
                  {inProgressCount}
                </span>
              </div>
            </div>

            <div className="h-7 w-px bg-border/60 shrink-0 mx-1" />

            {/* Total Udhaar Collectible */}
            <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0">
                <Wallet className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-col items-end min-w-0">
                <span className={cn('text-[10px] sm:text-[11px] font-bold text-rose-700 dark:text-rose-300 leading-tight truncate', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                  {t.unsettledKhata}
                </span>
                <span className="font-mono text-sm sm:text-base font-bold text-rose-600 dark:text-rose-400 truncate max-w-[90px] leading-none mt-0.5">
                  Rs.{(unsettledKhataTotal ?? 0) >= 10000 ? `${((unsettledKhataTotal ?? 0) / 1000).toFixed(1)}k` : (unsettledKhataTotal ?? 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Block 2: Two 56px Thumb Buttons */}
          <div className="grid grid-cols-2 gap-2.5 mt-3">
            {/* Primary Gold: Book New Suit */}
            <Link
              href="/orders/new"
              className="w-full h-14 rounded-2xl bg-gold hover:bg-gold-hover text-[#18181B] font-bold shadow-[0_4px_16px_rgba(197,154,63,0.3)] active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-0.5 px-2 cursor-pointer border border-gold/40 block"
            >
              <div className="flex items-center gap-1.5">
                <PlusCircle className="h-4 w-4 text-[#18181B] shrink-0" />
                <span className={cn('text-xs font-bold leading-tight', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                  {t.bookNewSuit}
                </span>
              </div>
              <span className={cn('text-[10px] font-semibold text-[#18181B]/80', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                {t.bookNewSuitSub}
              </span>
            </Link>

            {/* Ghost Outline: Search Parchi */}
            <Link
              href="/orders"
              className="w-full h-14 rounded-2xl border border-border bg-card hover:bg-muted/50 text-foreground font-semibold shadow-sm active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-0.5 px-2 backdrop-blur-md cursor-pointer block"
            >
              <div className="flex items-center gap-1.5">
                <Search className="h-4 w-4 text-gold shrink-0" />
                <span className={cn('text-xs font-bold leading-tight text-foreground', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                  {t.searchParchi}
                </span>
              </div>
              <span className={cn('text-[10px] text-muted-foreground font-medium', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                {t.searchParchiSub}
              </span>
            </Link>
          </div>

          {/* Block 2.5: Digital Naap Register & Saved Sizing Quick Access Card */}
          <Link href="/customers" className="block mt-2.5" data-testid="dashboard-customers-register-card">
            <div className="rounded-2xl border border-gold/30 bg-card p-3 shadow-xs hover:border-gold/50 active:scale-[0.99] transition-all flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 border border-gold/30 text-gold shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={cn('text-xs font-bold text-foreground truncate', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                      {t.naapRegisterTitle}
                    </span>
                    <span className="rounded-full bg-gold/15 text-gold border border-gold/30 px-1.5 py-0.2 text-[9px] font-bold shrink-0">
                      <bdi dir="ltr">{customers.length}</bdi>
                    </span>
                  </div>
                  <span className={cn('text-[10px] text-muted-foreground truncate leading-tight mt-0.5', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                    {t.naapRegisterSub}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-gold font-bold text-xs shrink-0 font-urdu-sans">
                <span>{t.openRegister}</span>
                <ChevronRight className={cn('h-4 w-4 transition-transform', dir === 'rtl' ? 'rotate-180' : '')} />
              </div>
            </div>
          </Link>

          {/* Block 3: Vertical Urgent Deliveries Feed */}
          <div className="space-y-3 mt-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className={cn('text-sm font-bold text-foreground', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                  {t.urgentDeliveries}
                </span>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold text-amber-600 dark:text-amber-300">
                  {t.urgentBadge}
                </span>
              </div>
              <Link
                href="/orders"
                className="inline-flex items-center gap-1 text-xs text-gold font-medium h-8 px-2.5 rounded-xl border border-gold/20 bg-gold/5 hover:bg-gold/15 transition-colors"
              >
                <span className={language === 'ur' ? 'font-urdu-sans' : 'font-sans'}>{t.allOrders}</span>
                <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', dir === 'rtl' ? 'rotate-180' : '')} />
              </Link>
            </div>

            {urgentOrders.length === 0 ? (
              <div className="p-5 rounded-2xl border border-border bg-card text-center space-y-2 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h4 className={cn('text-sm font-semibold text-foreground leading-relaxed', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                  {t.allCaughtUpTitle}
                </h4>
                <p className={cn('text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                  {t.allCaughtUpDesc}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {urgentOrders.map((order) => {
                  const customer = customerMap.get(order.customer_id);
                  const isDueToday = order.delivery_date === todayStr;
                  const garmentName =
                    GARMENT_DISPLAY_NAMES[order.garment_type] || order.garment_type;
                  const urgencyInfo = getDeliveryUrgency(order.delivery_date);
                  const nextInfo = getNextStatusInfo(order.status);
                  const stageConfig = STAGE_BADGE_CONFIG[order.status] || {
                    label: order.status,
                    labelUrdu: '',
                    variant: 'status-booked',
                  };

                  return (
                    <div
                      key={order.id}
                      className="premium-glass-card p-3.5 border-border bg-card hover:border-gold/30 space-y-3 rounded-2xl shadow-sm transition-all"
                    >
                      {/* Top Row: Customer name, Order #, Due Date Urgency Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground truncate">
                              {customer?.full_name || t.walkInCustomer}
                            </span>
                            <span className="font-mono text-xs font-bold text-gold shrink-0">
                              #{order.order_number}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {customer?.phone || t.noPhone}
                          </div>
                        </div>

                        <span
                          className={cn(
                            'shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full border font-mono',
                            urgencyInfo.urgency === 'critical' || isDueToday
                              ? 'border-amber-500/40 bg-amber-500/15 text-amber-500 dark:text-amber-300 animate-pulse'
                              : order.delivery_date < todayStr
                              ? 'border-rose-500/40 bg-rose-500/15 text-rose-500 dark:text-rose-300'
                              : 'border-border bg-muted/40 text-muted-foreground'
                          )}
                        >
                          {isDueToday ? t.dueTodayBadge : order.delivery_date}
                        </span>
                      </div>

                      {/* Specs & Stage / Balance Row */}
                      <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-muted/30 border border-border/50">
                        <span className="text-foreground font-medium truncate">
                          <bdi dir="ltr">{order.quantity}×</bdi> {garmentName} • {order.fabric_color || (language === 'ur' ? 'کپڑا' : 'Fabric')}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant={stageConfig.variant} className="text-[10px] px-2 py-0.5">
                            {language === 'ur' && stageConfig.labelUrdu ? stageConfig.labelUrdu : stageConfig.label}
                          </Badge>
                          <span
                            className={cn(
                              'font-mono text-xs font-bold',
                              order.balance_due === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            )}
                          >
                            {order.balance_due === 0 ? t.paidBadge : `Rs. ${(order.balance_due ?? 0).toLocaleString()}`}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons: 1-Tap WhatsApp, Print, and 1-Tap Advance */}
                      <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                        {/* 1-Tap WhatsApp Receipt/Alert Button (min 44px) */}
                        <button
                          type="button"
                          onClick={() => handleOpenWhatsApp(order)}
                          title="WhatsApp Alert"
                          className="h-11 min-h-[44px] px-3.5 flex-1 rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 active:scale-95 transition-all text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <MessageSquare className="h-4 w-4 shrink-0" />
                          <span className={language === 'ur' ? 'font-urdu-sans' : 'font-sans'}>{t.receiptWhatsApp}</span>
                        </button>

                        {/* 1-Tap Print Button (min 44px) */}
                        <button
                          type="button"
                          onClick={() => handleOpenPrint(order)}
                          title={t.printTag}
                          className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl border border-border bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground flex items-center justify-center active:scale-95 transition-all shrink-0 cursor-pointer shadow-sm"
                        >
                          <Printer className="h-4 w-4" />
                        </button>

                        {/* 1-Tap Next Stage Advancement Button (min 44px) */}
                        {nextInfo ? (
                          <button
                            type="button"
                            onClick={() => handleSingleOrderAdvance(order.id)}
                            title={`Advance to ${nextInfo.labelEn}`}
                            className="h-11 min-h-[44px] px-3.5 flex-1 rounded-xl border border-gold/30 bg-gold/15 text-gold hover:bg-gold/25 active:scale-95 transition-all text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span className={language === 'ur' ? 'font-urdu-sans' : 'font-sans'}>
                              {language === 'ur' ? nextInfo.labelUrdu : `${nextInfo.labelEn} →`}
                            </span>
                            <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 transition-transform', dir === 'rtl' ? 'rotate-180' : '')} />
                          </button>
                        ) : (
                          <div className="h-11 min-h-[44px] px-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span className={language === 'ur' ? 'font-urdu-sans' : 'font-sans'}>{t.completedStage}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>


        {/* ================================================================ */}
        {/* DESKTOP VIEWPORT ONLY (hidden md:block)                          */}
        {/* ================================================================ */}
        <div className="hidden md:block space-y-6">
        {/* ------------------------------------------------------------------ */}
        {/* 1. TOP HEADER & GREETING BAR                                        */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="text-xs font-semibold tracking-widest uppercase text-gold">
                {t.workshopOperations}
              </span>
              <span className="text-xs text-muted-foreground">
                • {shop?.name || 'Master Workshop Counter'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground flex items-center gap-3">
              <span className={language === 'ur' ? 'font-urdu-sans' : 'font-sans'}>{t.commandDashboard}</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs text-muted-foreground shadow-sm">
              <Calendar className="h-3.5 w-3.5 text-gold" />
              <span>
                {new Date().toLocaleDateString(language === 'ur' ? 'ur-PK' : 'en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <Link href="/orders">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-border bg-card hover:bg-muted/50 text-xs font-medium text-foreground shadow-sm"
              >
                <span className={language === 'ur' ? 'font-urdu-sans' : 'font-sans'}>{t.viewFullQueue}</span>
                <ArrowUpRight className={cn("h-3.5 w-3.5 text-gold transition-transform", dir === 'rtl' ? 'rotate-[-90deg]' : '')} />
              </Button>
            </Link>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* FRESH WORKSHOP ZERO-MOCK CALLOUT                                   */}
        {/* ------------------------------------------------------------------ */}
        {!isLoading && orders.length === 0 && (
          <div className="premium-glass-card p-6 border-gold/30 bg-gradient-to-r from-gold/10 via-amber-500/5 to-transparent relative overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.1)]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/40 bg-gold/15 text-gold shadow-[0_0_20px_rgba(212,175,55,0.2)] shrink-0">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className={cn("text-lg font-semibold text-foreground", language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                      {t.freshWorkshopTitle}
                    </h3>
                  </div>
                  <p className={cn("text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed", language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                    {t.freshWorkshopDesc}
                  </p>
                </div>
              </div>
              <Link href="/orders/new" className="shrink-0 w-full sm:w-auto">
                <Button
                  variant="default"
                  size="md"
                  className="w-full sm:w-auto gap-2 bg-gold text-[#18181B] hover:bg-gold-hover font-semibold shadow-[0_4px_16px_rgba(197,154,63,0.3)] transition-all hover:scale-[1.02]"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span className={language === 'ur' ? 'font-urdu-sans' : 'font-sans'}>{t.bookFirstSuit}</span>
                </Button>
              </Link>
            </div>
          </div>
        )}


        {/* ------------------------------------------------------------------ */}
        {/* 2. TOP KPI METRICS RIBBON (2-Cols Mobile / 4-Cols Desktop Grid)     */}
        {/* ------------------------------------------------------------------ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          {/* Card 1: Active Queue */}
          <div className="premium-glass-card p-3.5 sm:p-5 relative overflow-hidden transition-all duration-200 hover:border-white/10 group">
            <div className="flex items-center justify-between pb-2 sm:pb-3">
              <span className={cn('text-[11px] font-semibold tracking-wider uppercase text-muted-foreground', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                {t.activeQueue}
              </span>
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold shadow-[0_0_15px_rgba(212,175,55,0.15)] shrink-0">
                <Scissors className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="space-y-1 sm:space-y-1.5">
              <div className="flex items-baseline gap-1.5 sm:gap-2">
                <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  <bdi dir="ltr">{activeOrders.length}</bdi>
                </span>
                <span className={cn('text-[11px] sm:text-xs font-medium text-muted-foreground', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                  {t.ordersInFlow}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] sm:text-xs pt-1 border-t border-border/50">
                <span className={cn('text-muted-foreground truncate mr-1', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                  {t.totalValue}
                </span>
                <span className="font-semibold text-gold shrink-0">
                  <bdi dir="ltr">Rs. {(activeOrdersValue ?? 0).toLocaleString()}</bdi>
                </span>
              </div>
            </div>
            <div className="mt-2 sm:mt-3 flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] text-muted-foreground truncate">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-400 shrink-0" />
              <span>{inCutCount} {t.cut}</span>
              <span className="text-muted-foreground/60">•</span>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
              <span>{inStitchCount} {t.stitch}</span>
            </div>
          </div>

          {/* Card 2: Due Today */}
          <div className="premium-glass-card p-3.5 sm:p-5 relative overflow-hidden transition-all duration-200 hover:border-amber-500/30 group border-amber-500/20 bg-gradient-to-br from-amber-500/[0.06] to-transparent">
            <div className="flex items-center justify-between pb-2 sm:pb-3">
              <span className={cn('text-[11px] font-semibold tracking-wider uppercase text-amber-600 dark:text-amber-300', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                {t.dueToday}
              </span>
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-500 dark:text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)] shrink-0">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-pulse" />
              </div>
            </div>
            <div className="space-y-1 sm:space-y-1.5">
              <div className="flex items-baseline gap-1.5 sm:gap-2">
                <span className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-300">
                  <bdi dir="ltr">{dueTodayOrders.length}</bdi>
                </span>
                <span className={cn('text-[11px] sm:text-xs font-semibold text-amber-600/90 dark:text-amber-400/90', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                  {t.suitsScheduled}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] sm:text-xs pt-1 border-t border-border/50">
                <span className={cn('text-muted-foreground truncate mr-1', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                  {t.dueValue}
                </span>
                <span className="font-semibold text-amber-600 dark:text-amber-300 shrink-0">
                  <bdi dir="ltr">Rs. {(dueTodayValue ?? 0).toLocaleString()}</bdi>
                </span>
              </div>
            </div>
            <div className="mt-2 sm:mt-3 flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] text-amber-600/80 dark:text-amber-400/80 truncate">
              {dueTodayOrders.length > 0 ? (
                <span className={language === 'ur' ? 'font-urdu-sans' : 'font-sans'}>{t.readyForPickup}</span>
              ) : (
                <span className={cn('text-muted-foreground', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>{t.scheduleClearToday}</span>
              )}
            </div>
          </div>

          {/* Card 3: Overdue */}
          <div className="premium-glass-card p-3.5 sm:p-5 relative overflow-hidden transition-all duration-200 hover:border-rose-500/40 group border-rose-500/20 bg-gradient-to-br from-rose-500/[0.06] to-transparent">
            <div className="flex items-center justify-between pb-2 sm:pb-3">
              <span className={cn('text-[11px] font-semibold tracking-wider uppercase text-rose-600 dark:text-rose-300', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                {t.overdueAlert}
              </span>
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/15 text-rose-500 dark:text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)] shrink-0">
                <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="space-y-1 sm:space-y-1.5">
              <div className="flex items-baseline gap-1.5 sm:gap-2">
                <span className="text-2xl sm:text-3xl font-bold tracking-tight text-rose-600 dark:text-rose-300">
                  <bdi dir="ltr">{overdueOrders.length}</bdi>
                </span>
                <span className={cn('text-[11px] sm:text-xs font-semibold text-rose-600 dark:text-rose-400', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                  {overdueOrders.length > 0 ? `${overdueOrders.length} ${t.delayed} ⚠️` : `0 ${t.delayed}`}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] sm:text-xs pt-1 border-t border-border/50">
                <span className={cn('text-muted-foreground truncate mr-1', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                  {t.delayed}
                </span>
                <span className="font-semibold text-rose-600 dark:text-rose-300 shrink-0">
                  <bdi dir="ltr">Rs. {(overdueValue ?? 0).toLocaleString()}</bdi>
                </span>
              </div>
            </div>
            <div className="mt-2 sm:mt-3 flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-medium text-rose-600 dark:text-rose-400 truncate">
              {overdueOrders.length > 0 ? (
                <>
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                  <span className={language === 'ur' ? 'font-urdu-sans' : 'font-sans'}>{language === 'ur' ? 'فوری کارروائی درکار' : 'Immediate Action Required'}</span>
                </>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  <span className={language === 'ur' ? 'font-urdu-sans' : 'font-sans'}>{t.allOnSchedule}</span>
                </span>
              )}
            </div>
          </div>

          {/* Card 4: Unsettled Khata */}
          <div className="premium-glass-card p-3.5 sm:p-5 relative overflow-hidden transition-all duration-200 hover:border-white/10 group">
            <div className="flex items-center justify-between pb-2 sm:pb-3">
              <span className={cn('text-[11px] font-semibold tracking-wider uppercase text-muted-foreground', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                {t.unsettledKhata}
              </span>
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-500 dark:text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.1)] shrink-0">
                <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="space-y-1 sm:space-y-1.5">
              <div className="flex items-baseline gap-1.5 sm:gap-2">
                <span className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-rose-600 dark:text-rose-300">
                  <bdi dir="ltr">Rs. {(unsettledKhataTotal ?? 0).toLocaleString()}</bdi>
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] sm:text-xs pt-1 border-t border-border/50">
                <span className={cn('text-muted-foreground truncate mr-1', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                  {t.debtors}
                </span>
                <span className={cn('font-medium text-foreground shrink-0', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                  <bdi dir="ltr">{debtorsCount}</bdi> {t.clients}
                </span>
              </div>
            </div>
            <div className="mt-2 sm:mt-3 flex items-center justify-between text-[10px] sm:text-[11px]">
              <a
                href="/khata"
                className="inline-flex items-center gap-1 text-gold hover:text-gold-hover transition-colors font-medium"
              >
                <span className={language === 'ur' ? 'font-urdu-sans' : 'font-sans'}>{t.viewKhata}</span>
                <ChevronRight className={cn('h-3 w-3', dir === 'rtl' ? 'rotate-180' : '')} />
              </a>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* 3. QUICK ACTION BAR                                                */}
        {/* ------------------------------------------------------------------ */}
        <div className="premium-glass-card p-4 flex flex-wrap items-center justify-between gap-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/15 text-gold text-xs">
              ⚡
            </span>
            <div className="flex flex-col">
              <span className={cn('text-xs font-semibold uppercase tracking-wider text-foreground', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                {t.quickCounterActions}
              </span>
              <span className={cn('text-[11px] text-muted-foreground', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                {t.quickActionsSub}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Button 1: Book New Suit (Gold Primary) */}
            <Link href="/orders/new">
              <Button
                variant="default"
                size="md"
                className="gap-2 bg-gold text-[#0B0C0E] hover:bg-gold-hover font-semibold shadow-[0_0_25px_rgba(212,175,55,0.25)] transition-all hover:scale-[1.02]"
              >
                <PlusCircle className="h-4 w-4" />
                <span className={language === 'ur' ? 'font-urdu-sans text-xs' : 'font-sans'}>
                  {t.bookNewSuit}
                </span>
              </Button>
            </Link>

            {/* Button 1.5: Digital Naap Register */}
            <Link href="/customers" data-testid="desktop-dashboard-customers-register-btn">
              <Button
                variant="outline"
                size="md"
                className="gap-2 border-gold/30 bg-gold/5 hover:bg-gold/15 text-foreground hover:border-gold/50"
              >
                <Users className="h-4 w-4 text-gold" />
                <span className={language === 'ur' ? 'font-urdu-sans text-xs' : 'font-sans'}>
                  {t.naapRegisterBtn}
                </span>
              </Button>
            </Link>

            {/* Button 2: Find Customer (Ghost/Glass) */}
            <Button
              variant="outline"
              size="md"
              onClick={handleFocusSearch}
              className="gap-2 border-border bg-card hover:bg-muted/50 text-foreground backdrop-blur-md"
            >
              <Search className="h-4 w-4 text-gold" />
              <span className={language === 'ur' ? 'font-urdu-sans text-xs' : 'font-sans'}>
                {t.findCustomer}
              </span>
              <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">
                /
              </span>
            </Button>

            {/* Button 3: Print Daily Run-Sheet (Outline) */}
            <Link href="/print">
              <Button
                variant="outline"
                size="md"
                className="gap-2 border-border bg-card hover:bg-muted/50 text-foreground"
              >
                <Printer className="h-4 w-4 text-muted-foreground" />
                <span className={language === 'ur' ? 'font-urdu-sans text-xs' : 'font-sans'}>
                  {t.printCounter}
                </span>
              </Button>
            </Link>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* 4. URGENT DELIVERIES WATCHLIST (Due Today & Tomorrow)              */}
        {/* ------------------------------------------------------------------ */}
        <div className="premium-glass-card overflow-hidden">
          {/* Card Header Chrome */}
          <div className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-500 dark:text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className={cn('text-base font-semibold text-foreground', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                    {t.urgentWatchlistTitle}
                  </h2>
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-300">
                    {t.dueTodayTomorrow}
                  </span>
                </div>
                <p className={cn('text-xs text-muted-foreground', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                  {t.urgentWatchlistSub}
                </p>
              </div>
            </div>

            <Link
              href="/orders"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gold hover:text-gold-hover transition-colors"
            >
              <span className={language === 'ur' ? 'font-urdu-sans' : 'font-sans'}>{t.viewAllOrdersQueue}</span>
              <ChevronRight className={cn('h-3.5 w-3.5', dir === 'rtl' ? 'rotate-180' : '')} />
            </Link>
          </div>

          {/* Table Container with required overflow-x-auto wrapper */}
          <div className="overflow-x-auto w-full touch-pan-x">
            <table className="w-full text-left rtl:text-right text-sm border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3.5 px-5">{t.thOrderNum}</th>
                  <th className="py-3.5 px-4">{t.thCustomer}</th>
                  <th className="py-3.5 px-4">{t.thGarment}</th>
                  <th className="py-3.5 px-4">{t.thStage}</th>
                  <th className="py-3.5 px-4 text-right rtl:text-left">{t.thBalanceDue}</th>
                  <th className="py-3.5 px-5 text-right rtl:text-left">{t.thActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {urgentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 px-6 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className={cn('text-sm font-semibold text-foreground', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                            {t.allCaughtUpTitle}
                          </h4>
                          <p className={cn('text-xs text-muted-foreground max-w-sm', language === 'ur' ? 'font-urdu-sans' : 'font-sans')}>
                            {t.allCaughtUpDesc}
                          </p>
                        </div>
                        <Link href="/orders/new" className="mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 border-gold/30 bg-gold/10 text-gold hover:bg-gold/20 text-xs"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                            <span className={language === 'ur' ? 'font-urdu-sans' : 'font-sans'}>{t.bookNewSuit}</span>
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  urgentOrders.map((order) => {
                    const customer = customerMap.get(order.customer_id);
                    const stageConfig = STAGE_BADGE_CONFIG[order.status] || {
                      label: order.status,
                      labelUrdu: '',
                      variant: 'status-booked',
                    };
                    const garmentName =
                      GARMENT_DISPLAY_NAMES[order.garment_type] || order.garment_type;

                    return (
                      <tr
                        key={order.id}
                        className="group transition-colors hover:bg-white/[0.02] border-b border-white/5"
                      >
                        {/* 1. Order Number */}
                        <td className="py-4 px-5">
                          <div className="flex flex-col">
                            <span className="font-mono text-xs font-bold text-gold group-hover:text-gold-hover transition-colors">
                              #{order.order_number}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              Due: {order.delivery_date}
                            </span>
                          </div>
                        </td>

                        {/* 2. Customer Name & Contact */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-200">
                              {customer?.full_name || 'Walk-in Customer'}
                            </span>
                            <span className="text-xs text-gray-400 font-mono">
                              {customer?.phone || 'No phone'}
                            </span>
                          </div>
                        </td>

                        {/* 3. Garment & Fabric */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-gray-200">
                              <bdi dir="ltr">{order.quantity}x</bdi> {garmentName}
                            </span>
                            <span className="text-[11px] text-gray-400 truncate max-w-[180px]">
                              {order.fabric_color || order.fabric_brand || 'Standard Fabric'}
                            </span>
                          </div>
                        </td>

                        {/* 4. Stage Badge */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Badge variant={stageConfig.variant} className="text-[11px] px-2.5 py-0.5">
                              {stageConfig.label}
                            </Badge>
                            <span
                              className="font-urdu-sans text-[11px] text-gray-500 hidden sm:inline"
                              dir="rtl"
                            >
                              {stageConfig.labelUrdu}
                            </span>
                          </div>
                        </td>

                        {/* 5. Financial Balance */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex flex-col items-end">
                            {order.balance_due === 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Paid (<bdi dir="ltr">Rs. 0</bdi>)</span>
                              </span>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="font-mono text-xs font-semibold text-rose-400">
                                  <bdi dir="ltr">Rs. {(order.balance_due ?? 0).toLocaleString()}</bdi>
                                </span>
                                <span className="block text-[10px] text-gray-500">
                                  Total: <bdi dir="ltr">Rs. {(order.total_amount ?? 0).toLocaleString()}</bdi>
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 6. Action Triggers */}
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 1-Click WhatsApp Receipt Trigger */}
                            <button
                              type="button"
                              onClick={() => handleOpenWhatsApp(order)}
                              title="Send WhatsApp Receipt / Ready Alert"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 transition-all hover:bg-emerald-500/20 hover:border-emerald-500/40"
                              aria-label={`Send WhatsApp for order ${order.order_number}`}
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </button>

                            {/* 1-Click Thermal Slip Print Trigger */}
                            <button
                              type="button"
                              onClick={() => handleOpenPrint(order)}
                              title="Print Thermal Fabric Tag & Invoice"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 transition-all hover:bg-white/10 hover:text-white"
                              aria-label={`Print thermal tag for order ${order.order_number}`}
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>

                            {/* View Order in Queue */}
                            <a
                              href="/orders"
                              title="View in Production Pipeline"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gold transition-all hover:bg-gold/10 hover:border-gold/30"
                              aria-label={`Inspect order ${order.order_number}`}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 5. INTERACTIVE 1-CLICK MODALS                                      */}
      {/* ------------------------------------------------------------------ */}
      {selectedWhatsAppOrder && (
        <WhatsAppReceiptModal
          open={whatsAppModalOpen}
          onOpenChange={setWhatsAppModalOpen}
          order={selectedWhatsAppOrder}
          customer={customerMap.get(selectedWhatsAppOrder.customer_id) || null}
          shop={shop || defaultMockShop}
        />
      )}

      {selectedPrintOrder && (
        <ThermalSlipModal
          open={printModalOpen}
          onOpenChange={setPrintModalOpen}
          order={selectedPrintOrder}
          customer={customerMap.get(selectedPrintOrder.customer_id) || null}
          shop={shop || defaultMockShop}
        />
      )}
    </AppShell>
  );
}
