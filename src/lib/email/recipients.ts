import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { supabaseBrowserConfig } from "@/lib/supabase/config";
import { serverEnv } from "@/lib/env";
import { log } from "@/lib/log";

/**
 * Looking up the address to email.
 *
 * `profiles` deliberately does not store email — auth.users owns it, and
 * duplicating it would mean two copies to keep in step and two to scrub on
 * account closure. Reading it needs the Admin API, hence the service-role
 * client here rather than the request-scoped one.
 *
 * A missing address is never fatal: the caller sends what it can and carries
 * on. Failing to deliver a receipt must not fail the order it describes.
 */

let cached: ReturnType<typeof createSupabaseClient> | null = null;

function adminAuthClient() {
  if (!cached) {
    const { url } = supabaseBrowserConfig();
    cached = createSupabaseClient(url, serverEnv.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return cached;
}

export async function emailForProfile(
  profileId: string | null | undefined,
): Promise<string | null> {
  if (!profileId) return null;

  try {
    const { data, error } = await adminAuthClient().auth.admin.getUserById(profileId);
    if (error) {
      log.warn("Could not resolve an email address.", { error: error.message });
      return null;
    }
    return data.user?.email ?? null;
  } catch (error) {
    log.warn("Email lookup threw.", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/** Both sides of an order in one round trip. */
export async function emailsForOrder(
  customerId: string,
  vendorProfileId: string | null,
): Promise<{ customer: string | null; vendor: string | null }> {
  const [customer, vendor] = await Promise.all([
    emailForProfile(customerId),
    emailForProfile(vendorProfileId),
  ]);
  return { customer, vendor };
}
