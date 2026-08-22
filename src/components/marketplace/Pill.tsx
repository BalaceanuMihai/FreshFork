import type { ReactNode } from "react";

type PillProps = {
  children: ReactNode;
  tone?: "solid" | "outline" | "ghost";
  className?: string;
};

const TONE_CLASSES: Record<NonNullable<PillProps["tone"]>, string> = {
  solid: "bg-forest text-buttermilk border-transparent",
  outline: "bg-transparent text-forest border-line",
  ghost: "bg-transparent text-forest border-sage",
};

export function Pill({ children, tone = "outline", className = "" }: PillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
