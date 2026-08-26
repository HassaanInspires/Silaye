/**
 * lib/offline-db.ts - Offline-First IndexedDB Storage Layer for Silaye
 *
 * Engineered with `idb` v8, providing versioned stores for:
 * - `customers` (indexed by phone, name)
 * - `measurements` (indexed by customer_id)
 * - `orders` (indexed by customer_id, status, order_number)
 * - `khata_transactions` (indexed by customer_id, order_id)
 * - `sync_queue` (indexed by status, created_at)
 *
 * Supports zero-setup seed initialization from `lib/mock-data.ts` on first launch
 * and full SSR / Next.js static export compatibility.
 */

import type { DBSchema, IDBPDatabase } from 'idb';
import type {
  Customer,
  MeasurementProfile,
  GarmentOrder,
  KhataTransaction,
  SyncQueueItem,
} from '@/types/tailor';
import {
  mockCustomers,
  mockMeasurementProfiles,
  mockOrders,
  mockKhataTransactions,
} from '@/lib/mock-data';
import { normalizePakistaniPhone } from '@/lib/validations/tailor';

// ==========================================
// 1. Database Constants & Schema
// ==========================================

export const DB_NAME = 'silaye_offline_db';
export const DB_VERSION = 1;

export interface SilayeDBSchema extends DBSchema {
  customers: {
    key: string;
    value: Customer;
    indexes: {
      phone: string;
      name: string;
      full_name: string;
    };
  };
  measurements: {
    key: string;
    value: MeasurementProfile;
    indexes: {
      customer_id: string;
    };
  };
  orders: {
    key: string;
    value: GarmentOrder;
    indexes: {
      customer_id: string;
      status: string;
      order_number: string;
    };
  };
  khata_transactions: {
    key: string;
    value: KhataTransaction;
    indexes: {
      customer_id: string;
      order_id: string;
    };
  };
  sync_queue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      status: string;
      created_at: number;
    };
  };
}

// In-memory singleton promise to prevent concurrent opening race conditions
let dbPromise: Promise<IDBPDatabase<SilayeDBSchema>> | null = null;

/**
 * Checks if IndexedDB is supported in the current runtime environment.
 */
export function isIndexedDBSupported(): boolean {
  return typeof indexedDB !== 'undefined';
}

/**
 * Generates a cryptographic UUID v4 string.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback RFC4122 v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ==========================================
// 2. Database Initialization & Seeding
// ==========================================

/**
 * Initializes and upgrades the IndexedDB instance.
 * Automatically seeds mock records if local stores are empty.
 */
export async function initLocalDatabase(): Promise<IDBPDatabase<SilayeDBSchema> | null> {
  if (!isIndexedDBSupported()) {
    return null;
  }

  if (!dbPromise) {
    dbPromise = (async () => {
      const { openDB } = await import('idb');
      const db = await openDB<SilayeDBSchema>(DB_NAME, DB_VERSION, {
        upgrade(dbInstance, oldVersion) {
          // Version 1 Store Definitions
          if (oldVersion < 1) {
            // Customers store
            if (!dbInstance.objectStoreNames.contains('customers')) {
              const customerStore = dbInstance.createObjectStore('customers', { keyPath: 'id' });
              customerStore.createIndex('phone', 'phone', { unique: false });
              customerStore.createIndex('name', 'full_name', { unique: false });
              customerStore.createIndex('full_name', 'full_name', { unique: false });
            }

            // Measurements store
            if (!dbInstance.objectStoreNames.contains('measurements')) {
              const measurementStore = dbInstance.createObjectStore('measurements', { keyPath: 'id' });
              measurementStore.createIndex('customer_id', 'customer_id', { unique: false });
            }

            // Orders store
            if (!dbInstance.objectStoreNames.contains('orders')) {
              const orderStore = dbInstance.createObjectStore('orders', { keyPath: 'id' });
              orderStore.createIndex('customer_id', 'customer_id', { unique: false });
              orderStore.createIndex('status', 'status', { unique: false });
              orderStore.createIndex('order_number', 'order_number', { unique: true });
            }

            // Khata ledger transactions store
            if (!dbInstance.objectStoreNames.contains('khata_transactions')) {
              const khataStore = dbInstance.createObjectStore('khata_transactions', { keyPath: 'id' });
              khataStore.createIndex('customer_id', 'customer_id', { unique: false });
              khataStore.createIndex('order_id', 'order_id', { unique: false });
            }

            // Offline mutation synchronization queue
            if (!dbInstance.objectStoreNames.contains('sync_queue')) {
              const syncStore = dbInstance.createObjectStore('sync_queue', { keyPath: 'id' });
              syncStore.createIndex('status', 'status', { unique: false });
              syncStore.createIndex('created_at', 'created_at', { unique: false });
            }
          }
        },
      });

      // Auto-seed only if explicit env flag is enabled for testing
      const shouldSeed = process.env.NEXT_PUBLIC_SEED_MOCK_DATA === 'true';
      const customerCount = await db.count('customers');
      if (customerCount === 0 && shouldSeed) {
        await seedLocalDatabase(db);
      }
      return db;
    })();
  }

  return dbPromise;
}

