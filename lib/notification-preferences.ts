/**
 * lib/notification-preferences.ts - Workshop Notification Preferences Utility
 *
 * Provides persistent storage and cross-component event dispatching for
 * workshop notification preferences (morning briefings, urgent alerts, sound/vibration).
 */

export interface WorkshopNotificationPrefs {
  morningBriefing: boolean;
  urgentAlerts: boolean;
  soundEnabled: boolean;
}

export const NOTIFICATION_PREFS_STORAGE_KEY = 'silaye:notification-prefs';
export const NOTIFICATION_PREFS_CHANGED_EVENT = 'silaye:notification-prefs-changed';

export const DEFAULT_NOTIFICATION_PREFS: WorkshopNotificationPrefs = {
  morningBriefing: true,
  urgentAlerts: true,
  soundEnabled: true,
};

/**
 * Retrieves the stored workshop notification preferences from localStorage with SSR fallback.
 * All settings default to true.
 */
export function getNotificationPreferences(): WorkshopNotificationPrefs {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }

  try {
    const raw = localStorage.getItem(NOTIFICATION_PREFS_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_NOTIFICATION_PREFS };
    }
    const parsed = JSON.parse(raw);
    return {
      morningBriefing: typeof parsed.morningBriefing === 'boolean' ? parsed.morningBriefing : true,
      urgentAlerts: typeof parsed.urgentAlerts === 'boolean' ? parsed.urgentAlerts : true,
      soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
    };
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
}

/**
 * Updates workshop notification preferences in localStorage and broadcasts a custom window event.
 */
export function setNotificationPreferences(
  prefs: Partial<WorkshopNotificationPrefs>
): WorkshopNotificationPrefs {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_NOTIFICATION_PREFS, ...prefs };
  }

  try {
    const current = getNotificationPreferences();
    const updated: WorkshopNotificationPrefs = {
      ...current,
      ...prefs,
    };
    localStorage.setItem(NOTIFICATION_PREFS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(
      new CustomEvent<WorkshopNotificationPrefs>(NOTIFICATION_PREFS_CHANGED_EVENT, {
        detail: updated,
      })
    );
    return updated;
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFS, ...prefs };
  }
}

/**
 * Resets notification preferences to default values (all enabled).
 */
export function resetNotificationPreferences(): WorkshopNotificationPrefs {
  return setNotificationPreferences(DEFAULT_NOTIFICATION_PREFS);
}
