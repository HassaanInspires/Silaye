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
import { customersDb, khataDb, ordersDb, staffDb, shopsDb } from '@/lib/db';
import { mockShop as defaultMockShop } from '@/lib/mock-data';
import type { Customer, KhataTransaction, GarmentOrder, Staff, Shop } from '@/types/tailor';

export default function KhataPage() {
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
        const currentShop = await shopsDb.getCurrentShop();
        if (!isMounted) return;
        setShop(currentShop || defaultMockShop);

        const targetShopId = currentShop?.id || defaultMockShop.id;
        const [loadedCustomers, loadedTransactions, loadedOrders, loadedStaff] = await Promise.all([
          customersDb.getByShopId(targetShopId),
          khataDb.getByShopId(targetShopId),
          ordersDb.getByShopId(targetShopId),
          staffDb.getByShopId(targetShopId),
        ]);

        if (isMounted) {
          setCustomers(loadedCustomers);
          setTransactions(loadedTransactions);
          setOrders(loadedOrders);
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
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 md:p-8 pt-4 sm:pt-6">
        {/* Page Header (Desktop) */}
        <div className="hidden md:flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
                <span>Khata & Financial Ledger</span>
                <span className="font-urdu-serif text-lg font-normal text-gold/80" dir="rtl">
                  کھاتہ و مالیاتی لیجر
                </span>
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-400">
              Market receivables, advance deposits, and double-entry aligned audit trails for customer accounts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="default"
              size="sm"
              onClick={() => handleOpenNewTransaction()}
              className="gap-2 bg-gold text-[#0B0C0E] hover:bg-gold-hover font-semibold shadow-[0_0_20px_rgba(212,175,55,0.2)]"
            >
              <PlusCircle className="h-4 w-4" />
              <span>New Khata Entry</span>
              <span className="font-urdu-sans text-xs opacity-80" dir="rtl">
                نیا اندراج
              </span>
            </Button>
          </div>
        </div>

        {/* Floating Notification Banner */}
        {notification && (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 shadow-md animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{notification.message}</span>
          </div>
        )}

        {/* ================================================================ */}
        {/* MOBILE KHATA LEDGER VIEWPORT (md:hidden)                         */}
        {/* ================================================================ */}
        <div className="block md:hidden space-y-4">
          {/* Mobile Header Bar */}
          <div className="flex items-center justify-between pb-1">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Khata Ledger</span>
                <span className="font-urdu-serif text-base text-gold" dir="rtl">
                  کھاتہ رجسٹر
                </span>
              </h1>
              <p className="text-[11px] text-gray-400">
                مارکیٹ ادھار اور ایڈوانس حساب کتاب
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => handleOpenNewTransaction()}
              className="h-8 px-2.5 bg-gold text-[#0B0C0E] hover:bg-gold-hover font-semibold text-xs shadow-[0_0_12px_rgba(212,175,55,0.25)] gap-1"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>نیا اندراج</span>
            </Button>
          </div>

          {/* 1. Mobile Financial Summary Card */}
          <div className="premium-glass-card p-4 border-rose-500/30 bg-gradient-to-br from-rose-500/15 via-[#121418] to-transparent relative overflow-hidden shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold tracking-wider uppercase text-rose-400">
                  Total Market Receivables • ادھار
                </span>
                <div className="font-mono text-2xl font-bold text-rose-300">
                  <bdi dir="ltr">Rs. {metrics.totalReceivables.toLocaleString()}</bdi>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-xs font-semibold">
                {metrics.debtorsCount} گاہک
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-center">
              <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                <span className="text-[9px] text-gray-400 block truncate">واجب الادا</span>
                <span className="font-mono text-xs font-bold text-rose-400">{metrics.debtorsCount}</span>
              </div>
              <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                <span className="text-[9px] text-gray-400 block truncate">ایڈوانس رقم</span>
                <span className="font-mono text-xs font-bold text-emerald-400">
                  Rs. {metrics.totalAdvances.toLocaleString()}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                <span className="text-[9px] text-gray-400 block truncate">بے باق کھاتے</span>
                <span className="font-mono text-xs font-bold text-gray-200">{metrics.settledCount}</span>
              </div>
            </div>
          </div>

          {/* 2. Sticky Search Bar & Filter Pills */}
          <div className="sticky top-0 z-20 bg-[#0B0C0E]/95 backdrop-blur-md pb-1 pt-0 -mx-4 px-4 space-y-2">
            <div className="relative">
              <Input
                type="search"
                placeholder="گاہک کا نام یا فون نمبر تلاش کریں..."
                value={mobileSearchQuery}
                onChange={(e) => setMobileSearchQuery(e.target.value)}
                leftIcon={<Search className="h-4 w-4 text-gold" />}
                className="h-10 text-xs bg-[#121418] border-white/10 pr-9 rounded-xl focus:border-gold/50"
              />
              {mobileSearchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => setMobileSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 flex items-center justify-center text-xs"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none touch-pan-x -mx-4 px-4">
              {[
                { id: 'ALL', labelUrdu: 'تمام', labelEn: 'All', count: customers.length },
                { id: 'DEBTORS', labelUrdu: 'ادھار', labelEn: 'Udhaar', count: metrics.debtorsCount },
                { id: 'CREDITORS', labelUrdu: 'ایڈوانس', labelEn: 'Advance', count: metrics.advanceHoldersCount },
                { id: 'SETTLED', labelUrdu: 'بے باق', labelEn: 'Settled', count: metrics.settledCount },
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

          {/* 3. Customer Balance Cards List */}
          {mobileFilteredCustomers.length === 0 ? (
            <div className="premium-glass-card p-8 text-center space-y-3 border-white/10 my-4">
              <Search className="h-8 w-8 text-gray-500 mx-auto" />
              <h3 className="text-sm font-semibold text-white">کوئی کھاتہ نہیں ملا</h3>
              <p className="text-xs text-gray-400">
                دیے گئے فلٹر یا تلاش کے مطابق کوئی گاہک موجود نہیں ہے۔
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setMobileSearchQuery('');
                  setMobileKhataTab('ALL');
                }}
                className="text-xs border-white/10"
              >
                فلٹرز صاف کریں
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
                      'premium-glass-card p-3.5 border hover:border-gold/30 active:scale-[0.99] transition-all bg-[#121418] space-y-2.5 shadow-md cursor-pointer',
                      isDebtor
                        ? 'border-rose-500/30'
                        : isCreditor
                        ? 'border-emerald-500/30'
                        : 'border-white/10'
                    )}
                  >
                    {/* Header: Name + Balance */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-bold text-sm text-white truncate">
                          {customer.full_name}
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono flex items-center gap-2">
                          <span>{customer.phone}</span>
                          {customer.city && <span>• {customer.city}</span>}
                        </div>
                      </div>

                      {/* Balance Badge */}
                      <div className="shrink-0 text-right">
                        {isDebtor && (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold font-mono">
                            <bdi dir="ltr">Rs. {customer.current_khata_balance.toLocaleString()}</bdi>
                            <span className="font-urdu-sans text-[10px] font-normal">واجب الادا</span>
                          </div>
                        )}
                        {isCreditor && (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold font-mono">
                            <bdi dir="ltr">Rs. {Math.abs(customer.current_khata_balance).toLocaleString()}</bdi>
                            <span className="font-urdu-sans text-[10px] font-normal">ایڈوانس</span>
                          </div>
                        )}
                        {isSettled && (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-emerald-400 text-xs font-semibold">
                            <CheckCircle2 className="h-3 w-3" />
                            <span className="font-urdu-sans text-[10px]">بے باق (Settled)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats summary */}
                    <div className="flex items-center justify-between text-[11px] text-gray-400 px-2 py-1 rounded-lg bg-black/40 border border-white/5">
                      <span>{customer.total_orders_count} آرڈرز مکمل</span>
                      <span>کل خریداری: Rs. {customer.total_spent.toLocaleString()}</span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      {/* WhatsApp Reminder (active on debtors) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenWhatsAppReminder(customer);
                        }}
                        className="h-8 px-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 flex items-center justify-center gap-1 text-xs font-semibold shrink-0"
                        title="Send WhatsApp Reminder"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>یاد دہانی</span>
                      </button>

                      {/* + Record Transaction */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenNewTransaction(customer);
                        }}
                        className="h-8 flex-1 rounded-lg border border-gold/40 bg-gold/15 text-gold hover:bg-gold/25 flex items-center justify-center gap-1 text-xs font-bold transition-all shadow-[0_0_10px_rgba(212,175,55,0.15)]"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span>رقم وصولی / کھاتہ</span>
                      </button>

                      {/* Details Statement Chevron */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCustomerDetail(customer);
                        }}
                        className="h-8 w-8 rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white flex items-center justify-center shrink-0"
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
          <div className="premium-glass-card p-10 sm:p-16 flex flex-col items-center justify-center text-center space-y-4 border-gold/20 shadow-[0_0_30px_rgba(212,175,55,0.08)] my-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-gold/30 bg-gold/10 text-gold shadow-[0_0_20px_rgba(212,175,55,0.2)]">
              <Wallet className="h-8 w-8 text-gold" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h2 className="text-xl font-bold text-white">Khata Register is Clear</h2>
              <p className="font-urdu-serif text-sm text-gold/90" dir="rtl">
                کھاتہ رجسٹر بالکل صاف ہے
              </p>
              <p className="text-xs sm:text-sm text-gray-400">
                No outstanding market receivables or advance ledger entries recorded. Record customer advance payments or balance adjustments with zero hassle.
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="default"
                size="md"
                onClick={() => handleOpenNewTransaction()}
                className="gap-2 bg-gold text-[#0B0C0E] hover:bg-gold-hover font-semibold shadow-[0_0_25px_rgba(212,175,55,0.3)] transition-all hover:scale-105"
              >
                <PlusCircle className="h-4 w-4" />
                <span>New Khata Entry</span>
                <span className="font-urdu-sans text-xs opacity-80" dir="rtl">
                  پہلا کھاتہ اندراج
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
