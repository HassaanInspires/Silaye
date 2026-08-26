/**
 * lib/sync-coordinator.ts - Mutation Sync Coordinator & Conflict Resolver
 *
 * Implements:
 * 1. Strict FIFO queue processing of offline mutations (`SyncQueueItem`)
 * 2. Pre-commit validation against domain Zod schemas
 * 3. Poison-pill & Dead-Letter Queue trap after MAX_RETRIES (5)
 * 4. Last-Write-Wins (LWW) conflict resolution for mutable entities
 * 5. Strict immutability for append-only Khata ledger transactions
 * 6. Reactive event emitter (`subscribe()`) and network heartbeat polling
 * 7. Full SSR & Next.js static export safety
 */

import type {
  GarmentOrder,
  Customer,
  MeasurementProfile,
  KhataTransaction,
  OrderStatus,
  SyncQueueItem,
} from '@/types/tailor';
import {
  saveLocalOrder,
  getLocalOrderById,
  saveLocalCustomer,
  getLocalCustomerById,
  saveLocalMeasurementProfile,
  appendKhataTransaction,
  getSyncQueue,
  getPendingSyncQueue,
  addSyncQueueItem,
  updateSyncQueueItem,
  removeSyncQueueItem,
  generateUUID,
} from '@/lib/offline-db';
import {
  orderCreateSchema,
  orderStatusUpdateSchema,
  customerCreateSchema,
  customerUpdateSchema,
  khataTransactionCreateSchema,
  measurementProfileCreateSchema,
} from '@/lib/validations/tailor';
import {
  isDatabaseConfigured,
  ordersDb,
  customersDb,
  measurementsDb,
  khataDb,
} from '@/lib/db';

// ==========================================
// 1. Types & Constants
// ==========================================

export type SyncStatus = 'ONLINE' | 'OFFLINE' | 'SYNCING';

export interface SyncState {
  status: SyncStatus;
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  lastSyncTime: number | null;
  lastError: string | null;
}

export interface SyncResult {
  processed: number;
  succeeded: number;
  failed: number;
  deadLettered: number;
}

export const MAX_SYNC_RETRIES = 5;

// ==========================================
// 2. Conflict Resolution Helpers
// ==========================================

/**
 * Resolves conflict between local and remote records using Last-Write-Wins (LWW)
 * based on ISO updated_at timestamps.
 */
export function resolveConflict<T extends { updated_at?: string; [key: string]: unknown }>(
  local: T,
  remote: T
): { winner: 'LOCAL' | 'REMOTE'; resolved: T } {
  const localTime = local.updated_at ? new Date(local.updated_at).getTime() : 0;
  const remoteTime = remote.updated_at ? new Date(remote.updated_at).getTime() : 0;

  if (localTime >= remoteTime) {
    return { winner: 'LOCAL', resolved: local };
  }
  return { winner: 'REMOTE', resolved: remote };
}

// ==========================================
// 3. Sync Coordinator Class
// ==========================================

export class SyncCoordinator {
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private pendingCount: number = 0;
  private failedCount: number = 0;
  private lastSyncTime: number | null = null;
  private lastError: string | null = null;
  private listeners: Set<(state: SyncState) => void> = new Set();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private isInitialized: boolean = false;

