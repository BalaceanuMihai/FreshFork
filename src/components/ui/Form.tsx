"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/** Shared form primitives. Used by auth, vendor onboarding, and menu forms. */

export const inputClass =
  "w-full rounded-xl border border-line bg-buttermilk px-4 py-3 text-[15px] text-forest outline-none placeholder:text-ink-50 focus:border-forest";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-forest">{label}</span>
      {children}
      {hint ? <span className="text-xs text-ink-50">{hint}</span> : null}
    </label>
  );
}

export function FormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-persimmon/40 bg-persimmon/10 px-4 py-3 text-sm text-cocoa"
    >
      {message}
    </p>
  );
}

export function FormNotice({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-sage bg-sage/15 px-4 py-3 text-sm text-forest">
      {message}
    </p>
  );
}

export function SubmitButton({
  label,
  pendingLabel,
  tone = "solid",
  disabled = false,
}: {
  label: string;
  pendingLabel: string;
  tone?: "solid" | "outline" | "danger";
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  const toneClass =
    tone === "solid"
      ? "bg-forest text-buttermilk border-transparent"
      : tone === "danger"
        ? "bg-persimmon text-buttermilk border-transparent"
        : "bg-transparent text-forest border-line";

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`rounded-full border px-7 py-3.5 text-sm font-semibold disabled:opacity-60 ${toneClass}`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
