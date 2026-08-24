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
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-status-overdue/30 bg-status-overdue/10 mb-6">
        <AlertCircle className="h-8 w-8 text-status-overdue" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">Order Not Found</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        We couldn&apos;t find an order matching that link. The link may be incorrect or the order
        may have been removed.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
        >
          <MessageSquare className="h-4 w-4" />
          Contact Shop on WhatsApp
        </a>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-card"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}

// ─── Main client view ─────────────────────────────────────────────────────────

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

  // Customer reference (used only server-side / for shop; not displayed publicly)
  const customer = order
    ? mockCustomers.find((c) => c.id === order.customer_id) ?? null
    : null;

  const waLink = order
    ? buildWhatsAppInquiryLink(order.order_number, mockShop.owner_phone)
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Minimal tracking nav ── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-foreground transition-opacity hover:opacity-80"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/40 bg-primary/10">
              <Scissors className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold text-foreground">Silaye</span>
          </Link>
          <div className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Secure Order Tracker</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 md:py-12">
        {!order ? (
          <OrderNotFound shopPhone={mockShop.owner_phone} />
        ) : (
          <div className="space-y-6">
            {/* ── Order identity card ── */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1">
                    <Package className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Order #{order.order_number}
                    </span>
                  </div>
                  <h1 className="text-2xl font-semibold text-foreground">
                    {order.quantity}× {GARMENT_TYPE_LABELS[order.garment_type]}
                  </h1>
                  <p className="mt-1 urdu-data-text text-sm text-muted-foreground" dir="rtl">
                    {order.quantity}× {GARMENT_TYPE_LABELS_UR[order.garment_type]}
                  </p>
                </div>

                {/* Booking date chip */}
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Booked {formatDate(order.booking_date)}</span>
                </div>
              </div>
            </div>

            {/* ── Progress stepper ── */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="mb-6 text-base font-semibold text-foreground">
                Production Progress
              </h2>
              <OrderProgressStepper
                currentStatus={order.status}
                deliveryDate={order.delivery_date}
                trialDate={order.trial_date}
              />
            </div>

            {/* ── Schedule & pickup details ── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Trial date — only show if not yet ready */}
              {order.trial_date &&
                order.status !== 'READY_FOR_DELIVERY' &&
                order.status !== 'COMPLETED' && (
                  <div className="rounded-xl border border-border bg-card p-5">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Trial Date
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {formatDate(order.trial_date)}
                    </p>
                    <p className="mt-0.5 urdu-data-text text-xs text-muted-foreground" dir="rtl">
                      ٹرائل کی تاریخ
                    </p>
                  </div>
                )}

              {/* Final delivery date */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Final Delivery
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {formatDate(order.delivery_date)}
                </p>
                <p className="mt-0.5 urdu-data-text text-xs text-muted-foreground" dir="rtl">
                  آخری ڈیلیوری تاریخ
                </p>
              </div>

              {/* Balance due — only show if unpaid/partially paid */}
              {order.payment_status !== 'FULLY_PAID' && order.balance_due > 0 && (
                <div className="rounded-xl border border-status-udhaar-pending/20 bg-status-udhaar-pending/5 p-5">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Balance Due on Pickup
                  </p>
                  <p className="text-lg font-semibold text-status-udhaar-pending">
                    <bdi dir="ltr">Rs. {order.balance_due.toLocaleString('en-PK')}</bdi>
                  </p>
                  <p className="mt-0.5 urdu-data-text text-xs text-muted-foreground" dir="rtl">
                    وصولی پر بقیہ رقم
                  </p>
                </div>
              )}

              {/* Fully paid badge */}
              {order.payment_status === 'FULLY_PAID' && (
                <div className="rounded-xl border border-status-advance-credit/20 bg-status-advance-credit/5 p-5">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Payment Status
                  </p>
                  <p className="text-lg font-semibold text-status-advance-credit">
                    Fully Paid ✓
                  </p>
                  <p className="mt-0.5 urdu-data-text text-xs text-muted-foreground" dir="rtl">
                    مکمل ادائیگی ہو چکی ہے
                  </p>
                </div>
              )}
            </div>

            {/* ── Order summary ── */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Order Summary
              </h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted-foreground">Garment</dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {GARMENT_TYPE_LABELS[order.garment_type]}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Quantity</dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {order.quantity} piece{order.quantity !== 1 ? 's' : ''}
                  </dd>
                </div>
                {order.fabric_color && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Fabric Color</dt>
                    <dd className="mt-0.5 font-medium text-foreground capitalize">
                      {order.fabric_color}
                    </dd>
                  </div>
                )}
                {order.fabric_brand && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Fabric Brand</dt>
                    <dd className="mt-0.5 font-medium text-foreground">{order.fabric_brand}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* ── Shop contact ── */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Shop Contact
              </h2>
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-foreground">{mockShop.name}</p>
                {mockShop.address && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    <span>{mockShop.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                  <bdi dir="ltr">{mockShop.owner_phone}</bdi>
                </div>
              </div>
            </div>

            {/* ── Privacy notice ── */}
            <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary/50 px-5 py-4 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              <p>
                This tracking page shows only your order progress and schedule. Personal
                measurements, contact details, and full account history are never displayed
                publicly.
              </p>
            </div>

            {/* ── WhatsApp CTA ── */}
            {waLink && (
              <div className="text-center pb-4">
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 rounded-xl bg-[#25D366] px-6 py-3.5 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90 active:scale-95"
                >
                  <MessageSquare className="h-5 w-5" />
                  Contact Shop about Order #{order.order_number}
                </a>
                <p className="mt-2 text-xs text-muted-foreground">
                  Opens WhatsApp with your order number pre-filled
                </p>
              </div>
            )}
          </div>
        )}

        {/* Suppress personal info for screen readers */}
        <p className="sr-only" aria-hidden="true">
          {customer?.full_name}
        </p>
      </main>

      {/* ── Minimal footer ── */}
      <footer className="border-t border-border mt-8 px-4 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          Powered by{' '}
          <Link href="/" className="text-primary underline-offset-2 hover:underline">
            Silaye Workshop OS
          </Link>{' '}
          · Secure & Private
        </p>
      </footer>
    </div>
  );
}
