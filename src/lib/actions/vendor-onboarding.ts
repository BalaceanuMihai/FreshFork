"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { assertOwnVendor } from "@/lib/vendor-access";
import { consume } from "@/lib/rate-limit";
import { captureException } from "@/lib/log";
import { timezoneForCoordinates } from "@/lib/geo/timezone";
import { features, publicEnv } from "@/lib/env";
import {
  addressSchema,
  businessInfoSchema,
  certSchema,
  slugify,
} from "@/lib/validation/vendor";
import { pickupWindowSchema } from "@/lib/validation/menu";
import type { Vendor } from "@/lib/supabase/database.types";

export type VendorFormState = { error?: string };

const STEPS = ["business", "address", "cert", "windows", "payouts", "review"] as const;

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

/**
 * The caller's vendor row, creating it on first use.
 *
 * The row *is* the onboarding draft — there is no separate draft table, so
 * every step is a plain upsert and a reload resumes where the vendor left off.
 */
async function loadOrCreateVendor(businessName?: string): Promise<Vendor> {
  const viewer = await requireRole("vendor", "/dashboard/vendor/onboarding/business");
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("vendors")
    .select("*")
    .eq("profile_id", viewer.user.id)
    .maybeSingle();

  if (existing) return existing;

  const name = businessName?.trim() || `${viewer.profile?.full_name ?? "New"}'s kitchen`;
  const { data: created, error } = await supabase
    .from("vendors")
    .insert({
      profile_id: viewer.user.id,
      business_name: name,
      handle: await uniqueHandle(name),
    })
    .select("*")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Could not start your vendor listing.");
  }
  return created;
}

/** Slugify, then suffix until free. Handles are user-visible, so keep them readable. */
async function uniqueHandle(businessName: string): Promise<string> {
  const supabase = await createClient();
  const base = slugify(businessName) || "kitchen";

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const { data } = await supabase
      .from("vendors")
      .select("id")
      .eq("handle", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }

  return `${base}-${Date.now().toString(36)}`;
}

function nextStepAfter(step: (typeof STEPS)[number]): string {
  const index = STEPS.indexOf(step);
  return STEPS[Math.min(index + 1, STEPS.length - 1)];
}

