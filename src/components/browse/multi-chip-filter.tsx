"use client";

import { useState } from "react";

import { cn } from "@/lib/cn";

/**
 * A pill-style multi-select that still submits as one comma-separated GET
 * param — the exact shape `parseFilters` already expects. No submit handler:
 * the browser reads the hidden input's current value when the surrounding
 * form is submitted natively.
 */
export function MultiChipFilter({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: readonly { value: string; label: string }[];
  defaultValue: string[];
}) {
  const [selected, setSelected] = useState<string[]>(defaultValue);

  function toggle(value: string) {
    setSelected((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  return (
    <div className="flex flex-wrap gap-2">
      <input type="hidden" name={name} value={selected.join(",")} />
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggle(option.value)}
            className={cn(
              "px-3 py-1 rounded-full text-sm border transition-colors",
              active
                ? "border-primary bg-primary/10 text-primary font-medium"
                : "border-border hover:bg-secondary text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
