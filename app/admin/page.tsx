'use client';

import * as React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Building2,
  Users,
  Scissors,
  Wallet,
  Search,
  RefreshCw,
  Sparkles,
  Lock,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  Store,
  Layers,
  ChevronRight,
  ExternalLink,
  Power,
  PlayCircle,
  PauseCircle,
  XCircle,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { adminDb } from '@/lib/db';
import type { PlatformMetrics, AdminShopOverview, ShopStatus } from '@/types/tailor';
import { formatCurrency } from '@/lib/escpos';

// ---------------------------------------------------------------------------
// Helper Mappings & Status Badges
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  ShopStatus,
  {
    label: string;
    labelUrdu: string;
    badgeClass: string;
    dotClass: string;
  }
> = {
  ACTIVE: {
    label: 'Active',
    labelUrdu: 'فعال',
    badgeClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
    dotClass: 'bg-emerald-400 animate-pulse',
  },
  SUSPENDED: {
    label: 'Suspended',
    labelUrdu: 'معطل',
    badgeClass: 'border-rose-500/40 bg-rose-500/15 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)]',
    dotClass: 'bg-rose-400',
  },
  TRIAL: {
    label: 'Trial Mode',
    labelUrdu: 'آزمائشی',
    badgeClass: 'border-amber-500/40 bg-amber-500/15 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]',
    dotClass: 'bg-amber-400',
  },
  EXPIRED: {
    label: 'Expired',
    labelUrdu: 'ختم شدہ',
    badgeClass: 'border-neutral-500/40 bg-neutral-500/15 text-neutral-400',
    dotClass: 'bg-neutral-500',
  },
};

type FilterTab = 'ALL' | 'ACTIVE' | 'SUSPENDED' | 'TRIAL';

