"use client";

import Link from "next/link";
import { useActionState } from "react";

import { submitForReview, type VendorFormState } from "@/lib/actions/vendor-onboarding";
import { FormError, SubmitButton } from "@/components/ui/Form";
import type { Vendor } from "@/lib/supabase/database.types";

export function ReviewSubmit({ vendor }: { vendor: Vendor }) {
  const [state, formAction] = useActionState<VendorFormState, FormData>(
    submitForReview,
    {},
  );

  const missing: { label: string; href: string }[] = [];
  if (!vendor.cuisine) {
    missing.push({ label: "Business details", href: "/dashboard/vendor/onboarding/business" });
  }
  if (!vendor.location) {
    missing.push({ label: "Pickup address", href: "/dashboard/vendor/onboarding/address" });
  }
  if (!vendor.cert_doc_path) {
    missing.push({ label: "Certification", href: "/dashboard/vendor/onboarding/cert" });
  }

  const canSubmit =
    missing.length === 0 &&
    (vendor.status === "draft" || vendor.status === "changes_requested");

  return (
    <div className="flex flex-col gap-6">
      {missing.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-70">Still needed before we can review:</p>
          <ul className="flex flex-col gap-2">
            {missing.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-2 rounded-xl border border-persimmon/40 bg-persimmon/10 px-4 py-2.5 text-sm text-cocoa"
                >
                  {item.label} →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {state.error ? <FormError message={state.error} /> : null}

      {canSubmit ? (
        <form action={formAction} className="flex justify-end">
          <input type="hidden" name="vendor_id" value={vendor.id} />
          <SubmitButton label="Submit for review" pendingLabel="Submitting…" />
        </form>
      ) : null}
    </div>
  );
}
