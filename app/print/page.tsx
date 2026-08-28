'use client';

import * as React from 'react';
import {
  Printer,
  Search,
  Filter,
  Tag,
  Receipt,
  Download,
  CheckSquare,
  Square,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpDown,
  Sparkles,
  RefreshCw,
  Eye,
  Scissors,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThermalSlipModal } from '@/components/tailor/thermal-slip-modal';
import { BarcodeRenderer } from '@/components/tailor/barcode-renderer';
import {
  mockOrders,
  mockCustomers,
  mockShop,
  mockStaff,
} from '@/lib/mock-data';
import {
  mapOrderToSlipData,
  formatCurrency,
  formatDateDisplay,
  buildFabricTagBinary,
  downloadEscPosBinaryFile,
} from '@/lib/escpos';
import { printerDb, DEFAULT_PRINTER_SETTINGS } from '@/lib/db';
import type { GarmentOrder, Customer, OrderStatus, GarmentType, PrinterSettings, PrinterPaperWidth } from '@/types/tailor';

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
  const [orders] = React.useState<GarmentOrder[]>(mockOrders);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [urgencyFilter, setUrgencyFilter] = React.useState<string>('ALL');
  const [selectedOrderIds, setSelectedOrderIds] = React.useState<Set<string>>(new Set());

  // Hardware & Printer Settings state
  const [printerSettings, setPrinterSettings] = React.useState<PrinterSettings>({
    id: 'ps-mock-default',
    shop_id: mockShop.id,
    ...DEFAULT_PRINTER_SETTINGS,
  });

  // Modal preview state
  const [activeModalOrder, setActiveModalOrder] = React.useState<GarmentOrder | null>(null);
  const [activeModalFormat, setActiveModalFormat] = React.useState<PrinterPaperWidth>('80mm');
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Load workshop printer settings
  React.useEffect(() => {
    let isMounted = true;
    async function loadSettings() {
      try {
        const settings = await printerDb.getByShopId(mockShop.id);
        if (isMounted && settings) {
          setPrinterSettings(settings);
          setActiveModalFormat(settings.paper_width);
        }
      } catch (err) {
        console.warn('Failed to load printer settings in print station:', err);
      }
    }
    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  // Customer map
  const customerMap = React.useMemo(() => {
    const map = new Map<string, Customer>();
    for (const c of mockCustomers) {
      map.set(c.id, c);
    }
    return map;
  }, []);

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
      <div className="space-y-6 pb-20">
        {/* Page Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Printer className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Thermal Printing Counter
              </h1>
              <Badge variant="secondary" className="font-mono text-xs">
                ESC/POS POS Hub
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate 58mm fabric staple tags for cutting tables and 80mm customer booking invoices with Code 128 barcodes.
            </p>
          </div>

          {/* Quick Action Badges */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (filteredOrders.length > 0) {
                  handleOpenSlipModal(filteredOrders[0], '58mm');
                }
              }}
              className="gap-1.5 text-xs"
            >
              <Tag className="h-3.5 w-3.5 text-primary" />
              <span>Sample 58mm Tag</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                if (filteredOrders.length > 0) {
                  handleOpenSlipModal(filteredOrders[0], '80mm');
                }
              }}
              className="gap-1.5 text-xs font-bold shadow-sm"
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>Sample 80mm Slip</span>
            </Button>
          </div>
        </div>

        {/* ====================================================================
            METRIC SUMMARY CARDS
            ==================================================================== */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="bg-card/70 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Total Orders</span>
                <Layers className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{metrics.total}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">In active workshop database</p>
            </CardContent>
          </Card>

          <Card className="bg-card/70 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-primary">Needs 58mm Tag</span>
                <Tag className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 text-2xl font-bold text-primary">{metrics.pendingTags}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Booked & in cutting queue</p>
            </CardContent>
          </Card>

          <Card className="bg-card/70 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-status-overdue">Urgent / Due 48h</span>
                <AlertTriangle className="h-4 w-4 text-status-overdue" />
              </div>
              <p className="mt-2 text-2xl font-bold text-status-overdue">{metrics.urgentCount}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Priority rush cutting tags</p>
            </CardContent>
          </Card>

          <Card className="bg-card/70 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-status-ready">Ready for 80mm Slip</span>
                <CheckCircle2 className="h-4 w-4 text-status-ready" />
              </div>
              <p className="mt-2 text-2xl font-bold text-status-ready">{metrics.readyInvoices}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Ready for customer pickup</p>
            </CardContent>
          </Card>
        </div>

        {/* ====================================================================
            SEARCH & FILTER TOOLBAR
            ==================================================================== */}
        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by order # (DP-2026-0801), customer name, or phone..."
                  className="pl-9 bg-background/80"
                />
              </div>

              {/* Status Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto text-xs">
                {['ALL', 'BOOKED', 'IN_CUTTING', 'IN_STITCHING', 'READY_FOR_DELIVERY', 'COMPLETED'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={cn(
                      'rounded-lg px-2.5 py-1 font-medium transition-colors',
                      statusFilter === st
                        ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                        : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    {st === 'ALL' ? 'All Stages' : st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Urgency Filter Bar & Batch Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium">Urgency:</span>
                {['ALL', 'URGENT', 'TODAY', 'OVERDUE'].map((urg) => (
                  <button
                    key={urg}
                    type="button"
                    onClick={() => setUrgencyFilter(urg)}
                    className={cn(
                      'rounded-md px-2 py-0.5 text-xs transition-colors',
                      urgencyFilter === urg
                        ? 'bg-secondary font-bold text-foreground border border-border'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {urg === 'ALL' ? 'Any Date' : urg}
                  </button>
                ))}
              </div>

              {/* Batch Action Buttons */}
              {selectedOrderIds.size > 0 && (
                <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-1 animate-in fade-in duration-200">
                  <span className="font-bold text-primary">
                    {selectedOrderIds.size} Selected
                  </span>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleBatchPrint('58mm')}
                    className="h-7 gap-1 text-xs px-2.5"
                  >
                    <Tag className="h-3 w-3" />
                    <span>Print Tags (58mm)</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBatchPrint('80mm')}
                    className="h-7 gap-1 text-xs px-2.5"
                  >
                    <Receipt className="h-3 w-3" />
                    <span>Print Invoices (80mm)</span>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ====================================================================
            ORDERS PRINT QUEUE TABLE
            ==================================================================== */}
        <Card className="border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-secondary/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-muted-foreground hover:text-foreground"
                      title="Select all"
                    >
                      {selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0 ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3">Order & Token</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Garment & Specs</th>
                  <th className="px-4 py-3">Delivery Date</th>
                  <th className="px-4 py-3 text-right">Balance Due</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Print Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Printer className="h-8 w-8 opacity-40 text-muted-foreground" />
                        <p className="text-base font-semibold text-foreground">No orders matching filter</p>
                        <p className="text-xs">Try clearing your search query or changing urgency filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const cust = customerMap.get(order.customer_id) || order.customer;
                    const garment = GARMENT_LABELS[order.garment_type] || { en: order.garment_type, ur: '' };
                    const isSelected = selectedOrderIds.has(order.id);
                    const statusBadge = STATUS_BADGES[order.status] || { label: order.status, variant: 'outline' };

                    const delv = new Date(order.delivery_date);
                    const now = new Date();
                    const diffDays = Math.round((delv.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    const isUrgent = diffDays <= 2;

                    return (
                      <tr
                        key={order.id}
                        className={cn(
                          'transition-colors hover:bg-secondary/20',
                          isSelected && 'bg-primary/5'
                        )}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSelect(order.id)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-primary" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </td>

                        {/* Order Number & Barcode Icon */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-mono font-bold text-foreground">
                              {order.order_number}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Booked: {formatDateDisplay(order.booking_date)}
                            </span>
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">
                              {cust?.full_name || 'Walk-in Customer'}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {cust?.phone || '--'}
                            </span>
                          </div>
                        </td>

                        {/* Garment & Specs */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground text-xs">
                              {garment.en} ({order.quantity || 1} Pair)
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {[order.fabric_color, order.fabric_brand].filter(Boolean).join(' • ') || 'Standard Fabric'}
                            </span>
                          </div>
                        </td>

                        {/* Delivery Date */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-foreground">
                              {formatDateDisplay(order.delivery_date)}
                            </span>
                            {isUrgent && (
                              <Badge variant="status-overdue" className="w-fit text-[10px] px-1 py-0">
                                {diffDays < 0 ? `${Math.abs(diffDays)}d Overdue` : diffDays === 0 ? 'Due Today' : `Due in ${diffDays}d`}
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* Balance Due */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-col items-end">
                            <bdi
                              dir="ltr"
                              className={cn(
                                'font-mono text-xs font-bold',
                                order.balance_due > 0 ? 'text-status-udhaar-pending' : 'text-status-ready'
                              )}
                            >
                              Rs. {formatCurrency(order.balance_due)}
                            </bdi>
                            <span className="text-[10px] text-muted-foreground">
                              Tot: Rs. {formatCurrency(order.total_amount)}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <Badge variant={statusBadge.variant} className="text-[11px]">
                            {statusBadge.label}
                          </Badge>
                        </td>

                        {/* Print Action Buttons */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* 58mm Fabric Tag */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenSlipModal(order, '58mm')}
                              className="h-8 gap-1 px-2 text-xs border-primary/40 hover:bg-primary/10 text-primary"
                              title="Print 58mm Fabric Staple Tag"
                            >
                              <Tag className="h-3.5 w-3.5" />
                              <span>58mm Tag</span>
                            </Button>

                            {/* 80mm Customer Invoice */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenSlipModal(order, '80mm')}
                              className="h-8 gap-1 px-2 text-xs hover:bg-secondary"
                              title="Print 80mm Customer Invoice"
                            >
                              <Receipt className="h-3.5 w-3.5" />
                              <span>80mm Slip</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Thermal Slip Modal */}
        <ThermalSlipModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          order={activeModalOrder}
          customer={activeModalOrder ? customerMap.get(activeModalOrder.customer_id) || activeModalOrder.customer : null}
          shop={mockShop}
          settings={printerSettings}
          initialFormat={activeModalFormat}
        />
      </div>
    </AppShell>
  );
}
