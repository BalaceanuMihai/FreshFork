"use client";

import { useActionState } from "react";
import { ChefHat, User } from "lucide-react";

import { signUp } from "@/lib/actions/auth";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUp, {});

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <span className="text-sm font-medium text-foreground">What brings you here?</span>
        <div className="grid grid-cols-2 gap-2">
          <RoleOption value="customer" label="I'm here to eat" icon={User} defaultChecked />
          <RoleOption value="vendor" label="I'm here to cook" icon={ChefHat} />
        </div>
      </div>

      <Field label="Name">
        <Input type="text" name="full_name" autoComplete="name" placeholder="Alex Müller" />
      </Field>
      <Field label="Email">
        <Input type="email" name="email" autoComplete="email" required />
      </Field>
      <Field label="Password" hint="At least 8 characters.">
        <Input type="password" name="password" autoComplete="new-password" minLength={8} required />
      </Field>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}

function RoleOption({
  value,
  label,
  icon: Icon,
  defaultChecked,
}: {
  value: string;
  label: string;
  icon: React.ElementType;
  defaultChecked?: boolean;
}) {
  return (
    <label className="cursor-pointer">
      <input type="radio" name="role" value={value} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border text-xs font-medium text-muted-foreground transition-colors peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary">
        <Icon className="w-4 h-4" />
        {label}
      </span>
    </label>
  );
}
