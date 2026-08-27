import { TriangleAlert } from "lucide-react";

import { cn } from "@/lib/cn";
import { dietaryLabel } from "@/lib/constants/taxonomy";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground",
        className,
      )}
      {...props}
    />
  );
}

const DIETARY_COLORS: Record<string, string> = {
  vegan: "bg-green-100 text-green-800",
  vegetarian: "bg-emerald-100 text-emerald-800",
  gluten_free: "bg-amber-100 text-amber-800",
  halal: "bg-teal-100 text-teal-800",
  kosher: "bg-teal-100 text-teal-800",
  dairy_free: "bg-blue-100 text-blue-800",
  nut_free: "bg-purple-100 text-purple-800",
};

export function DietaryBadge({ tag }: { tag: string }) {
  return (
    <span
      className={cn(
        "text-xs font-medium px-1.5 py-0.5 rounded-full",
        DIETARY_COLORS[tag] ?? "bg-secondary text-secondary-foreground",
      )}
    >
      {dietaryLabel(tag)}
    </span>
  );
}

/** Allergens read as a safety warning, not a dietary preference chip. */
export function AllergenTag({ label }: { label: string }) {
  return (
    <span className="text-xs px-1.5 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-800 flex items-center gap-0.5 w-fit">
      <TriangleAlert className="w-2.5 h-2.5 shrink-0" />
      {label}
    </span>
  );
}

export type StatusTone = "neutral" | "info" | "warning" | "success" | "danger";

const TONES: Record<StatusTone, string> = {
  neutral: "bg-secondary text-muted-foreground",
  info: "bg-blue-100 text-blue-700",
  warning: "bg-amber-100 text-amber-700",
  success: "bg-green-100 text-green-700",
  danger: "bg-red-100 text-red-700",
};

export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: StatusTone }) {
  return <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border-0", TONES[tone])}>{label}</span>;
}
