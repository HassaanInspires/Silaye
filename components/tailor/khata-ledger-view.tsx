'use client';

import * as React from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  Search,
  PlusCircle,
  MessageSquare,
  FileText,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  List,
  Sparkles,
  Phone,
  MapPin,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatPakistaniPhoneDisplay } from '@/lib/whatsapp';
import type { Customer, KhataTransaction, GarmentOrder, Staff, Shop } from '@/types/tailor';

export type KhataFilterTab = 'ALL' | 'DEBTORS' | 'CREDITORS' | 'SETTLED';
export type KhataSortOption = 'HIGHEST_DEBT' | 'HIGHEST_CREDIT' | 'NAME' | 'ORDERS' | 'SPENT';

export interface KhataLedgerViewProps {
  customers: Customer[];
  transactions: KhataTransaction[];
  orders?: GarmentOrder[];
  staff?: Staff[];
  shop?: Shop | null;
  onOpenNewTransaction: (customer?: Customer | null) => void;
  onOpenCustomerDetail: (customer: Customer) => void;
  onOpenWhatsAppReminder: (customer: Customer) => void;
}

export function KhataLedgerView({
  customers,
  transactions,
  orders = [],
  staff = [],
  shop,
  onOpenNewTransaction,
  onOpenCustomerDetail,
  onOpenWhatsAppReminder,
}: KhataLedgerViewProps) {
  // Filter & Search states
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [activeTab, setActiveTab] = React.useState<KhataFilterTab>('ALL');
  const [sortBy, setSortBy] = React.useState<KhataSortOption>('HIGHEST_DEBT');
  const [viewLayout, setViewLayout] = React.useState<'grid' | 'table'>('grid');

  // Aggregated Market Metrics
  const metrics = React.useMemo(() => {
    let totalReceivables = 0; // Sum of positive balances (Udhaar)
    let totalAdvances = 0; // Sum of negative balances (Advance credits held)
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

  // Filtered and Sorted Customers
  const filteredCustomers = React.useMemo(() => {
    let list = customers.filter((c) => {
      // Search matching
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = c.full_name.toLowerCase().includes(q);
        const matchesPhone = c.phone.replace(/\D/g, '').includes(q.replace(/\D/g, ''));
        const matchesCity = c.city?.toLowerCase().includes(q) || false;
        const matchesNotes = c.notes?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesPhone && !matchesCity && !matchesNotes) {
          return false;
        }
      }

      // Tab filter
      if (activeTab === 'DEBTORS') {
        return c.current_khata_balance > 0;
      }
      if (activeTab === 'CREDITORS') {
        return c.current_khata_balance < 0;
      }
      if (activeTab === 'SETTLED') {
        return c.current_khata_balance === 0;
      }

      return true;
    });

    // Sorting
    list = list.sort((a, b) => {
      switch (sortBy) {
        case 'HIGHEST_DEBT':
          return b.current_khata_balance - a.current_khata_balance;
        case 'HIGHEST_CREDIT':
          return a.current_khata_balance - b.current_khata_balance;
        case 'NAME':
          return a.full_name.localeCompare(b.full_name);
        case 'ORDERS':
          return b.total_orders_count - a.total_orders_count;
        case 'SPENT':
          return b.total_spent - a.total_spent;
        default:
          return 0;
      }
    });

    return list;
  }, [customers, searchQuery, activeTab, sortBy]);

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* 1. AGGREGATED METRICS RIBBON                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Receivables (Udhaar) */}
        <Card className="border-rose-500/20 bg-card relative overflow-hidden">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-rose-500/5 blur-2xl pointer-events-none" />
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Market Receivables
              </span>
              <div className="urdu-data-text text-xs text-rose-400 font-medium" dir="rtl">
                واجب الادا ادھار
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold text-rose-400">
              <bdi dir="ltr">Rs. {metrics.totalReceivables.toLocaleString()}</bdi>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Badge variant="status-udhaar-pending" className="px-1.5 py-0 text-[10px]">
                {metrics.debtorsCount} Debtors
              </Badge>
              <span>awaiting recovery</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Advance Deposits Held */}
        <Card className="border-emerald-500/20 bg-card relative overflow-hidden">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none" />
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Advance Deposits Held
              </span>
              <div className="urdu-data-text text-xs text-emerald-400 font-medium" dir="rtl">
                ایڈوانس رقم (ڈپازٹ)
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold text-emerald-400">
              <bdi dir="ltr">Rs. {metrics.totalAdvances.toLocaleString()}</bdi>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Badge variant="status-advance-credit" className="px-1.5 py-0 text-[10px]">
                {metrics.advanceHoldersCount} Accounts
              </Badge>
              <span>in store credit</span>
            </div>
          </CardContent>
        </Card>

        {/* Net Market Position */}
        <Card className="border-border bg-card relative overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Net Market Balance
              </span>
              <div className="urdu-data-text text-xs text-primary font-medium" dir="rtl">
                خالص مارکیٹ پوزیشن
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'font-mono text-2xl font-bold',
                metrics.netMarketPosition > 0
                  ? 'text-rose-400'
                  : metrics.netMarketPosition < 0
                  ? 'text-emerald-400'
                  : 'text-foreground'
              )}
            >
              <bdi dir="ltr">
                {metrics.netMarketPosition >= 0 ? '' : '-'}Rs.{' '}
                {Math.abs(metrics.netMarketPosition).toLocaleString()}
              </bdi>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{metrics.netMarketPosition >= 0 ? 'Net Receivable' : 'Net Advance Credit'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Active Accounts & Settled Ratio */}
        <Card className="border-border bg-card relative overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Khata Accounts
              </span>
              <div className="urdu-data-text text-xs text-muted-foreground font-medium" dir="rtl">
                کل گاہک کھاتے
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary text-foreground">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold text-foreground">
              {metrics.totalCustomers}
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="text-status-ready font-medium">
                {metrics.settledCount} Settled (بے باق)
              </span>
              <span>•</span>
              <span className="text-rose-400 font-medium">
                {metrics.debtorsCount} Pending
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. TOOLBAR: SEARCH, TABS, SORT & QUICK RECORD CTA                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Search Input */}
        <div className="flex flex-1 items-center gap-3">
          <Input
            type="search"
            placeholder="Search customer by name, mobile number, or city…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            className="max-w-md bg-card"
          />

          {/* Quick Filter Tabs */}
          <div className="hidden sm:flex items-center rounded-lg border border-border bg-card p-1">
            <button
              onClick={() => setActiveTab('ALL')}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                activeTab === 'ALL'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              All ({customers.length})
            </button>
            <button
              onClick={() => setActiveTab('DEBTORS')}
              className={cn(
                'flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                activeTab === 'DEBTORS'
                  ? 'bg-rose-500/20 text-rose-300 font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-rose-400'
              )}
            >
              <span>Udhaar</span>
              <span className="urdu-data-text text-[11px]">(واجب الادا)</span>
              <span className="ml-1 rounded-full bg-rose-500/20 px-1.5 py-0.2 font-mono text-[10px] text-rose-400">
                {metrics.debtorsCount}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('CREDITORS')}
              className={cn(
                'flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                activeTab === 'CREDITORS'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-emerald-400'
              )}
            >
              <span>Advance</span>
              <span className="urdu-data-text text-[11px]">(ایڈوانس)</span>
              <span className="ml-1 rounded-full bg-emerald-500/20 px-1.5 py-0.2 font-mono text-[10px] text-emerald-400">
                {metrics.advanceHoldersCount}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('SETTLED')}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                activeTab === 'SETTLED'
                  ? 'bg-secondary text-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Settled ({metrics.settledCount})
            </button>
          </div>
        </div>

        {/* Right Actions: Sort, View Toggle, + Record Transaction CTA */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as KhataSortOption)}
              className="rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="HIGHEST_DEBT">Highest Debt (زیادہ ادھار)</option>
              <option value="HIGHEST_CREDIT">Highest Advance (زیادہ ایڈوانس)</option>
              <option value="NAME">Customer Name (A-Z)</option>
              <option value="SPENT">Highest Spent (کل خریداری)</option>
              <option value="ORDERS">Most Orders (زیادہ آرڈرز)</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-border bg-card p-1">
            <button
              onClick={() => setViewLayout('grid')}
              className={cn(
                'rounded p-1 text-muted-foreground transition-colors',
                viewLayout === 'grid' && 'bg-secondary text-foreground'
              )}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewLayout('table')}
              className={cn(
                'rounded p-1 text-muted-foreground transition-colors',
                viewLayout === 'table' && 'bg-secondary text-foreground'
              )}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Global New Entry Button */}
          <Button
            variant="default"
            size="sm"
            onClick={() => onOpenNewTransaction(null)}
            className="gap-1.5 shadow-sm font-semibold"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Record Khata Entry</span>
            <span className="urdu-data-text font-normal text-primary-foreground hidden md:inline">
              (نیا اندراج)
            </span>
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. CUSTOMER LEDGER CARDS GRID / TABLE VIEW                         */}
      {/* ------------------------------------------------------------------ */}
      {filteredCustomers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center">
          <Wallet className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-semibold text-foreground">No Khata accounts found</h3>
          <p className="urdu-data-text text-sm text-muted-foreground mt-1 max-w-sm">
            دیے گئے فلٹر یا تلاش کے مطابق کوئی کھاتہ دستیاب نہیں ہے۔
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setActiveTab('ALL');
            }}
            className="mt-4 gap-1.5 text-xs"
          >
            Clear Filters • تمام فلٹرز ختم کریں
          </Button>
        </div>
      ) : viewLayout === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCustomers.map((customer) => {
            const isDebtor = customer.current_khata_balance > 0;
            const isCreditor = customer.current_khata_balance < 0;
            const isSettled = customer.current_khata_balance === 0;

            return (
              <Card
                key={customer.id}
                className={cn(
                  'border transition-all duration-200 hover:border-primary/40 hover:shadow-md flex flex-col justify-between',
                  isDebtor
                    ? 'border-rose-500/30 bg-card hover:shadow-rose-950/10'
                    : isCreditor
                    ? 'border-emerald-500/30 bg-card hover:shadow-emerald-950/10'
                    : 'border-border bg-card'
                )}
              >
                <div>
                  {/* Card Top Banner */}
                  <CardHeader className="pb-3 border-b border-border/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 overflow-hidden">
                        <button
                          onClick={() => onOpenCustomerDetail(customer)}
                          className="text-left font-semibold text-foreground hover:text-primary transition-colors text-base truncate block w-full"
                        >
                          {customer.full_name}
                        </button>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="font-mono">
                            {formatPakistaniPhoneDisplay(customer.phone)}
                          </span>
                        </div>
                      </div>

                      {/* Balance Badge */}
                      <Badge
                        variant={
                          isDebtor
                            ? 'status-udhaar-pending'
                            : isCreditor
                            ? 'status-advance-credit'
                            : 'secondary'
                        }
                        className="shrink-0"
                      >
                        {isDebtor ? 'واجب الادا' : isCreditor ? 'ایڈوانس' : 'بے باق'}
                      </Badge>
                    </div>
                  </CardHeader>

                  {/* Card Content & Financial Info */}
                  <CardContent className="pt-4 space-y-4">
                    {/* Big Balance Display */}
                    <div className="rounded-xl border border-border/70 bg-card-elevated p-3 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-muted-foreground uppercase tracking-wider">
                          Current Khata Balance
                        </div>
                        <div className="urdu-data-text text-[10px] text-muted-foreground">
                          {isDebtor ? 'بقایا ادھار رقم' : isCreditor ? 'ایڈوانس جمع شدہ' : 'حساب برابر'}
                        </div>
                      </div>
                      <div className="text-right">
                        <bdi
                          dir="ltr"
                          className={cn(
                            'font-mono text-xl font-bold',
                            isDebtor
                              ? 'text-rose-400'
                              : isCreditor
                              ? 'text-emerald-400'
                              : 'text-muted-foreground'
                          )}
                        >
                          {customer.current_khata_balance >= 0 ? '' : '-'}Rs.{' '}
                          {Math.abs(customer.current_khata_balance).toLocaleString()}
                        </bdi>
                      </div>
                    </div>

                    {/* Customer Notes / Location & Lifetime Spent */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <div className="flex items-center gap-1 truncate max-w-[180px]">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate">{customer.city || customer.address || 'Wah Cantt'}</span>
                      </div>
                      <div className="text-right">
                        <span>{customer.total_orders_count} orders • </span>
                        <bdi dir="ltr" className="font-mono font-medium text-foreground">
                          Rs. {customer.total_spent.toLocaleString()}
                        </bdi>
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Card Action Buttons */}
                <div className="border-t border-border/60 bg-card-elevated/40 p-3 flex items-center justify-between gap-2">
                  {/* 1-Tap WhatsApp Reminder (Debtors only) */}
                  {isDebtor ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenWhatsAppReminder(customer)}
                      className="gap-1.5 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 flex-1"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Reminder</span>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenCustomerDetail(customer)}
                      className="gap-1 text-xs text-muted-foreground hover:text-foreground flex-1"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Statement</span>
                    </Button>
                  )}

                  {/* Record Entry */}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onOpenNewTransaction(customer)}
                    className="gap-1 text-xs flex-1"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>+ Entry</span>
                  </Button>

                  {/* Statement View */}
                  {isDebtor && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onOpenCustomerDetail(customer)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      title="View Complete Statement"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Compact Table View */
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-card-elevated text-muted-foreground">
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Customer / فون</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Location / شہر</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-center">Orders</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Lifetime Spent</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">
                  Khata Balance
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-center">Status</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCustomers.map((customer) => {
                const isDebtor = customer.current_khata_balance > 0;
                const isCreditor = customer.current_khata_balance < 0;

                return (
                  <tr
                    key={customer.id}
                    className="hover:bg-card-elevated/60 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <button
                        onClick={() => onOpenCustomerDetail(customer)}
                        className="font-semibold text-foreground hover:text-primary text-left text-sm"
                      >
                        {customer.full_name}
                      </button>
                      <div className="font-mono text-muted-foreground text-[11px]">
                        {formatPakistaniPhoneDisplay(customer.phone)}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-muted-foreground">
                      {customer.city || customer.address || 'Wah Cantt'}
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-medium text-foreground">
                      {customer.total_orders_count}
                    </td>

                    <td className="py-3 px-4 text-right font-mono">
                      <bdi dir="ltr">Rs. {customer.total_spent.toLocaleString()}</bdi>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <bdi
                        dir="ltr"
                        className={cn(
                          'font-mono text-sm font-bold',
                          isDebtor
                            ? 'text-rose-400'
                            : isCreditor
                            ? 'text-emerald-400'
                            : 'text-muted-foreground'
                        )}
                      >
                        {customer.current_khata_balance >= 0 ? '' : '-'}Rs.{' '}
                        {Math.abs(customer.current_khata_balance).toLocaleString()}
                      </bdi>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant={
                          isDebtor
                            ? 'status-udhaar-pending'
                            : isCreditor
                            ? 'status-advance-credit'
                            : 'secondary'
                        }
                        className="text-[10px]"
                      >
                        {isDebtor ? 'واجب الادا' : isCreditor ? 'ایڈوانس' : 'بے باق'}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isDebtor && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenWhatsAppReminder(customer)}
                            className="h-7 px-2 text-[11px] text-emerald-400 hover:bg-emerald-500/10"
                            title="Send WhatsApp Reminder"
                          >
                            <MessageSquare className="h-3.5 w-3.5 mr-1" />
                            Reminder
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onOpenNewTransaction(customer)}
                          className="h-7 px-2 text-[11px] text-primary hover:bg-primary/10"
                        >
                          <PlusCircle className="h-3.5 w-3.5 mr-1" />
                          Entry
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onOpenCustomerDetail(customer)}
                          className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          Statement
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default KhataLedgerView;
