import { z } from "zod";

import { CUISINES } from "@/lib/constants/taxonomy";

export const businessInfoSchema = z.object({
  business_name: z
    .string()
    .trim()
    .min(2, "Your business name needs at least 2 characters.")
    .max(80, "Keep your business name under 80 characters."),
  cuisine: z.enum(CUISINES, { message: "Pick a cuisine from the list." }),
  kitchen_type: z.string().trim().max(80).optional().or(z.literal("")),
  story: z
    .string()
    .trim()
    .max(1200, "Keep your story under 1200 characters.")
    .optional()
    .or(z.literal("")),
});

export const addressSchema = z.object({
  pickup_address_line: z.string().trim().min(3, "Enter your pickup address."),
  pickup_city: z.string().trim().max(80).optional().or(z.literal("")),
  pickup_state: z.string().trim().max(40).optional().or(z.literal("")),
  pickup_postal_code: z.string().trim().max(16).optional().or(z.literal("")),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export const certSchema = z.object({
  certification_label: z
    .string()
    .trim()
    .min(2, "Name the certification you hold.")
    .max(80),
  cert_doc_path: z.string().trim().min(1, "Upload your certification document."),
  cert_expires_on: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
    .optional()
    .or(z.literal("")),
});

export const adminDecisionSchema = z.object({
  vendor_id: z.uuid("Unknown vendor."),
  note: z.string().trim().max(600).optional().or(z.literal("")),
});

/** Turn a business name into a URL-safe handle. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
