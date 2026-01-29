import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy initialization to avoid errors during build time
let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL environment variable. " +
        "Please check your .env.local file."
    );
  }
  return url;
}

function getSupabasePublishableKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY environment variable. " +
        "Please check your .env.local file."
    );
  }
  return key;
}

function getSupabaseSecretKey(): string {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY environment variable. " +
        "Please check your .env.local file."
    );
  }
  return key;
}

// Browser client for client-side operations (read-only)
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(getSupabaseUrl(), getSupabasePublishableKey());
  }
  return _supabase;
}

// Server client for API routes (with secret key for inserts)
export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return _supabaseAdmin;
}

// Keep the old exports for backwards compatibility (lazy initialized)
export const supabase = {
  get client() {
    return getSupabase();
  },
  from: (table: string) => getSupabase().from(table),
  rpc: (fn: string, params?: Record<string, unknown>) =>
    getSupabase().rpc(fn, params),
};

export const supabaseAdmin = {
  get client() {
    return getSupabaseAdmin();
  },
  from: (table: string) => getSupabaseAdmin().from(table),
  rpc: (fn: string, params?: Record<string, unknown>) =>
    getSupabaseAdmin().rpc(fn, params),
};
