/**
 * lib/platform-native.ts - Native Mobile Lifecycle & System Bars Initializer
 * Configures Android & iOS hardware status bar, navigation bar, and safe area telemetry.
 */

import { StatusBar, Style } from '@capacitor/status-bar';
import { isNativeMobile } from './platform';

export interface NativeSystemBarConfig {
  /** Hex color for status bar background, defaults to Obsidian Dark '#0B0C0E' */
  backgroundColor?: string;
  /** Status bar style (Style.Dark = light icons on dark bar) */
  style?: Style;
  /** Whether the webview extends under the status bar (default: false) */
  overlays?: boolean;
}

/**
 * Initializes native mobile platform hardware system bars:
 * 1. Sets Status Bar overlay mode (false by default for safe layout separation)
 * 2. Sets Status Bar background color to Obsidian Dark (#0B0C0E)
 * 3. Sets Status Bar style to Dark (light text/icons on dark background)
 */
export async function initializeNativePlatform(config?: NativeSystemBarConfig): Promise<void> {
  if (typeof window === 'undefined') return;

  // Only run if executing within a Capacitor native mobile context (Android / iOS)
  if (!isNativeMobile(false)) return;

  try {
    const bgColor = config?.backgroundColor ?? '#0B0C0E';
    const barStyle = config?.style ?? Style.Dark;
    const overlay = config?.overlays ?? false;

    // Apply status bar overlay mode
    await StatusBar.setOverlaysWebView({ overlay });

    // Apply status bar background color
    await StatusBar.setBackgroundColor({ color: bgColor });

    // Apply status bar text/icon style (Dark = light icons on dark bar)
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