  // Custom remote dispatch handler for testing, PostgreSQL serverless dispatch, and network transport
  public remoteDispatcher: (item: SyncQueueItem) => Promise<{ success: boolean; data?: unknown; error?: string }> =
    async (item) => {
      // 1. Direct PostgreSQL serverless dispatch when database connection is configured
      if (isDatabaseConfigured()) {
        try {
          const endpoint = item.endpoint;
          const method = item.method;
          const payload = item.payload;

          if (endpoint.startsWith('/api/orders') && method === 'POST') {
            const data = await ordersDb.create(payload as unknown as Parameters<typeof ordersDb.create>[0]);
            return { success: true, data };
          }
          if (endpoint.startsWith('/api/orders/') && (method === 'PATCH' || method === 'PUT')) {
            const parts = endpoint.split('/');
            const orderId = parts[3] || (payload.id as string);
            const data = await ordersDb.update(orderId, payload as unknown as Parameters<typeof ordersDb.update>[1]);
            return { success: true, data };
          }
          if (endpoint.startsWith('/api/customers') && method === 'POST') {
            const data = await customersDb.create(payload as unknown as Parameters<typeof customersDb.create>[0]);
            return { success: true, data };
          }
          if (endpoint.startsWith('/api/customers/') && (method === 'PATCH' || method === 'PUT')) {
            const parts = endpoint.split('/');
            const customerId = parts[3] || (payload.id as string);
            const data = await customersDb.update(customerId, payload as unknown as Parameters<typeof customersDb.update>[1]);
            return { success: true, data };
          }
          if (endpoint.startsWith('/api/measurements') && method === 'POST') {
            const data = await measurementsDb.create(payload as unknown as Parameters<typeof measurementsDb.create>[0]);
            return { success: true, data };
          }
          if (endpoint.startsWith('/api/khata') && method === 'POST') {
            const data = await khataDb.append(payload as unknown as Parameters<typeof khataDb.append>[0]);
            return { success: true, data };
          }
        } catch (dbErr: unknown) {
          const msg = dbErr instanceof Error ? dbErr.message : 'Database sync error';
          return { success: false, error: msg };
        }
      }

      // 2. In web browser runtime with standard endpoints
      if (typeof window !== 'undefined' && typeof fetch === 'function' && !item.endpoint.startsWith('mock:')) {
        try {
          const res = await fetch(item.endpoint, {
            method: item.method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload),
          });
          if (!res.ok) {
            const errorText = await res.text().catch(() => 'HTTP Error');
            return { success: false, error: `HTTP ${res.status}: ${errorText}` };
          }
          const json = await res.json().catch(() => ({}));
          return { success: true, data: json };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Network failure';
          return { success: false, error: msg };
        }
      }

