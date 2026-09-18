'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  Calendar,
  MessageSquare,
  Phone,
  MapPin,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  Scissors,
  Sparkles,
} from 'lucide-react';
import { mockOrders, mockCustomers, mockShop, SEED_ORDERS, SEED_CUSTOMERS } from '@/lib/mock-data';
import { ordersDb, shopsDb } from '@/lib/db';
import { OrderProgressStepper } from '@/components/track/order-progress-stepper';
import type { GarmentOrder, Shop } from '@/types/tailor';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GARMENT_TYPE_LABELS: Record<GarmentOrder['garment_type'], string> = {
  MEN_SHALWAR_KAMEEZ: "Men's Shalwar Kameez",
  MEN_KURTA: "Men's Kurta",
  WAISTCOAT: 'Waistcoat',
  PRINCE_SUIT: 'Prince Suit',
  TROUSER_SHIRT: 'Trouser & Shirt',
  WOMEN_SUIT: "Women's Suit",
};

const GARMENT_TYPE_LABELS_UR: Record<GarmentOrder['garment_type'], string> = {
  MEN_SHALWAR_KAMEEZ: 'مردانہ شلوار قمیض',
  MEN_KURTA: 'مردانہ کرتہ',
  WAISTCOAT: 'واسکٹ',
  PRINCE_SUIT: 'پرنس سوٹ',
  TROUSER_SHIRT: 'ٹراؤزر اور شرٹ',
  WOMEN_SUIT: 'زنانہ سوٹ',
};

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-PK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function buildWhatsAppInquiryLink(orderNumber: string, shopPhone: string): string {
  const cleanPhone = shopPhone.replace(/\D/g, '');
  const phone = cleanPhone.startsWith('92') ? cleanPhone : `92${cleanPhone.replace(/^0/, '')}`;
  const text = encodeURIComponent(
    `السلام علیکم!\nمیں اپنے آرڈر #${orderNumber} کے بارے میں معلومات لینا چاہتا ہوں۔\n\nHello! I would like to inquire about my Order #${orderNumber}.`
  );
  return `https://wa.me/${phone}?text=${text}`;
}

// ─── Not Found State ──────────────────────────────────────────────────────────

function OrderNotFound({ shopPhone }: { shopPhone: string }) {
  const waLink = buildWhatsAppInquiryLink('?', shopPhone);
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 mb-6">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-xl font-bold text-foreground">Order Not Found</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-xs font-urdu-serif" dir="rtl">
        اس لنک کے مطابق کوئی آرڈر نہیں مل سکا۔ برائے مہربانی اپنا آرڈر نمبر چیک کریں یا ورکشاپ سے رابطہ کریں۔
      </p>
      <p className="mt-1 text-xs text-muted-foreground/80 max-w-xs">
        We couldn&apos;t find an order matching that link. The link may be incorrect or the order may have been removed.
      </p>
      <div className="mt-8 flex flex-col w-full gap-3">
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-emerald-500 transition-colors"
        >
          <MessageSquare className="h-4 w-4" />
          <span>Contact Workshop on WhatsApp</span>
        </a>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Silaye Home</span>
        </Link>
      </div>
    </div>
  );
}

// ─── Main Client View ─────────────────────────────────────────────────────────

