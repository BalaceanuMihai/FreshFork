"use client";

import { useActionState } from "react";

import { deleteMyAccount, type AccountFormState } from "@/lib/actions/account";

/**
 * Account closure.
 *
 * Deliberately not a one-click button: the action refuses unless the word is
 * typed, and refuses again if anything is in flight on either side of an
 * order. Completed orders survive closure — they are an accounting record and
 * an allergen record — with every identifying field cleared.
 */
export function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(
    deleteMyAccount,
    {},
  );

  return (
    <form action={formAction}>
      <h2>Close your account</h2>
      <p>
        This clears your name, phone and profile, signs you out for good, and
        takes any kitchen listing off the marketplace. Past orders stay on record
        without your details attached — we&apos;re required to keep them.
      </p>
      <p>Cancel or complete anything in progress first.</p>

      {state.error ? <p role="alert">{state.error}</p> : null}

      <label htmlFor="confirm-delete">Type DELETE to confirm</label>
      <input id="confirm-delete" name="confirm" autoComplete="off" required />

      <button type="submit" disabled={pending}>
        {pending ? "Closing…" : "Close my account"}
      </button>
    </form>
  );
}
