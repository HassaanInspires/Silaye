/**
 * lib/sync/sync-engine.ts - Resilient Dexie Background Synchronization Engine
 *
 * Implements:
 * 1. Concurrency Mutex (`isSyncing`) guarding against overlapping executions
 * 2. Strict FIFO Queue Processing of offline pending orders
 * 3. Customer Deduplication: Checks remote customer by phone and adopts server ID
 * 4. Upserting Orders and Measurement specs to Supabase `garment_orders`
 * 5. Upserting Khata Transactions if advance payment exists
 * 6. Auth session refresh on 401 without consuming retry budget
 * 7. Poison-pill protection: Marks `sync_status = 'failed'` after 3 retries without blocking queue
 * 8. Exported React hook `useSyncStatus()` for ambient telemetry
 */

import * as React from 'react';
import { db } from '@/lib/db';
import { supabase, isSupabaseConfigured, refreshSession } from '@/lib/supabase/client';

export class SyncEngine {
  private isSyncing = false;
  private lastSyncedAt: string | null = null;
  private listeners: Set<() => void> = new Set();

  /**
   * Subscribe to sync engine status transitions.
   */
  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('[SyncEngine] Listener error:', err);
      }
    }
  }

  public getIsSyncing(): boolean {
    return this.isSyncing;
  }

  public getLastSyncedAt(): string | null {
    return this.lastSyncedAt;
  }

  /**
   * Processes all pending offline orders in Dexie and upserts to Supabase.
   */
  public async processQueue(): Promise<void> {
    // 1. Guard against SSR and offline states
    if (typeof window === 'undefined' || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      return;
    }

    // 2. Concurrency Mutex guard
    if (this.isSyncing) {
      return;
    }

    this.isSyncing = true;
    this.notify();

    try {
      // 3. Proactively refresh Supabase session if configured
      if (isSupabaseConfigured()) {
        try {
          await refreshSession();
        } catch (refreshErr) {
          console.warn('[SyncEngine] Pre-sync session refresh warning:', refreshErr);
        }
      }

      // 4. Fetch all records where sync_status === 'pending' ordered by created_at
      const pendingOrders = await db.orders
        .where('sync_status')
        .equals('pending')
        .sortBy('created_at');

      if (!pendingOrders || pendingOrders.length === 0) {
        return;
      }

      // 5. Process each pending order sequentially (never block entire queue on single item failure)
      for (const order of pendingOrders) {
        try {
          let resolvedCustomerId = order.customer_id;
          const localCustomer = await db.customers.get(order.customer_id);

          // Deduplicate Customer against remote Supabase table by phone
          if (localCustomer && isSupabaseConfigured()) {
            const { data: remoteCustomer, error: custLookupErr } = await supabase
              .from('customers')
              .select('id')
              .eq('shop_id', order.shop_id)
              .eq('phone', localCustomer.phone)
              .maybeSingle();

            if (custLookupErr && (custLookupErr as { status?: number }).status === 401) {
              await refreshSession();
            }

            if (remoteCustomer && remoteCustomer.id) {
              // Adopt remote customer primary key
              resolvedCustomerId = remoteCustomer.id;
            } else {
              // Upsert local customer record
              const customerPayload = {
                id: localCustomer.id,
                shop_id: localCustomer.shop_id,
                full_name: localCustomer.full_name,
                phone: localCustomer.phone,
                secondary_phone: localCustomer.alternate_phone || null,
                address: localCustomer.address || null,
                city: localCustomer.city || 'Wah Cantt',
                khata_balance: localCustomer.current_khata_balance ?? 0,
                notes: localCustomer.notes || null,
                total_orders_count: localCustomer.total_orders_count || 1,
                total_spent: localCustomer.total_spent || 0,
                created_at: localCustomer.created_at,
                updated_at: localCustomer.updated_at,
              };

              const { error: custUpsertErr } = await supabase
                .from('customers')
                .upsert(customerPayload, { onConflict: 'shop_id,phone' });

              if (custUpsertErr) {
                throw custUpsertErr;
              }

              await db.customers.update(localCustomer.id, {
                sync_status: 'synced',
                synced_at: new Date().toISOString(),
                last_sync_error: null,
              });
            }
          }

          // Upsert Garment Order and Measurement specs to Supabase
          if (isSupabaseConfigured()) {
            const orderPayload = {
              id: order.id,
              shop_id: order.shop_id,
              order_number: order.order_number,
              customer_id: resolvedCustomerId,
              measurement_profile_id: order.measurement_profile_id || null,
              status: order.status || 'BOOKED',
              garment_type: order.garment_type || 'MEN_SHALWAR_KAMEEZ',
              quantity: order.quantity || 1,
              booking_date: order.booking_date,
              trial_date: order.trial_date || null,
              delivery_date: order.delivery_date,
              actual_delivery_date: order.actual_delivery_date || null,
              fabric_details: {
                provided_by: order.fabric_provided_by,
                color: order.fabric_color,
                brand: order.fabric_brand,
                pieces_count: order.fabric_pieces_count,
                notes: order.fabric_notes,
              },
              snapshot_measurements: order.snapshot_measurements || {},
              snapshot_styles: order.snapshot_styles || {},
              pricing: {
                stitching_rate: order.stitching_rate,
                fabric_charges: order.fabric_charges,
                addons_charges: order.addons_charges,
                discount_amount: order.discount_amount,
                total_amount: order.total_amount,
                advance_paid: order.advance_paid,
                balance_due: order.balance_due,
              },
              stitching_rate: order.stitching_rate,
              fabric_charges: order.fabric_charges,
              addons_charges: order.addons_charges,
              discount_amount: order.discount_amount,
              total_amount: order.total_amount,
              advance_paid: order.advance_paid,
              balance_due: order.balance_due,
              payment_status: order.payment_status,
              assigned_cutter_id: order.assigned_cutter_id || null,
              assigned_stitcher_id: order.assigned_stitcher_id || null,
              barcode_token: order.barcode_token,
              public_tracking_key: order.public_tracking_key,
              notes: order.fabric_notes || null,
              created_at: order.created_at,
              updated_at: order.updated_at,
            };

            let orderUpsertRes = await supabase
              .from('garment_orders')
              .upsert(orderPayload, { onConflict: 'id' });

            if (orderUpsertRes.error && orderUpsertRes.error.code === '42P01') {
              orderUpsertRes = await supabase
                .from('orders')
                .upsert(orderPayload, { onConflict: 'id' });
            }

            if (orderUpsertRes.error) {
              throw orderUpsertRes.error;
            }
          }

          // Upsert Khata Transaction if present for this order
          const khataTx = await db.khata_transactions
            .where('order_id')
            .equals(order.id)
            .first();

          if (khataTx && isSupabaseConfigured()) {
            const khataPayload = {
              id: khataTx.id,
              shop_id: khataTx.shop_id,
              customer_id: resolvedCustomerId,
              order_id: order.id,
              type: khataTx.transaction_type,
              amount: khataTx.amount,
              balance_after: khataTx.balance_after,
              notes: khataTx.notes || null,
              created_by: khataTx.created_by || null,
              created_at: khataTx.created_at,
            };

            const { error: khataErr } = await supabase
              .from('khata_transactions')
              .upsert(khataPayload, { onConflict: 'id' });

            if (khataErr) {
              throw khataErr;
            }

            await db.khata_transactions.update(khataTx.id, {
              sync_status: 'synced',
              synced_at: new Date().toISOString(),
              last_sync_error: null,
            });
          }

          // Success: Mark order record in Dexie as synced
          await db.orders.update(order.id, {
            customer_id: resolvedCustomerId,
            sync_status: 'synced',
            synced_at: new Date().toISOString(),
            last_sync_error: null,
          });

        } catch (orderErr: unknown) {
          const errorMsg = orderErr instanceof Error ? orderErr.message : String(orderErr);
          const is401 =
            typeof orderErr === 'object' &&
            orderErr !== null &&
            ('status' in orderErr || 'code' in orderErr) &&
            ((orderErr as { status?: number }).status === 401 ||
              (orderErr as { code?: string }).code === '401');

          if (is401) {
            // Refresh session and do not increment retry count
            try {
              await refreshSession();
            } catch {
              // ignore
            }
          } else {
            const nextRetries = (order.sync_retry_count || 0) + 1;
            await db.orders.update(order.id, {
              sync_retry_count: nextRetries,
              sync_status: nextRetries >= 3 ? 'failed' : 'pending',
              last_sync_error: errorMsg,
            });
          }
          console.error(`[SyncEngine] Error syncing order ${order.order_number}:`, orderErr);
        }
      }
    } finally {
      this.isSyncing = false;
      this.lastSyncedAt = new Date().toISOString();
      this.notify();
    }
  }
}

