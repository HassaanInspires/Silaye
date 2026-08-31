'use client';

import * as React from 'react';
import { initializeNativePlatform } from '@/lib/platform-native';

/**
 * NativeInitializer is a lightweight, zero-DOM client component mounted at the root
 * layout to ensure hardware system bars (status bar color & theme) are initialized
 * immediately on application startup across all native Android and iOS viewports.
 */
export function NativeInitializer(): null {
  React.useEffect(() => {
    initializeNativePlatform();
  }, []);

  return null;
}

export default NativeInitializer;
