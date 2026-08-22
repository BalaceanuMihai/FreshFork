"use client";

import { useActionState, useState } from "react";

import { signUp, type AuthFormState } from "@/lib/actions/auth";
import type { UserRole } from "@/lib/supabase/database.types";
import { Field, inputClass } from "./AuthShell";
import { FormError, SubmitButton } from "./SignInForm";

const ROLE_CHOICES: { value: Extract<UserRole, "customer" | "vendor">; title: string; blurb: string }[] = [
  {
    value: "customer",
    title: "I'm here to eat",
    blurb: "Browse neighbors' kitchens and order for pickup.",
  },
  {
    value: "vendor",
    title: "I'm here to cook",
    blurb: "List dishes, set pickup windows, get paid.",
  },
];

export function SignUpForm() {
  const [state, formAction] = useActionState<AuthFormState, FormData>(signUp, {});
  const [role, setRole] = useState<"customer" | "vendor">("customer");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 text-[13px] font-medium text-forest">
          What brings you here?
        </legend>
        {ROLE_CHOICES.map((choice) => {
          const active = role === choice.value;
          return (
            <label
              key={choice.value}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 ${
                active ? "border-forest bg-buttermilk" : "border-line bg-transparent"
              }`}
            >
              <input
                type="radio"
                name="role"
                value={choice.value}
                checked={active}
                onChange={() => setRole(choice.value)}
                className="mt-1 accent-persimmon"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-forest">
                  {choice.title}
                </span>
                <span className="text-[13px] text-ink-70">{choice.blurb}</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      <Field label="Name">
        <input
          className={inputClass}
          type="text"
          name="full_name"
          autoComplete="name"
          placeholder="Sara Petrov"
        />
      </Field>
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
      <Field label="Password" hint="At least 8 characters.">
        <input
          className={inputClass}
          type="password"
          name="password"
          autoComplete="new-password"
          minLength={8}
          placeholder="••••••••"
          required
        />
      </Field>
      {state.error ? <FormError message={state.error} /> : null}
      <SubmitButton label="Create account" pendingLabel="Creating account…" />
    </form>
  );
}