export const syncEngine = new SyncEngine();

/**
 * React hook providing reactive synchronization state for telemetry indicators.
 */
export function useSyncStatus(): {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
} {
  const [isOnline, setIsOnline] = React.useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = React.useState<boolean>(() => syncEngine.getIsSyncing());
  const [pendingCount, setPendingCount] = React.useState<number>(0);
  const [lastSyncedAt, setLastSyncedAt] = React.useState<string | null>(() =>
    syncEngine.getLastSyncedAt()
  );

  React.useEffect(() => {
    let isMounted = true;

    const queryPendingCount = async () => {
      try {
        const count = await db.orders.where('sync_status').equals('pending').count();
        if (isMounted) {
          setPendingCount(count);
        }
      } catch {
        if (isMounted) {
          setPendingCount(0);
        }
      }
    };

    queryPendingCount();

    const handleSyncChange = () => {
      if (!isMounted) return;
      setIsSyncing(syncEngine.getIsSyncing());
      setLastSyncedAt(syncEngine.getLastSyncedAt());
      queryPendingCount();
    };

    const handleOnline = () => {
      if (!isMounted) return;
      setIsOnline(true);
      syncEngine.processQueue().catch(console.error);
    };

    const handleOffline = () => {
      if (!isMounted) return;
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const unsubscribe = syncEngine.subscribe(handleSyncChange);

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  return { isOnline, isSyncing, pendingCount, lastSyncedAt };
}
