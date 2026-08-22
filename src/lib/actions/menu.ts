"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { menuItemSchema } from "@/lib/validation/menu";
import type { Vendor } from "@/lib/supabase/database.types";

export type MenuFormState = { error?: string };

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

/** RLS already blocks cross-vendor writes; this makes the failure legible. */
async function requireOwnVendor(): Promise<Vendor> {
  const viewer = await requireRole("vendor", "/dashboard/vendor/menu");
  const supabase = await createClient();
  const { data } = await supabase
    .from("vendors")
    .select("*")
    .eq("profile_id", viewer.user.id)
    .maybeSingle();

  if (!data) redirect("/dashboard/vendor/onboarding/business");
  return data;
}

function parseMenuForm(formData: FormData) {
  return menuItemSchema.safeParse({
    name: formData.get("name"),
    section: formData.get("section") || "Mains",
    description: formData.get("description"),
    price_cents: formData.get("price"),
    photo_path: formData.get("photo_path"),
    prep_note: formData.get("prep_note"),
    allergens: formData.getAll("allergens").map(String),
    dietary_tags: formData.getAll("dietary_tags").map(String),
    quantity_available: formData.get("quantity_available"),
    is_available: formData.get("is_available") === "on",
  });
}

export async function createMenuItem(
  _prev: MenuFormState,
  formData: FormData,
): Promise<MenuFormState> {
  const vendor = await requireOwnVendor();
  const parsed = parseMenuForm(formData);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("menu_items").insert({
    vendor_id: vendor.id,
    name: parsed.data.name,
    section: parsed.data.section,
    description: parsed.data.description || null,
    price_cents: parsed.data.price_cents,
    photo_path: parsed.data.photo_path || null,
    prep_note: parsed.data.prep_note || null,
    allergens: parsed.data.allergens,
    dietary_tags: parsed.data.dietary_tags,
    quantity_available: parsed.data.quantity_available,
    is_available: parsed.data.is_available,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/vendor/menu");
  revalidatePath(`/vendor/${vendor.handle}`);
  redirect("/dashboard/vendor/menu");
}

export async function updateMenuItem(
  _prev: MenuFormState,
  formData: FormData,
): Promise<MenuFormState> {
  const vendor = await requireOwnVendor();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Unknown dish." };

  const parsed = parseMenuForm(formData);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_items")
    .update({
      name: parsed.data.name,
      section: parsed.data.section,
      description: parsed.data.description || null,
      price_cents: parsed.data.price_cents,
      photo_path: parsed.data.photo_path || null,
      prep_note: parsed.data.prep_note || null,
      allergens: parsed.data.allergens,
      dietary_tags: parsed.data.dietary_tags,
      quantity_available: parsed.data.quantity_available,
      is_available: parsed.data.is_available,
    })
    .eq("id", id)
    .eq("vendor_id", vendor.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/vendor/menu");
  revalidatePath(`/vendor/${vendor.handle}`);
  redirect("/dashboard/vendor/menu");
}

export async function deleteMenuItem(formData: FormData): Promise<void> {
  const vendor = await requireOwnVendor();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("menu_items").delete().eq("id", id).eq("vendor_id", vendor.id);

  revalidatePath("/dashboard/vendor/menu");
  revalidatePath(`/vendor/${vendor.handle}`);
}

export async function toggleMenuItemAvailability(formData: FormData): Promise<void> {
  const vendor = await requireOwnVendor();
  const id = String(formData.get("id") ?? "");
  const next = formData.get("next") === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("menu_items")
    .update({ is_available: next })
    .eq("id", id)
    .eq("vendor_id", vendor.id);

  revalidatePath("/dashboard/vendor/menu");
  revalidatePath(`/vendor/${vendor.handle}`);
}
