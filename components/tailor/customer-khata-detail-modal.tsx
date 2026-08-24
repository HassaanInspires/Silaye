'use client';

import * as React from 'react';
import {
  FileText,
  MessageSquare,
  PlusCircle,
  Printer,
  Calendar,
  User,
  Phone,
  MapPin,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  Receipt,
  Tag,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  ShoppingBag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPakistaniPhoneDisplay } from '@/lib/whatsapp';
import type {
  Customer,
  KhataTransaction,
  GarmentOrder,
  Staff,
  Shop,
  TransactionType,
} from '@/types/tailor';

export interface CustomerKhataDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  transactions: KhataTransaction[];
  orders?: GarmentOrder[];
  staff?: Staff[];
  shop?: Shop | null;
  onOpenNewEntry: (customer: Customer) => void;
  onOpenWhatsAppReminder?: (customer: Customer) => void;
}

const TX_TYPE_LABELS: Record<
  TransactionType,
  { labelEn: string; labelUr: string; isCredit: boolean; variant: 'status-advance-credit' | 'status-udhaar-pending' | 'secondary' | 'default' }
> = {
  MANUAL_CREDIT: {
    labelEn: 'Cash Receipt',
    labelUr: 'رقم وصولی',
    isCredit: true,
    variant: 'status-advance-credit',
  },
  MANUAL_DEBIT: {
    labelEn: 'Manual Debit',
    labelUr: 'کھاتہ ڈیبٹ / ادھار',
    isCredit: false,
    variant: 'status-udhaar-pending',
  },
  ORDER_ADVANCE: {
    labelEn: 'Order Advance',
    labelUr: 'آرڈر ایڈوانس',
    isCredit: true,
    variant: 'status-advance-credit',
  },
  ORDER_FINAL_PAYMENT: {
    labelEn: 'Order Final Payment',
    labelUr: 'آرڈر بقایا وصولی',
    isCredit: true,
    variant: 'status-advance-credit',
  },
  DISCOUNT_ADJUSTMENT: {
    labelEn: 'Discount / Concession',
    labelUr: 'رعایت / ڈسکاؤنٹ',
    isCredit: true,
    variant: 'secondary',
  },
};

