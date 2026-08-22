"use client";

import { useActionState } from "react";

import { signIn, type AuthFormState } from "@/lib/actions/auth";
import { Field, FormError, SubmitButton, inputClass } from "@/components/ui/Form";

export { FormError, SubmitButton };

export function SignInForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(signIn, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      <Field label="Email">
        <input
          className={inputClass}
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
      </Field>
      <Field label="Password">
        <input
          className={inputClass}
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </Field>
      {state.error ? <FormError message={state.error} /> : null}
      <SubmitButton label="Sign in" pendingLabel="Signing in…" />
    </form>
  );
}
