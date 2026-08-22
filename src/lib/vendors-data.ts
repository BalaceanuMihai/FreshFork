import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import type { MenuItem, PickupWindow, Vendor } from "@/lib/supabase/database.types";

export type VendorWithMenu = Vendor & {
  menu_items: MenuItem[];
  pickup_windows: PickupWindow[];
};

/**
 * The signed-in vendor's own business record, or null if they haven't started
 * onboarding. Request-cached so a page and its shell share one lookup.
 */
export const getOwnVendor = cache(async (): Promise<Vendor | null> => {
  const viewer = await getViewer();
  if (!viewer) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("vendors")
    .select("*")
    .eq("profile_id", viewer.user.id)
    .maybeSingle();

  return data ?? null;
});

/** Public vendor page. RLS restricts this to live vendors for everyone else. */
export const getVendorByHandle = cache(
  async (handle: string): Promise<VendorWithMenu | null> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("vendors")
      .select("*, menu_items(*), pickup_windows(*)")
      .eq("handle", handle)
      .maybeSingle();

    if (!data) return null;

    const vendor = data as VendorWithMenu;
    vendor.menu_items = (vendor.menu_items ?? []).sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
    );
    vendor.pickup_windows = (vendor.pickup_windows ?? [])
      .filter((w) => w.is_active)
      .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time));

    return vendor;
  },
);

export async function getVendorById(id: string): Promise<Vendor | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("vendors").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

export async function getMenuItems(vendorId: string): Promise<MenuItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("menu_items")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("section")
    .order("sort_order");
  return data ?? [];
}

export async function getMenuItem(id: string): Promise<MenuItem | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("menu_items").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

export async function getPickupWindows(vendorId: string): Promise<PickupWindow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pickup_windows")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("day_of_week")
    .order("start_time");
  return data ?? [];
}

/** Vendors awaiting an admin decision, newest submission first. */
export async function getReviewQueue(): Promise<Vendor[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vendors")
    .select("*")
    .in("status", ["pending_review", "changes_requested"])
    .order("updated_at", { ascending: false });
  return data ?? [];
}

export async function getAllVendorsForAdmin(): Promise<Vendor[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vendors")
    .select("*")
    .order("updated_at", { ascending: false });
  return data ?? [];
}

/** Public URL for a dish photo or vendor image in the public bucket. */
export async function publicPhotoUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const supabase = await createClient();
  return supabase.storage.from("dish-photos").getPublicUrl(path).data.publicUrl;
}

/** Short-lived link to a private certification document, for admin review. */
export async function signedCertUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("vendor-docs").createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}
