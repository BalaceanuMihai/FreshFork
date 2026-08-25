"use client";

import { useActionState } from "react";

import { signIn } from "@/lib/actions/auth";

export function SignInForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(signIn, {});

  return (
    <form action={formAction}>
      <input type="hidden" name="next" value={next} />
      <div>
        <label>
          Email
          <input type="email" name="email" autoComplete="email" required />
        </label>
      </div>
      <div>
        <label>
          Password
          <input type="password" name="password" autoComplete="current-password" required />
        </label>
      </div>
      {state.error ? <p role="alert">{state.error}</p> : null}
      <button type="submit">Sign in</button>
    </form>
  );
}
