import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'pk.silaye.app',
  appName: 'Silaye Beta',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0B0C0E',
  },
  plugins: {
    StatusBar: {
      backgroundColor: '#0B0C0E',
      style: 'DARK',
      overlaysWebView: false,
    },
    SplashScreen: {
      backgroundColor: '#0B0C0E',
      launchAutoHide: true,
      launchShowDuration: 1000,
      showSpinner: false,
      androidSplashResourceName: 'splash',
    },
    Keyboard: {
      resize: KeyboardResize.Body,
      style: KeyboardStyle.Dark,
      resizeOnFullScreen: true,
    },
  },
};

export default config;
