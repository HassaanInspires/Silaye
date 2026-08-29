/**
 * app/track/[orderId]/page.tsx
 *
 * Public order tracking portal — zero login required.
 *
 * Static export compatibility:
 *   Next.js `output: 'export'` requires `generateStaticParams()` for dynamic routes.
 *   We pre-render known order IDs and fallback preview slugs so static compilation succeeds
 *   when running clean-slate zero-mock production builds.
 *
 * Privacy isolation:
 *   Only order status, garment type, schedule dates, and balance_due are exposed.
 *   Customer phone, address, and full khata history are never rendered.
 */

import { mockOrders, SEED_ORDERS } from '@/lib/mock-data';
import { OrderTrackingView } from '@/components/track/order-tracking-view';

// ─── Static tracking fallback slugs for build-time pre-rendering ─────────────
const STATIC_TRACKING_SLUGS: ReadonlyArray<string> = [
  'DP-2026-0801',
  'DP-2026-0802',
  'DP-2026-0803',
  'DP-2026-0804',
  'DP-2026-0805',
  'DP-2026-0806',
  'DP-2026-0807',
  'f0000000-0000-0000-0000-000000000001',
  'f0000000-0000-0000-0000-000000000002',
  'preview',
];

// ─── Static params for output: 'export' ──────────────────────────────────────

export function generateStaticParams(): Array<{ orderId: string }> {
  const slugs: Array<{ orderId: string }> = [];

  const sourceOrders = mockOrders.length > 0 ? mockOrders : SEED_ORDERS;

  for (const order of sourceOrders) {
    slugs.push({ orderId: order.order_number });
    slugs.push({ orderId: order.public_tracking_key });
  }

  for (const slug of STATIC_TRACKING_SLUGS) {
    if (!slugs.some((s) => s.orderId === slug)) {
      slugs.push({ orderId: slug });
    }
  }

  return slugs;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrderTrackingPage() {
  return <OrderTrackingView />;
}
