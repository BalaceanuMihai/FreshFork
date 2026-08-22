import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "./database.types";
import { supabaseBrowserConfig } from "./config";
import { serverEnv } from "@/lib/env";

/**
 * Supabase client bound to the request's cookies. Use in server components,
 * server actions, and route handlers.
 *
 * Writing cookies from a server component throws in Next.js; that case is
 * swallowed because `src/proxy.ts` already refreshes the session on every
 * request, so the refreshed cookie is written there instead.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = supabaseBrowserConfig();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a server component — the proxy refreshes instead.
        }
      },
    },
  });
}

/**
 * Service-role client. Bypasses RLS entirely — never import this into
 * anything that runs in the browser, and never hand it a user-supplied id
 * without checking authorisation first.
 */
export function createAdminClient() {
  const { url } = supabaseBrowserConfig();

  return createServerClient<Database>(url, serverEnv.supabaseServiceRoleKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}
