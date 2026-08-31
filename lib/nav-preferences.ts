/**
 * lib/nav-preferences.ts - Navigation Layout Preferences Utility
 *
 * Provides persistent storage and cross-component event dispatching for
 * mobile navigation layout styles: 'tabs' | 'drawer' | 'hybrid'.
 */

export type NavLayoutPreference = 'tabs' | 'drawer' | 'hybrid';

export const NAV_LAYOUT_STORAGE_KEY = 'silaye:nav-layout';
export const NAV_LAYOUT_CHANGED_EVENT = 'silaye:nav-layout-changed';
export const DEFAULT_NAV_LAYOUT: NavLayoutPreference = 'tabs';

/**
 * Retrieves the stored navigation layout preference from localStorage with SSR fallback.
 * Default is 'tabs'.
 */
export function getNavLayoutPreference(): NavLayoutPreference {
  if (typeof window === 'undefined') {
    return DEFAULT_NAV_LAYOUT;
  }
  try {
    const stored = localStorage.getItem(NAV_LAYOUT_STORAGE_KEY);
    if (stored === 'tabs' || stored === 'drawer' || stored === 'hybrid') {
      return stored;
    }
  } catch {
    // Ignore localStorage access errors in restricted/sandboxed environments
  }
  return DEFAULT_NAV_LAYOUT;
}

/**
 * Updates the navigation layout preference in localStorage and dispatches a window event.
 */
export function setNavLayoutPreference(layout: NavLayoutPreference): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(NAV_LAYOUT_STORAGE_KEY, layout);
    window.dispatchEvent(new Event(NAV_LAYOUT_CHANGED_EVENT));
  } catch {
    // Ignore localStorage access errors
  }
}
