'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  LayoutGrid,
  List,
  Search,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Users,
  RefreshCw,
  MessageSquare,
  Printer,
  ChevronRight,
  Scissors,
  PlusCircle,
  Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PipelineBoard, PIPELINE_COLUMNS } from '@/components/tailor/pipeline-board';
import { getDeliveryUrgency } from '@/components/tailor/order-card';
import { OrderInspectorDrawer } from '@/components/tailor/order-inspector-drawer';
import { WhatsAppReceiptModal } from '@/components/tailor/whatsapp-receipt-modal';
import { ThermalSlipModal } from '@/components/tailor/thermal-slip-modal';
import { ordersDb, customersDb, staffDb, shopsDb, isDatabaseConfigured } from '@/lib/db';
import {
  mockShop as defaultMockShop,
  SEED_ORDERS,
  SEED_CUSTOMERS,
  isDemoMode,
} from '@/lib/mock-data';
import { useLanguage } from '@/lib/language-provider';
import type { GarmentOrder, Customer, Staff, OrderStatusLog, OrderStatus, Shop } from '@/types/tailor';

type ViewMode = 'list' | 'kanban';
type UrgencyFilter = 'ALL' | 'TODAY' | 'READY' | 'OVERDUE';
type MobileStatusFilter = 'ALL' | 'CUTTING' | 'STITCHING' | 'READY' | 'DELIVERED';

const GARMENT_DISPLAY_NAMES: Record<string, { ur: string; en: string }> = {
  MEN_SHALWAR_KAMEEZ: { ur: 'مردانہ شلوار قمیض', en: 'Men Shalwar Kameez' },
  MEN_KURTA: { ur: 'مردانہ کرتہ پاجامہ', en: 'Men Kurta Trouser' },
  WAISTCOAT: { ur: 'واسکٹ', en: 'Waistcoat' },
  PRINCE_SUIT: { ur: 'پرنس سوٹ', en: 'Prince Suit' },
  TROUSER_SHIRT: { ur: 'پینٹ شرٹ', en: 'Trouser Shirt' },
  WOMEN_SUIT: { ur: 'زنانہ سوٹ', en: 'Ladies Suit' },
};

const STAGE_CONFIG: Record<
  OrderStatus,
  { labelEn: string; labelUr: string; variant: 'status-booked' | 'status-cutting' | 'status-stitching' | 'status-ready' | 'status-overdue' }
> = {
  BOOKED: { labelEn: 'Booked', labelUr: 'بک شدہ', variant: 'status-booked' },
  FABRIC_RECEIVED: { labelEn: 'Fabric In', labelUr: 'کپڑا موصول', variant: 'status-booked' },
  IN_CUTTING: { labelEn: 'In Cutting', labelUr: 'کٹائی جاری', variant: 'status-cutting' },
  IN_STITCHING: { labelEn: 'In Stitching', labelUr: 'سلائی جاری', variant: 'status-stitching' },
  KAJ_BUTTON: { labelEn: 'Kaj & Button', labelUr: 'کاج و بٹن', variant: 'status-stitching' },
  PRESSING: { labelEn: 'Pressing', labelUr: 'استری و پیکنگ', variant: 'status-ready' },
  READY_FOR_TRIAL: { labelEn: 'Trial Ready', labelUr: 'ٹرائل تیار', variant: 'status-ready' },
  READY_FOR_DELIVERY: { labelEn: 'Ready for Pickup', labelUr: 'ڈلیوری تیار', variant: 'status-ready' },
  COMPLETED: { labelEn: 'Completed', labelUr: 'مکمل شدہ', variant: 'status-ready' },
  CANCELLED: { labelEn: 'Cancelled', labelUr: 'منسوخ شدہ', variant: 'status-overdue' },
};

