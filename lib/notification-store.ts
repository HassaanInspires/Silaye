/**
 * lib/notification-store.ts - Persistent Notification History Store
 *
 * Uses IndexedDB via the idb package (already a project dependency) to persist
 * up to 50 in-app notifications across app restarts. Each notification has
 * a type-based color code, can be individually deleted, and can be marked as read.
 *
 * Events:
 *  - 'silaye:notifications-updated'  — dispatched on any store mutation
 */

import { openDB, type IDBPDatabase } from 'idb';

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotificationItemType =
  | 'morning_briefing'
  | 'urgent_order'
  | 'test'
  | 'system'
  | 'payment';

export interface StoredNotification {
  id: string;
  title: string;
  body: string;
  type: NotificationItemType;
  route?: string;
  timestamp: number;
  isRead: boolean;
}

// ── Type → UI Color Mapping ───────────────────────────────────────────────────

export const NOTIF_TYPE_COLORS: Record<
  NotificationItemType,
  { bg: string; border: string; text: string; dot: string; icon: string }
> = {
  morning_briefing: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-300',
    dot: 'bg-blue-400',
    icon: '☀️',
  },
  urgent_order: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    text: 'text-rose-300',
    dot: 'bg-rose-400',
    icon: '⚠️',
  },
  test: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    text: 'text-yellow-300',
    dot: 'bg-yellow-400',
    icon: '🔔',
  },
  system: {
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30',
    text: 'text-gray-300',
    dot: 'bg-gray-400',
    icon: 'ℹ️',
  },
  payment: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-300',
    dot: 'bg-emerald-400',
    icon: '💳',
  },
};

// ── DB Constants ──────────────────────────────────────────────────────────────

const DB_NAME = 'silaye_notifications_db';
const DB_VERSION = 1;
const STORE_NAME = 'notifications';
const MAX_NOTIFICATIONS = 50;
export const NOTIFICATIONS_UPDATE_EVENT = 'silaye:notifications-updated';

// ── DB Singleton ──────────────────────────────────────────────────────────────

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB not available in SSR'));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('isRead', 'isRead');
        }
      },
    });
  }
  return dbPromise;
}

function broadcastUpdate(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATE_EVENT));
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Pushes a new notification to persistent storage.
 * Automatically trims history to MAX_NOTIFICATIONS oldest entries.
 */
export async function pushNotification(
  notif: Omit<StoredNotification, 'id' | 'isRead'>
): Promise<void> {
  try {
    const db = await getDb();
    const id = `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const entry: StoredNotification = { ...notif, id, isRead: false };
    await db.put(STORE_NAME, entry);

    // Trim to maximum — delete the oldest ones
    const all = await db.getAllFromIndex(STORE_NAME, 'timestamp');
    if (all.length > MAX_NOTIFICATIONS) {
      const toDelete = (all as StoredNotification[]).slice(
        0,
        all.length - MAX_NOTIFICATIONS
      );
      for (const item of toDelete) {
        await db.delete(STORE_NAME, item.id);
      }
    }

    broadcastUpdate();
  } catch {
    // Fail silently — notifications are non-critical
  }
}

/**
 * Returns all stored notifications ordered newest-first.
 */
export async function getAllNotifications(): Promise<StoredNotification[]> {
  try {
    const db = await getDb();
    const all = await db.getAllFromIndex(STORE_NAME, 'timestamp');
    return (all as StoredNotification[]).reverse();
  } catch {
    return [];
  }
}

/**
 * Marks a single notification as read.
 */
export async function markAsRead(id: string): Promise<void> {
  try {
    const db = await getDb();
    const item = (await db.get(STORE_NAME, id)) as StoredNotification | undefined;
    if (item && !item.isRead) {
      await db.put(STORE_NAME, { ...item, isRead: true });
      broadcastUpdate();
    }
  } catch {
    // Fail silently
  }
}

/**
 * Marks all notifications as read.
 */
export async function markAllAsRead(): Promise<void> {
  try {
    const db = await getDb();
    const all = (await db.getAll(STORE_NAME)) as StoredNotification[];
    const unread = all.filter((n) => !n.isRead);
    for (const item of unread) {
      await db.put(STORE_NAME, { ...item, isRead: true });
    }
    if (unread.length > 0) broadcastUpdate();
  } catch {
    // Fail silently
  }
}

/**
 * Permanently deletes a single notification by ID.
 */
export async function deleteNotification(id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(STORE_NAME, id);
    broadcastUpdate();
  } catch {
    // Fail silently
  }
}

/**
 * Deletes all stored notifications.
 */
export async function clearAllNotifications(): Promise<void> {
  try {
    const db = await getDb();
    await db.clear(STORE_NAME);
    broadcastUpdate();
  } catch {
    // Fail silently
  }
}

/**
 * Returns the count of unread notifications.
 */
export async function getUnreadCount(): Promise<number> {
  try {
    const db = await getDb();
    const all = (await db.getAll(STORE_NAME)) as StoredNotification[];
    return all.filter((n) => !n.isRead).length;
  } catch {
    return 0;
  }
}
