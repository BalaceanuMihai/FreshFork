"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireRole, requireViewer } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getPlatformSettings } from "@/lib/settings";
import { captureException, log } from "@/lib/log";
import { platformSettingsSchema } from "@/lib/validation/community";

export type AccountFormState = { error?: string; ok?: string };

/**
 * Closing an account.
 *
 * Not a DELETE. `orders.customer_id` is ON DELETE RESTRICT on purpose — a
 * completed sale is an accounting record and, for a food marketplace, an
 * allergen record. Both have to outlive the buyer's decision to leave.
 *
 * So closure is a two-step scrub: `delete_my_account()` clears every
 * identifying field in our own tables (and takes any vendor listing off the
 * marketplace, queueing its certification document for deletion from storage),
 * then the auth user is soft-deleted so the address can never sign in again.
 */
export async function deleteMyAccount(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const viewer = await requireViewer("/account");

  // Typing the word is the confirmation. An account closure that can happen by
  // misclick is a support ticket waiting to be raised.
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") {
    return { error: 'Type DELETE to confirm.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_my_account");

  if (error) {
    // The RPC refuses while anything is in flight, and says which side.
    const message = error.message?.replace(/^(.*?)(?:error|exception):\s*/i, "").trim();
    return { error: message || "We couldn't close your account." };
  }

  // Soft delete rather than hard: a hard delete would cascade to `profiles`,
  // which the orders foreign key correctly refuses.
  try {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(viewer.user.id, true);
  } catch (authError) {
    // The data is already scrubbed; the sign-in block is the lesser half.
    captureException(authError, { where: "deleteMyAccount.authDelete" });
    log.error("Account data was scrubbed but the auth user survived.", {
      userId: viewer.user.id,
    });
  }

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/?closed=1");
}

/**
 * Marketplace configuration.
 *
 * Fees live in the database because `create_order()` applies them server-side.
 * This is the only way to change them, and every change is logged — a silent
 * fee rise is the kind of thing a marketplace gets sued over.
 */
export async function updatePlatformSettings(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const viewer = await requireRole("admin", "/dashboard/admin");

  const parsed = platformSettingsSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the values and try again." };
  }
  if (parsed.data.service_fee_max_cents < parsed.data.service_fee_min_cents) {
    return { error: "The service fee cap cannot be below its floor." };
  }

  const before = await getPlatformSettings();

  const supabase = await createClient();
  const { error } = await supabase
    .from("platform_settings")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", true);

  if (error) return { error: error.message };

  const admin = createAdminClient();
  await admin.from("admin_actions").insert({
    actor_id: viewer.user.id,
    action: "settings.updated",
    subject_type: "platform_settings",
    subject_id: null,
    metadata: { before, after: parsed.data },
  });

  revalidatePath("/dashboard/admin/settings");
  return { ok: "Settings saved." };
}
