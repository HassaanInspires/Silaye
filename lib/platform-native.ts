/**
 * lib/platform-native.ts - Native Mobile Lifecycle & System Bars Initializer
 * Configures Android & iOS hardware status bar, navigation bar, and safe area telemetry.
 */

import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { isNativeMobile } from './platform';

export interface NativeSystemBarConfig {
  /** Hex color for status bar background, defaults to Obsidian Dark '#0B0C0E' or Light '#F8F9FA' */
  backgroundColor?: string;
  /** Status bar style (Style.Dark = light icons on dark bar, Style.Light = dark icons on light bar) */
  style?: Style;
  /** Whether the webview extends under the status bar (default: false) */
  overlays?: boolean;
}

/**
 * Synchronizes native mobile hardware status bar with active theme:
 * - Light Mode: Style.Light (dark text/icons on light bar) and #F9F8F5 background.
 * - Dark Mode: Style.Dark (white text/icons on dark bar) and #0B0C0E background.
 * Guarded by Capacitor.isNativePlatform() to protect Web and Electron Desktop environments.
 */
export async function setNativeStatusBarTheme(theme: 'light' | 'dark'): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    if (!Capacitor.isNativePlatform() && !isNativeMobile(false)) return;

    if (theme === 'light') {
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#F9F8F5' });
    } else {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0B0C0E' });
    }
  } catch (err) {
    console.warn('[Silaye Native] StatusBar theme synchronization notice:', err);
  }
}

/**
 * Initializes native mobile platform hardware system bars:
 * 1. Reads active theme from localStorage ('silaye_theme')
 * 2. Sets Status Bar overlay mode (false by default for safe layout separation)
 * 3. Sets Status Bar background color and text/icon style matching theme
 */
export async function initializeNativePlatform(config?: NativeSystemBarConfig): Promise<void> {
  if (typeof window === 'undefined') return;

  // Only run if executing within a Capacitor native mobile context (Android / iOS)
  if (!Capacitor.isNativePlatform() && !isNativeMobile(false)) return;

  try {
    let savedTheme: 'light' | 'dark' = 'dark';
    try {
      const stored = localStorage.getItem('silaye_theme');
      if (stored === 'light' || stored === 'dark') {
        savedTheme = stored;
      }
    } catch {
      // Safe fallback to dark
    }

    const defaultBg = savedTheme === 'light' ? '#F9F8F5' : '#0B0C0E';
    const defaultStyle = savedTheme === 'light' ? Style.Light : Style.Dark;

    const bgColor = config?.backgroundColor ?? defaultBg;
    const barStyle = config?.style ?? defaultStyle;
    const overlay = config?.overlays ?? false;

    // Apply status bar overlay mode
    await StatusBar.setOverlaysWebView({ overlay });

    // Apply status bar background color
    await StatusBar.setBackgroundColor({ color: bgColor });

    // Apply status bar text/icon style
    await StatusBar.setStyle({ style: barStyle });

    // Attach native-mobile class to root elements for mobile single-scroll touch lockdown
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('native-mobile');
      document.body.classList.add('native-mobile');
    }
  } catch (err) {
    // Fail gracefully in non-native or unsupported browser contexts
    console.warn('[Silaye Native] System bar initialization notice:', err);
  }
}
