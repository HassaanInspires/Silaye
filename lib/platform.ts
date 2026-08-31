/**
 * lib/platform.ts - Cross-Platform Detection & Device Environment Gateway
 * Unified runtime detection for Native Mobile (Capacitor Android/iOS), Desktop (Electron), and Web Browser.
 */

import { Capacitor } from '@capacitor/core';

export type PlatformType = 'android' | 'ios' | 'electron' | 'web';

/**
 * Checks if the application is running inside a Capacitor native mobile wrapper (Android or iOS),
 * with support for URL query override (?view=mobile or ?onboarding=true) for responsive development testing.
 */
export function isNativeMobile(allowQueryOverride: boolean = true): boolean {
  if (typeof window === 'undefined') return false;

  // 1. URL Query Parameter Override for Testing & Development
  if (allowQueryOverride) {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      if (
        searchParams.get('view') === 'mobile' ||
        searchParams.get('onboarding') === 'true'
      ) {
        return true;
      }
    } catch {
      // Ignore query param error on non-standard environments
    }
  }

  // 2. Capacitor Core Native Platform Verification
  try {
    if (Capacitor.isNativePlatform()) return true;
  } catch {
    // Ignore Capacitor load error
  }

  // 3. Window Global Capacitor Fallback
  if (window.Capacitor?.isNativePlatform?.()) {
    return true;
  }

  return false;
}

/**
 * Checks if the application is running inside the Electron Desktop runtime environment.
 */
export function isElectron(): boolean {
  if (typeof window === 'undefined') return false;

  if (window.electronAPI?.isElectron) return true;

  if (typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent)) {
    return true;
  }

  return false;
}

/**
 * Detects if the current viewport or user agent represents a mobile device.
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  if (isNativeMobile()) return true;

  if (typeof navigator !== 'undefined') {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  return false;
}

/**
 * Resolves the active platform type.
 */
export function getPlatformType(): PlatformType {
  if (typeof window === 'undefined') return 'web';

  if (isElectron()) return 'electron';

  try {
    const capPlatform = Capacitor.getPlatform();
    if (capPlatform === 'android') return 'android';
    if (capPlatform === 'ios') return 'ios';
  } catch {
    // Fallback below
  }

  if (isNativeMobile(false)) return 'android';

  return 'web';
}
