"use client";

import { useActionState } from "react";

import {
  approveVendor,
  requestVendorChanges,
  suspendVendor,
  type AdminFormState,
} from "@/lib/actions/admin-vendors";
import { FormError, FormNotice, SubmitButton, inputClass } from "@/components/ui/Form";
import type { Vendor } from "@/lib/supabase/database.types";

export function VendorDecisionForms({ vendor }: { vendor: Vendor }) {
  const [approveState, approveAction] = useActionState<AdminFormState, FormData>(
    approveVendor,
    {},
  );
  const [changesState, changesAction] = useActionState<AdminFormState, FormData>(
    requestVendorChanges,
    {},
  );
  const [suspendState, suspendAction] = useActionState<AdminFormState, FormData>(
    suspendVendor,
    {},
  );

  const message =
    approveState.ok ?? changesState.ok ?? suspendState.ok ?? null;
  const error =
    approveState.error ?? changesState.error ?? suspendState.error ?? null;

  return (
    <div className="flex flex-col gap-6">
      {message ? <FormNotice message={message} /> : null}
      {error ? <FormError message={error} /> : null}

      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-buttermilk p-5">
        <p className="text-sm text-ink-70">
          Approving opens the review gate only. The listing appears in search once
          Stripe payouts are connected too.
        </p>
        <form action={approveAction}>
          <input type="hidden" name="vendor_id" value={vendor.id} />
          <SubmitButton label="Approve listing" pendingLabel="Approving…" />
        </form>
      </div>

      <form
        action={changesAction}
        className="flex flex-col gap-4 rounded-2xl border border-line bg-buttermilk p-5"
      >
        <input type="hidden" name="vendor_id" value={vendor.id} />
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-forest">
            Ask for a change
          </span>
          <textarea
            className={`${inputClass} min-h-[90px] resize-y`}
            name="note"
            placeholder="The certificate photo is cut off — please re-upload the full page."
          />
        </label>
        <div className="flex justify-start">
          <SubmitButton
            label="Request changes"
            pendingLabel="Sending…"
            tone="outline"
          />
        </div>
      </form>

      <form
        action={suspendAction}
        className="flex flex-col gap-4 rounded-2xl border border-persimmon/30 bg-persimmon/5 p-5"
      >
        <input type="hidden" name="vendor_id" value={vendor.id} />
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-forest">
            Suspend this cook
          </span>
          <textarea
            className={`${inputClass} min-h-[90px] resize-y`}
            name="note"
            placeholder="Reason — the cook sees this."
          />
        </label>
        <div className="flex justify-start">
          <SubmitButton label="Suspend" pendingLabel="Suspending…" tone="danger" />
        </div>
      </form>
    </div>
  );
}
