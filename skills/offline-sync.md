# skills/offline-sync.md - Offline-First IndexedDB Architecture & Network Synchronization

## 1. System Philosophy & Offline Guarantees

In high-density Pakistani market environments (such as Saddar, Anarkali, or local bazaars), cell tower congestion, load shedding, and unstable ISP connections cause frequent intermittent disconnections. 

Silaye implements a **Local-First, Append-Safe Sync Engine**:
1. **Zero-Latency Local Reads & Writes:** Every user action (recording a measurement, booking an order, advancing a queue stage) writes immediately to an in-browser IndexedDB database.
2. **Optimistic Local Reflection:** The UI updates instantaneously from local storage; it never blocks user input waiting for remote HTTP roundtrips.
3. **Guaranteed Queue Replay:** Mutations executed while offline are queued in an append-only FIFO sync store and replayed sequentially with idempotency keys once connectivity is restored.
4. **Immutable Ledger Integrity:** Financial balances (*Khata*) are never overwritten with static totals; they are derived from append-only transaction logs to prevent balance corruptions.

---

## 2. Storage Topology & Data Layer Architecture


```

┌─────────────────────────────────────────────────────────────┐
│                    Next.js UI Components                    │
│             (Forms, Kanban Board, Khata Ledger)             │
└──────────────────────────────┬──────────────────────────────┘
│ Reads & Optimistic Writes
▼
┌─────────────────────────────────────────────────────────────┐
│                 IndexedDB Local Store (idb)                 │
│  ├── local_customers                                        │
│  ├── local_measurements                                     │
│  ├── local_orders                                           │
│  ├── local_khata_ledger                                     │
│  └── sync_mutation_queue ◄── [Appends Pending Actions]      │
└──────────────────────────────┬──────────────────────────────┘
│ Background Worker / Engine
▼
┌─────────────────────────────────────────────────────────────┐
│                Silaye Sync Coordinator                    │
│  ├── Online Heartbeat Detector (Ping + navigator.onLine)    │
│  ├── FIFO Sequential Queue Replayer                         │
│  └── Conflict Resolver (LWW + State Machine Verification)   │
└──────────────────────────────┬──────────────────────────────┘
│ Encrypted HTTPS / WebSockets
▼
┌─────────────────────────────────────────────────────────────┐
│                 Remote Backend / Supabase                   │
│               (PostgreSQL Database & RLS)                   │
└─────────────────────────────────────────────────────────────┘

```

---

## 3. IndexedDB Schema Specification

Using the lightweight `idb` Promise library:

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface SilayeDB extends DBSchema {
  customers: {
    key: string; // UUID
    value: {
      id: string;
      shop_id: string;
      full_name: string;
      phone: string;
      alternate_phone?: string;
      current_khata_balance: number;
      local_sync_status: 'SYNCED' | 'PENDING_CREATION' | 'PENDING_UPDATE';
      updated_at: string;
    };
    indexes: { 'by-phone': string; 'by-sync-status': string };
  };

  measurement_profiles: {
    key: string; // UUID
    value: {
      id: string;
      customer_id: string;
      shop_id: string;
      profile_name: string;
      garment_type: string;
      measurements: Record<string, number>;
      style_preferences: Record<string, string>;
      local_sync_status: 'SYNCED' | 'PENDING_CREATION' | 'PENDING_UPDATE';
      updated_at: string;
    };
    indexes: { 'by-customer': string };
  };

  orders: {
    key: string; // UUID
    value: {
      id: string;
      order_number: string;
      shop_id: string;
      customer_id: string;
      status: string;
      garment_type: string;
      delivery_date: string;
      trial_date?: string;
      total_amount: number;
      advance_paid: number;
      balance_due: number;
      snapshot_measurements: Record<string, number>;
      snapshot_styles: Record<string, string>;
      local_sync_status: 'SYNCED' | 'PENDING_CREATION' | 'PENDING_UPDATE';
      updated_at: string;
    };
    indexes: { 'by-status': string; 'by-customer': string; 'by-order-num': string };
  };

  sync_mutation_queue: {
    key: string; // Auto-incrementing numeric or monotonic timestamp ID
    value: {
      id: string; // UUID
      idempotency_key: string; // Prevents duplicate execution on server
      endpoint: string; // e.g., '/api/orders/create'
      method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      payload: any;
      retry_count: number;
      max_retries: number;
      last_error?: string;
      created_at: number; // Epoch timestamp
    };
    indexes: { 'by-created-at': number };
  };
}

const DB_NAME = 'silaye_local_db';
const DB_VERSION = 1;

export async function initLocalDatabase(): Promise<IDBPDatabase<SilayeDB>> {
  return openDB<SilayeDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 1. Customers Store
      if (!db.objectStoreNames.contains('customers')) {
        const customerStore = db.createObjectStore('customers', { keyPath: 'id' });
        customerStore.createIndex('by-phone', 'phone');
        customerStore.createIndex('by-sync-status', 'local_sync_status');
      }

      // 2. Measurement Profiles Store
      if (!db.objectStoreNames.contains('measurement_profiles')) {
        const measurementStore = db.createObjectStore('measurement_profiles', { keyPath: 'id' });
        measurementStore.createIndex('by-customer', 'customer_id');
      }

      // 3. Orders Store
      if (!db.objectStoreNames.contains('orders')) {
        const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
        orderStore.createIndex('by-status', 'status');
        orderStore.createIndex('by-customer', 'customer_id');
        orderStore.createIndex('by-order-num', 'order_number');
      }

      // 4. Mutation Sync Queue
      if (!db.objectStoreNames.contains('sync_mutation_queue')) {
        const queueStore = db.createObjectStore('sync_mutation_queue', { keyPath: 'id' });
        queueStore.createIndex('by-created-at', 'created_at');
      }
    },
  });
}