/**
 * Seeds local database with initial mock dataset.
 */
export async function seedLocalDatabase(db: IDBPDatabase<SilayeDBSchema>): Promise<void> {
  const tx = db.transaction(
    ['customers', 'measurements', 'orders', 'khata_transactions'],
    'readwrite'
  );

  const customerStore = tx.objectStore('customers');
  for (const customer of mockCustomers) {
    await customerStore.put(customer);
  }

  const measurementStore = tx.objectStore('measurements');
  for (const measurement of mockMeasurementProfiles) {
    await measurementStore.put(measurement);
  }

  const orderStore = tx.objectStore('orders');
  for (const order of mockOrders) {
    await orderStore.put(order);
  }

  const khataStore = tx.objectStore('khata_transactions');
  for (const transaction of mockKhataTransactions) {
    await khataStore.put(transaction);
  }

  await tx.done;
}

// ==========================================
// 3. Customer CRUD Operations
// ==========================================

export async function getLocalCustomers(): Promise<Customer[]> {
  const db = await initLocalDatabase();
  if (!db) return mockCustomers;
  return db.getAll('customers');
}

export async function getLocalCustomerById(id: string): Promise<Customer | undefined> {
  const db = await initLocalDatabase();
  if (!db) return mockCustomers.find((c) => c.id === id);
  return db.get('customers', id);
}

export async function getLocalCustomerByPhone(phone: string): Promise<Customer | undefined> {
  const db = await initLocalDatabase();
  const cleanPhone = phone.trim();
  let normalizedQuery: string = cleanPhone;
  try {
    normalizedQuery = normalizePakistaniPhone(cleanPhone);
  } catch {
    normalizedQuery = cleanPhone.replace(/\D/g, '');
  }

  if (!db) {
    return mockCustomers.find(
      (c) =>
        normalizePakistaniPhone(c.phone) === normalizedQuery ||
        (c.alternate_phone && normalizePakistaniPhone(c.alternate_phone) === normalizedQuery)
    );
  }

  // Exact match via index
  const exact = await db.getFromIndex('customers', 'phone', cleanPhone);
  if (exact) return exact;

  // Normalized scan fallback
  const all = await db.getAll('customers');
  return all.find(
    (c) =>
      normalizePakistaniPhone(c.phone) === normalizedQuery ||
      (c.alternate_phone && normalizePakistaniPhone(c.alternate_phone) === normalizedQuery)
  );
}

export async function saveLocalCustomer(customer: Customer): Promise<void> {
  const db = await initLocalDatabase();
  if (!db) return;
  await db.put('customers', customer);
}

export async function deleteLocalCustomer(id: string): Promise<void> {
  const db = await initLocalDatabase();
  if (!db) return;
  await db.delete('customers', id);
}

// ==========================================
// 4. Measurement Profile CRUD Operations
// ==========================================

export async function getLocalMeasurementProfiles(): Promise<MeasurementProfile[]> {
  const db = await initLocalDatabase();
  if (!db) return mockMeasurementProfiles;
  return db.getAll('measurements');
}

export async function getLocalMeasurementProfileById(
  id: string
): Promise<MeasurementProfile | undefined> {
  const db = await initLocalDatabase();
  if (!db) return mockMeasurementProfiles.find((m) => m.id === id);
  return db.get('measurements', id);
}

export async function getLocalMeasurementProfilesByCustomerId(
  customerId: string
): Promise<MeasurementProfile[]> {
  const db = await initLocalDatabase();
  if (!db) return mockMeasurementProfiles.filter((m) => m.customer_id === customerId);
  return db.getAllFromIndex('measurements', 'customer_id', customerId);
}

export async function saveLocalMeasurementProfile(profile: MeasurementProfile): Promise<void> {
  const db = await initLocalDatabase();
  if (!db) return;
  await db.put('measurements', profile);
}

export async function deleteLocalMeasurementProfile(id: string): Promise<void> {
  const db = await initLocalDatabase();
  if (!db) return;
  await db.delete('measurements', id);
}

// ==========================================
// 5. Garment Order CRUD Operations
// ==========================================

export async function getLocalOrders(): Promise<GarmentOrder[]> {
  const db = await initLocalDatabase();
  if (!db) return mockOrders;
  return db.getAll('orders');
}

