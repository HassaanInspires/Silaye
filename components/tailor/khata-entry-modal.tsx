'use client';

import * as React from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  Receipt,
  Tag,
  User,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { khataTransactionCreateSchema } from '@/lib/validations/tailor';
import { formatPakistaniPhoneDisplay } from '@/lib/whatsapp';
import type {
  Customer,
  GarmentOrder,
  Staff,
  Shop,
  TransactionType,
  KhataTransaction,
} from '@/types/tailor';

export interface KhataEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  selectedCustomerId?: string | null;
  orders?: GarmentOrder[];
  staff?: Staff[];
  shop?: Shop | null;
  onSubmitTransaction: (
    data: Omit<KhataTransaction, 'id' | 'created_at'>
  ) => void;
}

interface TransactionTypeOption {
  type: TransactionType;
  titleEn: string;
  titleUr: string;
  description: string;
  isCredit: boolean; // true = reduces debt / credits account; false = increases debt / debits account
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
}

const TRANSACTION_TYPES: TransactionTypeOption[] = [
  {
    type: 'MANUAL_CREDIT',
    titleEn: 'Cash / Payment Received',
    titleUr: 'رقم وصولی / کریڈٹ',
    description: 'Payment collected from customer. Reduces debt or adds advance deposit.',
    isCredit: true,
    icon: ArrowDownLeft,
    colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    type: 'MANUAL_DEBIT',
    titleEn: 'Manual Debit / Charge',
    titleUr: 'نئی رقم ادھار / ڈیبٹ',
    description: 'Extra charge or balance added. Increases customer outstanding debt.',
    isCredit: false,
    icon: ArrowUpRight,
    colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  },
  {
    type: 'ORDER_ADVANCE',
    titleEn: 'Order Advance Deposit',
    titleUr: 'آرڈر ایڈوانس وصولی',
    description: 'Advance payment collected against a specific garment booking.',
    isCredit: true,
    icon: Coins,
    colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    type: 'ORDER_FINAL_PAYMENT',
    titleEn: 'Order Final Settlement',
    titleUr: 'آرڈر بقایا وصولی',
    description: 'Final payment received upon garment delivery or trial.',
    isCredit: true,
    icon: Receipt,
    colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    type: 'DISCOUNT_ADJUSTMENT',
    titleEn: 'Discount / Concession',
    titleUr: 'رعایت / ڈسکاؤنٹ ایڈجسٹمنٹ',
    description: 'Special concession or discount granted to waive outstanding balance.',
    isCredit: true,
    icon: Tag,
    colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
];

const QUICK_NOTES = [
  'Cash received at counter',
  'JazzCash online transfer',
  'Easypaisa mobile payment',
  'Bank direct transfer',
  'Fabric provided on credit',
  'Special customer concession',
];

export function KhataEntryModal({
  open,
  onOpenChange,
  customers,
  selectedCustomerId,
  orders = [],
  staff = [],
  shop,
  onSubmitTransaction,
}: KhataEntryModalProps) {
  // Target customer selection
  const [customerId, setCustomerId] = React.useState<string>(
    selectedCustomerId || (customers[0]?.id ?? '')
  );

  // Form states
  const [transactionType, setTransactionType] =
    React.useState<TransactionType>('MANUAL_CREDIT');
  const [amountStr, setAmountStr] = React.useState<string>('');
  const [orderId, setOrderId] = React.useState<string>('');
  const [notes, setNotes] = React.useState<string>('');
  const [staffId, setStaffId] = React.useState<string>(staff[0]?.id || '');
  const [validationError, setValidationError] = React.useState<string | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  // Synchronize when modal opens or selected customer changes
  React.useEffect(() => {
    if (open) {
      const initialId = selectedCustomerId || customers[0]?.id || '';
      setCustomerId(initialId);
      setTransactionType('MANUAL_CREDIT');
      setAmountStr('');
      setOrderId('');
      setNotes('');
      setStaffId(staff[0]?.id || '');
      setValidationError(null);
      setIsSubmitting(false);
    }
  }, [open, selectedCustomerId, customers, staff]);

  // Selected customer entity
  const targetCustomer = React.useMemo(() => {
    return customers.find((c) => c.id === customerId) || null;
  }, [customers, customerId]);

  // Customer orders
  const customerOrders = React.useMemo(() => {
    if (!targetCustomer) return [];
    return orders.filter((o) => o.customer_id === targetCustomer.id);
  }, [orders, targetCustomer]);

  // Numeric amount
  const parsedAmount = parseFloat(amountStr) || 0;

  // Selected transaction type info
  const selectedTypeOption = React.useMemo(() => {
    return (
      TRANSACTION_TYPES.find((t) => t.type === transactionType) ||
      TRANSACTION_TYPES[0]
    );
  }, [transactionType]);

  // Balance calculation
  const currentBalance = targetCustomer?.current_khata_balance ?? 0;

  const calculatedBalanceAfter = React.useMemo(() => {
    if (!parsedAmount || parsedAmount <= 0) return currentBalance;

    if (transactionType === 'MANUAL_DEBIT') {
      // Debit increases positive balance (customer owes more)
      return currentBalance + parsedAmount;
    } else {
      // Credit / Advance / Final Payment / Discount decreases positive balance
      return currentBalance - parsedAmount;
    }
  }, [currentBalance, parsedAmount, transactionType]);

  // Quick Amount Handlers
  const handleQuickAmount = (val: number) => {
    setAmountStr(val.toString());
    setValidationError(null);
  };

  const handleFullBalance = () => {
    if (currentBalance > 0) {
      setAmountStr(currentBalance.toString());
      setValidationError(null);
    }
  };

  // Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!targetCustomer) {
      setValidationError('Please select a valid customer.');
      return;
    }

    if (!parsedAmount || parsedAmount <= 0) {
      setValidationError('Please enter a valid amount greater than zero.');
      return;
    }

    const shopId = shop?.id || targetCustomer.shop_id;

    // Validate using domain schema
    const validationResult = khataTransactionCreateSchema.safeParse({
      shop_id: shopId,
      customer_id: targetCustomer.id,
      order_id: orderId ? orderId : null,
      transaction_type: transactionType,
      amount: parsedAmount,
      notes: notes.trim() ? notes.trim() : null,
      created_by: staffId ? staffId : null,
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]?.message || 'Invalid transaction inputs';
      setValidationError(firstError);
      return;
    }

    setIsSubmitting(true);

    try {
      onSubmitTransaction({
        shop_id: shopId,
        customer_id: targetCustomer.id,
        order_id: orderId ? orderId : null,
        transaction_type: transactionType,
        amount: parsedAmount,
        balance_after: calculatedBalanceAfter,
        notes: notes.trim() || null,
        created_by: staffId || null,
      });

      onOpenChange(false);
    } catch {
      setValidationError('Failed to record transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="border-b border-border bg-card-elevated px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-foreground">
                Record Khata Entry • <span className="urdu-data-text font-normal text-primary">کھاتہ اندراج</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Append an immutable financial transaction with automatic balance reconciliation.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {/* Customer Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Customer Account • <span className="urdu-data-text font-normal">گاہک کا انتخاب</span>
            </label>

            {selectedCustomerId && targetCustomer ? (
              <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3.5 shadow-sm">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-foreground">
                      {targetCustomer.full_name}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatPakistaniPhoneDisplay(targetCustomer.phone)}
                    {targetCustomer.city && ` • ${targetCustomer.city}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-muted-foreground">Current Balance</div>
                  <div className="flex items-center gap-1.5">
                    <bdi
                      dir="ltr"
                      className={cn(
                        'font-mono text-sm font-bold',
                        currentBalance > 0
                          ? 'text-rose-400'
                          : currentBalance < 0
                          ? 'text-emerald-400'
                          : 'text-muted-foreground'
                      )}
                    >
                      Rs. {Math.abs(currentBalance).toLocaleString()}
                    </bdi>
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
                        ? 'ایڈوانس ڈپازٹ'
                        : 'بے باق'}
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm text-foreground shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({formatPakistaniPhoneDisplay(c.phone)}) —{' '}
                      {c.current_khata_balance > 0
                        ? `Udhaar: Rs. ${c.current_khata_balance.toLocaleString()}`
                        : c.current_khata_balance < 0
                        ? `Advance: Rs. ${Math.abs(c.current_khata_balance).toLocaleString()}`
                        : 'Settled'}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Transaction Type Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Transaction Type • <span className="urdu-data-text font-normal">لین دین کی قسم</span>
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {TRANSACTION_TYPES.map((opt) => {
                const Icon = opt.icon;
                const isSelected = transactionType === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => {
                      setTransactionType(opt.type);
                      setValidationError(null);
                    }}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border p-3 text-left transition-all',
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                        : 'border-border bg-card hover:border-primary/40 hover:bg-card-elevated'
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border',
                        opt.colorClass
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-0.5 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {opt.titleEn}
                        </span>
                        <span
                          className="urdu-data-text text-xs text-primary font-medium"
                          dir="rtl"
                        >
                          {opt.titleUr}
                        </span>
                      </div>
                      <p className="text-[11px] leading-tight text-muted-foreground line-clamp-2">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount Input & Quick Modifiers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Amount (PKR) • <span className="urdu-data-text font-normal">رقم</span>
              </label>
              {currentBalance > 0 && selectedTypeOption.isCredit && (
                <button
                  type="button"
                  onClick={handleFullBalance}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Pay Full Balance (Rs. {currentBalance.toLocaleString()})
                </button>
              )}
            </div>

            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-2.5 font-mono text-sm font-semibold text-muted-foreground">
                Rs.
              </span>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="0"
                value={amountStr}
                onChange={(e) => {
                  setAmountStr(e.target.value);
                  setValidationError(null);
                }}
                className="pl-12 font-mono text-lg font-bold text-foreground"
                autoFocus
              />
            </div>

            {/* Quick Amount Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[500, 1000, 2000, 3000, 5000].map((val) => (
                <button
                  key={val}
                  type="button"
                  tabIndex={-1}
                  onClick={() => handleQuickAmount(val)}
                  className="rounded-md border border-border bg-card-elevated px-2.5 py-1 text-xs font-mono text-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
                >
                  +<bdi dir="ltr">Rs. {val.toLocaleString()}</bdi>
                </button>
              ))}
            </div>
          </div>

          {/* Real-time Dynamic Balance Projection Preview */}
          <div className="rounded-xl border border-border bg-card-elevated p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center justify-between">
              <span>Dynamic Balance Calculation</span>
              <span className="urdu-data-text font-normal text-primary">حساب کتاب کا تخمینہ</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              {/* Current */}
              <div className="rounded-lg border border-border/50 bg-background/50 p-2.5">
                <div className="text-[11px] text-muted-foreground">Current Balance</div>
                <div className="mt-1 font-mono text-sm font-bold text-foreground">
                  <bdi dir="ltr">
                    {currentBalance >= 0 ? '' : '-'}Rs.{' '}
                    {Math.abs(currentBalance).toLocaleString()}
                  </bdi>
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  {currentBalance > 0 ? 'Udhaar' : currentBalance < 0 ? 'Credit' : 'Settled'}
                </div>
              </div>

              {/* Delta */}
              <div className="rounded-lg border border-border/50 bg-background/50 p-2.5">
                <div className="text-[11px] text-muted-foreground">
                  {selectedTypeOption.isCredit ? 'Credit (-)' : 'Debit (+)'}
                </div>
                <div
                  className={cn(
                    'mt-1 font-mono text-sm font-bold',
                    selectedTypeOption.isCredit ? 'text-emerald-400' : 'text-rose-400'
                  )}
                >
                  <bdi dir="ltr">
                    {selectedTypeOption.isCredit ? '-' : '+'}Rs.{' '}
                    {parsedAmount.toLocaleString()}
                  </bdi>
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground truncate">
                  {selectedTypeOption.titleEn}
                </div>
              </div>

              {/* Projected Balance After */}
              <div
                className={cn(
                  'rounded-lg border p-2.5 transition-colors',
                  calculatedBalanceAfter > 0
                    ? 'border-rose-500/30 bg-rose-500/10'
                    : calculatedBalanceAfter < 0
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : 'border-border/50 bg-background/50'
                )}
              >
                <div className="text-[11px] text-muted-foreground">Balance After</div>
                <div
                  className={cn(
                    'mt-1 font-mono text-sm font-bold',
                    calculatedBalanceAfter > 0
                      ? 'text-rose-400'
                      : calculatedBalanceAfter < 0
                      ? 'text-emerald-400'
                      : 'text-foreground'
                  )}
                >
                  <bdi dir="ltr">
                    {calculatedBalanceAfter >= 0 ? '' : '-'}Rs.{' '}
                    {Math.abs(calculatedBalanceAfter).toLocaleString()}
                  </bdi>
                </div>
                <div className="mt-0.5 text-[10px] font-medium">
                  {calculatedBalanceAfter > 0 ? (
                    <span className="text-rose-400">واجب الادا ادھار</span>
                  ) : calculatedBalanceAfter < 0 ? (
                    <span className="text-emerald-400">ایڈوانس ڈپازٹ</span>
                  ) : (
                    <span className="text-muted-foreground">مکمل بے باق (0)</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Link to Order (Conditional if orders available or type is order-related) */}
          {customerOrders.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Link to Garment Order (Optional) • <span className="urdu-data-text font-normal">آرڈر کا حوالہ</span>
              </label>
              <div className="relative">
                <select
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-input bg-card px-3.5 py-2 text-xs text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- No specific order link (General Ledger) --</option>
                  {customerOrders.map((ord) => (
                    <option key={ord.id} value={ord.id}>
                      #{ord.order_number} ({ord.garment_type}) — Total: Rs.{' '}
                      {ord.total_amount.toLocaleString()} | Due: Rs.{' '}
                      {ord.balance_due.toLocaleString()} [{ord.status}]
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
          )}

          {/* Notes / Reason & Quick Suggestions */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Reason / Payment Note • <span className="urdu-data-text font-normal">تفصیل / ادائیگی نوٹ</span>
            </label>
            <Input
              type="text"
              placeholder="e.g., Cash received at counter, JazzCash transaction ID, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm"
            />
            <div className="flex flex-wrap gap-1.5">
              {QUICK_NOTES.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  tabIndex={-1}
                  onClick={() => setNotes(chip)}
                  className="rounded-md border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Staff Member Selector */}
          {staff.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recorded By (Staff Handler) • <span className="urdu-data-text font-normal">اندراج کنندہ</span>
              </label>
              <div className="relative">
                <select
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-input bg-card px-3.5 py-2 text-xs text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
          )}

          {/* Validation Feedback Alert */}
          {validationError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Actions */}
          <DialogFooter className="border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={isSubmitting || parsedAmount <= 0}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirm & Save Entry • اندراج محفوظ کریں
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default KhataEntryModal;
