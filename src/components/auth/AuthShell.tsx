import type { ReactNode } from "react";

export { Field, inputClass } from "@/components/ui/Form";

/** Centered card used by the sign-in and sign-up screens. */
export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  aside,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="flex flex-1 items-start justify-center px-6 py-20">
      <div className="w-full max-w-[440px] rounded-3xl border border-line bg-card p-10">
        <div className="flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-persimmon" aria-hidden />
          <span className="font-mono text-[11px] tracking-[0.18em] text-forest">
            {eyebrow}
          </span>
        </div>
        <h1 className="mt-5 font-display text-[38px] font-semibold leading-[1.08] tracking-[-0.02em] text-forest">
          {title}
        </h1>
        <p className="mt-3 text-[15px] leading-[1.55] text-ink-70">{subtitle}</p>
        <div className="mt-8">{children}</div>
        {aside ? (
          <div className="mt-7 border-t border-line pt-6 text-sm text-ink-70">
            {aside}
          </div>
        ) : null}
      </div>
    </section>
  );
}
