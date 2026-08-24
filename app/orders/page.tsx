'use client';

import * as React from 'react';
import {
  LayoutGrid,
  List,
  Search,
  PlusCircle,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Filter,
  Users,
  RefreshCw,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { OrderCard, getDeliveryUrgency } from '@/components/tailor/order-card';
import { PipelineBoard, PIPELINE_COLUMNS } from '@/components/tailor/pipeline-board';
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

type ViewMode = 'kanban' | 'list';
type UrgencyFilter = 'ALL' | 'TODAY' | 'READY' | 'OVERDUE';

export default function OrdersQueuePage() {
  const [orders, setOrders] = React.useState<GarmentOrder[]>(initialMockOrders);
  const [customers] = React.useState<Customer[]>(initialMockCustomers);
  const [staff] = React.useState<Staff[]>(initialMockStaff);
  const [statusLogs, setStatusLogs] = React.useState<OrderStatusLog[]>(initialMockLogs);

  // View mode
  const [viewMode, setViewMode] = React.useState<ViewMode>('kanban');

  // WhatsApp Receipt Modal state
  const [whatsAppModalOpen, setWhatsAppModalOpen] = React.useState<boolean>(false);
  const [selectedWhatsAppOrder, setSelectedWhatsAppOrder] = React.useState<GarmentOrder | null>(null);

  // Thermal Print Modal state
  const [printModalOpen, setPrintModalOpen] = React.useState<boolean>(false);
  const [selectedPrintOrder, setSelectedPrintOrder] = React.useState<GarmentOrder | null>(null);

  const handleOpenWhatsApp = (order: GarmentOrder) => {
    setSelectedWhatsAppOrder(order);
    setWhatsAppModalOpen(true);
  };

  const handleOpenPrint = (order: GarmentOrder) => {
    setSelectedPrintOrder(order);
    setPrintModalOpen(true);
  };

  // Search & Filter states
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [urgencyFilter, setUrgencyFilter] = React.useState<UrgencyFilter>('ALL');
  const [selectedStaffId, setSelectedStaffId] = React.useState<string>('ALL');
  const [selectedStageFilter, setSelectedStageFilter] = React.useState<string>('ALL');

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

  // Handle stage change from single card action
  const handleSingleOrderAdvance = (orderId: string) => {
    const currentOrder = orders.find((o) => o.id === orderId);
    if (!currentOrder || currentOrder.status === 'COMPLETED') return;

    const currentCol = PIPELINE_COLUMNS.find((col) =>
      col.statuses.includes(currentOrder.status)
    );
    if (!currentCol) return;

    const nextStatus = currentCol.nextStatus;
    if (nextStatus === currentOrder.status) return;

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: nextStatus,
              actual_delivery_date:
                nextStatus === 'COMPLETED' ? new Date().toISOString() : o.actual_delivery_date,
              updated_at: new Date().toISOString(),
            }
          : o
      )
    );

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

  const handleSingleOrderRollback = (orderId: string) => {
    const currentOrder = orders.find((o) => o.id === orderId);
    if (!currentOrder || currentOrder.status === 'BOOKED') return;

    const currentCol = PIPELINE_COLUMNS.find((col) =>
      col.statuses.includes(currentOrder.status)
    );
    if (!currentCol || !currentCol.prevStatus) return;

    const prevStatus = currentCol.prevStatus;

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: prevStatus,
              actual_delivery_date: null,
              updated_at: new Date().toISOString(),
            }
          : o
      )
    );

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

      // 2. Urgency Filter
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

      // 4. Specific Stage Filter (primarily for List View)
      if (selectedStageFilter !== 'ALL') {
        const targetCol = PIPELINE_COLUMNS.find((col) => col.id === selectedStageFilter);
        if (targetCol && !targetCol.statuses.includes(order.status)) {
          return false;
        }
      }

      return true;
    });
  }, [orders, customerMap, searchQuery, urgencyFilter, selectedStaffId, selectedStageFilter]);

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
      <div className="space-y-6 max-w-full">
        {/* ================================================================= */}
        {/* 1. Page Header: Title, Metrics, View Mode Toggle & New Booking CTA */}
        {/* ================================================================= */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground font-sans">
                Workshop Production Pipeline
              </h1>
              <span className="font-urdu-serif text-lg text-primary" dir="rtl">
                ورکشاپ پروڈکشن کیو
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Real-time garment tracking, stage transitions, and urgent deadline queue.
            </p>
          </div>

          {/* Action Row: View Switcher + New Order */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border border-border bg-card p-1">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  viewMode === 'kanban'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                aria-label="Kanban Board View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Kanban</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  viewMode === 'list'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                aria-label="List Table View"
              >
                <List className="h-3.5 w-3.5" />
                <span>List View</span>
              </button>
            </div>

            {/* New Order Button */}
            <a href="/orders/new">
              <Button variant="default" size="sm" className="gap-1.5 whitespace-nowrap bg-primary text-primary-foreground hover:bg-gold-hover">
                <PlusCircle className="h-4 w-4" />
                <span>New Booking</span>
              </Button>
            </a>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. Top Metric Ribbon & Stage Counter Strip                         */}
        {/* ================================================================= */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {/* Active Queue */}
          <div className="flex flex-col rounded-xl border border-border/80 bg-card p-3.5 shadow-sm">
            <span className="text-xs font-medium text-muted-foreground">Active Queue</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-foreground">
                {activeQueueOrders}
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                Rs. {totalPipelineValue.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Today's Deliveries */}
          <div
            onClick={() => setUrgencyFilter(urgencyFilter === 'TODAY' ? 'ALL' : 'TODAY')}
            className={cn(
              'flex flex-col rounded-xl border p-3.5 shadow-sm cursor-pointer transition-all',
              todayDeliveriesCount > 0
                ? 'border-amber-500/40 bg-amber-500/10 hover:border-amber-500/60'
                : 'border-border/80 bg-card hover:border-border'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Due Today</span>
              <Calendar className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className={cn('text-xl font-bold font-mono', todayDeliveriesCount > 0 ? 'text-amber-400' : 'text-foreground')}>
                {todayDeliveriesCount}
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
              'flex flex-col rounded-xl border p-3.5 shadow-sm cursor-pointer transition-all',
              overdueCount > 0
                ? 'border-rose-500/40 bg-rose-500/10 hover:border-rose-500/60'
                : 'border-border/80 bg-card hover:border-border'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Overdue</span>
              <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className={cn('text-xl font-bold font-mono', overdueCount > 0 ? 'text-rose-400 animate-pulse' : 'text-foreground')}>
                {overdueCount}
              </span>
              <span className="text-[10px] text-rose-400/80 font-medium">
                {overdueCount > 0 ? 'Action Required' : 'Zero'}
              </span>
            </div>
          </div>

          {/* Ready for Delivery */}
          <div
            onClick={() => setUrgencyFilter(urgencyFilter === 'READY' ? 'ALL' : 'READY')}
            className={cn(
              'flex flex-col rounded-xl border p-3.5 shadow-sm cursor-pointer transition-all',
              readyForPickupCount > 0
                ? 'border-status-ready/40 bg-status-ready/10 hover:border-status-ready/60'
                : 'border-border/80 bg-card hover:border-border'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Ready for Pickup</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-status-ready" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-status-ready">
                {readyForPickupCount}
              </span>
              <span className="text-[10px] text-status-ready/80 font-medium">
                Alert Customer
              </span>
            </div>
          </div>

          {/* Completed / Delivered */}
          <div className="hidden lg:flex flex-col rounded-xl border border-border/80 bg-card p-3.5 shadow-sm">
            <span className="text-xs font-medium text-muted-foreground">Total Completed</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-foreground">
                {orders.filter((o) => o.status === 'COMPLETED').length}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                / {totalWorkshopOrders} Total
              </span>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3. Stage Counter Pills Bar                                         */}
        {/* ================================================================= */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setSelectedStageFilter('ALL')}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-all whitespace-nowrap border',
              selectedStageFilter === 'ALL'
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-card border-border/80 text-muted-foreground hover:border-foreground/30'
            )}
          >
            <span>All Stages</span>
            <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-bold">
              {orders.length}
            </span>
          </button>

          {PIPELINE_COLUMNS.map((col) => {
            const count = orders.filter((o) => col.statuses.includes(o.status)).length;
            const isSelected = selectedStageFilter === col.id;

            return (
              <button
                key={col.id}
                type="button"
                onClick={() => setSelectedStageFilter(isSelected ? 'ALL' : col.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-all whitespace-nowrap border',
                  isSelected
                    ? cn(col.accentBg, col.accentColor, 'border-current shadow-sm')
                    : 'bg-card border-border/80 text-muted-foreground hover:border-foreground/30'
                )}
              >
                <span>{col.label}</span>
                <span className={cn('rounded-full px-1.5 py-0.2 text-[10px] font-bold border', col.accentBg, col.accentColor)}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ================================================================= */}
        {/* 4. Filter Toolbar: Search Input + Urgency Chips + Staff Filter     */}
        {/* ================================================================= */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-xl border border-border/80 bg-card p-3.5 shadow-sm">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Input
              type="search"
              placeholder="Search customer name, mobile, order #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
              className="h-9 text-xs"
            />
          </div>

          {/* Quick Filter Chips & Staff Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Urgency Filter Group */}
            <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setUrgencyFilter('ALL')}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-colors',
                  urgencyFilter === 'ALL'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setUrgencyFilter('TODAY')}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-colors',
                  urgencyFilter === 'TODAY'
                    ? 'bg-amber-500/20 text-amber-300 font-semibold'
                    : 'text-muted-foreground hover:text-amber-400'
                )}
              >
                Today ({todayDeliveriesCount})
              </button>
              <button
                type="button"
                onClick={() => setUrgencyFilter('OVERDUE')}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-colors',
                  urgencyFilter === 'OVERDUE'
                    ? 'bg-rose-500/20 text-rose-300 font-semibold'
                    : 'text-muted-foreground hover:text-rose-400'
                )}
              >
                Overdue ({overdueCount})
              </button>
              <button
                type="button"
                onClick={() => setUrgencyFilter('READY')}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-colors',
                  urgencyFilter === 'READY'
                    ? 'bg-status-ready/20 text-status-ready font-semibold'
                    : 'text-muted-foreground hover:text-status-ready'
                )}
              >
                Ready ({readyForPickupCount})
              </button>
            </div>

            {/* Staff Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                aria-label="Filter by assigned staff member"
              >
                <option value="ALL">All Staff Craftsmen</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Filters button if any active */}
            {(searchQuery || urgencyFilter !== 'ALL' || selectedStaffId !== 'ALL' || selectedStageFilter !== 'ALL') && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setUrgencyFilter('ALL');
                  setSelectedStaffId('ALL');
                  setSelectedStageFilter('ALL');
                }}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* 5. Main Viewport: Kanban Board OR Flat List Table                  */}
        {/* ================================================================= */}
        {viewMode === 'kanban' ? (
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
        ) : (
          /* List Table View */
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>Showing {filteredOrders.length} matching orders</span>
              <span className="font-mono">
                Total: Rs. {filteredOrders.reduce((s, o) => s + o.total_amount, 0).toLocaleString()}
              </span>
            </div>

            {filteredOrders.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredOrders.map((order) => {
                  const customer = customerMap.get(order.customer_id);
                  const cutter = order.assigned_cutter_id ? staffMap.get(order.assigned_cutter_id) : null;
                  const stitcher = order.assigned_stitcher_id ? staffMap.get(order.assigned_stitcher_id) : null;

                  return (
                    <OrderCard
                      key={order.id}
                      order={order}
                      customer={customer}
                      assignedCutter={cutter}
                      assignedStitcher={stitcher}
                      onAdvance={handleSingleOrderAdvance}
                      onRollback={handleSingleOrderRollback}
                      onOpenWhatsApp={handleOpenWhatsApp}
                      onOpenPrint={handleOpenPrint}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground bg-card/40">
                <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <h3 className="text-sm font-semibold text-foreground">No orders match your filter criteria</h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm">
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
                    setSelectedStageFilter('ALL');
                  }}
                  className="mt-4 text-xs"
                >
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        )}

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
      </div>
    </AppShell>
  );
}
