"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { adminDecisionSchema } from "@/lib/validation/vendor";
import { emailForProfile } from "@/lib/email/recipients";
import { sendEmailInBackground } from "@/lib/email/send";
import { vendorDecisionEmail } from "@/lib/email/templates";
import { publicEnv } from "@/lib/env";
import type { VendorStatus } from "@/lib/supabase/database.types";

export type AdminFormState = { error?: string; ok?: string };

/**
 * Apply an admin decision to a vendor listing.
 *
 * The page is already role-gated, but the check is repeated here: a server
 * action is its own entry point and must never rely on the page that rendered
 * the form. Writes go through the service-role client because `status` and the
 * review columns are trigger-protected against authenticated writers.
 */
async function decide(
  formData: FormData,
  status: VendorStatus,
  requireNote: boolean,
): Promise<AdminFormState> {
  const viewer = await requireRole("admin", "/dashboard/admin/vendors");

  const parsed = adminDecisionSchema.safeParse({
    vendor_id: formData.get("vendor_id"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Could not apply that decision." };
  }
  if (requireNote && !parsed.data.note) {
    return { error: "Tell the cook what needs to change." };
  }

  const admin = createAdminClient();
  const { data: vendor, error } = await admin
    .from("vendors")
    .update({
      status,
      status_note: parsed.data.note || null,
      reviewed_by: viewer.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.vendor_id)
    .select("id, business_name, profile_id")
    .maybeSingle();

  if (error) return { error: error.message };

  // `reviewed_by` / `reviewed_at` only ever hold the *latest* decision, which
  // is no use when somebody asks why a kitchen was suspended in March.
  await admin.from("admin_actions").insert({
    actor_id: viewer.user.id,
    action: `vendor.${status}`,
    subject_type: "vendor",
    subject_id: parsed.data.vendor_id,
    note: parsed.data.note || null,
  });

  // A cook whose listing was sent back for changes previously had no way of
  // finding out except by logging in and noticing.
  if (vendor && status !== "pending_review" && status !== "draft") {
    const to = await emailForProfile(vendor.profile_id);
    sendEmailInBackground(
      to,
      vendorDecisionEmail({
        vendorName: vendor.business_name,
        decision: status as "approved" | "changes_requested" | "suspended",
        note: parsed.data.note || null,
        dashboardUrl: `${publicEnv.appUrl}/dashboard/vendor`,
      }),
      { vendorId: vendor.id },
    );
  }

  revalidatePath("/dashboard/admin/vendors", "layout");
  revalidatePath("/browse");
  revalidatePath("/");

  return { ok: `Listing marked ${status.replace("_", " ")}.` };
}

export async function approveVendor(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  // is_live is derived by trigger: approving only opens the admin gate. If the
  // vendor hasn't finished Stripe yet, they stay invisible until the webhook
  // completes the other gate.
  return decide(formData, "approved", false);
}

export async function requestVendorChanges(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  return decide(formData, "changes_requested", true);
}

export async function suspendVendor(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  return decide(formData, "suspended", true);
}
