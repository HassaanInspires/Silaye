'use client';

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
import { mockOrders, mockCustomers, mockShop } from '@/lib/mock-data';
import { OrderProgressStepper } from '@/components/track/order-progress-stepper';
import type { GarmentOrder } from '@/types/tailor';

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
  return new Date(dateStr).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
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
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-red-200 bg-red-50 mb-6">
        <AlertCircle className="h-8 w-8 text-red-600" />
      </div>
      <h2 className="text-xl font-bold text-neutral-900">Order Not Found</h2>
      <p className="mt-2 text-sm text-neutral-600 max-w-xs">
        We couldn&apos;t find an order matching that link. The link may be incorrect or the order may have been removed.
      </p>
      <div className="mt-8 flex flex-col w-full gap-3">
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-[#20ba59] transition-colors"
        >
          <MessageSquare className="h-4 w-4" />
          Contact Workshop on WhatsApp
        </a>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Silaye Home
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

  // Resolve order by order_number OR public_tracking_key
  const order = mockOrders.find(
    (o) =>
      o.order_number.toLowerCase() === orderId.toLowerCase() ||
      o.public_tracking_key === orderId
  ) ?? null;

  // Customer reference (used only server-side / for screen reader attributes)
  const customer = order
    ? mockCustomers.find((c) => c.id === order.customer_id) ?? null
    : null;

  const waLink = order
    ? buildWhatsAppInquiryLink(order.order_number, mockShop.owner_phone)
    : null;

  return (
    <div className="min-h-screen bg-[#0B0C0E] py-0 sm:py-8 flex justify-center items-start">
      {/* ── Mobile Container Frame ── */}
      <div className="w-full max-w-md mx-auto min-h-screen sm:min-h-[92vh] bg-linen-base shadow-2xl relative pb-28 text-neutral-900 sm:rounded-3xl sm:border sm:border-neutral-800/30 sm:overflow-hidden flex flex-col">
        
        {/* ── Top Header Bar ── */}
        <header className="bg-ambient-dark text-white p-5 text-center rounded-b-2xl shadow-lg relative z-20 border-b border-white/5">
          <div className="flex items-center justify-between mb-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
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
            <h1 className="font-editorial text-2xl font-bold tracking-tight text-white">
              Silaye Workshop
            </h1>
            <p className="text-xs text-gold-muted uppercase tracking-widest mt-0.5">
              Order Tracker · <span className="font-urdu-sans" dir="rtl">آرڈر ٹریکر</span>
            </p>
          </div>
        </header>

        {/* ── Body Content ── */}
        {!order ? (
          <OrderNotFound shopPhone={mockShop.owner_phone} />
        ) : (
          <main className="flex-1 flex flex-col">
            {/* ── 1. Order Details Card ── */}
            <div className="linen-card p-6 mt-6 mx-4 relative overflow-hidden">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-xs font-bold text-neutral-900 mb-2">
                    <Package className="h-3.5 w-3.5 text-gold-muted" />
                    <span>Order #{order.order_number}</span>
                  </div>
                  <h2 className="text-xl font-bold text-neutral-900 leading-snug">
                    {order.quantity}× {GARMENT_TYPE_LABELS[order.garment_type]}
                  </h2>
                  <p className="urdu-data-text text-sm text-neutral-600" dir="rtl">
                    {order.quantity}× {GARMENT_TYPE_LABELS_UR[order.garment_type]}
                  </p>
                </div>
              </div>

              {/* Grid: Dates & Status */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-neutral-200/80 text-xs">
                <div className="rounded-xl bg-[#F4F1EA] p-3">
                  <div className="flex items-center gap-1 text-neutral-500 mb-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="font-medium">Booked</span>
                  </div>
                  <p className="font-bold text-neutral-900">{formatDate(order.booking_date)}</p>
                </div>

                <div className="rounded-xl bg-gold/15 border border-gold/20 p-3">
                  <div className="flex items-center gap-1 text-neutral-700 mb-1">
                    <Sparkles className="h-3.5 w-3.5 text-gold-muted" />
                    <span className="font-semibold">Target Delivery</span>
                  </div>
                  <p className="font-bold text-neutral-950">{formatDate(order.delivery_date)}</p>
                </div>
              </div>

              {/* Financial Status Banner */}
              <div className="mt-3">
                {order.payment_status === 'FULLY_PAID' ? (
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs">
                    <span className="font-semibold text-emerald-800">Payment Status</span>
                    <span className="font-bold text-emerald-700">Fully Paid ✓</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-xs">
                    <div>
                      <span className="font-semibold text-amber-900 block">Balance Due on Pickup</span>
                      <span className="urdu-data-text text-[11px] text-amber-800" dir="rtl">وصولی پر بقیہ رقم</span>
                    </div>
                    <span className="text-sm font-bold text-amber-950">
                      <bdi dir="ltr">Rs. {order.balance_due.toLocaleString('en-PK')}</bdi>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── 2. Progress Stepper Container ── */}
            <div className="linen-card p-6 mt-4 mx-4">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                  Production Progress
                </h3>
                <span className="urdu-data-text text-xs text-neutral-500" dir="rtl">
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
            <div className="linen-card p-5 mt-4 mx-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-neutral-900">{mockShop.name}</span>
                <span className="text-[11px] text-neutral-500 font-medium">Bespoke Workshop</span>
              </div>
              
              {mockShop.address && (
                <div className="flex items-start gap-2 text-neutral-600">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-neutral-400" />
                  <span>{mockShop.address}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-neutral-600">
                <Phone className="h-3.5 w-3.5 flex-shrink-0 text-neutral-400" />
                <a href={`tel:${mockShop.owner_phone}`} className="font-medium hover:underline">
                  <bdi dir="ltr">{mockShop.owner_phone}</bdi>
                </a>
              </div>

              <div className="pt-2 border-t border-neutral-200/60 flex items-center gap-2 text-[11px] text-neutral-500">
                <ShieldCheck className="h-3.5 w-3.5 text-gold-muted flex-shrink-0" />
                <span>Customer measurements and accounts remain strictly private.</span>
              </div>
            </div>
          </main>
        )}

        {/* ── 4. Fixed Bottom Action Bar ── */}
        {order && waLink && (
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/95 backdrop-blur-md border-t border-neutral-200 p-4 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] sm:rounded-b-3xl">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all"
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