export default function SuperAdminDashboardPage() {
  // Access Gate State
  const [authChecking, setAuthChecking] = React.useState<boolean>(true);
  const [isSuperAdmin, setIsSuperAdmin] = React.useState<boolean>(false);

  // Platform Data State
  const [metrics, setMetrics] = React.useState<PlatformMetrics | null>(null);
  const [shops, setShops] = React.useState<AdminShopOverview[]>([]);
  const [loadingData, setLoadingData] = React.useState<boolean>(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [activeTab, setActiveTab] = React.useState<FilterTab>('ALL');

  // Status Change Dialog State
  const [selectedShop, setSelectedShop] = React.useState<AdminShopOverview | null>(null);
  const [targetStatus, setTargetStatus] = React.useState<ShopStatus | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = React.useState<boolean>(false);
  const [updatingStatus, setUpdatingStatus] = React.useState<boolean>(false);

  // Purge Test Data Dialog State
  const [shopToPurge, setShopToPurge] = React.useState<AdminShopOverview | null>(null);
  const [purgeDialogOpen, setPurgeDialogOpen] = React.useState<boolean>(false);
  const [purgeConfirmInput, setPurgeConfirmInput] = React.useState<string>('');
  const [purgingData, setPurgingData] = React.useState<boolean>(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = React.useState<{ title: string; desc: string; type: 'success' | 'error' } | null>(null);

  // Load Super Admin Gate
  React.useEffect(() => {
    let isMounted = true;

    async function checkAdmin() {
      setAuthChecking(true);
      try {
        const isSuper = await adminDb.checkIsSuperAdmin();
        if (isMounted) {
          setIsSuperAdmin(isSuper);
          setAuthChecking(false);
          if (isSuper) {
            loadPlatformData();
          }
        }
      } catch {
        if (isMounted) {
          setIsSuperAdmin(false);
          setAuthChecking(false);
        }
      }
    }

    checkAdmin();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadPlatformData = async () => {
    setLoadingData(true);
    try {
      const [metricsData, shopsData] = await Promise.all([
        adminDb.getPlatformMetrics(),
        adminDb.getAllShops(),
      ]);
      setMetrics(metricsData);
      setShops(shopsData);
    } catch (err) {
      console.error('Failed to load platform data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const showToast = (title: string, desc: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenStatusDialog = (shop: AdminShopOverview, status: ShopStatus) => {
    setSelectedShop(shop);
    setTargetStatus(status);
    setStatusDialogOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!selectedShop || !targetStatus) return;

    setUpdatingStatus(true);
    try {
      const success = await adminDb.setShopStatus(selectedShop.id, targetStatus);
      if (success) {
        // Optimistically update list
        setShops((prev) =>
          prev.map((s) => (s.id === selectedShop.id ? { ...s, status: targetStatus, updated_at: new Date().toISOString() } : s))
        );

        // Update metrics counts
        if (metrics) {
          const updatedShops = shops.map((s) => (s.id === selectedShop.id ? { ...s, status: targetStatus } : s));
          setMetrics({
            ...metrics,
            active_shops: updatedShops.filter((s) => s.status === 'ACTIVE').length,
            suspended_shops: updatedShops.filter((s) => s.status === 'SUSPENDED').length,
          });
        }

        showToast(
          'Workshop Status Updated',
          `"${selectedShop.name}" status changed to ${targetStatus}.`,
          'success'
        );
        setStatusDialogOpen(false);
      } else {
        showToast('Update Failed', 'Could not update workshop status. Try again.', 'error');
      }
    } catch (err) {
      showToast('Error', 'An unexpected error occurred while modifying status.', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleOpenPurgeDialog = (shop: AdminShopOverview) => {
    setShopToPurge(shop);
    setPurgeConfirmInput('');
    setPurgeDialogOpen(true);
  };

  const handleConfirmPurge = async () => {
    if (!shopToPurge) return;
    if (purgeConfirmInput.trim().toUpperCase() !== 'PURGE') {
      showToast('Validation Error', 'Please type PURGE in all caps to confirm.', 'error');
      return;
    }

    setPurgingData(true);
    try {
      const result = await adminDb.purgeShopTestData(shopToPurge.id);
      if (result.success) {
        // Optimistically update orders count for this workshop
        setShops((prev) =>
          prev.map((s) =>
            s.id === shopToPurge.id ? { ...s, total_orders: 0, updated_at: new Date().toISOString() } : s
          )
        );

        // Update platform metrics
        if (metrics) {
          const updatedTotalOrders = shops
            .map((s) => (s.id === shopToPurge.id ? 0 : s.total_orders))
            .reduce((acc, count) => acc + count, 0);
          setMetrics({
            ...metrics,
            total_orders: updatedTotalOrders,
          });
        }

        showToast(
          'Purge Completed',
          `Purged test data for "${shopToPurge.name}". Deleted ${result.deleted_orders} orders and ${result.deleted_khata} khata entries.`,
          'success'
        );
        setPurgeDialogOpen(false);
        setShopToPurge(null);
        setPurgeConfirmInput('');
      } else {
        showToast('Purge Failed', 'Could not purge test data. Try again.', 'error');
      }
    } catch (err) {
      console.error('Purge error:', err);
      showToast('Purge Error', err instanceof Error ? err.message : 'An error occurred during data purge.', 'error');
    } finally {
      setPurgingData(false);
    }
  };

  // Filtered Shops List
  const filteredShops = React.useMemo(() => {
    return shops.filter((shop) => {
      const matchesTab =
        activeTab === 'ALL' ||
        (activeTab === 'ACTIVE' && shop.status === 'ACTIVE') ||
        (activeTab === 'SUSPENDED' && shop.status === 'SUSPENDED') ||
        (activeTab === 'TRIAL' && shop.status === 'TRIAL');

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        shop.name.toLowerCase().includes(q) ||
        shop.city.toLowerCase().includes(q) ||
        (shop.owner_email && shop.owner_email.toLowerCase().includes(q)) ||
        (shop.phone && shop.phone.includes(q));

      return matchesTab && matchesSearch;
    });
  }, [shops, activeTab, searchQuery]);

  // -------------------------------------------------------------------------
  // 1. Loading Gate
  // -------------------------------------------------------------------------
  if (authChecking) {
    return (
      <AppShell activeRoute="/admin">
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 animate-pulse shadow-[0_0_30px_rgba(6,182,212,0.2)]">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-sm font-medium text-gray-200">Verifying Founder Privileges...</span>
            <span className="font-urdu-sans text-xs text-gray-400" dir="rtl">
              سپر ایڈمن تصدیق جاری ہے...
            </span>
          </div>
        </div>
      </AppShell>
    );
  }

  // -------------------------------------------------------------------------
  // 2. Unauthorized 403 Glass Card Access Gate
  // -------------------------------------------------------------------------
  if (!isSuperAdmin) {
    return (
      <AppShell activeRoute="/admin">
        <div className="min-h-[75vh] flex items-center justify-center p-4">
          <Card className="premium-glass-card max-w-lg w-full p-8 text-center border-rose-500/20 shadow-[0_0_50px_rgba(244,63,94,0.1)]">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.2)]">
              <Lock className="h-8 w-8" />
            </div>

            <div className="space-y-2 mb-6">
              <span className="inline-block rounded-full border border-rose-500/30 bg-rose-500/15 px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-rose-300">
                403 Access Denied
              </span>
              <h1 className="font-editorial text-3xl font-semibold text-white tracking-tight">
                Unauthorized Platform View
              </h1>
              <p className="font-urdu-sans text-sm text-rose-400/90 -mt-1" dir="rtl">
                آپ کو پلیٹ فارم ایڈمن پینل تک رسائی کی اجازت نہیں ہے۔
              </p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto pt-2">
                This command center is reserved exclusively for Silaye system administrators and platform founders.
              </p>
            </div>

            <a href="/dashboard">
              <Button
                variant="default"
                className="w-full bg-gold text-[#0B0C0E] hover:bg-gold-hover font-semibold shadow-[0_0_20px_rgba(212,175,55,0.2)]"
              >
                <span>Return to Workshop Dashboard</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </a>
          </Card>
        </div>
      </AppShell>
    );
  }

  // -------------------------------------------------------------------------
  // 3. Authorized Super Admin Platform Command Center
  // -------------------------------------------------------------------------
  return (
    <AppShell activeRoute="/admin">
      <div className="flex-1 space-y-8 max-w-7xl mx-auto pb-16">
        {/* Toast Notification Alert */}
        {toastMessage && (
          <div
            className={cn(
              'fixed top-20 right-6 z-50 flex items-center gap-3 rounded-2xl border px-5 py-3.5 backdrop-blur-2xl shadow-2xl transition-all animate-in fade-in slide-in-from-top-4 duration-300',
              toastMessage.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-950/80 text-emerald-200'
                : 'border-rose-500/40 bg-rose-950/80 text-rose-200'
            )}
            role="status"
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
            )}
            <div className="flex flex-col">
              <span className="text-xs font-bold">{toastMessage.title}</span>
              <span className="text-[11px] opacity-90">{toastMessage.desc}</span>
            </div>
          </div>
        )}

        {/* Top Header & Platform Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h1 className="font-editorial text-3xl font-semibold tracking-tight text-white">
                Platform Command Center
              </h1>
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-300 uppercase tracking-wider">
                Founder Mode
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-urdu-serif text-sm text-cyan-400/80" dir="rtl">
                سلائے پلیٹ فارم سپروائزر اور ورکشاپ مینجمنٹ کنٹرول
              </span>
            </div>
          </div>

          {/* Quick Refresh & Stats Controls */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={loadPlatformData}
              disabled={loadingData}
              className="gap-2 border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-gray-300"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loadingData && 'animate-spin text-cyan-400')} />
              <span>{loadingData ? 'Syncing...' : 'Sync Live Metrics'}</span>
            </Button>
          </div>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* TOP KPI COMMAND RIBBON (4 Metric Cards)                             */}
        {/* ------------------------------------------------------------------- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Registered Workshops */}
          <Card className="premium-glass-card p-5 relative overflow-hidden border-cyan-500/20 hover:border-cyan-500/40 transition-all">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Registered Workshops
                </span>
                <div className="font-urdu-sans text-xs text-cyan-400/90 -mt-0.5" dir="rtl">
                  کل درزی ورکشاپس
                </div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                <Building2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-3xl font-bold tracking-tight text-white font-mono">
                {metrics?.total_shops ?? '—'}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  {metrics?.active_shops ?? 0} Active
                </span>
                {metrics && metrics.suspended_shops > 0 && (
                  <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                    {metrics.suspended_shops} Suspended
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Card 2: Platform Craftsmen */}
          <Card className="premium-glass-card p-5 relative overflow-hidden border-gold/20 hover:border-gold/40 transition-all">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Platform Craftsmen
                </span>
                <div className="font-urdu-sans text-xs text-gold/90 -mt-0.5" dir="rtl">
                  فعال کاریگر و ماسٹرز
                </div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/10 text-gold">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-3xl font-bold tracking-tight text-white font-mono">
                {metrics?.total_users ?? '—'}
              </span>
              <span className="text-xs text-gray-400">Across Pakistan</span>
            </div>
          </Card>

          {/* Card 3: Orders Tailored */}
          <Card className="premium-glass-card p-5 relative overflow-hidden border-purple-500/20 hover:border-purple-500/40 transition-all">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Total Orders Tailored
                </span>
                <div className="font-urdu-sans text-xs text-purple-400/90 -mt-0.5" dir="rtl">
                  کل سلائی آرڈرز
                </div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                <Scissors className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-3xl font-bold tracking-tight text-white font-mono">
                {metrics?.total_orders ?? '—'}
              </span>
              <span className="text-xs text-purple-300/80">Lifetime Throughput</span>
            </div>
          </Card>

          {/* Card 4: Total Udhaar Receivable Volume */}
          <Card className="premium-glass-card p-5 relative overflow-hidden border-amber-500/20 hover:border-amber-500/40 transition-all">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Market Udhaar Tracked
                </span>
                <div className="font-urdu-sans text-xs text-amber-400/90 -mt-0.5" dir="rtl">
                  مارکیٹ ادھار والیوم
                </div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-amber-300 font-mono">
                <bdi dir="ltr">{metrics ? formatCurrency(metrics.total_khata_volume) : '—'}</bdi>
              </span>
              <span className="text-xs text-amber-400/70">Ledger Balances</span>
            </div>
          </Card>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* WORKSHOP SUPERVISION & LIFECYCLE MANAGEMENT TABLE                   */}
        {/* ------------------------------------------------------------------- */}
        <Card className="premium-glass-card overflow-hidden">
          <CardHeader className="p-6 pb-4 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="font-editorial text-2xl text-white flex items-center gap-2">
                <span>Workshop Directory & Operations</span>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-mono font-medium text-gray-300">
                  {filteredShops.length}
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-gray-400">
                Supervise registered tailoring workshop tenants, audit production volumes, and manage subscription lifecycles.
              </CardDescription>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] p-1">
              {(['ALL', 'ACTIVE', 'SUSPENDED', 'TRIAL'] as FilterTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                    activeTab === tab
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  )}
                >
                  {tab === 'ALL' && 'All Shops'}
                  {tab === 'ACTIVE' && 'Active'}
                  {tab === 'SUSPENDED' && 'Suspended'}
                  {tab === 'TRIAL' && 'Trial'}
                </button>
              ))}
            </div>
          </CardHeader>

          {/* Search Bar */}
          <div className="p-6 py-4 border-b border-white/5 bg-white/[0.01]">
            <Input
              type="search"
              placeholder="Search by workshop name, city (e.g. Lahore, Wah Cantt), or owner email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
              className="h-10 text-xs md:text-sm bg-[#0B0C0E]/60 border-white/10"
            />
          </div>

          {/* High-Density Data Table */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-gray-400 uppercase tracking-wider text-[10px] font-semibold">
                  <th className="py-3.5 px-6">Workshop Name</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Owner & Contact</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Craftsmen</th>
                  <th className="py-3.5 px-4 text-right">Orders</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-6 text-right">Governance Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {filteredShops.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-500">
                      <Store className="h-8 w-8 mx-auto mb-2 opacity-40 text-gray-400" />
                      <p className="text-sm">No tailoring workshops found matching current criteria.</p>
                    </td>
                  </tr>
                ) : (
                  filteredShops.map((shop) => {
                    const statusMeta = STATUS_CONFIG[shop.status] || STATUS_CONFIG.ACTIVE;
                    return (
                      <tr
                        key={shop.id}
                        className="hover:bg-white/[0.03] transition-colors group"
                      >
                        {/* Workshop Name */}
                        <td className="py-4 px-6 font-medium text-white">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-gold font-bold">
                              {shop.name.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-100 group-hover:text-gold transition-colors">
                                {shop.name}
                              </span>
                              <span className="text-[10px] text-gray-500 font-mono">
                                {shop.id.substring(0, 13)}...
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Location */}
                        <td className="py-4 px-4 text-gray-300">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                            <span>{shop.city || 'Wah Cantt'}</span>
                          </div>
                        </td>

                        {/* Owner & Contact */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 text-gray-200">
                              <Mail className="h-3 w-3 text-cyan-400 shrink-0" />
                              <span className="truncate max-w-[170px]" title={shop.owner_email || 'No email'}>
                                {shop.owner_email || 'founder@silaye.pk'}
                              </span>
                            </div>
                            {shop.phone && (
                              <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-mono">
                                <Phone className="h-3 w-3 text-gray-500 shrink-0" />
                                <span>{shop.phone}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-4">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                              statusMeta.badgeClass
                            )}
                          >
                            <span className={cn('h-1.5 w-1.5 rounded-full', statusMeta.dotClass)} />
                            <span>{statusMeta.label}</span>
                          </span>
                        </td>

                        {/* Craftsmen Count */}
                        <td className="py-4 px-4 text-center font-mono">
                          <span className="rounded-lg bg-white/5 px-2 py-1 text-xs border border-white/10 text-gray-200">
                            {shop.member_count}
                          </span>
                        </td>

                        {/* Orders Processed */}
                        <td className="py-4 px-4 text-right font-mono font-semibold text-white">
                          <bdi dir="ltr">{shop.total_orders.toLocaleString()}</bdi>
                        </td>

                        {/* Created Date */}
                        <td className="py-4 px-4 text-gray-400 font-mono text-[11px]">
                          {new Date(shop.created_at).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {shop.status === 'ACTIVE' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenStatusDialog(shop, 'SUSPENDED')}
                                className="h-7 px-2.5 text-[11px] border-rose-500/30 text-rose-400 hover:bg-rose-500/15 hover:border-rose-500/60"
                              >
                                <PauseCircle className="h-3.5 w-3.5 mr-1 text-rose-400" />
                                <span>Suspend</span>
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenStatusDialog(shop, 'ACTIVE')}
                                className="h-7 px-2.5 text-[11px] border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/15 hover:border-emerald-500/60"
                              >
                                <PlayCircle className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                                <span>Reactivate</span>
                              </Button>
                            )}

                            {shop.status !== 'TRIAL' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenStatusDialog(shop, 'TRIAL')}
                                className="h-7 px-2 text-[11px] text-gray-400 hover:text-amber-300 hover:bg-amber-500/10"
                                title="Set Trial Mode"
                              >
                                <span>Trial</span>
                              </Button>
                            )}

                            {/* Purge Test Data Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenPurgeDialog(shop)}
                              className="h-7 px-2 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30"
                              title="Purge Workshop Test Data"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              <span>Purge</span>
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

        {/* ------------------------------------------------------------------- */}
        {/* STATUS MUTATION CONFIRMATION MODAL                                  */}
        {/* ------------------------------------------------------------------- */}
        <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
          <DialogContent className="max-w-md bg-[#0F1115]/95 border-white/10 backdrop-blur-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl border',
                    targetStatus === 'SUSPENDED'
                      ? 'border-rose-500/40 bg-rose-500/15 text-rose-400'
                      : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                  )}
                >
                  {targetStatus === 'SUSPENDED' ? (
                    <ShieldAlert className="h-5 w-5" />
                  ) : (
                    <ShieldCheck className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <DialogTitle className="font-editorial text-xl text-white">
                    {targetStatus === 'SUSPENDED'
                      ? 'Confirm Workshop Suspension'
                      : targetStatus === 'ACTIVE'
                      ? 'Reactivate Workshop Access'
                      : 'Set Workshop to Trial'}
                  </DialogTitle>
                  <span className="font-urdu-sans text-xs text-gray-400" dir="rtl">
                    ورکشاپ اسٹیٹس کی تبدیلی کی تصدیق
                  </span>
                </div>
              </div>
              <DialogDescription className="text-xs text-gray-300 leading-relaxed pt-2">
                {targetStatus === 'SUSPENDED' && (
                  <>
                    Are you sure you want to suspend <strong className="text-white">{selectedShop?.name}</strong>?
                    Operators of this workshop will be locked out from booking new orders and processing Khata transactions until reactivated.
                  </>
                )}
                {targetStatus === 'ACTIVE' && (
                  <>
                    Reactivating <strong className="text-white">{selectedShop?.name}</strong> will restore full production operations, order bookings, and member access.
                  </>
                )}
                {targetStatus === 'TRIAL' && (
                  <>
                    Switch <strong className="text-white">{selectedShop?.name}</strong> into Trial evaluation mode.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusDialogOpen(false)}
                disabled={updatingStatus}
                className="border-white/10 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleConfirmStatusChange}
                disabled={updatingStatus}
                className={cn(
                  'font-semibold text-[#0B0C0E]',
                  targetStatus === 'SUSPENDED'
                    ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                )}
              >
                {updatingStatus ? 'Updating...' : `Confirm ${targetStatus}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ------------------------------------------------------------------- */}
        {/* TWO-STEP PURGE TEST DATA CONFIRMATION MODAL                         */}
        {/* ------------------------------------------------------------------- */}
        <Dialog open={purgeDialogOpen} onOpenChange={setPurgeDialogOpen}>
          <DialogContent className="max-w-md bg-[#0F1115]/95 border-rose-500/30 backdrop-blur-2xl shadow-[0_0_50px_rgba(244,63,94,0.15)]">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/40 bg-rose-500/15 text-rose-400">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="font-editorial text-xl text-white">
                    Purge Workshop Test Data
                  </DialogTitle>
                  <span className="font-urdu-sans text-xs text-rose-400" dir="rtl">
                    ٹیسٹ ڈیٹا ڈیلیٹ کرنے کی تصدیق
                  </span>
                </div>
              </div>
              <DialogDescription className="text-xs text-gray-300 leading-relaxed pt-2 space-y-2">
                <p>
                  You are about to permanently purge all test records for{' '}
                  <strong className="text-white">{shopToPurge?.name}</strong>.
                </p>
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-[11px] text-rose-300 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                    <span>Irreversible Action:</span>
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 opacity-90 pl-1">
                    <li>Deletes all test orders & status audit progression logs</li>
                    <li>Deletes all test customer measurement profiles</li>
                    <li>Deletes all test Khata financial ledger transactions</li>
                    <li>Deletes test customer directory accounts</li>
                    <li>Resets monthly tailoring usage quota count to 0</li>
                  </ul>
                  <p className="font-urdu-sans text-rose-400 pt-1" dir="rtl">
                    تمام کسٹمرز، آرڈرز اور کھاتہ رجسٹر مکمل ڈیلیٹ ہو جائے گا۔
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-[11px] text-emerald-300">
                  <span className="font-medium">Safely Retained:</span> Workshop profile settings, craftsman accounts, garment rates, and printer hardware preferences are preserved.
                </div>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 pt-2">
              <label className="text-xs text-gray-300 flex items-center justify-between font-medium">
                <span>Type <strong className="text-rose-400 font-mono">PURGE</strong> to confirm:</span>
                <span className="font-urdu-sans text-[11px] text-gray-400" dir="rtl">
                  تصدیق کے لیے PURGE لکھیں
                </span>
              </label>
              <Input
                type="text"
                placeholder="PURGE"
                value={purgeConfirmInput}
                onChange={(e) => setPurgeConfirmInput(e.target.value)}
                className="bg-black/50 border-rose-500/30 focus:border-rose-500 text-white font-mono text-center uppercase tracking-widest text-sm h-10"
                autoComplete="off"
              />
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPurgeDialogOpen(false)}
                disabled={purgingData}
                className="border-white/10 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleConfirmPurge}
                disabled={purgingData || purgeConfirmInput.trim().toUpperCase() !== 'PURGE'}
                className="font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {purgingData ? 'Purging Data...' : 'Purge Workshop Data'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
