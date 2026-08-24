/**
 * app/track/[orderId]/page.tsx
 *
 * Public order tracking portal — zero login required.
 *
 * Static export compatibility:
 *   Next.js `output: 'export'` requires `generateStaticParams()` for dynamic routes.
 *   We pre-render all known order IDs (order_number and public_tracking_key) at build
 *   time. The actual runtime lookup is handled by the 'use client' OrderTrackingView
 *   component which uses useParams() to resolve the correct order from mock data.
 *
 * Privacy isolation:
 *   Only order status, garment type, schedule dates, and balance_due are exposed.
 *   Customer phone, address, and full khata history are never rendered.
 */

import { mockOrders } from '@/lib/mock-data';
import { OrderTrackingView } from '@/components/track/order-tracking-view';

// ─── Static params for output: 'export' ──────────────────────────────────────

export function generateStaticParams(): Array<{ orderId: string }> {
  const slugs: Array<{ orderId: string }> = [];

  for (const order of mockOrders) {
    // Register by order_number (e.g. DP-2026-0801)
    slugs.push({ orderId: order.order_number });
    // Also register by public_tracking_key UUID so tracking links work
    slugs.push({ orderId: order.public_tracking_key });
  }

  return slugs;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrderTrackingPage() {
  return <OrderTrackingView />;
}
