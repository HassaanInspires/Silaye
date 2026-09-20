'use client';

import * as React from 'react';
import {
  Wallet,
  PlusCircle,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Search,
  MessageSquare,
  ChevronRight,
  Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KhataLedgerView } from '@/components/tailor/khata-ledger-view';
import { KhataEntryModal } from '@/components/tailor/khata-entry-modal';
import { CustomerKhataDetailModal } from '@/components/tailor/customer-khata-detail-modal';
import { WhatsAppReceiptModal } from '@/components/tailor/whatsapp-receipt-modal';
import { customersDb, khataDb, ordersDb, staffDb, shopsDb, isDatabaseConfigured } from '@/lib/db';
import {
  mockShop as defaultMockShop,
  SEED_CUSTOMERS,
  SEED_KHATA_TRANSACTIONS,
  SEED_ORDERS,
  isDemoMode,
} from '@/lib/mock-data';
import { useLanguage } from '@/lib/language-provider';
import type { Customer, KhataTransaction, GarmentOrder, Staff, Shop } from '@/types/tailor';

export default function KhataPage() {
  const { language, khataT } = useLanguage();

  // Live state
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [transactions, setTransactions] = React.useState<KhataTransaction[]>([]);
  const [orders, setOrders] = React.useState<GarmentOrder[]>([]);
  const [staff, setStaff] = React.useState<Staff[]>([]);
  const [shop, setShop] = React.useState<Shop | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  // Modal states
  const [entryModalOpen, setEntryModalOpen] = React.useState<boolean>(false);
  const [selectedEntryCustomer, setSelectedEntryCustomer] = React.useState<Customer | null>(null);

  const [detailModalOpen, setDetailModalOpen] = React.useState<boolean>(false);
  const [selectedDetailCustomer, setSelectedDetailCustomer] = React.useState<Customer | null>(null);

  const [whatsAppModalOpen, setWhatsAppModalOpen] = React.useState<boolean>(false);
  const [selectedWhatsAppCustomer, setSelectedWhatsAppCustomer] = React.useState<Customer | null>(null);

  // Toast / notification banner state
  const [notification, setNotification] = React.useState<{
    message: string;
    type: 'success' | 'info';
  } | null>(null);

  // Live repository initialization
  React.useEffect(() => {
    let isMounted = true;

    async function loadKhataData() {
      setIsLoading(true);
      try {
        let currentShop: Shop | null = null;
        try {
          currentShop = await shopsDb.getCurrentShop();
        } catch (shopErr) {
          console.warn('Khata shop resolution notice:', shopErr);
        }

        if (!isMounted) return;
        setShop(currentShop || defaultMockShop);

        const targetShopId = currentShop?.id || defaultMockShop.id;
        let loadedCustomers: Customer[] = [];
        let loadedTransactions: KhataTransaction[] = [];
        let loadedOrders: GarmentOrder[] = [];
        let loadedStaff: Staff[] = [];

        try {
          const results = await Promise.allSettled([
            customersDb.getByShopId(targetShopId),
            khataDb.getByShopId(targetShopId),
            ordersDb.getByShopId(targetShopId),
            staffDb.getByShopId(targetShopId),
          ]);

          if (results[0].status === 'fulfilled' && Array.isArray(results[0].value)) {
            loadedCustomers = results[0].value;
          }
          if (results[1].status === 'fulfilled' && Array.isArray(results[1].value)) {
            loadedTransactions = results[1].value;
          }
          if (results[2].status === 'fulfilled' && Array.isArray(results[2].value)) {
            loadedOrders = results[2].value;
          }
          if (results[3].status === 'fulfilled' && Array.isArray(results[3].value)) {
            loadedStaff = results[3].value.map((m) => ({
              id: m.id,
              shop_id: m.shop_id,
              name: m.name || 'Workshop Member',
              phone: '',
              role: (m.role === 'OWNER' ? 'MANAGER' : m.role) as Staff['role'],
              is_active: true,
              created_at: m.created_at,
            }));
          }
        } catch (dataErr) {
          console.warn('Khata repository settled notice:', dataErr);
        }

        // Realistic seed fallback for preview/demo modes or empty test environments
        const shouldUseSeed =
          loadedCustomers.length === 0 &&
          (targetShopId === defaultMockShop.id ||
            targetShopId === 'shp-demo-001' ||
            targetShopId === '00000000-0000-0000-0000-000000000001' ||
            targetShopId.startsWith('a0000000') ||
            isDemoMode() ||
            !isDatabaseConfigured());

        const finalCustomers = shouldUseSeed
          ? SEED_CUSTOMERS.map((c) => ({ ...c, shop_id: targetShopId }))
          : loadedCustomers;

        const finalTransactions = shouldUseSeed
          ? SEED_KHATA_TRANSACTIONS.map((t) => ({ ...t, shop_id: targetShopId }))
          : loadedTransactions;

        const finalOrders = shouldUseSeed
          ? SEED_ORDERS.map((o) => ({ ...o, shop_id: targetShopId }))
          : loadedOrders;

        if (isMounted) {
          setCustomers(finalCustomers);
          setTransactions(finalTransactions);
          setOrders(finalOrders);
          setStaff(loadedStaff);
        }
      } catch (err) {
        console.warn('Khata ledger data fetch error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadKhataData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-dismiss notification
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Handlers
  const handleOpenNewTransaction = (customer?: Customer | null) => {
    setSelectedEntryCustomer(customer || null);
    setEntryModalOpen(true);
  };

  const handleOpenCustomerDetail = (customer: Customer) => {
    setSelectedDetailCustomer(customer);
    setDetailModalOpen(true);
  };

  const handleOpenWhatsAppReminder = (customer: Customer) => {
    setSelectedWhatsAppCustomer(customer);
    setWhatsAppModalOpen(true);
  };

  // Submit immutable transaction
  const handleSubmitTransaction = (
    txData: Omit<KhataTransaction, 'id' | 'created_at'>
  ) => {
    const newTxId = `g0000000-0000-0000-0000-${Date.now().toString().slice(-12).padStart(12, '0')}`;
    const nowIso = new Date().toISOString();

    const createdTx: KhataTransaction = {
      ...txData,
      id: newTxId,
      created_at: nowIso,
    };

    // 1. Append immutable transaction to ledger
    setTransactions((prev) => [createdTx, ...prev]);

    // 2. Update customer balance and metadata
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === txData.customer_id) {
          const updatedSpent =
            txData.transaction_type === 'MANUAL_DEBIT'
              ? c.total_spent + txData.amount
              : c.total_spent;

          return {
            ...c,
            current_khata_balance: txData.balance_after,
            total_spent: updatedSpent,
            updated_at: nowIso,
          };
        }
        return c;
      })
    );

    // 3. Update selectedDetailCustomer if statement modal is currently referencing them
    if (selectedDetailCustomer && selectedDetailCustomer.id === txData.customer_id) {
      setSelectedDetailCustomer((prev) =>
        prev
          ? {
              ...prev,
              current_khata_balance: txData.balance_after,
              updated_at: nowIso,
            }
          : null
      );
    }

    // Persist via khataDb RPC
    khataDb.append(txData).catch((err) => {
      console.warn('Khata append RPC error:', err);
    });

    const customerName =
      customers.find((c) => c.id === txData.customer_id)?.full_name || 'Customer';

    setNotification({
      message: `Khata entry recorded for ${customerName} (New Balance: Rs. ${Math.abs(
        txData.balance_after
      ).toLocaleString()})`,
      type: 'success',
    });
  };

  // Find active customer for WhatsApp reminder
  const currentWhatsAppCustomer = React.useMemo(() => {
    if (!selectedWhatsAppCustomer) return null;
    return customers.find((c) => c.id === selectedWhatsAppCustomer.id) || selectedWhatsAppCustomer;
  }, [customers, selectedWhatsAppCustomer]);

  // Find active customer for Statement detail
  const currentDetailCustomer = React.useMemo(() => {
    if (!selectedDetailCustomer) return null;
    return customers.find((c) => c.id === selectedDetailCustomer.id) || selectedDetailCustomer;
  }, [customers, selectedDetailCustomer]);

  // Aggregated Market Metrics for Mobile Card
  const metrics = React.useMemo(() => {
    let totalReceivables = 0;
    let totalAdvances = 0;
    let debtorsCount = 0;
    let advanceHoldersCount = 0;
    let settledCount = 0;

    customers.forEach((c) => {
      if (c.current_khata_balance > 0) {
        totalReceivables += c.current_khata_balance;
        debtorsCount += 1;
      } else if (c.current_khata_balance < 0) {
        totalAdvances += Math.abs(c.current_khata_balance);
        advanceHoldersCount += 1;
      } else {
        settledCount += 1;
      }
    });

    const netMarketPosition = totalReceivables - totalAdvances;
    return {
      totalReceivables,
      totalAdvances,
      netMarketPosition,
      debtorsCount,
      advanceHoldersCount,
      settledCount,
      totalCustomers: customers.length,
    };
  }, [customers]);

  // Mobile search and tab filters
  const [mobileSearchQuery, setMobileSearchQuery] = React.useState<string>('');
  const [mobileKhataTab, setMobileKhataTab] = React.useState<'ALL' | 'DEBTORS' | 'CREDITORS' | 'SETTLED'>('ALL');

  const mobileFilteredCustomers = React.useMemo(() => {
    return customers
      .filter((c) => {
        if (mobileSearchQuery.trim()) {
          const q = mobileSearchQuery.toLowerCase().trim();
          const matchesName = c.full_name.toLowerCase().includes(q);
          const matchesPhone = c.phone.replace(/\D/g, '').includes(q.replace(/\D/g, ''));
          const matchesCity = c.city?.toLowerCase().includes(q) || false;
          if (!matchesName && !matchesPhone && !matchesCity) return false;
        }
        if (mobileKhataTab === 'DEBTORS') return c.current_khata_balance > 0;
        if (mobileKhataTab === 'CREDITORS') return c.current_khata_balance < 0;
        if (mobileKhataTab === 'SETTLED') return c.current_khata_balance === 0;
        return true;
      })
      .sort((a, b) => b.current_khata_balance - a.current_khata_balance);
  }, [customers, mobileSearchQuery, mobileKhataTab]);

  return (
    <AppShell activeRoute="/khata">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Header (Desktop) */}
        <div className="hidden md:flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
          <div className="space-y-1">
            <h1 className={cn(
              "text-2xl sm:text-3xl font-semibold tracking-tight text-foreground flex items-center gap-3",
              language === 'ur' && "font-urdu-serif leading-relaxed"
            )}>
              <span>{khataT.pageTitle}</span>
            </h1>
            <p className={cn(
              "text-xs sm:text-sm text-muted-foreground max-w-2xl",
              language === 'ur' ? "font-urdu-serif leading-relaxed" : ""
            )}>
              {language === 'en' ? (
                <bdi dir="ltr">{khataT.pageSubtitle}</bdi>
              ) : (
                khataT.pageSubtitle
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="default"
              size="sm"
              onClick={() => handleOpenNewTransaction()}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-sm"
            >
              <PlusCircle className="h-4 w-4" />
              <span className={language === 'ur' ? "font-urdu-serif text-sm" : ""}>
                {khataT.newKhataEntryFull}
              </span>
            </Button>
          </div>
        </div>

        {/* Floating Notification Banner */}
        {notification && (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-700 dark:text-emerald-300 shadow-md animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-medium">{notification.message}</span>
          </div>
        )}

        {/* ================================================================ */}
        {/* MOBILE KHATA LEDGER VIEWPORT (md:hidden)                         */}
        {/* ================================================================ */}
        <div className="block md:hidden space-y-4 pb-44 pb-safe">
          {/* Mobile Header Bar */}
          <div className="flex items-center justify-between pb-1">
            <div>
              <h1 className={cn(
                "text-xl font-bold text-foreground flex items-center gap-2",
                language === 'ur' && "font-urdu-serif leading-relaxed"
              )}>
                <span>{khataT.mobileTitle}</span>
              </h1>
              <p className={cn(
                "text-[11px] text-muted-foreground",
                language === 'ur' ? "font-urdu-serif leading-relaxed py-0.5" : ""
              )}>
                {language === 'en' ? <bdi dir="ltr">{khataT.mobileSubtitle}</bdi> : khataT.mobileSubtitle}
              </p>
            </div>
          </div>

          {/* 1. Mobile Financial Summary Card */}
          <div className="rounded-2xl p-4 border border-rose-500/30 bg-card shadow-sm relative overflow-hidden space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className={cn(
                  "text-[10px] font-bold tracking-wider uppercase text-rose-600 dark:text-rose-400",
                  language === 'ur' && "font-urdu-serif leading-relaxed"
                )}>
                  {khataT.totalReceivables}
                </span>
                <div className="font-mono text-2xl font-bold text-rose-600 dark:text-rose-400">
                  <bdi dir="ltr">Rs. {metrics.totalReceivables.toLocaleString()}</bdi>
                </div>
              </div>
              <span className={cn(
                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 text-xs font-semibold",
                language === 'ur' && "font-urdu-serif leading-relaxed"
              )}>
                {metrics.debtorsCount} {khataT.debtorsCount}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-center">
              <div className="p-2 rounded-xl bg-muted/40 border border-border">
                <span className={cn(
                  "text-[10px] text-muted-foreground block truncate",
                  language === 'ur' && "font-urdu-serif leading-relaxed"
                )}>
                  {khataT.awaitingRecovery}
                </span>
                <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">{metrics.debtorsCount}</span>
              </div>
              <div className="p-2 rounded-xl bg-muted/40 border border-border">
                <span className={cn(
                  "text-[10px] text-muted-foreground block truncate",
                  language === 'ur' && "font-urdu-serif leading-relaxed"
                )}>
                  {khataT.inStoreCredit}
                </span>
                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <bdi dir="ltr">Rs. {metrics.totalAdvances.toLocaleString()}</bdi>
                </span>
              </div>
              <div className="p-2 rounded-xl bg-muted/40 border border-border">
                <span className={cn(
                  "text-[10px] text-muted-foreground block truncate",
                  language === 'ur' && "font-urdu-serif leading-relaxed"
                )}>
                  {khataT.settled}
                </span>
                <span className="font-mono text-xs font-bold text-foreground">{metrics.settledCount}</span>
              </div>
            </div>
          </div>

          {/* 2. Sticky Search Bar & Filter Pills */}
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pb-2 pt-1 -mx-4 px-4 space-y-2 border-b border-border/50">
            <div className="relative">
              <Input
                type="search"
                placeholder={khataT.searchPlaceholder}
                value={mobileSearchQuery}
                onChange={(e) => setMobileSearchQuery(e.target.value)}
                leftIcon={<Search className="h-4 w-4 text-primary" />}
                className="h-10 text-xs bg-card border-input pr-9 rounded-xl focus:border-primary"
              />
              {mobileSearchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => setMobileSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground flex items-center justify-center text-xs"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-none touch-pan-x -mx-4 pl-4 pr-10">
              {[
                { id: 'ALL', label: khataT.allTab, count: customers.length },
                { id: 'DEBTORS', label: khataT.debtorsTab, count: metrics.debtorsCount },
                { id: 'CREDITORS', label: khataT.creditorsTab, count: metrics.advanceHoldersCount },
                { id: 'SETTLED', label: khataT.settledTab, count: metrics.settledCount },
              ].map((tab) => {
                const isActive = mobileKhataTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMobileKhataTab(tab.id as any)}
                    className={cn(
                      'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border',
                      isActive
                        ? 'bg-primary/15 text-primary border-primary/40 shadow-sm font-semibold'
                        : 'bg-card text-muted-foreground border-border hover:text-foreground'
                    )}
                  >
                    <span className={language === 'ur' ? "font-urdu-serif leading-relaxed py-0.5" : ""}>{tab.label}</span>
                    <span
                      className={cn(
                        'px-1.5 py-0.2 rounded-full text-[10px] font-mono',
                        isActive ? 'bg-primary/25 text-primary font-bold' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Customer Balance Cards List */}
          {mobileFilteredCustomers.length === 0 ? (
            <div className="rounded-2xl p-8 text-center space-y-3 border border-border bg-card shadow-sm my-4">
              <Search className="h-8 w-8 text-muted-foreground/50 mx-auto" />
              <h3 className={cn(
                "text-sm font-semibold text-foreground",
                language === 'ur' && "font-urdu-serif"
              )}>
                {khataT.noFilterResultsTitle}
              </h3>
              <p className={cn(
                "text-xs text-muted-foreground",
                language === 'ur' ? "font-urdu-serif leading-relaxed" : ""
              )}>
                {khataT.noFilterResultsDesc}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setMobileSearchQuery('');
                  setMobileKhataTab('ALL');
                }}
                className={cn(
                  "text-xs border-border",
                  language === 'ur' && "font-urdu-serif"
                )}
              >
                {khataT.clearFilters}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {mobileFilteredCustomers.map((customer) => {
                const isDebtor = customer.current_khata_balance > 0;
                const isCreditor = customer.current_khata_balance < 0;
                const isSettled = customer.current_khata_balance === 0;

                return (
                  <div
                    key={customer.id}
                    onClick={() => handleOpenCustomerDetail(customer)}
                    className={cn(
                      'rounded-2xl p-3.5 border hover:border-primary/40 active:scale-[0.99] transition-all bg-card space-y-2.5 shadow-sm cursor-pointer',
                      isDebtor
                        ? 'border-rose-500/30'
                        : isCreditor
                        ? 'border-emerald-500/30'
                        : 'border-border'
                    )}
                  >
                    {/* Header: Name + Balance */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-bold text-sm text-foreground truncate">
                          {customer.full_name}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-2">
                          <bdi dir="ltr">{customer.phone}</bdi>
                          {customer.city && <span>• {customer.city}</span>}
                        </div>
                      </div>

                      {/* Balance Badge */}
                      <div className="shrink-0 text-right">
                        {isDebtor && (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-600 dark:text-rose-300 text-xs font-bold font-mono">
                            <bdi dir="ltr">Rs. {customer.current_khata_balance.toLocaleString()}</bdi>
                            <span className={cn(
                              "text-[10px] font-normal",
                              language === 'ur' && "font-urdu-serif"
                            )}>
                              {khataT.udhaar}
                            </span>
                          </div>
                        )}
                        {isCreditor && (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-300 text-xs font-bold font-mono">
                            <bdi dir="ltr">Rs. {Math.abs(customer.current_khata_balance).toLocaleString()}</bdi>
                            <span className={cn(
                              "text-[10px] font-normal",
                              language === 'ur' && "font-urdu-serif"
                            )}>
                              {khataT.advance}
                            </span>
                          </div>
                        )}
                        {isSettled && (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/50 border border-border text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                            <CheckCircle2 className="h-3 w-3" />
                            <span className={cn(
                              "text-[10px]",
                              language === 'ur' && "font-urdu-serif"
                            )}>
                              {khataT.settled}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats summary */}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground px-2.5 py-1.5 rounded-lg bg-muted/40 border border-border">
                      <span className={language === 'ur' ? "font-urdu-serif leading-relaxed" : ""}>
                        {customer.total_orders_count} {khataT.ordersCount}
                      </span>
                      <span className={language === 'ur' ? "font-urdu-serif leading-relaxed" : ""}>
                        {khataT.totalSpent}: <bdi dir="ltr" className="font-mono font-semibold text-foreground">Rs. {customer.total_spent.toLocaleString()}</bdi>
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      {/* WhatsApp Reminder (active on debtors) */}
                      {isDebtor ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenWhatsAppReminder(customer);
                          }}
                          className="h-8 px-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 flex items-center justify-center gap-1 text-xs font-semibold shrink-0"
                          title="Send WhatsApp Reminder"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span className={language === 'ur' ? "font-urdu-serif" : ""}>{khataT.whatsappReminder}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCustomerDetail(customer);
                          }}
                          className="h-8 px-2.5 rounded-lg border border-border bg-muted/50 text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 text-xs font-semibold shrink-0"
                          title="View Statement"
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                          <span className={language === 'ur' ? "font-urdu-serif" : ""}>{khataT.statement}</span>
                        </button>
                      )}

                      {/* + Record Transaction */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenNewTransaction(customer);
                        }}
                        className="h-8 flex-1 rounded-lg border border-primary/40 bg-primary/15 text-primary hover:bg-primary/25 flex items-center justify-center gap-1 text-xs font-bold transition-all shadow-sm"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span className={language === 'ur' ? "font-urdu-serif" : ""}>{khataT.recordEntry}</span>
                      </button>

                      {/* Details Statement Chevron */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCustomerDetail(customer);
                        }}
                        className="h-8 w-8 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center shrink-0"
                        title="View Full Ledger Statement"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* DESKTOP KHATA LEDGER VIEWPORT (hidden md:block)                  */}
        {/* ================================================================ */}
        <div className="hidden md:block">
        {/* Zero-Mock Clean-Slate Empty State */}
        {!isLoading && customers.length === 0 && transactions.length === 0 && (
          <div className="rounded-2xl p-10 sm:p-16 flex flex-col items-center justify-center text-center space-y-4 border border-border bg-card shadow-sm my-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-primary/30 bg-primary/10 text-primary shadow-sm">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h2 className={cn(
                "text-xl font-bold text-foreground",
                language === 'ur' && "font-urdu-serif"
              )}>
                {khataT.emptyStateTitle}
              </h2>
              <p className={cn(
                "text-xs sm:text-sm text-muted-foreground",
                language === 'ur' ? "font-urdu-serif leading-relaxed" : ""
              )}>
                {language === 'en' ? (
                  <bdi dir="ltr">{khataT.emptyStateDesc}</bdi>
                ) : (
                  khataT.emptyStateDesc
                )}
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="default"
                size="md"
                onClick={() => handleOpenNewTransaction()}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-sm transition-all"
              >
                <PlusCircle className="h-4 w-4" />
                <span className={language === 'ur' ? "font-urdu-serif text-sm" : ""}>
                  {khataT.recordFirstEntry}
                </span>
              </Button>
            </div>
          </div>
        )}

        {/* Main Master Ledger View */}
        {(customers.length > 0 || transactions.length > 0) && (
          <KhataLedgerView
            customers={customers}
            transactions={transactions}
            orders={orders}
            staff={staff}
            shop={shop || defaultMockShop}
            onOpenNewTransaction={handleOpenNewTransaction}
            onOpenCustomerDetail={handleOpenCustomerDetail}
            onOpenWhatsAppReminder={handleOpenWhatsAppReminder}
          />
        )}
        </div>

        {/* 1. Transaction Entry Modal */}
        <KhataEntryModal
          open={entryModalOpen}
          onOpenChange={setEntryModalOpen}
          customers={customers}
          selectedCustomerId={selectedEntryCustomer?.id}
          orders={orders}
          staff={staff}
          shop={shop || defaultMockShop}
          onSubmitTransaction={handleSubmitTransaction}
        />

        {/* 2. Customer Statement / Audit Trail Modal */}
        <CustomerKhataDetailModal
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          customer={currentDetailCustomer}
          transactions={transactions}
          orders={orders}
          staff={staff}
          shop={shop || defaultMockShop}
          onOpenNewEntry={(c) => {
            setSelectedEntryCustomer(c);
            setEntryModalOpen(true);
          }}
          onOpenWhatsAppReminder={(c) => {
            setSelectedWhatsAppCustomer(c);
            setWhatsAppModalOpen(true);
          }}
        />

        {/* 3. WhatsApp Khata Payment Reminder Modal */}
        <WhatsAppReceiptModal
          open={whatsAppModalOpen}
          onOpenChange={setWhatsAppModalOpen}
          customer={currentWhatsAppCustomer}
          shop={shop || defaultMockShop}
          initialTemplate="khata"
        />
      </div>
    </AppShell>
  );
}
