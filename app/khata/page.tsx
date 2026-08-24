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
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { KhataLedgerView } from '@/components/tailor/khata-ledger-view';
import { KhataEntryModal } from '@/components/tailor/khata-entry-modal';
import { CustomerKhataDetailModal } from '@/components/tailor/customer-khata-detail-modal';
import { WhatsAppReceiptModal } from '@/components/tailor/whatsapp-receipt-modal';
import {
  mockCustomers as initialMockCustomers,
  mockKhataTransactions as initialMockTransactions,
  mockOrders as initialMockOrders,
  mockStaff as initialMockStaff,
  mockShop,
} from '@/lib/mock-data';
import type { Customer, KhataTransaction, GarmentOrder, Staff } from '@/types/tailor';

export default function KhataPage() {
  // In-memory local state
  const [customers, setCustomers] = React.useState<Customer[]>(initialMockCustomers);
  const [transactions, setTransactions] = React.useState<KhataTransaction[]>(initialMockTransactions);
  const [orders] = React.useState<GarmentOrder[]>(initialMockOrders);
  const [staff] = React.useState<Staff[]>(initialMockStaff);

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

  return (
    <AppShell activeRoute="/khata">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="font-editorial text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                Khata & Financial Ledger
              </h1>
              <span className="font-editorial text-lg text-primary">•</span>
              <span className="urdu-data-text text-lg text-primary font-medium" dir="rtl">
                کھاتہ و مالیاتی لیجر
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Market receivables, advance deposits, and double-entry aligned audit trails for customer accounts.
            </p>
          </div>

          {/* Quick stats indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs text-primary">
              <Sparkles className="h-4 w-4" />
              <span>Immutable Ledger Active</span>
            </div>
          </div>
        </div>

        {/* Floating Notification Banner */}
        {notification && (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 shadow-md animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{notification.message}</span>
          </div>
        )}

        {/* Main Master Ledger View */}
        <KhataLedgerView
          customers={customers}
          transactions={transactions}
          orders={orders}
          staff={staff}
          shop={mockShop}
          onOpenNewTransaction={handleOpenNewTransaction}
          onOpenCustomerDetail={handleOpenCustomerDetail}
          onOpenWhatsAppReminder={handleOpenWhatsAppReminder}
        />

        {/* 1. Transaction Entry Modal */}
        <KhataEntryModal
          open={entryModalOpen}
          onOpenChange={setEntryModalOpen}
          customers={customers}
          selectedCustomerId={selectedEntryCustomer?.id}
          orders={orders}
          staff={staff}
          shop={mockShop}
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
          shop={mockShop}
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
          shop={mockShop}
          initialTemplate="khata"
        />
      </div>
    </AppShell>
  );
}
