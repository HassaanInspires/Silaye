'use client';

import * as React from 'react';
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
  Sparkles,
  Scissors,
  PlusCircle,
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
import { ordersDb, customersDb, staffDb, shopsDb } from '@/lib/db';
import { mockShop as defaultMockShop } from '@/lib/mock-data';
import type { GarmentOrder, Customer, Staff, OrderStatusLog, OrderStatus, Shop } from '@/types/tailor';

type ViewMode = 'list' | 'kanban';
type UrgencyFilter = 'ALL' | 'TODAY' | 'READY' | 'OVERDUE';
type MobileStatusFilter = 'ALL' | 'CUTTING' | 'STITCHING' | 'READY' | 'DELIVERED';

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

export default function OrdersQueuePage() {
  const [orders, setOrders] = React.useState<GarmentOrder[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [staff, setStaff] = React.useState<Staff[]>([]);
  const [statusLogs, setStatusLogs] = React.useState<OrderStatusLog[]>([]);
  const [shop, setShop] = React.useState<Shop | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  // View mode defaults strictly to 'list'
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

  // Minimalist Search & Filter states
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
          setOrders(loadedOrders);
          setCustomers(loadedCustomers);
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

  // Minimalist Filter Engine
  const filteredOrders = React.useMemo(() => {
    return orders.filter((order) => {
      // 1. Text Search Filter (Order #, Customer Name, Phone)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const customer = customerMap.get(order.customer_id);
        const matchOrderNo = order.order_number.toLowerCase().includes(q);
        const matchCustName = customer?.full_name.toLowerCase().includes(q) || false;
        const matchPhone = customer?.phone.includes(q) || false;
        const matchGarment = (GARMENT_DISPLAY_NAMES[order.garment_type] || '').toLowerCase().includes(q);

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
        const matchGarment = (GARMENT_DISPLAY_NAMES[order.garment_type] || '').toLowerCase().includes(q);

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
    return {
      nextStatus: currentCol.nextStatus,
      labelUrdu: nextCol ? `اگلا: ${nextCol.labelUrdu} →` : 'اگلا مرحلہ →',
      labelEn: nextCol ? `Next: ${nextCol.label}` : 'Advance',
    };
  };

  return (
    <AppShell activeRoute="/orders">
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* ================================================================= */}
        {/* MOBILE PIPELINE VIEWPORT (md:hidden)                              */}
        {/* ================================================================= */}
        <div className="block md:hidden space-y-3">
          {/* 1. Mobile Header Bar */}
          <div className="flex items-center justify-between pb-1">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Production Queue</span>
                <span className="font-urdu-serif text-base text-gold" dir="rtl">
                  سلائی کیو
                </span>
              </h1>
              <p className="text-[11px] text-gray-400">
                {orders.length} کل آرڈرز ورکشاپ میں
              </p>
            </div>
            <a href="/orders/new">
              <Button
                size="sm"
                className="h-8 px-2.5 bg-gold text-[#0B0C0E] hover:bg-gold-hover font-semibold text-xs shadow-[0_0_12px_rgba(212,175,55,0.2)]"
              >
                <PlusCircle className="h-3.5 w-3.5 mr-1" />
                <span>نیا سوٹ</span>
              </Button>
            </a>
          </div>

          {/* 2. Sticky Top Mobile Search Bar & Horizontal Status Pills */}
          <div className="sticky top-0 z-20 bg-[#0B0C0E]/95 backdrop-blur-md pb-1 pt-0 -mx-4 px-4">
            <div className="relative">
              <Input
                type="search"
                placeholder="گاہک کا نام، فون یا آرڈر نمبر..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="h-4 w-4 text-gold" />}
                className="h-10 text-xs bg-[#121418] border-white/10 pr-9 rounded-xl focus:border-gold/50"
              />
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 min-h-[40px] min-w-[40px] text-gray-400 hover:text-white flex items-center justify-center text-sm cursor-pointer"
                  aria-label="Clear search query"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Horizontal Scrollable Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 scrollbar-none touch-pan-x -mx-4 px-4">
              {[
                { id: 'ALL', labelUrdu: 'تمام', labelEn: 'All', count: mobileStatusCounts.all },
                { id: 'CUTTING', labelUrdu: 'کٹنگ', labelEn: 'Cutting', count: mobileStatusCounts.cutting },
                { id: 'STITCHING', labelUrdu: 'سلائی', labelEn: 'Stitching', count: mobileStatusCounts.stitching },
                { id: 'READY', labelUrdu: 'تیار', labelEn: 'Ready', count: mobileStatusCounts.ready },
                { id: 'DELIVERED', labelUrdu: 'ڈیلیورڈ', labelEn: 'Delivered', count: mobileStatusCounts.delivered },
              ].map((tab) => {
                const isActive = mobileStatusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMobileStatusFilter(tab.id as MobileStatusFilter)}
                    className={cn(
                      'shrink-0 flex items-center gap-1.5 px-3.5 h-11 min-h-[44px] rounded-full text-xs font-medium transition-all cursor-pointer border',
                      isActive
                        ? 'bg-gold/15 text-gold border-gold/40 shadow-[0_0_10px_rgba(212,175,55,0.2)] font-semibold'
                        : 'bg-[#121418] text-gray-400 border-white/5 hover:text-gray-200'
                    )}
                  >
                    <span className="font-urdu-sans">{tab.labelUrdu}</span>
                    <span className="text-[10px] opacity-70">({tab.labelEn})</span>
                    <span
                      className={cn(
                        'px-1.5 py-0.2 rounded-full text-[10px] font-mono',
                        isActive ? 'bg-gold/30 text-gold font-bold' : 'bg-white/5 text-gray-400'
                      )}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Mobile Order Cards List */}
          {mobileFilteredOrders.length === 0 ? (
            <div className="premium-glass-card p-8 text-center space-y-3 border-white/10 my-4">
              <Search className="h-8 w-8 text-gray-500 mx-auto" />
              <h3 className="text-sm font-semibold text-white">کوئی آرڈر نہیں ملا</h3>
              <p className="text-xs text-gray-400">
                دیے گئے فلٹر یا تلاش کے مطابق کوئی آرڈر موجود نہیں ہے۔
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setMobileStatusFilter('ALL');
                }}
                className="text-xs border-white/10"
              >
                تمام فلٹرز صاف کریں
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {mobileFilteredOrders.map((order) => {
                const customer = customerMap.get(order.customer_id);
                const stageConfig = STAGE_BADGE_CONFIG[order.status] || {
                  label: order.status,
                  labelUrdu: '',
                  variant: 'status-booked',
                };
                const garmentName =
                  GARMENT_DISPLAY_NAMES[order.garment_type] || order.garment_type;
                const urgencyInfo = getDeliveryUrgency(order.delivery_date);
                const nextInfo = getNextStatusInfo(order.status);

                return (
                  <div
                    key={order.id}
                    onClick={() => handleInspectOrder(order)}
                    className="premium-glass-card p-3.5 border-white/10 hover:border-gold/30 active:scale-[0.99] transition-all bg-[#121418] space-y-3 shadow-md cursor-pointer"
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white truncate">
                            {customer?.full_name || 'Walk-in Customer'}
                          </span>
                          <span className="font-mono text-xs font-bold text-gold shrink-0">
                            #{order.order_number}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono">
                          {customer?.phone || 'No phone'}
                        </div>
                      </div>

                      {/* Urgency Due Date Badge */}
                      <span
                        className={cn(
                          'shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                          urgencyInfo.urgency === 'critical' &&
                            'border-rose-500/40 bg-rose-500/15 text-rose-300 animate-pulse',
                          urgencyInfo.urgency === 'warning' &&
                            'border-amber-500/40 bg-amber-500/15 text-amber-300',
                          urgencyInfo.urgency === 'safe' &&
                            'border-white/10 bg-white/5 text-gray-300'
                        )}
                      >
                        {order.delivery_date}
                      </span>
                    </div>

                    {/* Garment & Specs Row */}
                    <div className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                      <span className="text-gray-200 font-medium truncate">
                        <bdi dir="ltr">{order.quantity}×</bdi> {garmentName}
                      </span>
                      <span className="text-gray-400 text-[11px] truncate max-w-[140px]">
                        {order.fabric_color || order.fabric_brand || 'Standard'}
                      </span>
                    </div>

                    {/* Stage & Balance Status Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={stageConfig.variant} className="text-[10px] px-2 py-0.5">
                          {stageConfig.label}
                        </Badge>
                        <span className="font-urdu-sans text-xs text-gray-400" dir="rtl">
                          {stageConfig.labelUrdu}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-gray-400 text-[11px]">باقی:</span>
                        {order.balance_due === 0 ? (
                          <span className="text-emerald-400 font-semibold font-mono">Paid</span>
                        ) : (
                          <span className="text-rose-400 font-bold font-mono">
                            Rs. {order.balance_due.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      {/* WhatsApp Receipt Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenWhatsApp(order);
                        }}
                        className="h-11 min-h-[44px] px-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 flex items-center justify-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer active:scale-95 transition-all"
                        title="WhatsApp Receipt"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>رسید</span>
                      </button>

                      {/* Thermal Print Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPrint(order);
                        }}
                        className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl border border-white/10 bg-white/5 text-gray-300 hover:text-white flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all"
                        title="Print Tag"
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
                          className="h-11 min-h-[44px] flex-1 rounded-xl border border-gold/40 bg-gold/15 text-gold hover:bg-gold/25 flex items-center justify-center gap-1.5 text-xs font-bold transition-all shadow-[0_0_12px_rgba(212,175,55,0.15)] cursor-pointer active:scale-95"
                        >
                          <span className="font-urdu-sans">{nextInfo.labelUrdu}</span>
                        </button>
                      ) : (
                        <div className="h-11 min-h-[44px] flex-1 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 flex items-center justify-center gap-1 text-xs font-semibold">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>مکمل شدہ (Delivered)</span>
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
        {/* ================================================================= */}
        {/* 1. Header with View Toggle & Action Bar                           */}
        {/* ================================================================= */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider uppercase text-gold">
                Active Workshop Pipeline
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-gray-400">
                {orders.length} Total Orders
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
              <span>Production Queue</span>
              <span className="font-urdu-serif text-lg font-normal text-gold/80" dir="rtl">
                سلائی کیو
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View Mode Toggle (Spreadsheet List vs Kanban Pipeline) */}
            <div className="flex items-center rounded-xl border border-white/10 bg-[#0B0C0E]/80 p-1 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                  viewMode === 'list'
                    ? 'bg-gold/15 text-gold border border-gold/30 shadow-[0_0_10px_rgba(212,175,55,0.15)]'
                    : 'text-gray-400 hover:text-gray-200'
                )}
                aria-pressed={viewMode === 'list'}
                aria-label="Switch to Spreadsheet Data List View"
              >
                <List className="h-3.5 w-3.5" />
                <span>List</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                  viewMode === 'kanban'
                    ? 'bg-gold/15 text-gold border border-gold/30 shadow-[0_0_10px_rgba(212,175,55,0.15)]'
                    : 'text-gray-400 hover:text-gray-200'
                )}
                aria-pressed={viewMode === 'kanban'}
                aria-label="Switch to Kanban Pipeline Board View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Kanban</span>
              </button>
            </div>

            {/* New Booking CTA Button */}
            <a href="/orders/new">
              <Button
                variant="default"
                size="sm"
                className="gap-1.5 bg-gold text-[#0B0C0E] hover:bg-gold-hover font-semibold shadow-[0_0_20px_rgba(212,175,55,0.2)]"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Book Suit</span>
                <span className="sm:hidden">New</span>
              </Button>
            </a>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. Zero-Mock Clean-Slate Empty State (When workshop queue is 0)  */}
        {/* ================================================================= */}
        {!isLoading && orders.length === 0 && (
          <div className="premium-glass-card p-10 sm:p-16 flex flex-col items-center justify-center text-center space-y-4 border-gold/20 shadow-[0_0_30px_rgba(212,175,55,0.08)] my-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-gold/30 bg-gold/10 text-gold shadow-[0_0_20px_rgba(212,175,55,0.2)]">
              <Scissors className="h-8 w-8 text-gold" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h2 className="text-xl font-bold text-white">No Orders in Production</h2>
              <p className="font-urdu-serif text-sm text-gold/90" dir="rtl">
                کوئی آرڈر زیر تکمیل نہیں ہے
              </p>
              <p className="text-xs sm:text-sm text-gray-400">
                Your workshop queue is clear. Start booking bespoke suits to track cutting, stitching, and trial deadlines with 1-tap WhatsApp alerts.
              </p>
            </div>
            <a href="/orders/new" className="pt-2">
              <Button
                variant="default"
                size="md"
                className="gap-2 bg-gold text-[#0B0C0E] hover:bg-gold-hover font-semibold shadow-[0_0_25px_rgba(212,175,55,0.3)] transition-all hover:scale-105"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Book First Suit</span>
                <span className="font-urdu-sans text-xs opacity-80" dir="rtl">
                  نیا آرڈر بک کریں
                </span>
              </Button>
            </a>
          </div>
        )}

        {/* ================================================================= */}
        {/* 3. Search & Urgency Pill Bar (Visible when orders exist)           */}
        {/* ================================================================= */}
        {orders.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Urgency Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setUrgencyFilter('ALL')}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer',
                  urgencyFilter === 'ALL'
                    ? 'bg-white/15 text-white border border-white/20'
                    : 'bg-white/5 text-gray-400 hover:text-gray-200 border border-transparent'
                )}
              >
                All ({orders.length})
              </button>
              <button
                type="button"
                onClick={() => setUrgencyFilter('TODAY')}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer',
                  urgencyFilter === 'TODAY'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-white/5 text-gray-400 hover:text-amber-300 border border-transparent'
                )}
              >
                <Calendar className="h-3 w-3 text-amber-400" />
                <span>Due Today</span>
              </button>
              <button
                type="button"
                onClick={() => setUrgencyFilter('OVERDUE')}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer',
                  urgencyFilter === 'OVERDUE'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-white/5 text-gray-400 hover:text-rose-300 border border-transparent'
                )}
              >
                <AlertCircle className="h-3 w-3 text-rose-400" />
                <span>Overdue</span>
              </button>
              <button
                type="button"
                onClick={() => setUrgencyFilter('READY')}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer',
                  urgencyFilter === 'READY'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-white/5 text-gray-400 hover:text-emerald-300 border border-transparent'
                )}
              >
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                <span>Ready for Pickup</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Input
                type="search"
                placeholder="Search customer, phone, order #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="h-3.5 w-3.5 text-gold" />}
                className="h-8 text-xs bg-[#0B0C0E]/60 border-white/10"
              />
            </div>

            {/* Staff Craftsman Filter & Reset */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <div className="flex items-center gap-1.5 text-xs">
                <Users className="h-3.5 w-3.5 text-gold" />
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="h-8 rounded-lg border border-white/10 bg-[#0B0C0E]/60 px-2.5 text-xs text-gray-200 focus:border-gold/50 focus:outline-none"
                  aria-label="Filter by assigned staff member"
                >
                  <option value="ALL">All Craftsmen</option>
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
                  className="h-8 px-2 text-xs text-gray-400 hover:text-white"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 4. Main Viewport: Tight High-Density Table OR Kanban Board        */}
        {/* ================================================================= */}
        {orders.length > 0 && (
          viewMode === 'list' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                <span>Showing {filteredOrders.length} orders</span>
                <span className="font-mono text-gold">
                  Total: <bdi dir="ltr">Rs. {filteredOrders.reduce((s, o) => s + o.total_amount, 0).toLocaleString()}</bdi>
                </span>
              </div>

              {filteredOrders.length > 0 ? (
                <div className="overflow-x-auto w-full rounded-xl border border-white/5 bg-[#121316]/80 backdrop-blur-xl shadow-2xl">
                  <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.01] text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        <th className="py-2.5 px-4">Order #</th>
                        <th className="py-2.5 px-4">Customer Details</th>
                        <th className="py-2.5 px-4">Garment & Fabric</th>
                        <th className="py-2.5 px-4">Stage</th>
                        <th className="py-2.5 px-4">Target Due</th>
                        <th className="py-2.5 px-4 text-right">Balance</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredOrders.map((order) => {
                        const customer = customerMap.get(order.customer_id);
                        const stageConfig = STAGE_BADGE_CONFIG[order.status] || {
                          label: order.status,
                          labelUrdu: '',
                          variant: 'status-booked',
                        };
                        const garmentName =
                          GARMENT_DISPLAY_NAMES[order.garment_type] || order.garment_type;
                        const urgencyInfo = getDeliveryUrgency(order.delivery_date);

                        return (
                          <tr
                            key={order.id}
                            onClick={() => handleInspectOrder(order)}
                            className="group transition-colors hover:bg-white/[0.03] cursor-pointer border-b border-white/5"
                          >
                            {/* 1. Order Number */}
                            <td className="py-2 px-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="font-mono text-xs font-bold text-gold group-hover:text-gold-hover transition-colors">
                                  #{order.order_number}
                                </span>
                                <span className="text-[10px] text-gray-500">
                                  {order.booking_date?.split('T')[0] || ''}
                                </span>
                              </div>
                            </td>

                            {/* 2. Customer Name & Phone */}
                            <td className="py-2 px-4">
                              <div className="flex flex-col leading-tight">
                                <span className="font-medium text-gray-200">
                                  {customer?.full_name || 'Walk-in Customer'}
                                </span>
                                <span className="text-[11px] text-gray-400 font-mono">
                                  {customer?.phone || 'No phone'}
                                </span>
                              </div>
                            </td>

                            {/* 3. Garment & Fabric */}
                            <td className="py-2 px-4">
                              <div className="flex flex-col leading-tight">
                                <span className="text-xs font-medium text-gray-200">
                                  <bdi dir="ltr">{order.quantity}x</bdi> {garmentName}
                                </span>
                                <span className="text-[10px] text-gray-400 truncate max-w-[160px]">
                                  {order.fabric_color || order.fabric_brand || 'Standard Fabric'}
                                </span>
                              </div>
                            </td>

                            {/* 4. Stage Badge */}
                            <td className="py-2 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <Badge variant={stageConfig.variant} className="text-[10px] px-2 py-0.5">
                                  {stageConfig.label}
                                </Badge>
                                <span
                                  className="font-urdu-sans text-[10px] text-gray-500 hidden sm:inline"
                                  dir="rtl"
                                >
                                  {stageConfig.labelUrdu}
                                </span>
                              </div>
                            </td>

                            {/* 5. Target Delivery Due Date */}
                            <td className="py-2 px-4 whitespace-nowrap">
                              <div className="flex flex-col leading-tight">
                                <span className="text-xs text-gray-300 font-mono">
                                  {order.delivery_date}
                                </span>
                                <span
                                  className={cn(
                                    'text-[10px] font-medium',
                                    urgencyInfo.urgency === 'critical' &&
                                      'text-rose-400 animate-pulse font-semibold',
                                    urgencyInfo.urgency === 'warning' &&
                                      'text-amber-400 font-semibold',
                                    urgencyInfo.urgency === 'safe' &&
                                      'text-gray-500'
                                  )}
                                >
                                  {urgencyInfo.label}
                                </span>
                              </div>
                            </td>

                            {/* 6. Balance Due */}
                            <td className="py-2 px-4 text-right whitespace-nowrap">
                              <div className="flex flex-col items-end leading-tight">
                                {order.balance_due === 0 ? (
                                  <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                    <span>Paid</span>
                                  </span>
                                ) : (
                                  <span className="font-mono text-xs font-semibold text-rose-400">
                                    <bdi dir="ltr">Rs. {order.balance_due.toLocaleString()}</bdi>
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* 7. Actions */}
                            <td className="py-2 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenWhatsApp(order);
                                  }}
                                  title="Send WhatsApp Receipt / Alert"
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 transition-all hover:bg-emerald-500/20 hover:border-emerald-500/40"
                                  aria-label={`Send WhatsApp for order ${order.order_number}`}
                                >
                                  <MessageSquare className="h-3 w-3" />
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenPrint(order);
                                  }}
                                  title="Print Thermal Fabric Tag & Invoice"
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 transition-all hover:bg-white/10 hover:text-white"
                                  aria-label={`Print thermal tag for order ${order.order_number}`}
                                >
                                  <Printer className="h-3 w-3" />
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleInspectOrder(order);
                                  }}
                                  title="Inspect Garment Specs & Measurements"
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-gold/30 bg-gold/10 text-gold transition-all hover:bg-gold/20 hover:border-gold/50"
                                  aria-label={`Inspect details for order ${order.order_number}`}
                                >
                                  <ChevronRight className="h-3.5 w-3.5" />
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
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 p-8 text-center text-gray-400 bg-white/[0.01]">
                  <Search className="h-8 w-8 text-gray-600 mb-2" />
                  <h3 className="text-xs font-semibold text-white">No orders match your filter criteria</h3>
                  <p className="mt-1 text-[11px] text-gray-400 max-w-sm">
                    Try adjusting your search query, urgency filter, or assigned staff selection.
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
                    className="mt-3 text-xs border-white/10 bg-white/5 hover:bg-white/10 text-gray-200"
                  >
                    Clear All Filters
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
