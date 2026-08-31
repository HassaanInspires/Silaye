'use client';

import * as React from 'react';
import {
  getNotificationPreferences,
  NOTIFICATION_PREFS_CHANGED_EVENT,
} from '@/lib/notification-preferences';
import {
  scheduleDailyMorningBriefing,
  scheduleUrgentOrderAlert,
} from '@/lib/notifications';
import { ordersDb, shopsDb } from '@/lib/db';

/**
 * components/platform/notification-scheduler.tsx
 *
 * Zero-DOM background client component mounted at root level.
 * Automatically synchronizes workshop orders with the Local Notifications Engine
 * to trigger daily 9:00 AM delivery briefings and urgent in-production alerts.
 */
export function NotificationScheduler(): null {
  const syncScheduledNotifications = React.useCallback(async () => {
    if (typeof window === 'undefined') return;

    const prefs = getNotificationPreferences();
    if (!prefs.morningBriefing && !prefs.urgentAlerts) return;

    try {
      // Get current workshop ID safely
      const shop = await shopsDb.getCurrentShop();
      const shopId = shop?.id || '';

      // Query active workshop orders
      const orders = await ordersDb.getOrders(shopId);

      // 1. Morning Briefing Scheduling
      if (prefs.morningBriefing) {
        await scheduleDailyMorningBriefing(orders);
      }

      // 2. Urgent Due Alerts Scheduling
      if (prefs.urgentAlerts && orders.length > 0) {
        const inProductionStages = [
          'BOOKED',
          'FABRIC_RECEIVED',
          'IN_CUTTING',
          'IN_STITCHING',
          'KAJ_BUTTON',
          'PRESSING',
        ];
        const now = Date.now();

        for (const order of orders) {
          if (!order.delivery_date || !inProductionStages.includes(order.status)) {
            continue;
          }
          const deliveryTime = new Date(order.delivery_date).getTime();
          const hoursLeft = (deliveryTime - now) / (1000 * 60 * 60);

          if (hoursLeft <= 24) {
            await scheduleUrgentOrderAlert(order);
          }
        }
      }
    } catch (err) {
      console.warn('[Silaye Notifications] Background scheduler evaluation notice:', err);
    }
  }, []);

  React.useEffect(() => {
    // Run initial evaluation after a slight delay to allow auth and offline DB initialization
    const timer = setTimeout(() => {
      syncScheduledNotifications();
    }, 2500);

    // Listen for preference changes from Settings UI
    const handlePrefsChange = () => {
      syncScheduledNotifications();
    };

    window.addEventListener(NOTIFICATION_PREFS_CHANGED_EVENT, handlePrefsChange);

    return () => {
      clearTimeout(timer);
      window.removeEventListener(NOTIFICATION_PREFS_CHANGED_EVENT, handlePrefsChange);
    };
  }, [syncScheduledNotifications]);

  return null;
}