      // Default simulated dispatch
      return { success: true, data: { synced: true, id: item.id } };
    };

  constructor() {
    this.init();
  }

  /**
   * Initializes network event listeners and initial queue counts.
   */
  public async init(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.isInitialized) {
      return;
    }
    this.isInitialized = true;

    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));

    await this.refreshQueueCounts();
    this.startHeartbeat();
  }

  /**
   * Refreshes internal pending and failed queue counts.
   */
  public async refreshQueueCounts(): Promise<void> {
    try {
      const queue = await getSyncQueue();
      this.pendingCount = queue.filter((item) => item.status === 'PENDING').length;
      this.failedCount = queue.filter((item) => item.status === 'FAILED').length;
      this.notifyListeners();
    } catch {
      // Gracefully handle uninitialized IndexedDB during SSR
    }
  }

  /**
   * Handles network status transitions.
   */
  private async handleNetworkChange(online: boolean): Promise<void> {
    const wasOffline = !this.isOnline;
    this.isOnline = online;
    this.notifyListeners();

    if (online && wasOffline) {
      // Reconnected: trigger FIFO replay
      await this.processQueue();
    }
  }

  /**
   * Returns current snapshot of sync state.
   */
  public getState(): SyncState {
    let status: SyncStatus = 'ONLINE';
    if (!this.isOnline) {
      status = 'OFFLINE';
    } else if (this.isSyncing) {
      status = 'SYNCING';
    }

    return {
      status,
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: this.pendingCount,
      failedCount: this.failedCount,
      lastSyncTime: this.lastSyncTime,
      lastError: this.lastError,
    };
  }

  /**
   * Subscribes a listener to sync state changes. Returns unsubscribe callback.
   */
  public subscribe(listener: (state: SyncState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (err) {
        console.error('[SyncCoordinator] Listener error:', err);
      }
    }
  }

  /**
   * Starts periodic heartbeat check (default 30s).
   */
  public startHeartbeat(intervalMs: number = 30000): void {
    if (typeof window === 'undefined') return;
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(async () => {
      if (typeof navigator !== 'undefined' && this.isOnline !== navigator.onLine) {
        this.handleNetworkChange(navigator.onLine);
      } else if (this.isOnline && this.pendingCount > 0 && !this.isSyncing) {
        await this.processQueue();
      }
    }, intervalMs);
  }

  /**
   * Stops periodic heartbeat check.
   */
  public stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Manually sets online state (useful for simulations and testing).
   */
  public async setOnlineStatus(online: boolean, triggerAutoProcess: boolean = false): Promise<void> {
    const wasOffline = !this.isOnline;
    this.isOnline = online;
    this.notifyListeners();

    if (online && wasOffline && triggerAutoProcess) {
      await this.processQueue();
    }
  }

  // ==========================================
  // 4. FIFO Mutation Queue Processor
  // ==========================================

  /**
   * Processes all pending mutations in strict FIFO order.
   * If an item exceeds MAX_SYNC_RETRIES, it is moved to 'FAILED' (Dead-Letter queue trap)
   * to avoid blocking subsequent mutations.
   */
  public async processQueue(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { processed: 0, succeeded: 0, failed: 0, deadLettered: 0 };
    }

    if (!this.isOnline) {
      return { processed: 0, succeeded: 0, failed: 0, deadLettered: 0 };
    }

    this.isSyncing = true;
    this.notifyListeners();

    const result: SyncResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      deadLettered: 0,
    };

    try {
      const pendingItems = await getPendingSyncQueue();

      for (const item of pendingItems) {
        // If network went offline mid-sync, halt further processing
        if (!this.isOnline) {
          break;
        }

        result.processed++;

        // Mark status as PROCESSING
        item.status = 'PROCESSING';
        await updateSyncQueueItem(item);

        try {
          const dispatchRes = await this.remoteDispatcher(item);

          if (dispatchRes.success) {
            // Success: remove item from queue
            await removeSyncQueueItem(item.id);
            result.succeeded++;
          } else {
            // Failure: handle retry and dead-letter trap
            item.retry_count = (item.retry_count || 0) + 1;
            item.error_message = dispatchRes.error || 'Unknown dispatch error';

            if (item.retry_count >= MAX_SYNC_RETRIES) {
              // Dead-letter queue trap: prevent poison-pill from blocking the queue
              item.status = 'FAILED';
              result.deadLettered++;
              console.warn(
                `[SyncCoordinator] Mutation ${item.id} dead-lettered after ${MAX_SYNC_RETRIES} retries. Error: ${item.error_message}`
              );
            } else {
              item.status = 'PENDING';
              result.failed++;
            }

            await updateSyncQueueItem(item);
            this.lastError = item.error_message;
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Processing error';
          item.retry_count = (item.retry_count || 0) + 1;
          item.error_message = msg;

          if (item.retry_count >= MAX_SYNC_RETRIES) {
            item.status = 'FAILED';
            result.deadLettered++;
          } else {
            item.status = 'PENDING';
            result.failed++;
          }

          await updateSyncQueueItem(item);
          this.lastError = msg;
        }
      }

      this.lastSyncTime = Date.now();
    } catch (err: unknown) {
      this.lastError = err instanceof Error ? err.message : 'Sync queue execution failed';
    } finally {
      this.isSyncing = false;
      await this.refreshQueueCounts();
    }

    return result;
  }

  // ==========================================
  // 5. Pre-Commit Validated Mutation Helpers
  // ==========================================

  /**
   * Enqueues an arbitrary validated mutation item.
   */
  public async enqueueMutation(
    endpoint: string,
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    payload: Record<string, unknown>
  ): Promise<SyncQueueItem> {
    const queueItem = await addSyncQueueItem({
      id: generateUUID(),
      endpoint,
      method,
      payload,
      created_at: Date.now(),
      retry_count: 0,
      status: 'PENDING',
    });

    await this.refreshQueueCounts();

    // If online, attempt immediate sync
    if (this.isOnline && !this.isSyncing) {
      // Non-blocking trigger
      this.processQueue().catch((err) => {
        console.error('[SyncCoordinator] Immediate sync failed:', err);
      });
    }

    return queueItem;
  }

  /**
   * Books a new order with pre-commit Zod validation, local IndexedDB persistence,
   * and offline sync enqueueing.
   */
  public async createOrderWithSync(order: GarmentOrder): Promise<GarmentOrder> {
    // 1. Pre-commit validation against orderCreateSchema
    orderCreateSchema.parse({
      shop_id: order.shop_id,
      customer_id: order.customer_id,
      measurement_profile_id: order.measurement_profile_id,
      garment_type: order.garment_type,
      quantity: order.quantity,
      trial_date: order.trial_date,
      delivery_date: order.delivery_date,
      fabric_provided_by: order.fabric_provided_by,
      fabric_color: order.fabric_color,
      fabric_brand: order.fabric_brand,
      fabric_pieces_count: order.fabric_pieces_count,
      fabric_notes: order.fabric_notes,
      stitching_rate: order.stitching_rate,
      fabric_charges: order.fabric_charges,
      addons_charges: order.addons_charges,
      discount_amount: order.discount_amount,
      advance_paid: order.advance_paid,
      assigned_cutter_id: order.assigned_cutter_id,
      assigned_stitcher_id: order.assigned_stitcher_id,
      snapshot_measurements: order.snapshot_measurements,
      snapshot_styles: order.snapshot_styles,
    });

    // 2. Commit to local IndexedDB
    await saveLocalOrder(order);

    // 3. Enqueue mutation
    await this.enqueueMutation('/api/orders', 'POST', order as unknown as Record<string, unknown>);

    return order;
  }

  /**
   * Updates order production stage with pre-commit validation and audit log generation.
   */
  public async updateOrderStatusWithSync(
    orderId: string,
    newStatus: OrderStatus,
    changedBy?: string,
    notes?: string
  ): Promise<GarmentOrder | undefined> {
    // 1. Fetch current order
    const order = await getLocalOrderById(orderId);
    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    const previousStatus = order.status;

    // 2. Pre-commit validation
    orderStatusUpdateSchema.parse({
      order_id: orderId,
      previous_status: previousStatus,
      new_status: newStatus,
      changed_by: changedBy ?? null,
      notes: notes ?? null,
    });

    // 3. Update order
    order.status = newStatus;
    order.updated_at = new Date().toISOString();
    if (newStatus === 'COMPLETED' && !order.actual_delivery_date) {
      order.actual_delivery_date = new Date().toISOString();
    }

    await saveLocalOrder(order);

    // 4. Enqueue mutation
    await this.enqueueMutation(`/api/orders/${orderId}/status`, 'PATCH', {
      order_id: orderId,
      previous_status: previousStatus,
      new_status: newStatus,
      changed_by: changedBy,
      notes,
      updated_at: order.updated_at,
    });

    return order;
  }

  /**
   * Creates a customer profile with pre-commit validation and sync enqueueing.
   */
  public async createCustomerWithSync(customer: Customer): Promise<Customer> {
    // 1. Pre-commit validation
    customerCreateSchema.parse({
      shop_id: customer.shop_id,
      full_name: customer.full_name,
      phone: customer.phone,
      alternate_phone: customer.alternate_phone,
      address: customer.address,
      city: customer.city,
      notes: customer.notes,
    });

    // 2. Commit locally
    await saveLocalCustomer(customer);

    // 3. Enqueue mutation
    await this.enqueueMutation('/api/customers', 'POST', customer as unknown as Record<string, unknown>);

    return customer;
  }

  /**
   * Updates an existing customer profile with pre-commit validation and sync enqueueing.
   */
  public async updateCustomerWithSync(customer: Customer): Promise<Customer> {
    // 1. Pre-commit validation
    customerUpdateSchema.parse(customer);

    // 2. Commit locally
    customer.updated_at = new Date().toISOString();
    await saveLocalCustomer(customer);

    // 3. Enqueue mutation
    await this.enqueueMutation(
      `/api/customers/${customer.id}`,
      'PUT',
      customer as unknown as Record<string, unknown>
    );

    return customer;
  }

  /**
   * Creates a measurement profile with pre-commit validation and sync enqueueing.
   */
  public async createMeasurementProfileWithSync(
    profile: MeasurementProfile
  ): Promise<MeasurementProfile> {
    // 1. Pre-commit validation
    measurementProfileCreateSchema.parse({
      shop_id: profile.shop_id,
      customer_id: profile.customer_id,
      profile_name: profile.profile_name,
      garment_type: profile.garment_type,
      measurements: profile.measurements,
      style_preferences: profile.style_preferences,
      is_default: profile.is_default,
    });

    // 2. Commit locally
    await saveLocalMeasurementProfile(profile);

    // 3. Enqueue mutation
    await this.enqueueMutation(
      '/api/measurements',
      'POST',
      profile as unknown as Record<string, unknown>
    );

    return profile;
  }

  /**
   * Appends an immutable Khata transaction and atomically updates the customer balance.
   */
  public async appendKhataTransactionWithSync(
    transaction: KhataTransaction
  ): Promise<KhataTransaction> {
    // 1. Pre-commit validation
    khataTransactionCreateSchema.parse({
      shop_id: transaction.shop_id,
      customer_id: transaction.customer_id,
      order_id: transaction.order_id,
      transaction_type: transaction.transaction_type,
      amount: transaction.amount,
      notes: transaction.notes,
      created_by: transaction.created_by,
    });

    // 2. Commit locally (atomic transaction + customer balance update)
    await appendKhataTransaction(transaction);

    // 3. Enqueue mutation
    await this.enqueueMutation(
      '/api/khata',
      'POST',
      transaction as unknown as Record<string, unknown>
    );

    return transaction;
  }
}

// ==========================================
// 6. Exported Global Singleton
// ==========================================

export const syncCoordinator = new SyncCoordinator();
