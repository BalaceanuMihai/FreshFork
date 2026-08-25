import { z } from "zod";

import { REPORT_REASONS } from "@/lib/supabase/database.types";

/** Reviews and reports — the Phase 5 surfaces. */

export const submitReviewSchema = z.object({
  order_id: z.uuid("Unknown order."),
  rating: z.coerce
    .number()
    .int()
    .min(1, "Pick a rating from 1 to 5.")
    .max(5, "Pick a rating from 1 to 5."),
  body: z
    .string()
    .trim()
    .max(2000, "Keep your review under 2000 characters.")
    .optional()
    .or(z.literal("")),
});

export const editReviewSchema = z.object({
  review_id: z.uuid("Unknown review."),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const replyToReviewSchema = z.object({
  review_id: z.uuid("Unknown review."),
  reply: z
    .string()
    .trim()
    .min(2, "Write a reply first.")
    .max(1000, "Keep your reply under 1000 characters."),
});

export const moderateReviewSchema = z.object({
  review_id: z.uuid("Unknown review."),
  hidden: z.coerce.boolean(),
  reason: z.string().trim().max(300).optional().or(z.literal("")),
});

export const REPORT_SUBJECTS = ["vendor", "menu_item", "review", "order"] as const;

export const submitReportSchema = z.object({
  subject_type: z.enum(REPORT_SUBJECTS, { message: "Unknown thing to report." }),
  subject_id: z.uuid("Unknown thing to report."),
  reason: z.enum(REPORT_REASONS, { message: "Pick a reason." }),
  detail: z
    .string()
    .trim()
    .max(2000, "Keep the detail under 2000 characters.")
    .optional()
    .or(z.literal("")),
});

export const resolveReportSchema = z.object({
  report_id: z.uuid("Unknown report."),
  status: z.enum(["open", "reviewing", "resolved", "dismissed"], {
    message: "Unknown status.",
  }),
  resolution_note: z.string().trim().max(1000).optional().or(z.literal("")),
});

/** Admin-editable marketplace configuration. */
export const platformSettingsSchema = z.object({
  platform_fee_bps: z.coerce.number().int().min(0).max(10_000),
  service_fee_bps: z.coerce.number().int().min(0).max(10_000),
  service_fee_min_cents: z.coerce.number().int().min(0).max(10_000),
  service_fee_max_cents: z.coerce.number().int().min(0).max(10_000),
  order_lead_minutes: z.coerce.number().int().min(0).max(10_080),
  max_pickup_days_ahead: z.coerce.number().int().min(1).max(90),
  pending_payment_ttl_minutes: z.coerce.number().int().min(5).max(1440),
  customer_cancel_cutoff_minutes: z.coerce.number().int().min(0).max(10_080),
  max_open_checkouts: z.coerce.number().int().min(1).max(50),
});
