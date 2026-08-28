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

export type { Session, User, AuthChangeEvent, Subscription };

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
 * Retrieves the currently active Supabase auth session.
 * Safe for SSR / static builds; returns null if unconfigured or unauthenticated.
 */
export async function getSession(): Promise<Session | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.auth.getSession();
    if (error) {
      console.warn('Supabase getSession warning:', error.message);
      return null;
    }
    return data.session;
  } catch (err) {
    console.warn('Supabase getSession exception:', err);
    return null;
  }
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
 * Terminates the active Supabase session.
 */
export async function signOut(): Promise<{ error: Error | null }> {
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
