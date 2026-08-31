'use client';

import * as React from 'react';
import {
  Printer,
  Search,
  Tag,
  Receipt,
  CheckSquare,
  Square,
  AlertTriangle,
  Layers,
  Sparkles,
  RefreshCw,
  Eye,
  Scissors,
  PlusCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThermalSlipModal } from '@/components/tailor/thermal-slip-modal';
import { BarcodeRenderer } from '@/components/tailor/barcode-renderer';
import { ordersDb, customersDb, printerDb, shopsDb } from '@/lib/db';
import { mockShop as defaultMockShop } from '@/lib/mock-data';
import {
  mapOrderToSlipData,
  formatCurrency,
  formatDateDisplay,
  buildFabricTagBinary,
  downloadEscPosBinaryFile,
} from '@/lib/escpos';
import { DEFAULT_PRINTER_SETTINGS } from '@/lib/db';
import type { GarmentOrder, Customer, OrderStatus, PrinterSettings, PrinterPaperWidth, Shop } from '@/types/tailor';

// ============================================================================
// Helper formatters & lookup maps
// ============================================================================

const GARMENT_LABELS: Record<string, { en: string; ur: string }> = {
  MEN_SHALWAR_KAMEEZ: { en: 'Shalwar Kameez', ur: 'مردانہ شلوار قمیض' },
  MEN_KURTA: { en: 'Men Kurta', ur: 'مردانہ کرتہ' },
  WAISTCOAT: { en: 'Waistcoat', ur: 'واسکٹ' },
  PRINCE_SUIT: { en: 'Prince Suit', ur: 'پرنس سوٹ' },
  TROUSER_SHIRT: { en: 'Trouser Shirt', ur: 'پینٹ شرٹ' },
  WOMEN_SUIT: { en: 'Ladies Suit', ur: 'زنانہ سوٹ' },
};

const STATUS_BADGES: Record<OrderStatus, { label: string; variant: 'status-booked' | 'status-cutting' | 'status-stitching' | 'status-ready' | 'status-overdue' | 'outline' }> = {
  BOOKED: { label: 'Booked', variant: 'status-booked' },
  FABRIC_RECEIVED: { label: 'Fabric Received', variant: 'status-booked' },
  IN_CUTTING: { label: 'In Cutting', variant: 'status-cutting' },
  IN_STITCHING: { label: 'In Stitching', variant: 'status-stitching' },
  KAJ_BUTTON: { label: 'Kaj & Button', variant: 'status-stitching' },
  PRESSING: { label: 'Pressing', variant: 'status-stitching' },
  READY_FOR_TRIAL: { label: 'Ready for Trial', variant: 'status-ready' },
  READY_FOR_DELIVERY: { label: 'Ready for Delivery', variant: 'status-ready' },
  COMPLETED: { label: 'Delivered', variant: 'outline' },
  CANCELLED: { label: 'Cancelled', variant: 'status-overdue' },
};

