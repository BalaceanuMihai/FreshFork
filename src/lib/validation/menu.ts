import { z } from "zod";

import { ALLERGEN_VALUES, DIETARY_VALUES } from "@/lib/constants/taxonomy";
import { parseMoneyToCents } from "@/lib/money";

/** "$16", "16", "16.50" -> 1600 / 1650 */
const priceToCents = z
  .string()
  .trim()
  .min(1, "Enter a price.")
  .transform((raw, ctx) => {
    // Strict: stripping non-digits used to turn "-5" into $5 and "1.2.3" into
    // $1.20, quietly listing a dish at a price the cook never typed.
    const cents = parseMoneyToCents(raw);
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: "Enter a price like 16 or 16.50." });
      return z.NEVER;
    }
    if (cents === 0) {
      ctx.addIssue({ code: "custom", message: "Enter a price like 16 or 16.50." });
      return z.NEVER;
    }
    if (cents > 100_000) {
      ctx.addIssue({ code: "custom", message: "That price looks too high." });
      return z.NEVER;
    }
    return cents;
  });

export const menuItemSchema = z.object({
  name: z.string().trim().min(2, "Give the dish a name.").max(80),
  section: z.string().trim().min(1).max(40).default("Mains"),
  description: z.string().trim().max(600).optional().or(z.literal("")),
  price_cents: priceToCents,
  photo_path: z.string().trim().optional().or(z.literal("")),
  prep_note: z.string().trim().max(60).optional().or(z.literal("")),
  allergens: z.array(z.enum(ALLERGEN_VALUES as [string, ...string[]])).default([]),
  dietary_tags: z.array(z.enum(DIETARY_VALUES as [string, ...string[]])).default([]),
  quantity_available: z
    .string()
    .trim()
    .optional()
    .transform((raw) => {
      if (!raw) return null;
      const n = Number.parseInt(raw, 10);
      return Number.isNaN(n) || n < 0 ? null : n;
    }),
  is_available: z.coerce.boolean().default(true),
});

export const pickupWindowSchema = z.object({
  day_of_week: z.coerce.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM."),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM."),
});