export default function OrdersQueuePage() {
  const { language, dir, ordersQueueT } = useLanguage();

  const [orders, setOrders] = React.useState<GarmentOrder[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [staff, setStaff] = React.useState<Staff[]>([]);
  const [, setStatusLogs] = React.useState<OrderStatusLog[]>([]);
  const [shop, setShop] = React.useState<Shop | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  // View mode defaults to 'list'
  const [viewMode, setViewMode] = React.useState<ViewMode>('list');

  // Slide-Out Inspector Drawer State
  const [inspectorOrder, setInspectorOrder] = React.useState<GarmentOrder | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState<boolean>(false);

  // WhatsApp Receipt Modal state
  const [whatsAppModalOpen, setWhatsAppModalOpen] = React.useState<boolean>(false);
  const [selectedWhatsAppOrder, setSelectedWhatsAppOrder] = React.useState<GarmentOrder | null>(null);

  // Thermal Print Modal state
  const [printModalOpen, setPrintModalOpen] = React.useState<boolean>(false);
  const [selectedPrintOrder, setSelectedPrintOrder] = React.useState<GarmentOrder | null>(null);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [urgencyFilter, setUrgencyFilter] = React.useState<UrgencyFilter>('ALL');
  const [mobileStatusFilter, setMobileStatusFilter] = React.useState<MobileStatusFilter>('ALL');
  const [selectedStaffId, setSelectedStaffId] = React.useState<string>('ALL');

  // Live data initialization
  React.useEffect(() => {
    let isMounted = true;

    async function loadOrdersData() {
      setIsLoading(true);
      try {
        const currentShop = await shopsDb.getCurrentShop();
        if (!isMounted) return;
        setShop(currentShop || defaultMockShop);

        const targetShopId = currentShop?.id || defaultMockShop.id;
        const [loadedOrders, loadedCustomers, loadedStaff] = await Promise.all([
          ordersDb.getByShopId(targetShopId),
          customersDb.getByShopId(targetShopId),
          staffDb.getByShopId(targetShopId),
        ]);

        if (isMounted) {
          // If in demo/test mode or if using the default mock shop and database is empty,
          // seed realistic workshop orders so tailors and auditors can preview the active workshop queue.
          const shouldUseSeed =
            loadedOrders.length === 0 &&
            (targetShopId === defaultMockShop.id ||
              targetShopId === 'shp-demo-001' ||
              isDemoMode() ||
              !isDatabaseConfigured());

          const finalOrders = shouldUseSeed
            ? SEED_ORDERS.map((o) => ({ ...o, shop_id: targetShopId }))
            : loadedOrders;
          const finalCustomers =
            shouldUseSeed && loadedCustomers.length === 0
              ? SEED_CUSTOMERS.map((c) => ({ ...c, shop_id: targetShopId }))
              : loadedCustomers;

          setOrders(finalOrders);
          setCustomers(finalCustomers);
          const mappedStaff: Staff[] = loadedStaff.map((m) => ({
            id: m.id,
            shop_id: m.shop_id,
            name: m.name || 'Workshop Member',
            phone: '',
            role: (m.role === 'OWNER' ? 'MANAGER' : m.role) as Staff['role'],
            is_active: true,
            created_at: m.created_at,
          }));
          setStaff(mappedStaff);
        }
      } catch (err) {
        console.warn('Orders queue data fetch error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadOrdersData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Customer & Staff lookups
  const customerMap = React.useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach((c) => map.set(c.id, c));
    return map;
  }, [customers]);

  const staffMap = React.useMemo(() => {
    const map = new Map<string, Staff>();
    staff.forEach((s) => map.set(s.id, s));
    return map;
  }, [staff]);

  const handleInspectOrder = (order: GarmentOrder) => {
    setInspectorOrder(order);
    setIsDrawerOpen(true);
  };

  const handleOpenWhatsApp = (order: GarmentOrder) => {
    setSelectedWhatsAppOrder(order);
    setWhatsAppModalOpen(true);
  };

  const handleOpenPrint = (order: GarmentOrder) => {
    setSelectedPrintOrder(order);
    setPrintModalOpen(true);
  };

  // Stage Advancement Handler
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
    setInspectorOrder(updatedOrder);

    // Persist status change
    ordersDb.updateStatus(orderId, nextStatus).catch((err) => {
      console.warn('Failed to persist status change:', err);
    });
  };

  // Stage Rollback Handler
  const handleSingleOrderRollback = (orderId: string) => {
    const currentOrder = orders.find((o) => o.id === orderId);
    if (!currentOrder || currentOrder.status === 'BOOKED') return;

    const currentCol = PIPELINE_COLUMNS.find((col) =>
      col.statuses.includes(currentOrder.status)
    );
    if (!currentCol) return;

    const prevStatus = currentCol.prevStatus;
    if (!prevStatus || prevStatus === currentOrder.status) return;

    const updatedOrder: GarmentOrder = {
      ...currentOrder,
      status: prevStatus,
      updated_at: new Date().toISOString(),
    };

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? updatedOrder : o))
    );
    setInspectorOrder(updatedOrder);

    ordersDb.updateStatus(orderId, prevStatus).catch((err) => {
      console.warn('Failed to persist status rollback:', err);
    });
  };

  // Filter Engine
  const filteredOrders = React.useMemo(() => {
    return orders.filter((order) => {
      // 1. Text Search Filter (Order #, Customer Name, Phone)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const customer = customerMap.get(order.customer_id);
        const matchOrderNo = order.order_number.toLowerCase().includes(q);
        const matchCustName = customer?.full_name.toLowerCase().includes(q) || false;
        const matchPhone = customer?.phone.includes(q) || false;
        const gName = GARMENT_DISPLAY_NAMES[order.garment_type];
        const matchGarment = (gName?.en.toLowerCase().includes(q) || gName?.ur.includes(q)) || false;

        if (!matchOrderNo && !matchCustName && !matchPhone && !matchGarment) {
          return false;
        }
      }

      // 2. Staff Craftsman Filter
      if (selectedStaffId !== 'ALL') {
        const isCutter = order.assigned_cutter_id === selectedStaffId;
        const isStitcher = order.assigned_stitcher_id === selectedStaffId;
        if (!isCutter && !isStitcher) return false;
      }

      // 3. Urgency Filter
      if (urgencyFilter !== 'ALL') {
        const urgency = getDeliveryUrgency(order.delivery_date);
        if (urgencyFilter === 'TODAY' && urgency.urgency !== 'warning' && urgency.urgency !== 'critical') {
          return false;
        }
        if (urgencyFilter === 'OVERDUE' && urgency.urgency !== 'critical') {
          return false;
        }
        if (urgencyFilter === 'READY' && order.status !== 'READY_FOR_DELIVERY' && order.status !== 'READY_FOR_TRIAL') {
          return false;
        }
      }

      return true;
    });
  }, [orders, searchQuery, selectedStaffId, urgencyFilter, customerMap]);

  // Dedicated Mobile Status Filter Logic
  const mobileFilteredOrders = React.useMemo(() => {
    return orders.filter((order) => {
      // 1. Text Search Filter (Order #, Customer Name, Phone)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const customer = customerMap.get(order.customer_id);
        const matchOrderNo = order.order_number.toLowerCase().includes(q);
        const matchCustName = customer?.full_name.toLowerCase().includes(q) || false;
        const matchPhone = customer?.phone.includes(q) || false;
        const gName = GARMENT_DISPLAY_NAMES[order.garment_type];
        const matchGarment = (gName?.en.toLowerCase().includes(q) || gName?.ur.includes(q)) || false;

        if (!matchOrderNo && !matchCustName && !matchPhone && !matchGarment) {
          return false;
        }
      }

      // 2. Mobile Status Category Filter
      if (mobileStatusFilter === 'CUTTING') {
        return ['IN_CUTTING', 'BOOKED', 'FABRIC_RECEIVED'].includes(order.status);
      }
      if (mobileStatusFilter === 'STITCHING') {
        return ['IN_STITCHING', 'KAJ_BUTTON', 'PRESSING'].includes(order.status);
      }
      if (mobileStatusFilter === 'READY') {
        return ['READY_FOR_DELIVERY', 'READY_FOR_TRIAL'].includes(order.status);
      }
      if (mobileStatusFilter === 'DELIVERED') {
        return order.status === 'COMPLETED';
      }

      return true;
    });
  }, [orders, searchQuery, mobileStatusFilter, customerMap]);

  const mobileStatusCounts = React.useMemo(() => {
    return {
      all: orders.length,
      cutting: orders.filter((o) => ['IN_CUTTING', 'BOOKED', 'FABRIC_RECEIVED'].includes(o.status)).length,
      stitching: orders.filter((o) => ['IN_STITCHING', 'KAJ_BUTTON', 'PRESSING'].includes(o.status)).length,
      ready: orders.filter((o) => ['READY_FOR_DELIVERY', 'READY_FOR_TRIAL'].includes(o.status)).length,
      delivered: orders.filter((o) => o.status === 'COMPLETED').length,
    };
  }, [orders]);

  const getNextStatusInfo = (currentStatus: OrderStatus) => {
    const currentCol = PIPELINE_COLUMNS.find((col) =>
      col.statuses.includes(currentStatus)
    );
    if (!currentCol || currentCol.nextStatus === currentStatus || currentStatus === 'COMPLETED') {
      return null;
    }
    const nextCol = PIPELINE_COLUMNS.find((col) => col.statuses.includes(currentCol.nextStatus));
    if (!nextCol) return { label: ordersQueueT.advanceBtn };
    return {
      label: language === 'ur' ? `اگلا: ${nextCol.labelUrdu} ←` : `Next: ${nextCol.label} →`,
    };
  };

  return (
    <AppShell activeRoute="/orders">
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* ================================================================= */}
        {/* MOBILE PIPELINE VIEWPORT (md:hidden)                              */}
        {/* ================================================================= */}
        <div className="block md:hidden space-y-3 pb-40 pb-safe">
          {/* 1. Mobile Header Bar */}
          <div className="flex items-center justify-between pb-1">
            <div>
              <h1 className={cn("text-xl font-bold text-foreground", language === 'ur' ? 'font-urdu-serif leading-relaxed' : '')}>
                {ordersQueueT.pageTitle}
              </h1>
              <p className={cn("text-xs text-muted-foreground", language === 'ur' ? 'font-urdu-serif leading-relaxed' : '')}>
                <bdi dir="ltr">{orders.length}</bdi> {ordersQueueT.totalOrders}
              </p>
            </div>
            <Link href="/orders/new">
              <Button
                size="sm"
                className="h-9 px-3 gap-1.5 bg-gold text-neutral-950 hover:bg-gold-hover font-semibold shadow-xs text-xs"
              >
                <PlusCircle className="h-4 w-4" />
                <span>{ordersQueueT.bookSuit}</span>
              </Button>
            </Link>
          </div>

          {/* 2. Sticky Top Mobile Search Bar & Horizontal Status Pills */}
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pb-2 pt-1 -mx-4 px-4 border-b border-border/40">
            <div className="relative">
              <Input
                type="search"
                placeholder={ordersQueueT.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="h-4 w-4 text-gold" />}
                className={cn(
                  "h-10 text-xs bg-card border-border pr-9 rounded-xl focus:border-gold/50 text-foreground placeholder:text-muted-foreground",
                  language === 'ur' ? 'font-urdu-serif placeholder:font-urdu-serif' : ''
                )}
              />
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 min-h-[40px] min-w-[40px] text-muted-foreground hover:text-foreground flex items-center justify-center text-sm cursor-pointer"
                  aria-label="Clear search query"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Horizontal Scrollable Status Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-none touch-pan-x -mx-4 pl-4 pr-10">
              {[
                { id: 'ALL', label: ordersQueueT.filterAll, count: mobileStatusCounts.all },
                { id: 'CUTTING', label: ordersQueueT.filterCutting, count: mobileStatusCounts.cutting },
                { id: 'STITCHING', label: ordersQueueT.filterStitching, count: mobileStatusCounts.stitching },
                { id: 'READY', label: ordersQueueT.filterReady, count: mobileStatusCounts.ready },
                { id: 'DELIVERED', label: ordersQueueT.filterDelivered, count: mobileStatusCounts.delivered },
              ].map((tab) => {
                const isActive = mobileStatusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMobileStatusFilter(tab.id as MobileStatusFilter)}
                    className={cn(
                      'shrink-0 flex items-center gap-1.5 px-3.5 h-10 min-h-[40px] rounded-full text-xs font-medium transition-all cursor-pointer border',
                      isActive
                        ? 'bg-gold/15 text-gold border-gold/40 shadow-[0_0_10px_rgba(212,175,55,0.15)] font-semibold'
                        : 'bg-card text-muted-foreground border-border/70 hover:text-foreground'
                    )}
                  >
                    <span className={cn(language === 'ur' ? 'font-urdu-serif leading-relaxed' : '')}>{tab.label}</span>
                    <span
                      className={cn(
                        'px-1.5 py-0.2 rounded-full text-[10px] font-mono',
                        isActive ? 'bg-gold/25 text-gold font-bold' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <bdi dir="ltr">{tab.count}</bdi>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Mobile Order Cards List */}
          {mobileFilteredOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center space-y-3 my-4">
              <Search className="h-8 w-8 text-muted-foreground/60 mx-auto" />
              <h3 className={cn("text-sm font-semibold text-foreground", language === 'ur' ? 'font-urdu-serif' : '')}>
                {ordersQueueT.noFilterMatchesTitle}
              </h3>
              <p className={cn("text-xs text-muted-foreground", language === 'ur' ? 'font-urdu-serif' : '')}>
                {ordersQueueT.noFilterMatchesSub}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setMobileStatusFilter('ALL');
                }}
                className={cn("text-xs border-border", language === 'ur' ? 'font-urdu-serif' : '')}
              >
                {ordersQueueT.clearFilterBtn}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {mobileFilteredOrders.map((order) => {
                const customer = customerMap.get(order.customer_id);
                const stageConfig = STAGE_CONFIG[order.status] || {
                  labelEn: order.status,
                  labelUr: order.status,
                  variant: 'status-booked',
                };
                const garmentName =
                  GARMENT_DISPLAY_NAMES[order.garment_type]?.[language] || order.garment_type;
                const urgencyInfo = getDeliveryUrgency(order.delivery_date);
                const nextInfo = getNextStatusInfo(order.status);

                return (
                  <div
                    key={order.id}
                    data-testid="order-card-mobile"
                    onClick={() => handleInspectOrder(order)}
                    className="rounded-2xl border border-border bg-card p-3.5 hover:border-gold/40 active:scale-[0.99] transition-all space-y-3 shadow-xs cursor-pointer"
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground truncate">
                            {customer?.full_name || ordersQueueT.walkInCustomer}
                          </span>
                          <span className="font-mono text-xs font-bold text-gold shrink-0">
                            <bdi dir="ltr">#{order.order_number}</bdi>
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {customer?.phone ? (
                            <a
                              href={`tel:${customer.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 hover:text-gold hover:underline"
                            >
                              <Phone className="h-3 w-3 text-muted-foreground/70" />
                              <bdi dir="ltr">{customer.phone}</bdi>
                            </a>
                          ) : (
                            <span>{ordersQueueT.noPhone}</span>
                          )}
                        </div>
                      </div>

                      {/* Urgency Due Date Badge */}
                      <span
                        className={cn(
                          'shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                          urgencyInfo.urgency === 'critical' &&
                            'border-rose-500/40 bg-rose-500/15 text-rose-600 dark:text-rose-300 animate-pulse',
                          urgencyInfo.urgency === 'warning' &&
                            'border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300',
                          urgencyInfo.urgency === 'safe' &&
                            'border-border bg-muted/40 text-muted-foreground'
                        )}
                      >
                        <bdi dir="ltr">{order.delivery_date}</bdi>
                      </span>
                    </div>

                    {/* Garment & Specs Row */}
                    <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-muted/30 border border-border/50">
                      <span className="text-foreground font-medium truncate">
                        <bdi dir="ltr">{order.quantity}×</bdi> {garmentName}
                      </span>
                      <span className="text-muted-foreground text-[11px] truncate max-w-[140px]">
                        {order.fabric_color || order.fabric_brand || ordersQueueT.standardFabric}
                      </span>
                    </div>

                    {/* Stage & Balance Status Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={stageConfig.variant} className="text-[10px] px-2 py-0.5">
                          {language === 'ur' ? stageConfig.labelUr : stageConfig.labelEn}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1 text-xs">
                        <span className={cn("text-muted-foreground text-[11px]", language === 'ur' ? 'font-urdu-serif' : '')}>
                          {ordersQueueT.balanceDue}
                        </span>
                        {order.balance_due === 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                            {ordersQueueT.paid}
                          </span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400 font-bold font-mono">
                            <bdi dir="ltr">Rs. {order.balance_due.toLocaleString()}</bdi>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                      {/* WhatsApp Receipt Button */}
                      <button
                        type="button"
                        data-testid="mobile-whatsapp-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenWhatsApp(order);
                        }}
                        className="h-11 min-h-[44px] px-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer active:scale-95 transition-all"
                        title={ordersQueueT.whatsappInquiry}
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span className={cn(language === 'ur' ? 'font-urdu-serif' : '')}>{ordersQueueT.receiptBtn}</span>
                      </button>

                      {/* Thermal Print Button */}
                      <button
                        type="button"
                        data-testid="mobile-print-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPrint(order);
                        }}
                        className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl border border-border bg-muted/30 text-muted-foreground hover:text-foreground flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all"
                        title={ordersQueueT.printBtn}
                      >
                        <Printer className="h-4 w-4" />
                      </button>

                      {/* Next Stage Advancement Button */}
                      {nextInfo ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSingleOrderAdvance(order.id);
                          }}
                          className="h-11 min-h-[44px] flex-1 rounded-xl border border-gold/40 bg-gold/15 text-gold hover:bg-gold/25 flex items-center justify-center gap-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                        >
                          <span className={cn(language === 'ur' ? 'font-urdu-serif' : '')}>{nextInfo.label}</span>
                        </button>
                      ) : (
                        <div className="h-11 min-h-[44px] flex-1 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 text-xs font-semibold">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className={cn(language === 'ur' ? 'font-urdu-serif' : '')}>{ordersQueueT.completedBtn}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* DESKTOP PIPELINE VIEWPORT (hidden md:block)                       */}
        {/* ================================================================= */}
        <div className="hidden md:block space-y-4">
          {/* 1. Header with View Toggle & Action Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tracking-wider uppercase text-gold">
                  {ordersQueueT.activeQueue}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  <bdi dir="ltr">{orders.length}</bdi> {ordersQueueT.totalOrders}
                </span>
              </div>
              <h1 className={cn("text-2xl sm:text-3xl font-bold tracking-tight text-foreground", language === 'ur' ? 'font-urdu-serif' : '')}>
                {ordersQueueT.pageTitle}
              </h1>
              <p className={cn("text-xs text-muted-foreground", language === 'ur' ? 'font-urdu-serif' : '')}>
                {ordersQueueT.pageSubtitle}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {/* View Mode Toggle (Spreadsheet List vs Kanban Pipeline) */}
              <div className="flex items-center rounded-xl border border-border bg-card p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer',
                    viewMode === 'list'
                      ? 'bg-gold/15 text-gold border border-gold/30 font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  aria-pressed={viewMode === 'list'}
                  aria-label="Switch to Spreadsheet Data List View"
                >
                  <List className="h-3.5 w-3.5" />
                  <span className={cn(language === 'ur' ? 'font-urdu-serif' : '')}>{ordersQueueT.viewList}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('kanban')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer',
                    viewMode === 'kanban'
                      ? 'bg-gold/15 text-gold border border-gold/30 font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  aria-pressed={viewMode === 'kanban'}
                  aria-label="Switch to Kanban Pipeline Board View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className={cn(language === 'ur' ? 'font-urdu-serif' : '')}>{ordersQueueT.viewKanban}</span>
                </button>
              </div>

              {/* New Booking CTA Button */}
              <Link href="/orders/new">
                <Button
                  variant="default"
                  size="sm"
                  className="gap-1.5 bg-gold text-neutral-950 hover:bg-gold-hover font-semibold shadow-xs"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className={cn(language === 'ur' ? 'font-urdu-serif' : '')}>{ordersQueueT.bookSuit}</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* 2. Zero-Mock Clean-Slate Empty State (When workshop queue is 0) */}
          {!isLoading && orders.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 sm:p-16 flex flex-col items-center justify-center text-center space-y-4 my-8 shadow-xs">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold shadow-xs">
                <Scissors className="h-8 w-8 text-gold" />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h2 className={cn("text-xl font-bold text-foreground", language === 'ur' ? 'font-urdu-serif' : '')}>
                  {ordersQueueT.noOrdersTitle}
                </h2>
                <p className={cn("text-xs sm:text-sm text-muted-foreground", language === 'ur' ? 'font-urdu-serif' : '')}>
                  {ordersQueueT.noOrdersSub}
                </p>
              </div>
              <Link href="/orders/new" className="pt-2">
                <Button
                  variant="default"
                  size="md"
                  className="gap-2 bg-gold text-neutral-950 hover:bg-gold-hover font-semibold shadow-sm transition-all hover:scale-105"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span className={cn(language === 'ur' ? 'font-urdu-serif' : '')}>{ordersQueueT.bookFirstSuit}</span>
                </Button>
              </Link>
            </div>
          )}

          {/* 3. Search & Urgency Pill Bar (Visible when orders exist) */}
          {orders.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Urgency Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setUrgencyFilter('ALL')}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer border',
                    urgencyFilter === 'ALL'
                      ? 'bg-gold/15 text-gold border-gold/40 font-semibold'
                      : 'bg-card text-muted-foreground hover:text-foreground border-border'
                  )}
                >
                  {ordersQueueT.filterAll} (<bdi dir="ltr">{orders.length}</bdi>)
                </button>
                <button
                  type="button"
                  onClick={() => setUrgencyFilter('TODAY')}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer border',
                    urgencyFilter === 'TODAY'
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 font-semibold'
                      : 'bg-card text-muted-foreground hover:text-amber-700 dark:hover:text-amber-300 border-border'
                  )}
                >
                  <Calendar className="h-3 w-3 text-amber-500" />
                  <span>{ordersQueueT.dueToday}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUrgencyFilter('OVERDUE')}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer border',
                    urgencyFilter === 'OVERDUE'
                      ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40 font-semibold'
                      : 'bg-card text-muted-foreground hover:text-rose-700 dark:hover:text-rose-300 border-border'
                  )}
                >
                  <AlertCircle className="h-3 w-3 text-rose-500" />
                  <span>{ordersQueueT.overdue}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUrgencyFilter('READY')}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer border',
                    urgencyFilter === 'READY'
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 font-semibold'
                      : 'bg-card text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-300 border-border'
                  )}
                >
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span>{ordersQueueT.readyForPickup}</span>
                </button>
              </div>

              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <Input
                  type="search"
                  placeholder={ordersQueueT.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="h-3.5 w-3.5 text-gold" />}
                  className={cn(
                    "h-9 text-xs bg-card border-border text-foreground placeholder:text-muted-foreground rounded-xl",
                    language === 'ur' ? 'font-urdu-serif placeholder:font-urdu-serif' : ''
                  )}
                />
              </div>

              {/* Staff Craftsman Filter & Reset */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <div className="flex items-center gap-1.5 text-xs">
                  <Users className="h-3.5 w-3.5 text-gold" />
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="h-9 rounded-xl border border-border bg-card px-2.5 text-xs text-foreground focus:border-gold/50 focus:outline-none"
                    aria-label="Filter by assigned staff member"
                  >
                    <option value="ALL">{ordersQueueT.allCraftsmen}</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </div>

                {(searchQuery || urgencyFilter !== 'ALL' || selectedStaffId !== 'ALL') && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setUrgencyFilter('ALL');
                      setSelectedStaffId('ALL');
                    }}
                    className={cn("h-9 px-2 text-xs text-muted-foreground hover:text-foreground", language === 'ur' ? 'font-urdu-serif' : '')}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    {ordersQueueT.resetFilters}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* 4. Main Viewport: Spreadsheet Table OR Kanban Board */}
          {orders.length > 0 && (
            viewMode === 'list' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>
                    {ordersQueueT.showingOrders} <bdi dir="ltr">{filteredOrders.length}</bdi> {ordersQueueT.totalOrders}
                  </span>
                  <span className="font-mono text-gold font-semibold">
                    {ordersQueueT.totalValue}: <bdi dir="ltr">Rs. {filteredOrders.reduce((s, o) => s + o.total_amount, 0).toLocaleString()}</bdi>
                  </span>
                </div>

                {filteredOrders.length > 0 ? (
                  <div className="overflow-x-auto w-full rounded-2xl border border-border bg-card shadow-xs">
                    <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                      <thead>
                        <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          <th className="py-3 px-4">{ordersQueueT.thOrderNumber}</th>
                          <th className="py-3 px-4">{ordersQueueT.thCustomer}</th>
                          <th className="py-3 px-4">{ordersQueueT.thGarment}</th>
                          <th className="py-3 px-4">{ordersQueueT.thStage}</th>
                          <th className="py-3 px-4">{ordersQueueT.thDue}</th>
                          <th className="py-3 px-4 text-right">{ordersQueueT.thBalance}</th>
                          <th className="py-3 px-4 text-right">{ordersQueueT.thActions}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {filteredOrders.map((order) => {
                          const customer = customerMap.get(order.customer_id);
                          const stageConfig = STAGE_CONFIG[order.status] || {
                            labelEn: order.status,
                            labelUr: order.status,
                            variant: 'status-booked',
                          };
                          const garmentName =
                            GARMENT_DISPLAY_NAMES[order.garment_type]?.[language] || order.garment_type;
                          const urgencyInfo = getDeliveryUrgency(order.delivery_date);

                          return (
                            <tr
                              key={order.id}
                              data-testid="order-row-desktop"
                              onClick={() => handleInspectOrder(order)}
                              className="group transition-colors hover:bg-muted/30 cursor-pointer border-b border-border/50"
                            >
                              {/* 1. Order Number */}
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="flex flex-col">
                                  <span className="font-mono text-xs font-bold text-gold group-hover:text-gold-hover transition-colors">
                                    <bdi dir="ltr">#{order.order_number}</bdi>
                                  </span>
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    <bdi dir="ltr">{order.booking_date?.split('T')[0] || ''}</bdi>
                                  </span>
                                </div>
                              </td>

                              {/* 2. Customer Name & Phone */}
                              <td className="py-3 px-4">
                                <div className="flex flex-col leading-tight">
                                  <span className="font-semibold text-foreground">
                                    {customer?.full_name || ordersQueueT.walkInCustomer}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground font-mono">
                                    {customer?.phone ? (
                                      <a
                                        href={`tel:${customer.phone}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="hover:text-gold hover:underline"
                                      >
                                        <bdi dir="ltr">{customer.phone}</bdi>
                                      </a>
                                    ) : (
                                      <span>{ordersQueueT.noPhone}</span>
                                    )}
                                  </span>
                                </div>
                              </td>

                              {/* 3. Garment & Fabric */}
                              <td className="py-3 px-4">
                                <div className="flex flex-col leading-tight">
                                  <span className="text-xs font-medium text-foreground">
                                    <bdi dir="ltr">{order.quantity}×</bdi> {garmentName}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                                    {order.fabric_color || order.fabric_brand || ordersQueueT.standardFabric}
                                  </span>
                                </div>
                              </td>

                              {/* 4. Production Stage Badge */}
                              <td className="py-3 px-4 whitespace-nowrap">
                                <Badge variant={stageConfig.variant} className="text-[10px]">
                                  {language === 'ur' ? stageConfig.labelUr : stageConfig.labelEn}
                                </Badge>
                              </td>

                              {/* 5. Schedule (Due Date) */}
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={cn(
                                      'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                                      urgencyInfo.urgency === 'critical' &&
                                        'border-rose-500/40 bg-rose-500/15 text-rose-600 dark:text-rose-300 animate-pulse',
                                      urgencyInfo.urgency === 'warning' &&
                                        'border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300',
                                      urgencyInfo.urgency === 'safe' &&
                                        'border-border bg-muted/40 text-muted-foreground'
                                    )}
                                  >
                                    <bdi dir="ltr">{order.delivery_date}</bdi>
                                  </span>
                                </div>
                              </td>

                              {/* 6. Balance Due */}
                              <td className="py-3 px-4 whitespace-nowrap text-right">
                                {order.balance_due === 0 ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>{ordersQueueT.paid}</span>
                                  </span>
                                ) : (
                                  <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                                    <bdi dir="ltr">Rs. {order.balance_due.toLocaleString()}</bdi>
                                  </span>
                                )}
                              </td>

                              {/* 7. Action Icons */}
                              <td className="py-3 px-4 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    data-testid="desktop-whatsapp-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenWhatsApp(order);
                                    }}
                                    title={ordersQueueT.whatsappInquiry}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-all hover:bg-emerald-500/20 cursor-pointer"
                                    aria-label={`Send WhatsApp for order ${order.order_number}`}
                                  >
                                    <MessageSquare className="h-3.5 w-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    data-testid="desktop-print-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenPrint(order);
                                    }}
                                    title={ordersQueueT.printBtn}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground cursor-pointer"
                                    aria-label={`Print thermal tag for order ${order.order_number}`}
                                  >
                                    <Printer className="h-3.5 w-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    data-testid="desktop-inspect-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleInspectOrder(order);
                                    }}
                                    title={ordersQueueT.inspectorTitle}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold/30 bg-gold/10 text-gold transition-all hover:bg-gold/20 cursor-pointer"
                                    aria-label={`Inspect details for order ${order.order_number}`}
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center bg-card shadow-xs">
                    <Search className="h-8 w-8 text-muted-foreground/60 mb-2" />
                    <h3 className={cn("text-xs font-semibold text-foreground", language === 'ur' ? 'font-urdu-serif' : '')}>
                      {ordersQueueT.noFilterMatchesTitle}
                    </h3>
                    <p className={cn("mt-1 text-[11px] text-muted-foreground max-w-sm", language === 'ur' ? 'font-urdu-serif' : '')}>
                      {ordersQueueT.noFilterMatchesSub}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('');
                        setUrgencyFilter('ALL');
                        setSelectedStaffId('ALL');
                      }}
                      className={cn("mt-3 text-xs border-border text-foreground", language === 'ur' ? 'font-urdu-serif' : '')}
                    >
                      {ordersQueueT.clearFilterBtn}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="min-w-0">
                <PipelineBoard
                  orders={filteredOrders}
                  customers={customers}
                  staff={staff}
                  onOrdersChange={setOrders}
                  onStatusLogAppend={(log) => setStatusLogs((prev) => [...prev, log])}
                  onOpenWhatsApp={handleOpenWhatsApp}
                  onOpenPrint={handleOpenPrint}
                />
              </div>
            )
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 5. TOP-LEVEL DRAWERS & MODALS                                       */}
      {/* =================================================================== */}
      <OrderInspectorDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        order={inspectorOrder}
        customer={inspectorOrder ? customerMap.get(inspectorOrder.customer_id) : null}
        assignedCutter={
          inspectorOrder?.assigned_cutter_id
            ? staffMap.get(inspectorOrder.assigned_cutter_id)
            : null
        }
        assignedStitcher={
          inspectorOrder?.assigned_stitcher_id
            ? staffMap.get(inspectorOrder.assigned_stitcher_id)
            : null
        }
        onAdvanceStage={handleSingleOrderAdvance}
        onRollbackStage={handleSingleOrderRollback}
        onOpenWhatsApp={handleOpenWhatsApp}
        onOpenPrint={handleOpenPrint}
      />

      {/* WhatsApp Receipt & Alert Modal */}
      <WhatsAppReceiptModal
        open={whatsAppModalOpen}
        onOpenChange={setWhatsAppModalOpen}
        order={selectedWhatsAppOrder}
        customer={selectedWhatsAppOrder ? customerMap.get(selectedWhatsAppOrder.customer_id) : null}
        shop={shop || defaultMockShop}
      />

      {/* Thermal Slip & Fabric Tag Modal */}
      <ThermalSlipModal
        open={printModalOpen}
        onOpenChange={setPrintModalOpen}
        order={selectedPrintOrder}
        customer={selectedPrintOrder ? customerMap.get(selectedPrintOrder.customer_id) : null}
        shop={shop || defaultMockShop}
      />
    </AppShell>
  );
}
