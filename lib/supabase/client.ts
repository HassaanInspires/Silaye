/**
 * lib/supabase/client.ts - Supabase Client Singleton & Environment Guard
 *
 * Provides:
 * 1. Safe singleton Supabase client initialization.
 * 2. Static-export and compile-time SSR guards (never throws on `next build` if env vars are missing).
 * 3. Environment variable resolution for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
 */

import {
  createClient,
  type SupabaseClient,
  type Session,
  type User,
  type AuthChangeEvent,
  type Subscription,
} from '@supabase/supabase-js';

import type { Shop } from '@/types/tailor';

export type { Session, User, AuthChangeEvent, Subscription };

export const SILAYE_CACHED_SESSION_KEY = 'silaye_cached_session';
export const SILAYE_CACHED_SHOP_KEY = 'silaye_cached_shop';

export interface CachedSessionPayload {
  user: User;
  session: Session;
  shop?: Shop | null;
  cachedAt: number;
}

/**
 * Retrieves the locally cached authentication session from localStorage.
 * SSR-safe; returns null if absent, invalid, or during build-time rendering.
 */
export function getCachedSession(): CachedSessionPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SILAYE_CACHED_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.user && parsed.session) {
      return parsed as CachedSessionPayload;
    }
    return null;
  } catch (err) {
    console.warn('Failed to parse silaye_cached_session from localStorage:', err);
    return null;
  }
}

/**
 * Persists the authenticated user, session, and workshop profile into localStorage
 * to shield offline counter operations against network drops.
 */
export function setCachedSession(payload: {
  user: User;
  session: Session;
  shop?: Shop | null;
}): void {
  if (typeof window === 'undefined') return;
  try {
    const cachedPayload: CachedSessionPayload = {
      user: payload.user,
      session: payload.session,
      shop: payload.shop || null,
      cachedAt: Date.now(),
    };
    localStorage.setItem(SILAYE_CACHED_SESSION_KEY, JSON.stringify(cachedPayload));
    if (payload.shop) {
      localStorage.setItem(SILAYE_CACHED_SHOP_KEY, JSON.stringify(payload.shop));
    }
  } catch (err) {
    console.warn('Failed to set silaye_cached_session in localStorage:', err);
  }
}

/**
 * Updates the workshop profile inside the active cached session in localStorage.
 */
export function updateCachedShop(shop: Shop): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getCachedSession();
    if (existing) {
      existing.shop = shop;
      existing.cachedAt = Date.now();
      localStorage.setItem(SILAYE_CACHED_SESSION_KEY, JSON.stringify(existing));
    }
    localStorage.setItem(SILAYE_CACHED_SHOP_KEY, JSON.stringify(shop));
  } catch (err) {
    console.warn('Failed to updateCachedShop in localStorage:', err);
  }
}

/**
 * Completely purges cached session and workshop keys from localStorage on sign-out.
 */
export function clearCachedSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SILAYE_CACHED_SESSION_KEY);
    localStorage.removeItem(SILAYE_CACHED_SHOP_KEY);
  } catch (err) {
    console.warn('Failed to clearCachedSession from localStorage:', err);
  }
}

export function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
}

export function getSupabaseAnonKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
}

export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return Boolean(
    url &&
      url.trim().length > 0 &&
      url.startsWith('http') &&
      key &&
      key.trim().length > 0
  );
}

// Safe placeholder credentials for build-time SSR / static export evaluation
const PLACEHOLDER_URL = 'https://placeholder-silaye.supabase.co';
const PLACEHOLDER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const url = getSupabaseUrl() || PLACEHOLDER_URL;
  const key = getSupabaseAnonKey() || PLACEHOLDER_KEY;

  cachedClient = createClient(url, key, {
    auth: {
      persistSession: typeof window !== 'undefined',
      autoRefreshToken: typeof window !== 'undefined',
      detectSessionInUrl: typeof window !== 'undefined',
    },
  });

  return cachedClient;
}

export const supabase: SupabaseClient = getSupabaseClient();

/**
 * Retrieves the active Supabase session with a strict timeout guard (default 2500ms).
 * Prevents mobile network hangs on flaky counter connections.
 */
export async function getSessionWithTimeout(timeoutMs: number = 2500): Promise<Session | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const client = getSupabaseClient();
    const sessionPromise = client.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.warn('Supabase getSession error:', error.message);
        return null;
      }
      return data.session;
    });

    let timer: NodeJS.Timeout | number | undefined;
    const timeoutPromise = new Promise<Session | null>((resolve) => {
      timer = setTimeout(() => {
        console.warn(`Supabase getSession timed out after ${timeoutMs}ms; engaging offline session shield.`);
        resolve(null);
      }, timeoutMs);
    });

    const result = await Promise.race([sessionPromise, timeoutPromise]);
    if (timer) clearTimeout(timer);
    return result;
  } catch (err) {
    console.warn('Supabase getSessionWithTimeout exception:', err);
    return null;
  }
}

/**
 * Retrieves the currently active Supabase auth session protected by the 2.5s timeout shield.
 * Safe for SSR / static builds; returns null if unconfigured or unauthenticated.
 */
export async function getSession(): Promise<Session | null> {
  return getSessionWithTimeout(2500);
}

/**
 * Refreshes the active Supabase auth session using the current refresh token.
 * Safe for SSR / static builds; returns null session if unconfigured or unauthenticated.
 */
export async function refreshSession(): Promise<{ session: Session | null; error: Error | null }> {
  if (!isSupabaseConfigured()) return { session: null, error: null };
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.auth.refreshSession();
    if (error) {
      return { session: null, error: new Error(error.message) };
    }
    return { session: data.session, error: null };
  } catch (err) {
    return { session: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Retrieves the current authenticated Supabase user.
 */
export async function getCurrentUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.auth.getUser();
    if (error) {
      return null;
    }
    return data.user;
  } catch {
    return null;
  }
}

/**
 * Terminates the active Supabase session and invalidates all local cached auth state.
 */
export async function signOut(): Promise<{ error: Error | null }> {
  clearCachedSession();
  if (!isSupabaseConfigured()) {
    return { error: null };
  }
  try {
    const client = getSupabaseClient();
    const { error } = await client.auth.signOut();
    return { error: error ? new Error(error.message) : null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Subscribes to auth state changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED).
 */
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): { unsubscribe: () => void } {
  if (!isSupabaseConfigured()) {
    return { unsubscribe: () => {} };
  }
  const client = getSupabaseClient();
  const {
    data: { subscription },
  } = client.auth.onAuthStateChange(callback);

  return {
    unsubscribe: () => {
      subscription.unsubscribe();
    },
  };
}
