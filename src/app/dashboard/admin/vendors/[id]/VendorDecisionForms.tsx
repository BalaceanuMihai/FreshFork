"use client";

import { useActionState, useState } from "react";

import { approveVendor, requestVendorChanges, suspendVendor } from "@/lib/actions/admin-vendors";
import { Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import type { Vendor } from "@/lib/supabase/database.types";

export function VendorDecisionForms({ vendor }: { vendor: Vendor }) {
  const [approveState, approveAction, approvePending] = useActionState(approveVendor, {});
  const [changesState, changesAction, changesPending] = useActionState(requestVendorChanges, {});
  const [suspendState, suspendAction, suspendPending] = useActionState(suspendVendor, {});
  const [showChanges, setShowChanges] = useState(false);
  const [showSuspend, setShowSuspend] = useState(false);

  const message = approveState.ok ?? changesState.ok ?? suspendState.ok ?? null;
  const error = approveState.error ?? changesState.error ?? suspendState.error ?? null;

  const eligible = vendor.status === "pending_review" || vendor.status === "changes_requested";

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Decision</h2>

      {message ? (
        <p className="text-sm text-green-700" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {!eligible ? (
        <p className="text-xs text-muted-foreground">
          This cook is currently {vendor.status.replace("_", " ")}.{" "}
          {vendor.status === "approved" ? "You can still suspend them below." : null}
        </p>
      ) : null}

      {eligible ? (
        <form action={approveAction} className="space-y-1.5">
          <input type="hidden" name="vendor_id" value={vendor.id} />
          <p className="text-xs text-muted-foreground">
            Approving opens the review gate only — the listing also needs Stripe payouts connected.
          </p>
          <Button type="submit" disabled={approvePending} className="w-full">
            {approvePending ? "Approving…" : "Approve listing"}
          </Button>
        </form>
      ) : null}

      {eligible ? (
        <div className="border-t border-border pt-3">
          {!showChanges ? (
            <button type="button" onClick={() => setShowChanges(true)} className="text-sm text-muted-foreground hover:text-foreground">
              Request changes
            </button>
          ) : (
            <form action={changesAction} className="space-y-2">
              <input type="hidden" name="vendor_id" value={vendor.id} />
              <Textarea name="note" rows={2} placeholder="The certificate photo is cut off — please re-upload the full page." />
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowChanges(false)} className="flex-1 text-sm">
                  Cancel
                </Button>
                <Button type="submit" disabled={changesPending} className="flex-1 text-sm">
                  {changesPending ? "Sending…" : "Request changes"}
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : null}

      <div className="border-t border-border pt-3">
        {!showSuspend ? (
          <button type="button" onClick={() => setShowSuspend(true)} className="text-sm text-destructive hover:underline">
            Suspend this cook
          </button>
        ) : (
          <form action={suspendAction} className="space-y-2">
            <input type="hidden" name="vendor_id" value={vendor.id} />
            <Textarea name="note" rows={2} placeholder="Reason — the cook sees this." />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setShowSuspend(false)} className="flex-1 text-sm">
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={suspendPending} className="flex-1 text-sm">
                {suspendPending ? "Suspending…" : "Suspend"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
