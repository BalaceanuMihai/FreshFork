"use client";

import { useActionState, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { deleteMyAccount, type AccountFormState } from "@/lib/actions/account";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

/**
 * Account closure.
 *
 * Deliberately not a one-click button: the action refuses unless the word is
 * typed, and refuses again if anything is in flight on either side of an
 * order. Completed orders survive closure — they are an accounting record and
 * an allergen record — with every identifying field cleared.
 */
export function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(deleteMyAccount, {});
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  return (
    <div className="border border-destructive/30 rounded-xl p-5 space-y-3">
      <h3 className="text-sm font-medium text-destructive flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" /> Danger zone
      </h3>

      {!open ? (
        <>
          <p className="text-xs text-muted-foreground">
            This clears your name, phone and profile, signs you out for good, and takes any kitchen listing off the
            marketplace. Past orders stay on record without your details attached — we&apos;re required to keep them.
            Cancel or complete anything in progress first.
          </p>
          <button type="button" onClick={() => setOpen(true)} className="text-sm text-destructive hover:underline font-medium">
            Close my account
          </button>
        </>
      ) : (
        <form action={formAction} className="space-y-3">
          <p className="text-sm text-foreground font-medium">Type DELETE to confirm:</p>
          <Input
            id="confirm-delete"
            name="confirm"
            autoComplete="off"
            required
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
          />

          {state.error ? (
            <p className="text-xs text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1 text-sm">
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={pending || confirmText !== "DELETE"} className="flex-1 text-sm">
              {pending ? "Closing…" : "Close my account"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
