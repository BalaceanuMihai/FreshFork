import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import type { MyMembership } from "@/lib/supabase/database.types";

/**
 * The signed-in user's plan, defaulting to free when no Stripe checkout has
 * ever happened. Reads `my_membership`, a view that coalesces a missing row
 * to free rather than requiring one to exist per profile.
 */
export const getMyMembership = cache(async (): Promise<MyMembership | null> => {
  const viewer = await getViewer();
  if (!viewer) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("my_membership")
    .select("*")
    .maybeSingle();

  return data ?? { profile_id: viewer.user.id, plan: "free", status: "active", current_period_end: null, cancel_at_period_end: false };
});

export async function isPlusMember(): Promise<boolean> {
  const membership = await getMyMembership();
  return membership?.plan === "plus" && membership.status !== "canceled";
}