export function OrderTrackingView() {
  const params = useParams();
  const rawId = params?.orderId;
  const orderId = Array.isArray(rawId) ? rawId[0] : rawId ?? '';

  const [order, setOrder] = React.useState<GarmentOrder | null>(null);
  const [shop, setShop] = React.useState<Shop>(mockShop);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    let isMounted = true;

    async function loadTrackingData() {
      setIsLoading(true);
      try {
        const currentShop = await shopsDb.getCurrentShop();
        const activeShop = currentShop || mockShop;
        if (!isMounted) return;
        setShop(activeShop);

        // Fetch real orders from Dexie / Supabase
        const targetShopId = activeShop.id;
        const loadedOrders = await ordersDb.getByShopId(targetShopId);

        // Search loaded database orders
        const q = orderId.toLowerCase().trim();
        let found = loadedOrders.find(
          (o) =>
            o.order_number.toLowerCase() === q ||
            o.public_tracking_key?.toLowerCase() === q ||
            o.id.toLowerCase() === q
        );

        // Fallback to mock / seed orders if not found in database (e.g. preview, static export slugs)
        if (!found) {
          const fallbackPool = mockOrders.length > 0 ? mockOrders : SEED_ORDERS;
          found = fallbackPool.find(
            (o) =>
              o.order_number.toLowerCase() === q ||
              o.public_tracking_key?.toLowerCase() === q ||
              o.id.toLowerCase() === q
          );
        }

        if (isMounted) {
          setOrder(found ?? null);
        }
      } catch (err) {
        console.warn('Failed to load tracking order:', err);
        // Fallback to mock search on error
        const q = orderId.toLowerCase().trim();
        const fallbackPool = mockOrders.length > 0 ? mockOrders : SEED_ORDERS;
        const fallback = fallbackPool.find(
          (o) =>
            o.order_number.toLowerCase() === q ||
            o.public_tracking_key?.toLowerCase() === q ||
            o.id.toLowerCase() === q
        );
        if (isMounted) setOrder(fallback ?? null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (orderId) {
      loadTrackingData();
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  // Customer reference (used only server-side / for screen reader attributes)
  const customer = order
    ? mockCustomers.find((c) => c.id === order.customer_id) ?? null
    : null;

  const shopPhone = shop.owner_phone || shop.phone || '0300-5551234';
  const waLink = order
    ? buildWhatsAppInquiryLink(order.order_number, shopPhone)
    : null;

  return (
    <div className="min-h-screen bg-background py-0 sm:py-8 flex justify-center items-start text-foreground">
      {/* ── Mobile Container Frame ── */}
      <div className="w-full max-w-md mx-auto min-h-screen sm:min-h-[92vh] bg-card shadow-2xl relative pb-28 text-card-foreground sm:rounded-3xl sm:border sm:border-border sm:overflow-hidden flex flex-col">
        
        {/* ── Top Header Bar ── */}
        <header className="bg-card border-b border-border text-card-foreground p-5 text-center rounded-b-2xl shadow-xs relative z-20">
          <div className="flex items-center justify-between mb-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Silaye</span>
            </Link>
            <div className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5">
              <ShieldCheck className="h-3.5 w-3.5 text-gold" />
              <span className="text-[11px] font-medium text-gold">Verified Tracker</span>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/15 border border-gold/30 mb-2 text-gold">
              <Scissors className="h-5 w-5" />
            </div>
            <h1 className="font-editorial text-2xl font-bold tracking-tight text-foreground">
              {shop.name || 'Silaye Workshop'}
            </h1>
            <p className="text-xs text-gold uppercase tracking-widest mt-0.5">
              Order Tracker · <span className="font-urdu-sans" dir="rtl">آرڈر ٹریکر</span>
            </p>
          </div>
        </header>

        {/* ── Body Content ── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center flex-1 py-24 space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            <p className="text-xs text-muted-foreground font-urdu-serif" dir="rtl">
              آرڈر کی معلومات لوڈ ہو رہی ہیں...
            </p>
          </div>
        ) : !order ? (
          <OrderNotFound shopPhone={shopPhone} />
        ) : (
          <main className="flex-1 flex flex-col">
            {/* ── 1. Order Details Card ── */}
            <div className="rounded-2xl border border-border bg-card p-6 mt-6 mx-4 relative overflow-hidden shadow-xs">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-xs font-bold text-foreground mb-2">
                    <Package className="h-3.5 w-3.5 text-gold" />
                    <span>Order #{order.order_number}</span>
                  </div>
                  <h2 className="text-xl font-bold text-foreground leading-snug">
                    <bdi dir="ltr">{order.quantity}×</bdi> {GARMENT_TYPE_LABELS[order.garment_type] || order.garment_type}
                  </h2>
                  <p className="urdu-data-text text-sm text-muted-foreground" dir="rtl">
                    <bdi dir="ltr">{order.quantity}×</bdi> {GARMENT_TYPE_LABELS_UR[order.garment_type] || ''}
                  </p>
                </div>
              </div>

              {/* Grid: Dates & Status */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border text-xs">
                <div className="rounded-xl bg-muted/40 border border-border p-3">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="font-medium">Booked</span>
                  </div>
                  <p className="font-bold text-foreground">
                    <bdi dir="ltr">{formatDate(order.booking_date)}</bdi>
                  </p>
                </div>

                <div className="rounded-xl bg-gold/15 border border-gold/30 p-3">
                  <div className="flex items-center gap-1 text-foreground/80 mb-1">
                    <Sparkles className="h-3.5 w-3.5 text-gold" />
                    <span className="font-semibold">Target Delivery</span>
                  </div>
                  <p className="font-bold text-foreground">
                    <bdi dir="ltr">{formatDate(order.delivery_date)}</bdi>
                  </p>
                </div>
              </div>

              {/* Financial Status Banner */}
              <div className="mt-3">
                {order.balance_due === 0 ? (
                  <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2.5 text-xs text-emerald-600 dark:text-emerald-400">
                    <span className="font-semibold">Payment Status</span>
                    <span className="font-bold">Fully Paid ✓</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-2.5 text-xs text-amber-700 dark:text-amber-400">
                    <div>
                      <span className="font-semibold block">Balance Due on Pickup</span>
                      <span className="urdu-data-text text-[11px] opacity-85" dir="rtl">وصولی پر بقیہ رقم</span>
                    </div>
                    <span className="text-sm font-bold">
                      <bdi dir="ltr">Rs. {order.balance_due.toLocaleString('en-PK')}</bdi>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── 2. Progress Stepper Container ── */}
            <div className="rounded-2xl border border-border bg-card p-6 mt-4 mx-4 shadow-xs">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Production Progress
                </h3>
                <span className="urdu-data-text text-xs text-muted-foreground" dir="rtl">
                  مراحلِ تیاری
                </span>
              </div>

              <OrderProgressStepper
                currentStatus={order.status}
                deliveryDate={order.delivery_date}
                trialDate={order.trial_date}
              />
            </div>

            {/* ── 3. Workshop Contact & Trust Card ── */}
            <div className="rounded-2xl border border-border bg-card p-5 mt-4 mx-4 space-y-2.5 text-xs shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">{shop.name}</span>
                <span className="text-[11px] text-muted-foreground font-medium">Bespoke Workshop</span>
              </div>
              
              {shop.address && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-muted-foreground/60" />
                  <span>{shop.address}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" />
                <a href={`tel:${shopPhone}`} className="font-medium hover:underline text-foreground">
                  <bdi dir="ltr">{shopPhone}</bdi>
                </a>
              </div>

              <div className="pt-2 border-t border-border flex items-center gap-2 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-gold flex-shrink-0" />
                <span>Customer measurements and accounts remain strictly private.</span>
              </div>
            </div>
          </main>
        )}

        {/* ── 4. Fixed Bottom Action Bar ── */}
        {order && waLink && (
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card/95 backdrop-blur-md border-t border-border p-4 z-50 shadow-lg sm:rounded-b-3xl">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all"
            >
              <MessageSquare className="h-5 w-5 fill-white text-white" />
              <span>WhatsApp Us · Order #{order.order_number}</span>
            </a>
          </div>
        )}

        {/* Screen-reader customer reference */}
        <span className="sr-only" aria-hidden="true">
          {customer?.full_name}
        </span>
      </div>
    </div>
  );
}
