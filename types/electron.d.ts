/**
 * types/electron.d.ts - Global type declarations for Electron IPC Bridge
 */

export interface ElectronAPI {
  platform: string;
  isElectron: boolean;
  openExternal: (url: string) => Promise<boolean>;
  printRawEscPos: (bytes: Uint8Array | number[]) => Promise<{ success: boolean; error?: string }>;
  clearOfflineCache: () => Promise<boolean>;
  getAppVersion: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    Capacitor?: {
      isNativePlatform: () => boolean;
      getPlatform: () => string;
    };
  }
}
