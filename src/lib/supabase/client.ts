"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";
import { supabaseBrowserConfig } from "./config";

/**
 * Supabase client for client components. `createBrowserClient` memoises the
 * underlying client, so calling this per render is fine.
 */
export function createClient() {
  const { url, key } = supabaseBrowserConfig();
  return createBrowserClient<Database>(url, key);
}
