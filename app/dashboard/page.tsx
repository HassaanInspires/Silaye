'use client';

import * as React from 'react';
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
  Layers,
  ArrowUpRight,
  TrendingUp,
  Flame,
  Calendar,
  Phone,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WhatsAppReceiptModal } from '@/components/tailor/whatsapp-receipt-modal';
import { ThermalSlipModal } from '@/components/tailor/thermal-slip-modal';
import {
  mockOrders as initialMockOrders,
  mockCustomers as initialMockCustomers,
  mockStaff,
  mockShop,
} from '@/lib/mock-data';
import type { GarmentOrder, Customer, OrderStatus } from '@/types/tailor';

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
  const [orders] = React.useState<GarmentOrder[]>(initialMockOrders);
  const [customers] = React.useState<Customer[]>(initialMockCustomers);

  // Modal states for 1-click interactions
  const [whatsAppModalOpen, setWhatsAppModalOpen] = React.useState<boolean>(false);
  const [selectedWhatsAppOrder, setSelectedWhatsAppOrder] = React.useState<GarmentOrder | null>(null);

  const [printModalOpen, setPrintModalOpen] = React.useState<boolean>(false);
  const [selectedPrintOrder, setSelectedPrintOrder] = React.useState<GarmentOrder | null>(null);

  // Customer map lookup
  const customerMap = React.useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach((c) => map.set(c.id, c));
    return map;
  }, [customers]);

  // Urgent Orders List (Due today, tomorrow, or in progress)
  const urgentOrders = React.useMemo(() => {
    // Select active, high-priority orders for the watchlist
    return orders
      .filter((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED')
      .slice(0, 5);
  }, [orders]);

  const handleOpenWhatsApp = (order: GarmentOrder) => {
    setSelectedWhatsAppOrder(order);
    setWhatsAppModalOpen(true);
  };

  const handleOpenPrint = (order: GarmentOrder) => {
    setSelectedPrintOrder(order);
    setPrintModalOpen(true);
  };

  const handleFocusSearch = () => {
    // Focus search input in AppShell top bar
    const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement | null;
    if (searchInput) {
      searchInput.focus();
      searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <AppShell activeRoute="/dashboard">
      <div className="flex-1 space-y-6 p-8 pt-6 max-w-7xl mx-auto">
        {/* ------------------------------------------------------------------ */}
        {/* 1. TOP HEADER & GREETING BAR                                        */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="text-xs font-semibold tracking-widest uppercase text-gold">
                Live Workshop Operations
              </span>
              <span className="text-xs text-muted-foreground">• Wah Cantt Master Counter</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
              <span>Command Dashboard</span>
              <span className="font-urdu-serif text-lg font-normal text-gold/80" dir="rtl">
                ورکشاپ ڈیش بورڈ
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-2 text-xs text-gray-300 backdrop-blur-md">
              <Calendar className="h-3.5 w-3.5 text-gold" />
              <span>
                {new Date().toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <a href="/orders">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-200"
              >
                <span>View Full Queue</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-gold" />
              </Button>
            </a>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* 2. TOP KPI METRICS RIBBON (4-Column Responsive Grid)               */}
        {/* ------------------------------------------------------------------ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {/* Card 1: Active Queue */}
          <div className="premium-glass-card p-5 relative overflow-hidden transition-all duration-200 hover:border-white/10 group">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-gray-400">
                  Active Queue
                </span>
                <span className="font-urdu-sans text-xs text-gray-500" dir="rtl">
                  زیر تکمیل
                </span>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold shadow-[0_0_15px_rgba(212,175,55,0.15)]">
                <Scissors className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-white">
                  <bdi dir="ltr">42</bdi>
                </span>
                <span className="text-xs font-medium text-gray-400">Orders in Flow</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                <span className="text-gray-400">Total Workshop Value</span>
                <span className="font-semibold text-gold">
                  <bdi dir="ltr">Rs. 148,000</bdi>
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-gray-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-400" />
              <span>7 In Cutting</span>
              <span className="text-gray-600">•</span>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span>12 In Stitching</span>
            </div>
          </div>

          {/* Card 2: Due Today */}
          <div className="premium-glass-card p-5 relative overflow-hidden transition-all duration-200 hover:border-amber-500/30 group border-amber-500/20 bg-gradient-to-br from-amber-500/[0.06] to-transparent">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-amber-300">
                  Due Today
                </span>
                <span className="font-urdu-sans text-xs text-amber-400/80" dir="rtl">
                  آج کی ڈلیوری
                </span>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Clock className="h-4 w-4 animate-pulse" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-amber-300">
                  <bdi dir="ltr">6</bdi>
                </span>
                <span className="text-xs font-semibold text-amber-400/90">Suits Scheduled</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                <span className="text-gray-400">Due Today Value</span>
                <span className="font-semibold text-amber-300">
                  <bdi dir="ltr">Rs. 21,000</bdi>
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-400/80">
              <Flame className="h-3 w-3 text-amber-400" />
              <span>Ready for Final Pickup / Pressing</span>
            </div>
          </div>

          {/* Card 3: Overdue */}
          <div className="premium-glass-card p-5 relative overflow-hidden transition-all duration-200 hover:border-rose-500/40 group border-rose-500/20 bg-gradient-to-br from-rose-500/[0.06] to-transparent">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-rose-300">
                  Overdue
                </span>
                <span className="font-urdu-sans text-xs text-rose-400/80" dir="rtl">
                  تاخیر شدہ
                </span>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/15 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-rose-300">
                  <bdi dir="ltr">1</bdi>
                </span>
                <span className="text-xs font-semibold text-rose-400">Suit Delayed ⚠️</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                <span className="text-gray-400">Delayed Value</span>
                <span className="font-semibold text-rose-300">
                  <bdi dir="ltr">Rs. 3,500</bdi>
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-rose-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
              <span>Action Required • 1 Day Late</span>
            </div>
          </div>

          {/* Card 4: Unsettled Khata */}
          <div className="premium-glass-card p-5 relative overflow-hidden transition-all duration-200 hover:border-white/10 group">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-gray-400">
                  Unsettled Khata
                </span>
                <span className="font-urdu-sans text-xs text-gray-500" dir="rtl">
                  واجب الادا
                </span>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold tracking-tight text-rose-300">
                  <bdi dir="ltr">Rs. 68,500</bdi>
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                <span className="text-gray-400">Debtors Balance</span>
                <span className="font-medium text-gray-300">
                  <bdi dir="ltr">14</bdi> Clients Pending
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px]">
              <a
                href="/khata"
                className="inline-flex items-center gap-1 text-gold hover:text-gold-hover transition-colors font-medium"
              >
                <span>Send Reminders</span>
                <ChevronRight className="h-3 w-3" />
              </a>
              <span className="font-urdu-sans text-xs text-gray-500" dir="rtl">
                کھاتہ وصولی
              </span>
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
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                Quick Counter Actions
              </span>
              <span className="text-[11px] text-gray-500">
                1-Tap triggers for workshop reception
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Button 1: Book New Suit (Gold Primary) */}
            <a href="/orders/new">
              <Button
                variant="default"
                size="md"
                className="gap-2 bg-gold text-[#0B0C0E] hover:bg-gold-hover font-semibold shadow-[0_0_25px_rgba(212,175,55,0.25)] transition-all hover:scale-[1.02]"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Book New Suit</span>
                <span className="font-urdu-sans text-xs font-normal opacity-80" dir="rtl">
                  نیا سوٹ
                </span>
              </Button>
            </a>

            {/* Button 2: Find Customer (Ghost/Glass) */}
            <Button
              variant="outline"
              size="md"
              onClick={handleFocusSearch}
              className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white backdrop-blur-md"
            >
              <Search className="h-4 w-4 text-gold" />
              <span>Find Customer</span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-gray-400 font-mono">
                /
              </span>
            </Button>

            {/* Button 3: Print Daily Run-Sheet (Outline) */}
            <a href="/print">
              <Button
                variant="outline"
                size="md"
                className="gap-2 border-white/15 bg-transparent hover:bg-white/5 text-gray-300 hover:text-white"
              >
                <Printer className="h-4 w-4 text-gray-400" />
                <span>Print Daily Run-Sheet</span>
                <span className="font-urdu-sans text-xs text-gray-400" dir="rtl">
                  شیٹ پرنٹ
                </span>
              </Button>
            </a>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* 4. URGENT DELIVERIES WATCHLIST (Due Today & Tomorrow)              */}
        {/* ------------------------------------------------------------------ */}
        <div className="premium-glass-card overflow-hidden">
          {/* Card Header Chrome */}
          <div className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-white">
                    Urgent Deliveries Watchlist
                  </h2>
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    Due Today & Tomorrow
                  </span>
                </div>
                <p className="text-xs text-gray-400 flex items-center gap-2">
                  <span>Priority orders requiring immediate workshop attention</span>
                  <span className="font-urdu-serif text-xs text-gold/80" dir="rtl">
                    فوری ترسیلات - آج اور کل
                  </span>
                </p>
              </div>
            </div>

            <a
              href="/orders"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gold hover:text-gold-hover transition-colors"
            >
              <span>View All Orders in Queue</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Table Container with required overflow-x-auto wrapper */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01] text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  <th className="py-3.5 px-5">Order #</th>
                  <th className="py-3.5 px-4">Customer Details</th>
                  <th className="py-3.5 px-4">Garment & Fabric</th>
                  <th className="py-3.5 px-4">Production Stage</th>
                  <th className="py-3.5 px-4 text-right">Balance Due</th>
                  <th className="py-3.5 px-5 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {urgentOrders.map((order) => {
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
                                <bdi dir="ltr">Rs. {order.balance_due.toLocaleString()}</bdi>
                              </span>
                              <span className="block text-[10px] text-gray-500">
                                Total: <bdi dir="ltr">Rs. {order.total_amount.toLocaleString()}</bdi>
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
                })}
              </tbody>
            </table>
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
          shop={mockShop}
        />
      )}

      {selectedPrintOrder && (
        <ThermalSlipModal
          open={printModalOpen}
          onOpenChange={setPrintModalOpen}
          order={selectedPrintOrder}
          customer={customerMap.get(selectedPrintOrder.customer_id) || null}
          shop={mockShop}
        />
      )}
    </AppShell>
  );
}
