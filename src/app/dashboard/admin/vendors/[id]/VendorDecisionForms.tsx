"use client";

import { useActionState } from "react";

import { approveVendor, requestVendorChanges, suspendVendor } from "@/lib/actions/admin-vendors";
import type { Vendor } from "@/lib/supabase/database.types";

export function VendorDecisionForms({ vendor }: { vendor: Vendor }) {
  const [approveState, approveAction] = useActionState(approveVendor, {});
  const [changesState, changesAction] = useActionState(requestVendorChanges, {});
  const [suspendState, suspendAction] = useActionState(suspendVendor, {});

  const message = approveState.ok ?? changesState.ok ?? suspendState.ok ?? null;
  const error = approveState.error ?? changesState.error ?? suspendState.error ?? null;

  return (
    <div>
      {message ? <p>{message}</p> : null}
      {error ? <p role="alert">{error}</p> : null}

      <form action={approveAction}>
        <input type="hidden" name="vendor_id" value={vendor.id} />
        <p>Approving opens the review gate only — the listing also needs Stripe payouts connected.</p>
        <button type="submit">Approve listing</button>
      </form>

      <form action={changesAction}>
        <input type="hidden" name="vendor_id" value={vendor.id} />
        <label>
          Ask for a change
          <textarea name="note" placeholder="The certificate photo is cut off — please re-upload the full page." />
        </label>
        <button type="submit">Request changes</button>
      </form>

      <form action={suspendAction}>
        <input type="hidden" name="vendor_id" value={vendor.id} />
        <label>
          Suspend this cook
          <textarea name="note" placeholder="Reason — the cook sees this." />
        </label>
        <button type="submit">Suspend</button>
      </form>
    </div>
  );
}
