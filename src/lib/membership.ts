import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { log } from "@/lib/log";
import type { MyMembership } from "@/lib/supabase/database.types";

/**
 * The signed-in user's plan.
 *
 * The three outcomes are kept distinct on purpose. "No membership row yet"
 * genuinely means free — that is the lazy-row design, and a customer who never
 * opened checkout has no Stripe state at all. "We could not read the table"
 * means something is broken, and quietly rendering it as free would tell a
 * paying member they are on the free plan. Callers get to tell those apart.
 */
export type MembershipRead =
  | { state: "ok"; membership: MyMembership }
  | { state: "signed_out" }
  | { state: "unavailable"; error: string };

const FREE = (profileId: string): MyMembership => ({
  profile_id: profileId,
  plan: "free",
  status: "active",
  current_period_end: null,
  cancel_at_period_end: false,
  grace_ends_at: null,
});

export const readMyMembership = cache(async (): Promise<MembershipRead> => {
  const viewer = await getViewer();
  if (!viewer) return { state: "signed_out" };

  const supabase = await createClient();
  const { data, error } = await supabase.from("my_membership").select("*").maybeSingle();

  if (error) {
    log.error("Could not read membership.", { error: error.message });
    return { state: "unavailable", error: error.message };
  }

  // The view coalesces a missing row to free, but a brand-new profile can
  // still race it; fall back rather than reporting a failure that isn't one.
  return { state: "ok", membership: data ?? FREE(viewer.user.id) };
});

/**
 * Plan for display. Returns null when we genuinely do not know, so the UI can
 * say so instead of asserting "Free".
 */
export async function getMyMembership(): Promise<MyMembership | null> {
  const read = await readMyMembership();
  return read.state === "ok" ? read.membership : null;
}

/**
 * Whether to show Plus benefits.
 *
 * Display only. The service-fee waiver that actually costs money is applied by
 * `create_order()` in SQL, which reads the memberships table directly — so a
 * wrong answer here never mischarges anybody, it only mis-renders a badge.
 */
export async function isPlusMember(): Promise<boolean> {
  const read = await readMyMembership();
  return read.state === "ok" && read.membership.plan === "plus";
}
