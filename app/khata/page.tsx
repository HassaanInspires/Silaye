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
import { Button } from '@/components/ui/button';
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

  return (
    <AppShell activeRoute="/khata">
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 md:p-8 pt-4 sm:pt-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-5">
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
