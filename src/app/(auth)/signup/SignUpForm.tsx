"use client";

import { useActionState } from "react";

import { signUp } from "@/lib/actions/auth";

export function SignUpForm() {
  const [state, formAction] = useActionState(signUp, {});

  return (
    <form action={formAction}>
      <fieldset>
        <legend>What brings you here?</legend>
        <label>
          <input type="radio" name="role" value="customer" defaultChecked />
          I&apos;m here to eat — browse neighbors&apos; kitchens and order for pickup.
        </label>
        <br />
        <label>
          <input type="radio" name="role" value="vendor" />
          I&apos;m here to cook — list dishes, set pickup windows, get paid.
        </label>
      </fieldset>

      <div>
        <label>
          Name
          <input type="text" name="full_name" autoComplete="name" />
        </label>
      </div>
      <div>
        <label>
          Email
          <input type="email" name="email" autoComplete="email" required />
        </label>
      </div>
      <div>
        <label>
          Password (at least 8 characters)
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
      </div>

      {state.error ? <p role="alert">{state.error}</p> : null}
      <button type="submit">Create account</button>
    </form>
  );
}
