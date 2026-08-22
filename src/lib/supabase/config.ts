import { publicEnv } from "@/lib/env";

/**
 * Browser-safe Supabase connection details.
 *
 * Prefers the modern publishable key (`sb_publishable_...`) and falls back to
 * the legacy anon JWT so existing `.env.local` files keep working.
 */
export function supabaseBrowserConfig(): { url: string; key: string } {
  const url = publicEnv.supabaseUrl;
  const key = publicEnv.supabasePublishableKey ?? publicEnv.supabaseAnonKey;

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local (see .env.example).",
    );
  }

  return { url, key };
}

/** True when the app has enough config to talk to Supabase at all. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    publicEnv.supabaseUrl &&
      (publicEnv.supabasePublishableKey ?? publicEnv.supabaseAnonKey),
  );
}
