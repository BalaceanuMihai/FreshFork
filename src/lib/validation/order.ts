import { z } from "zod";

import { CART_LIMITS } from "@/lib/cart-limits";
import { parseMoneyToCents } from "@/lib/money";

/**
 * Form shapes for the ordering flow.
 *
 * These reject obvious nonsense early so the user gets a sentence instead of a
 * Postgres error. They are not the security boundary — `create_order()` and
 * the lifecycle RPCs re-check ownership, availability, timing and price in SQL,
 * because a server action is not the only way to reach PostgREST.
 */

const quantity = z.coerce
  .number()
  .int("Whole portions only.")
  .min(1, "Choose at least one.")
  .max(CART_LIMITS.maxQuantity, `Up to ${CART_LIMITS.maxQuantity} of each dish.`);

export const addToCartSchema = z.object({
  vendor_id: z.uuid("Unknown kitchen."),
  menu_item_id: z.uuid("Unknown dish."),
  quantity: quantity.default(1),
});

export const updateCartLineSchema = z.object({
  menu_item_id: z.uuid("Unknown dish."),
  // Zero is how the UI removes a line, so it is allowed here but not above.
  quantity: z.coerce.number().int().min(0).max(CART_LIMITS.maxQuantity),
});

export const checkoutSchema = z.object({
  pickup_window_id: z.uuid("Choose a pickup time."),
  pickup_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a pickup date.")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Choose a pickup date."),
  note: z.string().trim().max(500, "Keep your note under 500 characters.").optional().or(z.literal("")),
});

export const orderIdSchema = z.object({
  order_id: z.uuid("Unknown order."),
});

export const cancelOrderSchema = z.object({
  order_id: z.uuid("Unknown order."),
  reason: z.string().trim().max(300).optional().or(z.literal("")),
});

/** Only the transitions a vendor is allowed to drive from their dashboard. */
export const VENDOR_TRANSITIONS = ["accepted", "ready", "completed", "rejected"] as const;

export const vendorTransitionSchema = z.object({
  order_id: z.uuid("Unknown order."),
  next: z.enum(VENDOR_TRANSITIONS, { message: "Unknown action." }),
  note: z.string().trim().max(300).optional().or(z.literal("")),
});

export const refundOrderSchema = z.object({
  order_id: z.uuid("Unknown order."),
  // Blank means "refund whatever is left".
  amount: z
    .string()
    .trim()
    .optional()
    .transform((raw, ctx) => {
      if (!raw) return null;
      // Strict parsing matters more here than anywhere: a sloppy strip turned
      // "-5" into a $5 refund nobody authorised.
      const cents = parseMoneyToCents(raw);
      if (cents === null || cents <= 0) {
        ctx.addIssue({ code: "custom", message: "Enter an amount like 12.50." });
        return z.NEVER;
      }
      return cents;
    }),
  reason: z.string().trim().max(300).optional().or(z.literal("")),
});