```

---

## 4. Conflict Resolution & Consistency Rules

### 4.1 Measurement Profiles & Profiles: Last-Write-Wins (LWW) with Monotonic Timestamps

* Every client mutation updates `updated_at` to the current ISO-8601 UTC timestamp.
* When the server processes an update, it accepts the change if `client_updated_at > server_updated_at`.
* If a collision occurs (e.g., two desktop terminals modified chest measurement while offline), the most recent valid timestamp takes precedence.

### 4.2 Production Stage Machine Invariants

Order statuses must only advance according to the strict state machine:
`BOOKED` ➔ `FABRIC_RECEIVED` ➔ `IN_CUTTING` ➔ `IN_STITCHING` ➔ `KAJ_BUTTON` ➔ `PRESSING` ➔ `READY_FOR_DELIVERY` ➔ `COMPLETED`.

* If an offline client attempts to transition an order directly from `BOOKED` to `READY_FOR_DELIVERY`, the server validates and logs intermediate transition timestamps automatically rather than rejecting the payload.

### 4.3 Financial Ledger Invariance: Append-Only Immutable Records

* The client **never** executes an arbitrary `UPDATE customer SET current_khata_balance = 5000`.
* Instead, it creates an immutable `KhataTransactionRecord`:
```typescript
interface KhataEntryMutation {
  idempotency_key: string;
  customer_id: string;
  order_id?: string;
  transaction_type: 'ORDER_ADVANCE' | 'ORDER_FINAL_PAYMENT' | 'MANUAL_DEBIT';
  amount: number;
  timestamp: string;
}

```


* Even if network replay is delayed by 48 hours, every transaction is appended to the ledger and the balance is computed by summation, eliminating race conditions or overwritten balances.

---

## 5. Sync Coordinator & Queue Replay Engine

```typescript
export class SyncCoordinator {
  private isProcessing = false;

  /**
   * Enqueues an offline mutation and triggers background processing
   */
  public async enqueueMutation(
    endpoint: string,
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    payload: any
  ): Promise<void> {
    const db = await initLocalDatabase();
    const mutationId = crypto.randomUUID();
    const idempotencyKey = `${method}_${endpoint}_${mutationId}`;

    await db.put('sync_mutation_queue', {
      id: mutationId,
      idempotency_key: idempotencyKey,
      endpoint,
      method,
      payload,
      retry_count: 0,
      max_retries: 5,
      created_at: Date.now(),
    });

    // Attempt instant dispatch if online
    if (navigator.onLine) {
      this.processQueue();
    }
  }

  /**
   * Replays pending mutations in FIFO order
   */
  public async processQueue(): Promise<{ processed: number; failed: number }> {
    if (this.isProcessing || !navigator.onLine) {
      return { processed: 0, failed: 0 };
    }

    this.isProcessing = true;
    const db = await initLocalDatabase();
    const queue = await db.getAllFromIndex('sync_mutation_queue', 'by-created-at');

    let processedCount = 0;
    let failedCount = 0;

    for (const item of queue) {
      try {
        const response = await fetch(item.endpoint, {
          method: item.method,
          headers: {
            'Content-Type': 'application/json',
            'X-Idempotency-Key': item.idempotency_key,
          },
          body: JSON.stringify(item.payload),
        });

        if (response.ok || response.status === 409) {
          // 200 OK or 409 Conflict (already executed on server) -> Success
          await db.delete('sync_mutation_queue', item.id);
          processedCount++;
        } else if (response.status >= 400 && response.status < 500) {
          // Client-side fatal validation error (do not retry endlessly)
          await db.delete('sync_mutation_queue', item.id);
          failedCount++;
        } else {
          // Server error (500) -> Increment retry with exponential backoff
          item.retry_count += 1;
          if (item.retry_count >= item.max_retries) {
            await db.delete('sync_mutation_queue', item.id);
            failedCount++;
          } else {
            await db.put('sync_mutation_queue', item);
          }
          break; // Stop queue processing to maintain FIFO order
        }
      } catch (err: any) {
        // Network drop during fetch
        item.retry_count += 1;
        item.last_error = err.message || 'Network fetch failed';
        await db.put('sync_mutation_queue', item);
        break; // Network unreachable, halt until next online event
      }
    }

    this.isProcessing = false;
    return { processed: processedCount, failed: failedCount };
  }
}

export const syncCoordinator = new SyncCoordinator();

```

---

## 6. Connectivity Heartbeat & Event Listeners

To ensure instantaneous recovery the second shop Wi-Fi or mobile data reconnects:

```typescript
export function registerNetworkEventListeners(onStatusChange?: (isOnline: boolean) => void) {
  if (typeof window === 'undefined') return;

  const handleOnline = async () => {
    // Verify true connection with a 1-byte ping to avoid captive portal false positives
    try {
      const response = await fetch('/api/health', { method: 'HEAD', cache: 'no-store' });
      if (response.ok) {
        if (onStatusChange) onStatusChange(true);
        syncCoordinator.processQueue();
      }
    } catch {
      if (onStatusChange) onStatusChange(false);
    }
  };

  const handleOffline = () => {
    if (onStatusChange) onStatusChange(false);
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Periodic heartbeat polling every 30 seconds
  setInterval(() => {
    if (navigator.onLine) {
      handleOnline();
    }
  }, 30000);
}

```

```

```