export function CustomerKhataDetailModal({
  open,
  onOpenChange,
  customer,
  transactions,
  orders = [],
  staff = [],
  shop,
  onOpenNewEntry,
  onOpenWhatsAppReminder,
}: CustomerKhataDetailModalProps) {
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  if (!customer) return null;

  // Filter transactions for this customer
  const customerTxList = transactions.filter(
    (t) => t.customer_id === customer.id
  );

  // Sort transactions
  const sortedTxList = [...customerTxList].sort((a, b) => {
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  // Calculate totals
  const totalDebits = customerTxList
    .filter((t) => t.transaction_type === 'MANUAL_DEBIT')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCredits = customerTxList
    .filter((t) => t.transaction_type !== 'MANUAL_DEBIT')
    .reduce((sum, t) => sum + t.amount, 0);

  // Lookups
  const staffMap = new Map<string, Staff>();
  staff.forEach((s) => staffMap.set(s.id, s));

  const orderMap = new Map<string, GarmentOrder>();
  orders.forEach((o) => orderMap.set(o.id, o));

  const handlePrint = () => {
    window.print();
  };

  const currentBalance = customer.current_khata_balance;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 print:m-0 print:max-w-none print:p-4 print:border-none print:shadow-none">
        {/* Top Header Card */}
        <div className="border-b border-border bg-card-elevated px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Customer identity */}
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-foreground">
                    {customer.full_name}
                  </h2>
                  <Badge
                    variant={
                      currentBalance > 0
                        ? 'status-udhaar-pending'
                        : currentBalance < 0
                        ? 'status-advance-credit'
                        : 'secondary'
                    }
                  >
                    {currentBalance > 0
                      ? 'واجب الادا ادھار'
                      : currentBalance < 0
                      ? 'ایڈوانس رقم'
                      : 'بے باق / کلیئر'}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    {formatPakistaniPhoneDisplay(customer.phone)}
                  </span>
                  {customer.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {customer.address}
                      {customer.city && `, ${customer.city}`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              {currentBalance > 0 && onOpenWhatsAppReminder && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenWhatsAppReminder(customer)}
                  className="gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                >
                  <MessageSquare className="h-4 w-4" />
                  Send Reminder
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="gap-1.5"
              >
                <Printer className="h-4 w-4" />
                Print Statement
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onOpenNewEntry(customer);
                }}
                className="gap-1.5"
              >
                <PlusCircle className="h-4 w-4" />
                + Record Entry
              </Button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-3">
              <span className="text-[11px] text-muted-foreground">Current Balance</span>
              <div className="mt-1 flex items-baseline gap-1">
                <bdi
                  dir="ltr"
                  className={cn(
                    'font-mono text-lg font-bold',
                    currentBalance > 0
                      ? 'text-rose-400'
                      : currentBalance < 0
                      ? 'text-emerald-400'
                      : 'text-foreground'
                  )}
                >
                  {currentBalance >= 0 ? '' : '-'}Rs.{' '}
                  {Math.abs(currentBalance).toLocaleString()}
                </bdi>
              </div>
              <span className="urdu-data-text text-[10px] text-muted-foreground" dir="rtl">
                {currentBalance > 0 ? 'واجب الادا' : currentBalance < 0 ? 'ایڈوانس بیلنس' : 'حساب کلیئر'}
              </span>
            </div>

            <div className="rounded-lg border border-border bg-card p-3">
              <span className="text-[11px] text-muted-foreground">Total Debited (Charges)</span>
              <div className="mt-1 font-mono text-lg font-bold text-rose-400">
                <bdi dir="ltr">Rs. {totalDebits.toLocaleString()}</bdi>
              </div>
              <span className="urdu-data-text text-[10px] text-muted-foreground" dir="rtl">
                کل ڈیبٹ اندراج
              </span>
            </div>

            <div className="rounded-lg border border-border bg-card p-3">
              <span className="text-[11px] text-muted-foreground">Total Credits (Paid)</span>
              <div className="mt-1 font-mono text-lg font-bold text-emerald-400">
                <bdi dir="ltr">Rs. {totalCredits.toLocaleString()}</bdi>
              </div>
              <span className="urdu-data-text text-[10px] text-muted-foreground" dir="rtl">
                کل موصولہ رقم
              </span>
            </div>

            <div className="rounded-lg border border-border bg-card p-3">
              <span className="text-[11px] text-muted-foreground">Lifetime Orders</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-mono text-lg font-bold text-foreground">
                  {customer.total_orders_count}
                </span>
                <span className="text-xs text-muted-foreground">
                  (<bdi dir="ltr">Rs. {customer.total_spent.toLocaleString()}</bdi>)
                </span>
              </div>
              <span className="urdu-data-text text-[10px] text-muted-foreground" dir="rtl">
                کل آرڈرز اور خریداری
              </span>
            </div>
          </div>
        </div>

        {/* Ledger Transactions Statement Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Transaction Audit Trail •{' '}
                <span className="urdu-data-text font-normal text-primary">
                  مکمل کھاتہ تفصیل و اندراجات
                </span>
              </h3>
              <Badge variant="outline" className="text-[11px]">
                {customerTxList.length} records
              </Badge>
            </div>

            {/* Sort toggler */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="gap-1 text-xs text-muted-foreground hover:text-foreground print:hidden"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
            </Button>
          </div>

          {customerTxList.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
              <Receipt className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-foreground">No transactions recorded yet</p>
              <p className="urdu-data-text text-xs text-muted-foreground mt-1">
                اس گاہک کے کھاتے میں ابھی تک کوئی لین دین درج نہیں ہے۔
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onOpenNewEntry(customer);
                }}
                className="mt-4 gap-1.5 text-xs"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Record First Entry
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-card-elevated text-muted-foreground">
                    <th className="py-3 px-4 font-semibold uppercase tracking-wider">Date & Time</th>
                    <th className="py-3 px-4 font-semibold uppercase tracking-wider">Type / قسم</th>
                    <th className="py-3 px-4 font-semibold uppercase tracking-wider">Reference / Order</th>
                    <th className="py-3 px-4 font-semibold uppercase tracking-wider">Notes / تفصیل</th>
                    <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right text-rose-400">
                      Debit (+)
                    </th>
                    <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right text-emerald-400">
                      Credit (-)
                    </th>
                    <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">
                      Balance After
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-sans">
                  {sortedTxList.map((tx) => {
                    const typeConfig =
                      TX_TYPE_LABELS[tx.transaction_type] || TX_TYPE_LABELS.MANUAL_CREDIT;
                    const linkedOrder = tx.order_id ? orderMap.get(tx.order_id) : null;
                    const staffMember = tx.created_by ? staffMap.get(tx.created_by) : null;

                    const formattedDate = new Date(tx.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });

                    const formattedTime = new Date(tx.created_at).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-card-elevated/60 transition-colors"
                      >
                        {/* Date */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-medium text-foreground">{formattedDate}</div>
                          <div className="text-[10px] text-muted-foreground">{formattedTime}</div>
                        </td>

                        {/* Type Badge */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <Badge variant={typeConfig.variant} className="w-fit text-[10px]">
                              {typeConfig.labelEn}
                            </Badge>
                            <span
                              className="urdu-data-text text-[10px] text-primary"
                              dir="rtl"
                            >
                              {typeConfig.labelUr}
                            </span>
                          </div>
                        </td>

                        {/* Order reference */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {linkedOrder ? (
                            <div className="flex items-center gap-1 text-primary">
                              <ShoppingBag className="h-3 w-3" />
                              <span className="font-mono font-medium">
                                #{linkedOrder.order_number}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">—</span>
                          )}
                        </td>

                        {/* Notes & Staff */}
                        <td className="py-3 px-4 max-w-xs">
                          <div className="text-foreground leading-snug">
                            {tx.notes || <span className="text-muted-foreground italic">Standard entry</span>}
                          </div>
                          {staffMember && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              by {staffMember.name}
                            </div>
                          )}
                        </td>

                        {/* Debit */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {!typeConfig.isCredit ? (
                            <bdi dir="ltr" className="font-mono font-bold text-rose-400">
                              +Rs. {tx.amount.toLocaleString()}
                            </bdi>
                          ) : (
                            <span className="text-muted-foreground/40 font-mono">—</span>
                          )}
                        </td>

                        {/* Credit */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {typeConfig.isCredit ? (
                            <bdi dir="ltr" className="font-mono font-bold text-emerald-400">
                              -Rs. {tx.amount.toLocaleString()}
                            </bdi>
                          ) : (
                            <span className="text-muted-foreground/40 font-mono">—</span>
                          )}
                        </td>

                        {/* Balance After */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <bdi
                            dir="ltr"
                            className={cn(
                              'font-mono font-bold',
                              tx.balance_after > 0
                                ? 'text-rose-400'
                                : tx.balance_after < 0
                                ? 'text-emerald-400'
                                : 'text-muted-foreground'
                            )}
                          >
                            {tx.balance_after >= 0 ? '' : '-'}Rs.{' '}
                            {Math.abs(tx.balance_after).toLocaleString()}
                          </bdi>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Statement Footer Note */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>Immutable Ledger Policy: Transactions are cryptographically sequenced and audit-trailed.</span>
            </div>
            <div className="font-mono">
              Shop: {shop?.name || 'Silaye Master Tailors'}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CustomerKhataDetailModal;