export async function getLocalOrderById(id: string): Promise<GarmentOrder | undefined> {
  const db = await initLocalDatabase();
  if (!db) return mockOrders.find((o) => o.id === id);
  return db.get('orders', id);
}

export async function getLocalOrderByNumber(orderNumber: string): Promise<GarmentOrder | undefined> {
  const db = await initLocalDatabase();
  if (!db) return mockOrders.find((o) => o.order_number === orderNumber);
  return db.getFromIndex('orders', 'order_number', orderNumber);
}

export async function getLocalOrdersByCustomerId(customerId: string): Promise<GarmentOrder[]> {
  const db = await initLocalDatabase();
  if (!db) return mockOrders.filter((o) => o.customer_id === customerId);
  return db.getAllFromIndex('orders', 'customer_id', customerId);
}

export async function saveLocalOrder(order: GarmentOrder): Promise<void> {
  const db = await initLocalDatabase();
  if (!db) return;
  await db.put('orders', order);
}

export async function deleteLocalOrder(id: string): Promise<void> {
  const db = await initLocalDatabase();
  if (!db) return;
  await db.delete('orders', id);
}

// ==========================================
// 6. Khata Financial Ledger Operations (Append-Only)
// ==========================================

export async function getLocalKhataTransactions(
  customerId?: string
): Promise<KhataTransaction[]> {
  const db = await initLocalDatabase();
  if (!db) {
    if (customerId) {
      return mockKhataTransactions.filter((t) => t.customer_id === customerId);
    }
    return mockKhataTransactions;
  }

  if (customerId) {
    return db.getAllFromIndex('khata_transactions', 'customer_id', customerId);
  }
  return db.getAll('khata_transactions');
}

/**
 * Appends a new Khata financial transaction and atomically updates the customer's balance.
 */
export async function appendKhataTransaction(
  transaction: KhataTransaction
): Promise<void> {
  const db = await initLocalDatabase();
  if (!db) return;

  const tx = db.transaction(['khata_transactions', 'customers'], 'readwrite');
  const khataStore = tx.objectStore('khata_transactions');
  const customerStore = tx.objectStore('customers');

  // Append transaction
  await khataStore.put(transaction);

  // Update customer current_khata_balance
  const customer = await customerStore.get(transaction.customer_id);
  if (customer) {
    customer.current_khata_balance = transaction.balance_after;
    customer.updated_at = transaction.created_at;
    await customerStore.put(customer);
  }

  await tx.done;
}

// ==========================================
// 7. Sync Queue CRUD Operations
// ==========================================

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await initLocalDatabase();
  if (!db) return [];
  return db.getAll('sync_queue');
}

export async function getPendingSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await initLocalDatabase();
  if (!db) return [];
  const items = await db.getAllFromIndex('sync_queue', 'status', 'PENDING');
  return items.sort((a, b) => a.created_at - b.created_at);
}

export async function addSyncQueueItem(
  item: Omit<SyncQueueItem, 'id' | 'created_at' | 'retry_count' | 'status'> &
    Partial<Pick<SyncQueueItem, 'id' | 'created_at' | 'retry_count' | 'status'>>
): Promise<SyncQueueItem> {
  const db = await initLocalDatabase();
  const queueItem: SyncQueueItem = {
    id: item.id || generateUUID(),
    endpoint: item.endpoint,
    method: item.method,
    payload: item.payload,
    created_at: item.created_at ?? Date.now(),
    retry_count: item.retry_count ?? 0,
    status: item.status ?? 'PENDING',
    error_message: item.error_message,
  };

  if (db) {
    await db.put('sync_queue', queueItem);
  }
  return queueItem;
}

export async function updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
  const db = await initLocalDatabase();
  if (!db) return;
  await db.put('sync_queue', item);
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  const db = await initLocalDatabase();
  if (!db) return;
  await db.delete('sync_queue', id);
}

export async function clearSyncQueue(): Promise<void> {
  const db = await initLocalDatabase();
  if (!db) return;
  await db.clear('sync_queue');
}

// ==========================================
// 8. Database Reset / Maintenance
// ==========================================

export async function clearDatabase(): Promise<void> {
  const db = await initLocalDatabase();
  if (!db) return;
  const tx = db.transaction(
    ['customers', 'measurements', 'orders', 'khata_transactions', 'sync_queue'],
    'readwrite'
  );
  await tx.objectStore('customers').clear();
  await tx.objectStore('measurements').clear();
  await tx.objectStore('orders').clear();
  await tx.objectStore('khata_transactions').clear();
  await tx.objectStore('sync_queue').clear();
  await tx.done;
}
