import "server-only";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Vendor } from "@/lib/supabase/database.types";

/**
 * Ownership checks for vendor-scoped work.
 *
 * Lives outside the `"use server"` modules on purpose. Everything exported
 * from a `"use server"` file becomes a callable action endpoint, so a helper
 * that only ever runs as part of another action does not belong in one.
 */

/** The caller's own vendor row, or a throw. Required before any admin-client write. */
export async function assertOwnVendor(vendorId: string): Promise<Vendor> {
  const viewer = await requireRole("vendor");
  const supabase = await createClient();

  const { data } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", vendorId)
    .maybeSingle();

  if (!data || data.profile_id !== viewer.user.id) {
    throw new Error("That listing is not yours.");
  }
  return data;
}
