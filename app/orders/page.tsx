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
import {
  mockOrders as initialMockOrders,
  mockCustomers as initialMockCustomers,
  mockStaff as initialMockStaff,
  mockOrderStatusLogs as initialMockLogs,
  mockShop,
} from '@/lib/mock-data';
import type { GarmentOrder, Customer, Staff, OrderStatusLog, OrderStatus } from '@/types/tailor';

type ViewMode = 'list' | 'kanban';
type UrgencyFilter = 'ALL' | 'TODAY' | 'READY' | 'OVERDUE';

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
  const [orders, setOrders] = React.useState<GarmentOrder[]>(initialMockOrders);
  const [customers] = React.useState<Customer[]>(initialMockCustomers);
  const [staff] = React.useState<Staff[]>(initialMockStaff);
  const [statusLogs, setStatusLogs] = React.useState<OrderStatusLog[]>(initialMockLogs);

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

  // Minimalist Search & Filter states (No filter wall)
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [urgencyFilter, setUrgencyFilter] = React.useState<UrgencyFilter>('ALL');
  const [selectedStaffId, setSelectedStaffId] = React.useState<string>('ALL');

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

    // Keep drawer in sync
    setInspectorOrder((prev) => (prev?.id === orderId ? updatedOrder : prev));

    setStatusLogs((prev) => [
      ...prev,
      {
        id: `h${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        order_id: orderId,
        previous_status: currentOrder.status,
        new_status: nextStatus,
        changed_by: currentOrder.assigned_cutter_id || null,
        notes: `Stage advanced from ${currentOrder.status} to ${nextStatus} via workshop list.`,
        created_at: new Date().toISOString(),
      },
    ]);
  };

  // Stage Rollback Handler
  const handleSingleOrderRollback = (orderId: string) => {
    const currentOrder = orders.find((o) => o.id === orderId);
    if (!currentOrder || currentOrder.status === 'BOOKED') return;

    const currentCol = PIPELINE_COLUMNS.find((col) =>
      col.statuses.includes(currentOrder.status)
    );
    if (!currentCol || !currentCol.prevStatus) return;

    const prevStatus = currentCol.prevStatus;

    const updatedOrder: GarmentOrder = {
      ...currentOrder,
      status: prevStatus,
      actual_delivery_date: null,
      updated_at: new Date().toISOString(),
    };

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? updatedOrder : o))
    );

    // Keep drawer in sync
    setInspectorOrder((prev) => (prev?.id === orderId ? updatedOrder : prev));

    setStatusLogs((prev) => [
      ...prev,
      {
        id: `h${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        order_id: orderId,
        previous_status: currentOrder.status,
        new_status: prevStatus,
        changed_by: currentOrder.assigned_cutter_id || null,
        notes: `Stage rolled back from ${currentOrder.status} to ${prevStatus} via workshop list.`,
        created_at: new Date().toISOString(),
      },
    ]);
  };

  // Filter pipeline orders
  const filteredOrders = React.useMemo(() => {
    return orders.filter((order) => {
      const customer = customerMap.get(order.customer_id);
      const query = searchQuery.trim().toLowerCase();

      // 1. Text Search Filter (Order #, Customer name, Customer phone)
      if (query) {
        const matchesOrderNumber = order.order_number.toLowerCase().includes(query);
        const matchesCustomerName = customer?.full_name.toLowerCase().includes(query) ?? false;
        const matchesPhone = customer?.phone.includes(query) ?? false;
        const matchesAlternatePhone = customer?.alternate_phone?.includes(query) ?? false;

        if (!matchesOrderNumber && !matchesCustomerName && !matchesPhone && !matchesAlternatePhone) {
          return false;
        }
      }

      // 2. Urgency Filter (Activated by top KPI cards)
      if (urgencyFilter !== 'ALL') {
        const urgencyInfo = getDeliveryUrgency(order.delivery_date);
        if (urgencyFilter === 'TODAY') {
          if (urgencyInfo.daysDiff !== 0) return false;
        } else if (urgencyFilter === 'READY') {
          if (order.status !== 'READY_FOR_DELIVERY' && order.status !== 'READY_FOR_TRIAL') {
            return false;
          }
        } else if (urgencyFilter === 'OVERDUE') {
          if (urgencyInfo.daysDiff >= 0 || order.status === 'COMPLETED') return false;
        }
      }

      // 3. Staff Assignment Filter
      if (selectedStaffId !== 'ALL') {
        if (
          order.assigned_cutter_id !== selectedStaffId &&
          order.assigned_stitcher_id !== selectedStaffId
        ) {
          return false;
        }
      }

      return true;
    });
  }, [orders, customerMap, searchQuery, urgencyFilter, selectedStaffId]);

  // Metrics summary
  const totalWorkshopOrders = orders.length;
  const activeQueueOrders = orders.filter((o) => o.status !== 'COMPLETED').length;
  const todayDeliveriesCount = orders.filter((o) => getDeliveryUrgency(o.delivery_date).daysDiff === 0 && o.status !== 'COMPLETED').length;
  const overdueCount = orders.filter((o) => getDeliveryUrgency(o.delivery_date).daysDiff < 0 && o.status !== 'COMPLETED').length;
  const readyForPickupCount = orders.filter((o) => o.status === 'READY_FOR_DELIVERY').length;
  const totalPipelineValue = orders
    .filter((o) => o.status !== 'COMPLETED')
    .reduce((sum, o) => sum + o.total_amount, 0);

  return (
    <AppShell activeRoute="/orders">
      <div className="space-y-4 max-w-7xl mx-auto p-4 sm:p-6">
        {/* ================================================================= */}
        {/* 1. Page Header: Title & View Switcher (No Duplicate CTA)          */}
        {/* ================================================================= */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white flex items-center gap-2.5">
              <span>Workshop Production Pipeline</span>
              <span className="font-urdu-serif text-base font-normal text-gold/80" dir="rtl">
                ورکشاپ پروڈکشن پائپ لائن
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">
              High-density queue tracker, stage advancements, and garment inspector.
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.03] p-1 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
                viewMode === 'list'
                  ? 'bg-gold text-[#0B0C0E] shadow-sm font-semibold'
                  : 'text-gray-400 hover:text-white'
              )}
              aria-label="List Table View"
            >
              <List className="h-3.5 w-3.5" />
              <span>List View</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
                viewMode === 'kanban'
                  ? 'bg-gold text-[#0B0C0E] shadow-sm font-semibold'
                  : 'text-gray-400 hover:text-white'
              )}
              aria-label="Kanban Board View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. Top KPI Metric Ribbon (Acts as interactive filter cards)        */}
        {/* ================================================================= */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
          {/* Active Queue */}
          <div
            onClick={() => setUrgencyFilter('ALL')}
            className={cn(
              'premium-glass-card p-3.5 flex flex-col justify-between cursor-pointer transition-all duration-200',
              urgencyFilter === 'ALL' ? 'border-gold/40 bg-gold/[0.04]' : 'hover:border-white/10'
            )}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Active Queue
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-white">
                <bdi dir="ltr">{activeQueueOrders}</bdi>
              </span>
              <span className="text-[11px] font-mono text-gold">
                <bdi dir="ltr">Rs. {totalPipelineValue.toLocaleString()}</bdi>
              </span>
            </div>
          </div>

          {/* Today's Deliveries */}
          <div
            onClick={() => setUrgencyFilter(urgencyFilter === 'TODAY' ? 'ALL' : 'TODAY')}
            className={cn(
              'premium-glass-card p-3.5 flex flex-col justify-between cursor-pointer transition-all duration-200',
              urgencyFilter === 'TODAY'
                ? 'border-amber-500/60 bg-amber-500/[0.12] shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                : todayDeliveriesCount > 0
                ? 'border-amber-500/40 bg-amber-500/[0.06] hover:border-amber-500/60'
                : 'hover:border-white/10'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                Due Today
              </span>
              <Calendar className="h-3 w-3 text-amber-400" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span
                className={cn(
                  'text-xl font-bold font-mono',
                  todayDeliveriesCount > 0 ? 'text-amber-300' : 'text-white'
                )}
              >
                <bdi dir="ltr">{todayDeliveriesCount}</bdi>
              </span>
              <span className="text-[10px] text-amber-400/80 font-medium">
                {todayDeliveriesCount > 0 ? 'Urgent' : 'Clear'}
              </span>
            </div>
          </div>

          {/* Overdue */}
          <div
            onClick={() => setUrgencyFilter(urgencyFilter === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
            className={cn(
              'premium-glass-card p-3.5 flex flex-col justify-between cursor-pointer transition-all duration-200',
              urgencyFilter === 'OVERDUE'
                ? 'border-rose-500/60 bg-rose-500/[0.12] shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                : overdueCount > 0
                ? 'border-rose-500/40 bg-rose-500/[0.06] hover:border-rose-500/60'
                : 'hover:border-white/10'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-300">
                Overdue
              </span>
              <AlertCircle className="h-3 w-3 text-rose-400" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span
                className={cn(
                  'text-xl font-bold font-mono',
                  overdueCount > 0 ? 'text-rose-400 animate-pulse' : 'text-white'
                )}
              >
                <bdi dir="ltr">{overdueCount}</bdi>
              </span>
              <span className="text-[10px] text-rose-400/80 font-medium">
                {overdueCount > 0 ? 'Delayed' : 'Zero'}
              </span>
            </div>
          </div>

          {/* Ready for Pickup */}
          <div
            onClick={() => setUrgencyFilter(urgencyFilter === 'READY' ? 'ALL' : 'READY')}
            className={cn(
              'premium-glass-card p-3.5 flex flex-col justify-between cursor-pointer transition-all duration-200',
              urgencyFilter === 'READY'
                ? 'border-emerald-500/60 bg-emerald-500/[0.12] shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                : readyForPickupCount > 0
                ? 'border-emerald-500/40 bg-emerald-500/[0.06] hover:border-emerald-500/60'
                : 'hover:border-white/10'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                Ready for Pickup
              </span>
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-emerald-400">
                <bdi dir="ltr">{readyForPickupCount}</bdi>
              </span>
              <span className="text-[10px] text-emerald-400/80 font-medium">
                Alert Ready
              </span>
            </div>
          </div>

          {/* Completed / Delivered */}
          <div className="hidden lg:flex premium-glass-card p-3.5 flex-col justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Total Completed
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-white">
                <bdi dir="ltr">{orders.filter((o) => o.status === 'COMPLETED').length}</bdi>
              </span>
              <span className="text-[11px] text-gray-500 font-mono">
                / {totalWorkshopOrders} Total
              </span>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3. Streamlined Search Toolbar (No redundant filter wall)           */}
        {/* ================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 rounded-xl border border-white/10 bg-[#121316]/80 backdrop-blur-xl p-2.5 shadow-xl">
          {/* Search Box */}
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

            {/* Reset Filters button if any active */}
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

        {/* ================================================================= */}
        {/* 4. Main Viewport: Tight High-Density Table OR Kanban Board        */}
        {/* ================================================================= */}
        {viewMode === 'list' ? (
          /* =============================================================== */
          /* HIGH-DENSITY DATA LIST (RAZOR-SHARP SPREADSHEET TABLE)          */
          /* =============================================================== */
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-400 px-1">
              <span>Showing {filteredOrders.length} orders</span>
              <span className="font-mono text-gold">
                Total: <bdi dir="ltr">Rs. {filteredOrders.reduce((s, o) => s + o.total_amount, 0).toLocaleString()}</bdi>
              </span>
            </div>

            {filteredOrders.length > 0 ? (
              /* Mobile-safe overflow wrapper */
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
                      const isEidRush =
                        order.fabric_notes?.toLowerCase().includes('eid') ||
                        order.fabric_notes?.toLowerCase().includes('urgent');

                      return (
                        <tr
                          key={order.id}
                          onClick={() => handleInspectOrder(order)}
                          className="group transition-colors hover:bg-white/[0.03] cursor-pointer border-b border-white/5"
                        >
                          {/* 1. Order Number */}
                          <td className="py-2 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-gold group-hover:text-gold-hover transition-colors">
                                #{order.order_number}
                              </span>
                              {isEidRush && (
                                <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-1 py-0.1 text-[9px] font-semibold text-amber-300">
                                  <Sparkles className="h-2 w-2" />
                                  Rush
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 2. Customer Name & Contact */}
                          <td className="py-2 px-4">
                            <div className="flex flex-col leading-tight">
                              <span className="font-medium text-gray-200 group-hover:text-white transition-colors">
                                {customer?.full_name || 'Walk-in Customer'}
                              </span>
                              <span className="text-[11px] text-gray-500 font-mono">
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
                              <span className="text-[11px] text-gray-500 truncate max-w-[170px]">
                                {order.fabric_color || order.fabric_brand || 'Standard'}
                              </span>
                            </div>
                          </td>

                          {/* 4. Production Stage */}
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

                          {/* 7. Actions (with stopPropagation technical guardrail) */}
                          <td className="py-2 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {/* 1-Click WhatsApp Trigger */}
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

                              {/* 1-Click Thermal Slip Print Trigger */}
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

                              {/* Open Inspector Trigger */}
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
          /* =============================================================== */
          /* KANBAN BOARD VIEW                                               */
          /* =============================================================== */
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
        )}
      </div>

      {/* =================================================================== */}
      {/* 5. TOP-LEVEL DRAWERS & MODALS (Outside overflow-x-auto container)   */}
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
        shop={mockShop}
      />

      {/* Thermal Slip & Fabric Tag Modal */}
      <ThermalSlipModal
        open={printModalOpen}
        onOpenChange={setPrintModalOpen}
        order={selectedPrintOrder}
        customer={selectedPrintOrder ? customerMap.get(selectedPrintOrder.customer_id) : null}
        shop={mockShop}
        initialFormat="58mm"
      />
    </AppShell>
  );
}
