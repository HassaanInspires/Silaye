'use client';

import * as React from 'react';

/**
 * Hook to reactively track browser and device online/offline connectivity status.
 * Initializes safely with navigator.onLine and subscribes to window online, offline,
 * and visibilitychange events for instant real-time synchronization.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = React.useState<boolean>(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleVisibilityChange = () => {
      if (typeof navigator !== 'undefined') {
        setIsOnline(navigator.onLine);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('visibilitychange', handleVisibilityChange);

    // Synchronize initial state upon mount
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isOnline;
}

export default useOnlineStatus;
