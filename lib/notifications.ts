/**
 * lib/notifications.ts - Automated Local Notifications Engine & Alert Scheduler
 *
 * Provides unified cross-platform local notification scheduling for Native Android/iOS
 * (via @capacitor/local-notifications) and Web/Desktop environments (Web Notification API & Web Audio).
 */

import { isNativeMobile } from './platform';
import { getNotificationPreferences } from './notification-preferences';
import type { GarmentOrder } from '@/types/tailor';

/** Fixed notification ID for daily 9:00 AM morning briefing */
export const MORNING_BRIEFING_NOTIFICATION_ID = 9001;

/** Fixed notification ID for test alerts */
export const TEST_NOTIFICATION_ID = 9999;

/**
 * Clamps a string identifier (e.g., UUID or order number) to a safe 32-bit positive integer
 * required by Android AlarmManager and Capacitor LocalNotifications plugin.
 */
export function hashStringToId(str: string): number {
  if (!str) return 1000;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return (Math.abs(hash) % 2000000000) + 1000;
}

/**
 * Synthesizes a luxury dual-tone acoustic notification chime using the Web Audio API.
 * Safeguards against SSR, browser autoplay restrictions, and AudioContext suspensions.
 */
export function playNotificationChime(): void {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Dual-harmonic tone: D5 (587.33 Hz) -> A5 (880.00 Hz)
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(880.0, ctx.currentTime + 0.18);

    // Subtle warm octave shimmer: D6 (1174.66 Hz)
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1174.66, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(1760.0, ctx.currentTime + 0.18);

    gainNode.gain.setValueAtTime(0.18, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.55);
    osc2.stop(ctx.currentTime + 0.55);
  } catch {
    // Graceful fallback if Web Audio is unsupported or blocked
  }
}

/**
 * Requests and verifies notification permissions across Native Mobile and Web Browser environments.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // 1. Native Capacitor Environment (Android / iOS)
  if (isNativeMobile(false) || window.Capacitor?.isNativePlatform?.()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') {
        return true;
      }
      const requested = await LocalNotifications.requestPermissions();
      return requested.display === 'granted';
    } catch (err) {
      console.warn('[Silaye Notifications] Native permission request notice:', err);
    }
  }

  // 2. Web Browser & Desktop Fallback
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      return true;
    }
    if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch {
        return false;
      }
    }
  }

  return false;
}

/**
 * Schedules or delivers the 9:00 AM daily morning briefing summarizing suits scheduled for delivery today.
 *
 * Guardrails:
 * - Checks WorkshopNotificationPrefs.morningBriefing.
 * - Filters orders due today that remain in active production.
 * - If current time is past 9:00 AM today, dispatches an immediate today summary; otherwise schedules for 9:00 AM.
 * - Replaces notification ID 9001 to prevent duplicate alarms.
 */
export async function scheduleDailyMorningBriefing(orders: GarmentOrder[]): Promise<void> {
  if (typeof window === 'undefined') return;

  const prefs = getNotificationPreferences();
  if (!prefs.morningBriefing) return;

  // Calculate local today date string (YYYY-MM-DD)
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;

  // Filter active orders due today
  const dueTodayOrders = (orders || []).filter((o) => {
    if (!o.delivery_date) return false;
    const orderDeliveryDate = o.delivery_date.split('T')[0];
    const isPending = o.status !== 'COMPLETED' && o.status !== 'CANCELLED';
    return orderDeliveryDate === todayStr && isPending;
  });

  const totalSuitsCount = dueTodayOrders.reduce((sum, o) => sum + (o.quantity || 1), 0);

  const title = '☀️ Morning Workshop Briefing | صبح کا بریفنگ';
  const body =
    totalSuitsCount > 0
      ? `آج ${totalSuitsCount} سوٹ ڈیلیور کرنے ہیں۔ ${totalSuitsCount} suit(s) scheduled for delivery today.`
      : 'All caught up! No scheduled deliveries due today. / آج کوئی ڈیلیوری شیڈول نہیں ہے۔';

  const isPast9AM = now.getHours() >= 9;

  // Target schedule time
  let targetScheduleDate = new Date();
  if (isPast9AM) {
    // Deliver immediate or slightly deferred alert (+2 seconds)
    targetScheduleDate = new Date(Date.now() + 2000);
  } else {
    targetScheduleDate.setHours(9, 0, 0, 0);
  }

  // 1. Native Capacitor Scheduling
  if (isNativeMobile(false) || window.Capacitor?.isNativePlatform?.()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      // Cancel previous morning briefing ID to avoid stale duplicates
      try {
        await LocalNotifications.cancel({
          notifications: [{ id: MORNING_BRIEFING_NOTIFICATION_ID }],
        });
      } catch {
        // Ignore cancel errors if not previously scheduled
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            id: MORNING_BRIEFING_NOTIFICATION_ID,
            title,
            body,
            schedule: {
              at: targetScheduleDate,
              allowWhileIdle: true,
            },
            sound: prefs.soundEnabled ? 'beep.wav' : undefined,
            extra: {
              route: '/orders',
              type: 'morning_briefing',
            },
          },
        ],
      });
      return;
    } catch (err) {
      console.warn('[Silaye Notifications] Native morning briefing schedule notice:', err);
    }
  }

  // 2. Web Browser Fallback
  if ('Notification' in window && Notification.permission === 'granted') {
    const sessionBriefingKey = `silaye:morning-briefing-shown-${todayStr}`;
    if (!sessionStorage.getItem(sessionBriefingKey)) {
      try {
        new Notification(title, {
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          silent: !prefs.soundEnabled,
        });
        sessionStorage.setItem(sessionBriefingKey, 'true');
        if (prefs.soundEnabled) {
          playNotificationChime();
        }
      } catch {
        // Ignore Notification constructor error
      }
    }
  }
}

