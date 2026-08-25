"use server";

import { revalidatePath } from "next/cache";

import { requireRole, requireViewer } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { consume } from "@/lib/rate-limit";
import {
  editReviewSchema,
  moderateReviewSchema,
  replyToReviewSchema,
  resolveReportSchema,
  submitReportSchema,
  submitReviewSchema,
} from "@/lib/validation/community";

export type CommunityFormState = { error?: string; ok?: string };

/**
 * Reviews and reports.
 *
 * As with orders, the rules live in SQL: `submit_review()` is what enforces
 * "you bought this, it was handed over, and you haven't reviewed it already".
 * These wrappers validate the shape, spend a rate-limit budget, and translate
 * the database's exception into a sentence.
 */

function rpcMessage(error: { message: string }, fallback: string): string {
  const cleaned = error.message?.replace(/^(.*?)(?:error|exception):\s*/i, "").trim();
  return cleaned && cleaned.length < 300 ? cleaned : fallback;
}

export async function submitReview(
  _prev: CommunityFormState,
  formData: FormData,
): Promise<CommunityFormState> {
  const viewer = await requireViewer("/orders");

  const limit = await consume("review", viewer.user.id);
  if (!limit.allowed) return { error: "That's a lot of reviews. Try again later." };

  const parsed = submitReviewSchema.safeParse({
    order_id: formData.get("order_id"),
    rating: formData.get("rating"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_review", {
    p_order_id: parsed.data.order_id,
    p_rating: parsed.data.rating,
    p_body: parsed.data.body || null,
  });

  if (error || !data) {
    return {
      error: error ? rpcMessage(error, "We couldn't post that review.") : "We couldn't post that review.",
    };
  }

  revalidatePath(`/orders/${parsed.data.order_id}`);
  revalidatePath("/browse");
  return { ok: "Thanks — your review is live." };
}

export async function editReview(
  _prev: CommunityFormState,
  formData: FormData,
): Promise<CommunityFormState> {
  await requireViewer("/orders");

  const parsed = editReviewSchema.safeParse({
    review_id: formData.get("review_id"),
    rating: formData.get("rating"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("edit_review", {
    p_review_id: parsed.data.review_id,
    p_rating: parsed.data.rating,
    p_body: parsed.data.body || null,
  });

  if (error) return { error: rpcMessage(error, "We couldn't update that review.") };

  revalidatePath("/orders");
  return { ok: "Review updated." };
}

export async function replyToReview(
  _prev: CommunityFormState,
  formData: FormData,
): Promise<CommunityFormState> {
  await requireRole("vendor", "/dashboard/vendor");

  const parsed = replyToReviewSchema.safeParse({
    review_id: formData.get("review_id"),
    reply: formData.get("reply"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Write a reply first." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("reply_to_review", {
    p_review_id: parsed.data.review_id,
    p_reply: parsed.data.reply,
  });

  if (error) return { error: rpcMessage(error, "We couldn't post that reply.") };

  revalidatePath("/dashboard/vendor/reviews");
  return { ok: "Reply posted." };
}

export async function moderateReview(
  _prev: CommunityFormState,
  formData: FormData,
): Promise<CommunityFormState> {
  await requireRole("admin", "/dashboard/admin");

  const parsed = moderateReviewSchema.safeParse({
    review_id: formData.get("review_id"),
    hidden: formData.get("hidden") === "true",
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: "Unknown review." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("moderate_review", {
    p_review_id: parsed.data.review_id,
    p_hidden: parsed.data.hidden,
    p_reason: parsed.data.reason || null,
  });

  if (error) return { error: rpcMessage(error, "We couldn't moderate that review.") };

  revalidatePath("/dashboard/admin/reviews");
  return { ok: parsed.data.hidden ? "Review hidden." : "Review restored." };
}

/**
 * File a safety or abuse report.
 *
 * Kept deliberately easy to reach — "the allergen list is wrong" needs a route
 * that does not depend on the vendor choosing to pass it on — and therefore
 * rate limited, because anything easy to file is easy to flood.
 */
export async function submitReport(
  _prev: CommunityFormState,
  formData: FormData,
): Promise<CommunityFormState> {
  const viewer = await requireViewer();

  const limit = await consume("report", viewer.user.id);
  if (!limit.allowed) {
    return { error: "You've filed several reports already. Our team is on it." };
  }

  const parsed = submitReportSchema.safeParse({
    subject_type: formData.get("subject_type"),
    subject_id: formData.get("subject_id"),
    reason: formData.get("reason"),
    detail: formData.get("detail"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({
    reporter_id: viewer.user.id,
    subject_type: parsed.data.subject_type,
    subject_id: parsed.data.subject_id,
    reason: parsed.data.reason,
    detail: parsed.data.detail || null,
  });

  if (error) return { error: "We couldn't file that report. Please try again." };

  return { ok: "Thanks — we've logged this and someone will look at it." };
}

export async function resolveReport(
  _prev: CommunityFormState,
  formData: FormData,
): Promise<CommunityFormState> {
  const viewer = await requireRole("admin", "/dashboard/admin/reports");

  const parsed = resolveReportSchema.safeParse({
    report_id: formData.get("report_id"),
    status: formData.get("status"),
    resolution_note: formData.get("resolution_note"),
  });
  if (!parsed.success) return { error: "Unknown report." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("reports")
    .update({
      status: parsed.data.status,
      resolution_note: parsed.data.resolution_note || null,
    })
    .eq("id", parsed.data.report_id);

  if (error) return { error: error.message };

  const admin = createAdminClient();
  await admin.from("admin_actions").insert({
    actor_id: viewer.user.id,
    action: `report.${parsed.data.status}`,
    subject_type: "report",
    subject_id: parsed.data.report_id,
    note: parsed.data.resolution_note || null,
  });

  revalidatePath("/dashboard/admin/reports");
  return { ok: "Report updated." };
}
