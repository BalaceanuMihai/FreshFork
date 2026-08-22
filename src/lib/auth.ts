import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Profile, UserRole } from "@/lib/supabase/database.types";

export type Viewer = { user: User; profile: Profile | null };

/**
 * The signed-in user, or null. Cached per request so a page and its nav
 * don't each pay for a round trip.
 *
 * Always `getUser()` rather than `getSession()` on the server: the session
 * cookie is user-controlled, only `getUser()` verifies it with the auth server.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile: profile ?? null };
});

/** The viewer's role, defaulting to `customer` while the profile row settles. */
export async function getViewerRole(): Promise<UserRole | null> {
  const viewer = await getViewer();
  if (!viewer) return null;
  return viewer.profile?.role ?? "customer";
}

/** Redirects to sign-in (preserving the destination) when signed out. */
export async function requireViewer(next?: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) {
    redirect(next ? `/signin?next=${encodeURIComponent(next)}` : "/signin");
  }
  return viewer;
}

/** Redirects signed-out users to sign-in and wrong-role users to /account. */
export async function requireRole(
  roles: UserRole | UserRole[],
  next?: string,
): Promise<Viewer> {
  const allowed = Array.isArray(roles) ? roles : [roles];
  const viewer = await requireViewer(next);
  const role = viewer.profile?.role ?? "customer";

  if (!allowed.includes(role)) {
    redirect("/account?denied=1");
  }

  return viewer;
}

/** First name (or email local part) for greetings and the nav avatar. */
export function displayName(viewer: Viewer): string {
  const full = viewer.profile?.full_name?.trim();
  if (full) {
    const [first, ...rest] = full.split(/\s+/);
    return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
  }
  return viewer.user.email?.split("@")[0] ?? "Guest";
}