/**
 * Triggers an urgent warning notification when an in-production order is due within 24 hours.
 *
 * Guardrails:
 * - Checks WorkshopNotificationPrefs.urgentAlerts.
 * - Verifies garment status is in active production stages (BOOKED, FABRIC_RECEIVED, IN_CUTTING, IN_STITCHING, KAJ_BUTTON, PRESSING).
 * - Generates clamped 32-bit positive integer notification ID.
 */
export async function scheduleUrgentOrderAlert(order: GarmentOrder): Promise<void> {
  if (typeof window === 'undefined' || !order) return;

  const prefs = getNotificationPreferences();
  if (!prefs.urgentAlerts) return;

  // Verify garment is actively in production
  const inProductionStages = [
    'BOOKED',
    'FABRIC_RECEIVED',
    'IN_CUTTING',
    'IN_STITCHING',
    'KAJ_BUTTON',
    'PRESSING',
  ];
  if (!inProductionStages.includes(order.status)) {
    return;
  }

  if (!order.delivery_date) return;

  const deliveryTimestamp = new Date(order.delivery_date).getTime();
  const nowTimestamp = Date.now();
  const diffHours = (deliveryTimestamp - nowTimestamp) / (1000 * 60 * 60);

  // Check if due in < 24 hours or already overdue
  if (diffHours > 24) return;

  const notifId = hashStringToId(`urgent_${order.id || order.order_number}`);
  const customerName = order.customer?.full_name ? ` (${order.customer.full_name})` : '';
  const title = `⚠️ Urgent Order Due | فوری ڈیلیوری الرٹ (#${order.order_number})`;
  const body = `Order #${order.order_number}${customerName} (${order.quantity}x suit) is due in less than 24 hours! زیرِ تکمیل سوٹ کی ڈیلیوری کا وقت قریب ہے۔`;

  // 1. Native Capacitor Scheduling
  if (isNativeMobile(false) || window.Capacitor?.isNativePlatform?.()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title,
            body,
            schedule: { at: new Date(Date.now() + 1000) },
            sound: prefs.soundEnabled ? 'beep.wav' : undefined,
            extra: {
              route: '/orders',
              orderId: order.id,
              type: 'urgent_due_alert',
            },
          },
        ],
      });
      return;
    } catch (err) {
      console.warn('[Silaye Notifications] Native urgent order alert notice:', err);
    }
  }

  // 2. Web Browser Fallback
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        silent: !prefs.soundEnabled,
      });
      if (prefs.soundEnabled) {
        playNotificationChime();
      }
    } catch {
      // Ignore
    }
  }
}

/**
 * Dispatches an immediate test notification with dual-tone audio chime to verify
 * device permissions, sound, and notification channels.
 */
export async function sendTestNotification(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const permitted = await requestNotificationPermissions();
  const prefs = getNotificationPreferences();

  if (prefs.soundEnabled) {
    playNotificationChime();
  }

  const title = '🔔 Silaye Notification Test / ٹیسٹ الرٹ';
  const body =
    'Workshop notification system is working properly! / ورکشاپ نوٹیفیکیشن سسٹم مکمل درست کام کر رہا ہے۔';

  // 1. Native Mobile Capacitor
  if (isNativeMobile(false) || window.Capacitor?.isNativePlatform?.()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.schedule({
        notifications: [
          {
            id: TEST_NOTIFICATION_ID,
            title,
            body,
            schedule: { at: new Date(Date.now() + 500) },
            sound: prefs.soundEnabled ? 'beep.wav' : undefined,
            extra: { type: 'test' },
          },
        ],
      });
      return true;
    } catch (err) {
      console.warn('[Silaye Notifications] Native test notification notice:', err);
    }
  }

  // 2. Web Browser Fallback
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        silent: !prefs.soundEnabled,
      });
      return true;
    } catch {
      return false;
    }
  }

  return permitted;
}

/**
 * Sets up a listener for notification tap / action performance on Capacitor mobile devices.
 * Extracts the deep-link route from notification extra payload and passes it to the callback.
 * Returns a cleanup function to unregister the listener.
 */
export async function setupNotificationActionListener(
  onNavigate: (route: string) => void
): Promise<() => void> {
  if (typeof window === 'undefined') return () => {};

  if (isNativeMobile(false) || window.Capacitor?.isNativePlatform?.()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const handle = await LocalNotifications.addListener(
        'localNotificationActionPerformed',
        (action) => {
          const targetRoute = action.notification.extra?.route || '/dashboard';
          if (targetRoute) {
            onNavigate(targetRoute);
          }
        }
      );
      return () => {
        handle.remove().catch(() => {});
      };
    } catch (err) {
      console.warn('[Silaye Notifications] Failed to attach notification action listener:', err);
    }
  }

  return () => {};
}
