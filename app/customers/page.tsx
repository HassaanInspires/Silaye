'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Users,
  PlusCircle,
  Search,
  Phone,
  Ruler,
  Scissors,
  Wallet,
  ExternalLink,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  X,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/lib/language-provider';
import { customersDb, shopsDb } from '@/lib/db';
import { mockShop as defaultMockShop } from '@/lib/mock-data';
import { CustomerProfileEditModal } from '@/components/tailor/customer-profile-edit-modal';
import { WhatsAppReceiptModal } from '@/components/tailor/whatsapp-receipt-modal';
import type { Customer, Shop } from '@/types/tailor';

export default function CustomersPage() {
  const { customersT, language, dir } = useLanguage();
  const isRtl = dir === 'rtl';

  const [shop, setShop] = React.useState<Shop>(defaultMockShop);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterMode, setFilterMode] = React.useState<'all' | 'with_measurements' | 'khata_due'>('all');

  // Modal states
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);

  const [whatsAppModalOpen, setWhatsAppModalOpen] = React.useState(false);
  const [whatsAppCustomer, setWhatsAppCustomer] = React.useState<Customer | null>(null);

  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // Load live shop & customers
  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const currentShop = await shopsDb.getCurrentShop();
      const effectiveShop = currentShop || defaultMockShop;
      setShop(effectiveShop);

      const custs = await customersDb.getByShopId(effectiveShop.id);
      setCustomers(custs || []);
    } catch (err) {
      console.warn('Failed to load customers:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived KPI metrics
  const totalCustomersCount = customers.length;
  const customersWithMeasurementsCount = customers.length; // In Silaye every customer profile stores measurement profile
  const debtorsCount = customers.filter((c) => (c.current_khata_balance ?? 0) > 0).length;
  const totalUdhaarAmount = customers.reduce(
    (acc, c) => acc + (c.current_khata_balance && c.current_khata_balance > 0 ? c.current_khata_balance : 0),
    0
  );

  // Filtered customer list
  const filteredCustomers = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customers.filter((c) => {
      const matchSearch =
        !q ||
        c.full_name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (filterMode === 'khata_due') {
        return (c.current_khata_balance ?? 0) > 0;
      }
      return true;
    });
  }, [customers, searchQuery, filterMode]);

  const handleOpenCreateModal = () => {
    setSelectedCustomer(null);
    setEditModalOpen(true);
  };

  const handleOpenEditModal = (c: Customer) => {
    setSelectedCustomer(c);
    setEditModalOpen(true);
  };

  const handleCustomerSaved = (savedCust: Customer) => {
    loadData();
    setToastMessage(customersT.profileSavedSuccess);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenWhatsApp = (c: Customer) => {
    setWhatsAppCustomer(c);
    setWhatsAppModalOpen(true);
  };

  return (
    <AppShell activeRoute="/customers">
      <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            data-testid="customer-success-toast"
            className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-600 dark:text-emerald-400 font-urdu-sans shadow-lg flex items-center justify-between animate-fade-in"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/30 text-primary shadow-xs">
                <Users className="h-5 w-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-urdu-sans leading-urdu-heading">
                {customersT.pageTitle}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground font-urdu-sans max-w-2xl">
              {customersT.pageSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              onClick={handleOpenCreateModal}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm font-urdu-sans shadow-xs"
              data-testid="add-customer-main-btn"
            >
              <PlusCircle className="h-4 w-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
              <span>{customersT.addCustomerBtn}</span>
            </Button>
          </div>
        </div>

        {/* Top Metric Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-urdu-sans">{customersT.totalCustomers}</p>
              <p className="text-2xl sm:text-3xl font-bold text-foreground font-mono">
                <bdi dir="ltr">{totalCustomersCount}</bdi>
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-urdu-sans">{customersT.savedProfiles}</p>
              <p className="text-2xl sm:text-3xl font-bold text-foreground font-mono">
                <bdi dir="ltr">{customersWithMeasurementsCount}</bdi>
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <Ruler className="h-5 w-5" />
            </div>
          </div>

          <div className="col-span-2 md:col-span-1 rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-urdu-sans">
                {customersT.activeDebtors} ({debtorsCount})
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400 font-mono">
                <bdi dir="ltr">Rs. {totalUdhaarAmount.toLocaleString()}</bdi>
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border p-3 rounded-xl shadow-xs">
          <div className="relative flex-1">
            <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={customersT.searchPlaceholder}
              className="pl-9 rtl:pl-3 rtl:pr-9 h-10 text-xs sm:text-sm font-urdu-sans bg-background"
              data-testid="customers-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-urdu-sans transition-all shrink-0 ${
                filterMode === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-background hover:bg-accent text-muted-foreground'
              }`}
            >
              {customersT.filterAll} ({totalCustomersCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('with_measurements')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-urdu-sans transition-all shrink-0 ${
                filterMode === 'with_measurements'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-background hover:bg-accent text-muted-foreground'
              }`}
            >
              {customersT.filterWithMeasurements} ({customersWithMeasurementsCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('khata_due')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-urdu-sans transition-all shrink-0 ${
                filterMode === 'khata_due'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-background hover:bg-accent text-rose-600 dark:text-rose-400'
              }`}
            >
              {customersT.filterKhataDue} ({debtorsCount})
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-12 text-center text-muted-foreground font-urdu-sans space-y-2">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs">گاہک لوڈ ہو رہے ہیں...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredCustomers.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 sm:p-12 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary">
              <Users className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-foreground font-urdu-sans">
                {searchQuery ? customersT.noCustomersFound : customersT.emptyStateTitle}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground font-urdu-sans max-w-md mx-auto">
                {searchQuery
                  ? 'تلاش کردہ نام یا فون نمبر کا کوئی ریکارڈ موجود نہیں ہے۔'
                  : customersT.emptyStateSub}
              </p>
            </div>
            <Button
              type="button"
              onClick={handleOpenCreateModal}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs font-urdu-sans"
            >
              <PlusCircle className="h-4 w-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
              <span>{customersT.addCustomerBtn}</span>
            </Button>
          </div>
        )}

        {/* Desktop High-Density Table (hidden on mobile) */}
        {!isLoading && filteredCustomers.length > 0 && (
          <div className="hidden md:block rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-start text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-background/60 text-muted-foreground font-urdu-sans text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4 text-start font-semibold">گاہک (Customer)</th>
                    <th className="py-3 px-4 text-start font-semibold">موبائل نمبر (Phone)</th>
                    <th className="py-3 px-4 text-start font-semibold">شہر و پتہ (Location)</th>
                    <th className="py-3 px-4 text-start font-semibold">سوٹ کی تعداد (Suits)</th>
                    <th className="py-3 px-4 text-start font-semibold">کھاتہ پوزیشن (Khata)</th>
                    <th className="py-3 px-4 text-end font-semibold">ایکشنز (Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredCustomers.map((c) => {
                    const balance = c.current_khata_balance ?? 0;
                    const hasDebt = balance > 0;
                    const hasCredit = balance < 0;

                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-accent/30 transition-colors group"
                        data-testid={`customer-row-${c.id}`}
                      >
                        {/* Name & Avatar */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold">
                              {c.full_name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-foreground text-sm font-urdu-sans leading-tight">
                                {c.full_name}
                              </p>
                              {c.notes && (
                                <p className="text-[11px] text-muted-foreground truncate max-w-[200px] font-urdu-sans mt-0.5">
                                  {c.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Phone with WhatsApp trigger */}
                        <td className="py-3.5 px-4 font-mono text-xs text-foreground">
                          <div className="flex items-center gap-2">
                            <bdi dir="ltr">{c.phone}</bdi>
                            <button
                              type="button"
                              onClick={() => handleOpenWhatsApp(c)}
                              title="Send WhatsApp"
                              className="p-1 rounded-md text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Location */}
                        <td className="py-3.5 px-4 text-muted-foreground font-urdu-sans">
                          {c.address ? `${c.address}, ${c.city || ''}` : c.city || '—'}
                        </td>

                        {/* Suits Count */}
                        <td className="py-3.5 px-4 font-mono font-semibold text-foreground">
                          <Badge variant="outline" className="text-xs">
                            <bdi dir="ltr">{c.total_orders_count || 0}</bdi> {customersT.suitsCount}
                          </Badge>
                        </td>

                        {/* Khata Balance */}
                        <td className="py-3.5 px-4">
                          {hasDebt && (
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-md text-xs">
                              {customersT.khataDue}: <bdi dir="ltr">Rs. {balance.toLocaleString()}</bdi>
                            </span>
                          )}
                          {hasCredit && (
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md text-xs">
                              {customersT.khataCredit}: <bdi dir="ltr">Rs. {Math.abs(balance).toLocaleString()}</bdi>
                            </span>
                          )}
                          {!hasDebt && !hasCredit && (
                            <span className="inline-flex items-center gap-1 text-muted-foreground text-xs font-urdu-sans">
                              {customersT.khataSettled} ✓
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-end">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Book Suit Shortcut */}
                            <Link
                              href={`/orders/new?phone=${encodeURIComponent(c.phone)}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/15 hover:bg-primary/25 border border-primary/40 text-primary font-bold text-xs font-urdu-sans shadow-2xs transition-all"
                              data-testid={`book-suit-for-${c.id}`}
                            >
                              <PlusCircle className="h-3.5 w-3.5" />
                              <span>{customersT.bookSuit}</span>
                            </Link>

                            {/* View / Edit Modal Trigger */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditModal(c)}
                              className="h-8 px-2 text-muted-foreground hover:text-foreground text-xs font-urdu-sans"
                            >
                              <Edit2 className="h-3.5 w-3.5 mr-1 rtl:ml-1 rtl:mr-0" />
                              <span>{customersT.editCustomer}</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Mobile Customer Cards (visible on mobile only) */}
        {!isLoading && filteredCustomers.length > 0 && (
          <div className="md:hidden space-y-3">
            {filteredCustomers.map((c) => {
              const balance = c.current_khata_balance ?? 0;
              const hasDebt = balance > 0;
              const hasCredit = balance < 0;

              return (
                <div
                  key={c.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3"
                  data-testid={`mobile-customer-card-${c.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/30 text-primary font-bold text-sm">
                        {c.full_name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-foreground font-urdu-sans leading-tight">
                          {c.full_name}
                        </h3>
                        <p className="text-xs text-muted-foreground font-urdu-sans mt-0.5">
                          {c.city || 'Wah Cantt'}
                        </p>
                      </div>
                    </div>

                    {/* Khata Status */}
                    <div>
                      {hasDebt && (
                        <span className="inline-block font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded text-[11px]">
                          <bdi dir="ltr">Rs. {balance.toLocaleString()}</bdi>
                        </span>
                      )}
                      {!hasDebt && (
                        <span className="inline-block text-[11px] text-emerald-600 font-urdu-sans">
                          {customersT.khataSettled} ✓
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Phone and Orders */}
                  <div className="flex items-center justify-between border-t border-border/50 pt-2 text-xs">
                    <div className="flex items-center gap-2 font-mono">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <bdi dir="ltr">{c.phone}</bdi>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenWhatsApp(c)}
                        className="p-1 rounded-md text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </button>
                      <span className="text-muted-foreground font-mono">
                        <bdi dir="ltr">{c.total_orders_count || 0}</bdi> {customersT.suitsCount}
                      </span>
                    </div>
                  </div>

                  {/* Mobile Actions Bar */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Link
                      href={`/orders/new?phone=${encodeURIComponent(c.phone)}`}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs font-urdu-sans text-center shadow-xs"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span>{customersT.bookSuit}</span>
                    </Link>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditModal(c)}
                      className="h-9 text-xs font-urdu-sans"
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1 rtl:ml-1 rtl:mr-0" />
                      <span>{customersT.editCustomer}</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Customer Edit & Measurement Profile Modal */}
        <CustomerProfileEditModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          customer={selectedCustomer}
          shop={shop}
          onSaved={handleCustomerSaved}
        />

        {/* WhatsApp Modal */}
        <WhatsAppReceiptModal
          open={whatsAppModalOpen}
          onOpenChange={setWhatsAppModalOpen}
          order={null}
          customer={whatsAppCustomer}
          shop={shop}
          initialTemplate="booking"
        />
      </div>
    </AppShell>
  );
}