export default function PrintStationPage() {
  const [orders, setOrders] = React.useState<GarmentOrder[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [shop, setShop] = React.useState<Shop | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [urgencyFilter, setUrgencyFilter] = React.useState<string>('ALL');
  const [selectedOrderIds, setSelectedOrderIds] = React.useState<Set<string>>(new Set());

  // Hardware & Printer Settings state
  const [printerSettings, setPrinterSettings] = React.useState<PrinterSettings>({
    id: 'ps-mock-default',
    shop_id: defaultMockShop.id,
    ...DEFAULT_PRINTER_SETTINGS,
  });

  // Modal preview state
  const [activeModalOrder, setActiveModalOrder] = React.useState<GarmentOrder | null>(null);
  const [activeModalFormat, setActiveModalFormat] = React.useState<PrinterPaperWidth>('80mm');
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Live repository initialization
  React.useEffect(() => {
    let isMounted = true;
    async function loadPrintData() {
      setIsLoading(true);
      try {
        const currentShop = await shopsDb.getCurrentShop();
        if (!isMounted) return;
        setShop(currentShop || defaultMockShop);

        const targetShopId = currentShop?.id || defaultMockShop.id;
        const [loadedOrders, loadedCustomers, settings] = await Promise.all([
          ordersDb.getByShopId(targetShopId),
          customersDb.getByShopId(targetShopId),
          printerDb.getByShopId(targetShopId),
        ]);

        if (isMounted) {
          setOrders(loadedOrders);
          setCustomers(loadedCustomers);
          if (settings) {
            setPrinterSettings(settings);
            setActiveModalFormat(settings.paper_width);
          }
        }
      } catch (err) {
        console.warn('Print station data fetch error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadPrintData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Customer map
  const customerMap = React.useMemo(() => {
    const map = new Map<string, Customer>();
    for (const c of customers) {
      map.set(c.id, c);
    }
    return map;
  }, [customers]);

  // Filter orders
  const filteredOrders = React.useMemo(() => {
    return orders.filter((order) => {
      const cust = customerMap.get(order.customer_id) || order.customer;
      const q = searchQuery.toLowerCase().trim();

      // Search match
      if (q) {
        const matchesNum = order.order_number.toLowerCase().includes(q);
        const matchesName = cust?.full_name.toLowerCase().includes(q);
        const matchesPhone = cust?.phone.toLowerCase().includes(q);
        if (!matchesNum && !matchesName && !matchesPhone) return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && order.status !== statusFilter) {
        return false;
      }

      // Urgency filter
      if (urgencyFilter !== 'ALL') {
        const now = new Date();
        const delv = new Date(order.delivery_date);
        const diffDays = Math.round((delv.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (urgencyFilter === 'OVERDUE' && diffDays >= 0) return false;
        if (urgencyFilter === 'TODAY' && diffDays !== 0) return false;
        if (urgencyFilter === 'URGENT' && diffDays > 2) return false;
      }

      return true;
    });
  }, [orders, searchQuery, statusFilter, urgencyFilter, customerMap]);

  // Aggregate metrics
  const metrics = React.useMemo(() => {
    const total = orders.length;
    const pendingTags = orders.filter((o) => o.status === 'BOOKED' || o.status === 'FABRIC_RECEIVED' || o.status === 'IN_CUTTING').length;
    const readyInvoices = orders.filter((o) => o.status === 'READY_FOR_DELIVERY' || o.status === 'READY_FOR_TRIAL').length;
    const urgentCount = orders.filter((o) => {
      const diff = Math.round((new Date(o.delivery_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return diff <= 2 && o.status !== 'COMPLETED' && o.status !== 'CANCELLED';
    }).length;

    return { total, pendingTags, readyInvoices, urgentCount };
  }, [orders]);

  // Multi-select helpers
  const handleToggleSelect = (id: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedOrderIds.size === filteredOrders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(filteredOrders.map((o) => o.id)));
    }
  };

  // Open slip modal
  const handleOpenSlipModal = (order: GarmentOrder, format: '58mm' | '80mm') => {
    setActiveModalOrder(order);
    setActiveModalFormat(format);
    setIsModalOpen(true);
  };

  // Batch Print
  const handleBatchPrint = (format: '58mm' | '80mm') => {
    if (selectedOrderIds.size === 0) return;
    const targetOrder = orders.find((o) => selectedOrderIds.has(o.id));
    if (targetOrder) {
      handleOpenSlipModal(targetOrder, format);
    }
  };

  return (
    <AppShell activeRoute="/print">
      <div className="space-y-6 pb-36 md:pb-20 pb-safe max-w-7xl mx-auto p-4 sm:p-6 md:p-8 pt-4 sm:pt-6">
        {/* Page Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold shadow-[0_0_15px_rgba(212,175,55,0.15)]">
                <Printer className="h-5 w-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
                <span>Thermal Printing Counter</span>
                <span className="font-urdu-serif text-lg font-normal text-gold/80" dir="rtl">
                  پرنٹنگ کاؤنٹر
                </span>
              </h1>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-gray-400">
              Generate 58mm fabric staple tags for cutting tables and 80mm customer booking receipts with Code 128 barcodes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a href="/orders/new">
              <Button
                variant="default"
                size="sm"
                className="gap-1.5 bg-gold text-[#0B0C0E] hover:bg-gold-hover font-semibold shadow-[0_0_20px_rgba(212,175,55,0.2)]"
              >
                <PlusCircle className="h-4 w-4" />
                <span>New Booking</span>
              </Button>
            </a>
          </div>
        </div>

        {/* ====================================================================
            ZERO-MOCK CLEAN-SLATE EMPTY STATE
            ==================================================================== */}
        {!isLoading && orders.length === 0 && (
          <div className="premium-glass-card p-10 sm:p-16 flex flex-col items-center justify-center text-center space-y-4 border-gold/20 shadow-[0_0_30px_rgba(212,175,55,0.08)] my-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-gold/30 bg-gold/10 text-gold shadow-[0_0_20px_rgba(212,175,55,0.2)]">
              <Printer className="h-8 w-8 text-gold" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h2 className="text-xl font-bold text-white">No Orders Scheduled for Printing</h2>
              <p className="font-urdu-serif text-sm text-gold/90" dir="rtl">
                پرنٹنگ کے لیے کوئی آرڈر موجود نہیں
              </p>
              <p className="text-xs sm:text-sm text-gray-400">
                Once you book suits in the production queue, you can generate 58mm fabric staple tags and 80mm customer booking receipts here with 1-click thermal triggers.
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
                  پہلا سوٹ بک کریں
                </span>
              </Button>
            </a>
          </div>
        )}

        {/* ====================================================================
            METRIC SUMMARY CARDS (When orders exist)
            ==================================================================== */}
        {orders.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Card className="premium-glass-card border-white/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400">Total Orders</span>
                    <Layers className="h-4 w-4 text-gray-400" />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-white">{metrics.total}</p>
                  <p className="mt-0.5 text-[11px] text-gray-500">In workshop database</p>
                </CardContent>
              </Card>

              <Card className="premium-glass-card border-white/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gold">Needs 58mm Tag</span>
                    <Tag className="h-4 w-4 text-gold" />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-gold">{metrics.pendingTags}</p>
                  <p className="mt-0.5 text-[11px] text-gray-500">Booked & in cutting queue</p>
                </CardContent>
              </Card>

              <Card className="premium-glass-card border-white/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-rose-400">Urgent / Due 48h</span>
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-rose-400">{metrics.urgentCount}</p>
                  <p className="mt-0.5 text-[11px] text-gray-500">Priority rush cutting tags</p>
                </CardContent>
              </Card>

              <Card className="premium-glass-card border-white/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-emerald-400">Ready for 80mm Slip</span>
                    <Receipt className="h-4 w-4 text-emerald-400" />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-emerald-400">{metrics.readyInvoices}</p>
                  <p className="mt-0.5 text-[11px] text-gray-500">Ready for customer pickup</p>
                </CardContent>
              </Card>
            </div>

            {/* Filter and Action Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <Input
                  type="search"
                  placeholder="Search order #, customer name, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="h-4 w-4 text-gold" />}
                  className="h-9 text-xs bg-[#0B0C0E]/60 border-white/10"
                />
              </div>

              {selectedOrderIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBatchPrint('58mm')}
                    className="gap-1.5 text-xs border-gold/30 bg-gold/10 text-gold hover:bg-gold/20"
                  >
                    <Tag className="h-3.5 w-3.5" />
                    <span>Print 58mm Tag ({selectedOrderIds.size})</span>
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleBatchPrint('80mm')}
                    className="gap-1.5 text-xs bg-gold text-[#0B0C0E] hover:bg-gold-hover font-semibold shadow-sm"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    <span>Print 80mm Slip ({selectedOrderIds.size})</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto w-full rounded-xl border border-white/5 bg-[#121316]/80 backdrop-blur-xl shadow-2xl">
              <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.01] text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    <th className="py-3 px-4 w-10">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-gray-400 hover:text-white"
                        aria-label="Select all orders"
                      >
                        {selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0 ? (
                          <CheckSquare className="h-4 w-4 text-gold" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Garment</th>
                    <th className="py-3 px-4">Stage</th>
                    <th className="py-3 px-4">Delivery Due</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                    <th className="py-3 px-4 text-right">Print Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredOrders.map((order) => {
                    const cust = customerMap.get(order.customer_id) || order.customer;
                    const badge = STATUS_BADGES[order.status] || { label: order.status, variant: 'outline' };
                    const garmentLabel = GARMENT_LABELS[order.garment_type] || { en: order.garment_type, ur: '' };
                    const isSelected = selectedOrderIds.has(order.id);

                    return (
                      <tr
                        key={order.id}
                        className={cn(
                          'group transition-colors hover:bg-white/[0.02] border-b border-white/5',
                          isSelected && 'bg-gold/5'
                        )}
                      >
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleSelect(order.id)}
                            className="text-gray-400 hover:text-white"
                            aria-label={`Select order ${order.order_number}`}
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-gold" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-mono text-xs font-bold text-gold">
                              #{order.order_number}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono">
                              {order.barcode_token || order.order_number}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-200">{cust?.full_name || 'Walk-in'}</span>
                            <span className="text-[11px] text-gray-400 font-mono">{cust?.phone}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-200">
                              <bdi dir="ltr">{order.quantity}x</bdi> {garmentLabel.en}
                            </span>
                            <span className="text-[10px] text-gray-400">{order.fabric_color || 'Customer Fabric'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={badge.variant} className="text-[10px] px-2 py-0.5">
                            {badge.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-gray-300">
                          {order.delivery_date}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-mono text-xs font-semibold text-rose-400">
                            <bdi dir="ltr">Rs. {order.balance_due.toLocaleString()}</bdi>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenSlipModal(order, '58mm')}
                              className="h-7 px-2 text-[11px] border-gold/30 bg-gold/10 text-gold hover:bg-gold/20"
                              title="Print 58mm Fabric Staple Tag"
                            >
                              <Tag className="h-3 w-3 mr-1" />
                              <span>58mm Tag</span>
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleOpenSlipModal(order, '80mm')}
                              className="h-7 px-2 text-[11px] bg-gold text-[#0B0C0E] hover:bg-gold-hover font-semibold"
                              title="Print 80mm Customer Invoice Receipt"
                            >
                              <Receipt className="h-3 w-3 mr-1" />
                              <span>80mm Slip</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Slip Modal */}
      {activeModalOrder && (
        <ThermalSlipModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          order={activeModalOrder}
          customer={customerMap.get(activeModalOrder.customer_id) || null}
          shop={shop || defaultMockShop}
          initialFormat={activeModalFormat}
        />
      )}
    </AppShell>
  );
}
