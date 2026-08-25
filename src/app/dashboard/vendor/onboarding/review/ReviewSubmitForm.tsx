"use client";

import Link from "next/link";
import { useActionState } from "react";

import { submitForReview } from "@/lib/actions/vendor-onboarding";
import type { Vendor } from "@/lib/supabase/database.types";

export function ReviewSubmitForm({ vendor }: { vendor: Vendor }) {
  const [state, formAction] = useActionState(submitForReview, {});

  const missing: { label: string; href: string }[] = [];
  if (!vendor.cuisine) missing.push({ label: "Business details", href: "/dashboard/vendor/onboarding/business" });
  if (!vendor.location) missing.push({ label: "Pickup address", href: "/dashboard/vendor/onboarding/address" });
  if (!vendor.cert_doc_path) missing.push({ label: "Certification", href: "/dashboard/vendor/onboarding/cert" });

  const canSubmit = missing.length === 0 && (vendor.status === "draft" || vendor.status === "changes_requested");

  return (
    <div>
      {missing.length > 0 ? (
        <>
          <p>Still needed before we can review:</p>
          <ul>
            {missing.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label} →</Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {state.error ? <p role="alert">{state.error}</p> : null}

      {canSubmit ? (
        <form action={formAction}>
          <input type="hidden" name="vendor_id" value={vendor.id} />
          <button type="submit">Submit for review</button>
        </form>
      ) : null}
    </div>
  );
}