export async function saveBusinessInfo(
  _prev: VendorFormState,
  formData: FormData,
): Promise<VendorFormState> {
  const parsed = businessInfoSchema.safeParse({
    business_name: formData.get("business_name"),
    cuisine: formData.get("cuisine"),
    kitchen_type: formData.get("kitchen_type"),
    story: formData.get("story"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const vendor = await loadOrCreateVendor(parsed.data.business_name);
  const supabase = await createClient();

  const { error } = await supabase
    .from("vendors")
    .update({
      business_name: parsed.data.business_name,
      cuisine: parsed.data.cuisine,
      kitchen_type: parsed.data.kitchen_type || null,
      story: parsed.data.story || null,
      onboarding_step: nextStepAfter("business"),
    })
    .eq("id", vendor.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/vendor", "layout");
  redirect("/dashboard/vendor/onboarding/address");
}

export async function saveAddress(
  _prev: VendorFormState,
  formData: FormData,
): Promise<VendorFormState> {
  const parsed = addressSchema.safeParse({
    pickup_address_line: formData.get("pickup_address_line"),
    pickup_city: formData.get("pickup_city"),
    pickup_state: formData.get("pickup_state"),
    pickup_postal_code: formData.get("pickup_postal_code"),
    lat: formData.get("lat"),
    lng: formData.get("lng"),
  });
  if (!parsed.success) {
    return { error: "Pick your address from the suggestions so we can map it." };
  }

  const vendor = await loadOrCreateVendor();
  const supabase = await createClient();

  // Derived here, from the coordinate we already have, rather than asked for.
  // Pickup windows are wall-clock times in the kitchen's own city, so the zone
  // has to travel with the address — and a cook should not have to know what
  // "Europe/Bucharest" means to sell a curry.
  const timezone = timezoneForCoordinates(parsed.data.lat, parsed.data.lng);

  // PostGIS geography has no PostgREST literal form, so the point goes in as
  // WKT — Postgres casts it on the way into the geography column.
  const { error } = await supabase
    .from("vendors")
    .update({
      pickup_address_line: parsed.data.pickup_address_line,
      pickup_city: parsed.data.pickup_city || null,
      pickup_state: parsed.data.pickup_state || null,
      pickup_postal_code: parsed.data.pickup_postal_code || null,
      location: `SRID=4326;POINT(${parsed.data.lng} ${parsed.data.lat})`,
      timezone,
      onboarding_step: nextStepAfter("address"),
    })
    .eq("id", vendor.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/vendor", "layout");
  redirect("/dashboard/vendor/onboarding/cert");
}

export async function saveCertification(
  _prev: VendorFormState,
  formData: FormData,
): Promise<VendorFormState> {
  const parsed = certSchema.safeParse({
    certification_label: formData.get("certification_label"),
    cert_doc_path: formData.get("cert_doc_path"),
    cert_expires_on: formData.get("cert_expires_on"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const vendor = await loadOrCreateVendor();
  const supabase = await createClient();

  const { error } = await supabase
    .from("vendors")
    .update({
      certification_label: parsed.data.certification_label,
      cert_doc_path: parsed.data.cert_doc_path,
      cert_expires_on: parsed.data.cert_expires_on || null,
      onboarding_step: nextStepAfter("cert"),
    })
    .eq("id", vendor.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/vendor", "layout");
  redirect("/dashboard/vendor/onboarding/windows");
}

export async function addPickupWindow(
  _prev: VendorFormState,
  formData: FormData,
): Promise<VendorFormState> {
  const parsed = pickupWindowSchema.safeParse({
    day_of_week: formData.get("day_of_week"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  if (parsed.data.end_time <= parsed.data.start_time) {
    return { error: "The window has to end after it starts." };
  }

  const vendor = await loadOrCreateVendor();
  const supabase = await createClient();

  const { error } = await supabase.from("pickup_windows").insert({
    vendor_id: vendor.id,
    day_of_week: parsed.data.day_of_week,
    start_time: parsed.data.start_time,
    end_time: parsed.data.end_time,
  });

  if (error) {
    return {
      error: error.code === "23505" ? "That window already exists." : error.message,
    };
  }

  revalidatePath("/dashboard/vendor/onboarding/windows");
  return {};
}

export async function removePickupWindow(
  _prev: VendorFormState,
  formData: FormData,
): Promise<VendorFormState> {
  const id = String(formData.get("window_id") ?? "");
  if (!id) return { error: "Unknown window." };

  const vendor = await loadOrCreateVendor();
  const supabase = await createClient();

  const { error } = await supabase
    .from("pickup_windows")
    .delete()
    .eq("id", id)
    .eq("vendor_id", vendor.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/vendor/onboarding/windows");
  return {};
}

export async function finishWindowsStep(): Promise<void> {
  const vendor = await loadOrCreateVendor();
  const supabase = await createClient();
  await supabase
    .from("vendors")
    .update({ onboarding_step: nextStepAfter("windows") })
    .eq("id", vendor.id);
  redirect("/dashboard/vendor/onboarding/payouts");
}

/**
 * Create (or re-link) the vendor's Stripe Connect Express account and send them
 * to Stripe's hosted onboarding.
 *
 * Express onboarding only — this unlocks payouts for a later phase; nothing
 * here charges a customer. Account status is never trusted from the return
 * redirect: the `account.updated` webhook is the only writer of `stripe_*`.
 */
export async function startStripeOnboarding(
  _prev: VendorFormState,
  formData: FormData,
): Promise<VendorFormState> {
  if (!features.stripeConnect) {
    return { error: "Payouts setup is unavailable — Stripe is not configured yet." };
  }

  const vendorId = String(formData.get("vendor_id") ?? "");
  const vendor = await assertOwnVendor(vendorId);

  const limit = await consume("stripeOnboarding", vendor.id);
  if (!limit.allowed) {
    return { error: "Too many attempts. Give it a minute and try again." };
  }

  const stripe = getStripe();
  let accountId = vendor.stripe_account_id;

  try {
    if (!accountId) {
      const account = await stripe.accounts.create(
        {
          type: "express",
          capabilities: { transfers: { requested: true } },
          business_type: "individual",
          metadata: { vendor_id: vendor.id, profile_id: vendor.profile_id },
        },
        // Without this, a double-submit or a retried action mints a second
        // Express account and orphans the first one on our Stripe dashboard.
        { idempotencyKey: `vendor-account-${vendor.id}` },
      );
      accountId = account.id;

      // stripe_* columns are service-role-only by trigger, so this one write
      // goes through the admin client — after the ownership check above.
      const admin = createAdminClient();
      const { error } = await admin
        .from("vendors")
        .update({ stripe_account_id: accountId, stripe_connect_status: "onboarding" })
        .eq("id", vendor.id);
      if (error) return { error: error.message };
    }

    const base = `${publicEnv.appUrl}/dashboard/vendor/onboarding/payouts`;
    const link = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: `${base}?refresh=1`,
      return_url: `${base}?return=1`,
    });

    redirect(link.url);
  } catch (error) {
    // redirect() throws a control-flow signal — let it through.
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    // A cook stuck here cannot get paid, so this is worth an alert rather
    // than only an inline message they might not report.
    captureException(error, { where: "startStripeOnboarding", vendorId: vendor.id });

    return {
      error: error instanceof Error ? error.message : "Could not reach Stripe.",
    };
  }

  return {};
}


export async function submitForReview(
  _prev: VendorFormState,
  formData: FormData,
): Promise<VendorFormState> {
  const vendorId = String(formData.get("vendor_id") ?? "");
  await assertOwnVendor(vendorId);

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_vendor_for_review", {
    p_vendor_id: vendorId,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/vendor", "layout");
  redirect("/dashboard/vendor/onboarding/review?submitted=1");
}
