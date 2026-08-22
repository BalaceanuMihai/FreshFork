"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import {
  AVAILABILITY_OPTIONS,
  PICKUP_WINDOW_OPTIONS,
  PRICE_BUCKETS,
  RADIUS_STEPS,
} from "@/lib/discovery-options";
import { CUISINES, DIETARY_TAGS } from "@/lib/constants/taxonomy";

/**
 * Filter controls. The URL is the state — every change pushes a new query
 * string and the server component re-runs the search. Nothing is fetched here.
 */
export function FilterRail({ radiusMiles }: { radiusMiles: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const apply = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      params.delete("page"); // any filter change resets pagination
      router.push(`/browse?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const csvValues = (key: string) =>
    (searchParams.get(key) ?? "").split(",").filter(Boolean);

  const toggleCsv = (key: string, value: string) =>
    apply((params) => {
      const current = new Set(csvValues(key));
      if (current.has(value)) current.delete(value);
      else current.add(value);
      if (current.size === 0) params.delete(key);
      else params.set(key, [...current].join(","));
    });

  const setSingle = (key: string, value: string) =>
    apply((params) => {
      if (searchParams.get(key) === value) params.delete(key);
      else params.set(key, value);
    });

  return (
    <aside className="flex w-[260px] shrink-0 flex-col gap-8">
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <span className="font-display text-[15px] font-semibold tracking-[-0.01em] text-forest">
            Distance
          </span>
          <span className="font-mono text-[11px] tracking-[0.08em] text-persimmon">
            {radiusMiles} MI
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={RADIUS_STEPS.length - 1}
          step={1}
          value={Math.max(
            0,
            RADIUS_STEPS.findIndex((step) => step === radiusMiles),
          )}
          onChange={(event) =>
            apply((params) =>
              params.set("radius", String(RADIUS_STEPS[Number(event.target.value)])),
            )
          }
          aria-label="Search radius in miles"
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-line accent-persimmon"
        />
        <div className="flex justify-between font-mono text-[10px] text-ink-50">
          {RADIUS_STEPS.map((step, i) => (
            <span key={step}>{i === RADIUS_STEPS.length - 1 ? `${step} mi` : step}</span>
          ))}
        </div>
      </div>

      <Group title="Availability">
        {AVAILABILITY_OPTIONS.map((option) => (
          <Check
            key={option.value}
            label={option.label}
            checked={searchParams.get("availability") === option.value}
            onChange={() => setSingle("availability", option.value)}
          />
        ))}
      </Group>

      <Group title="Cuisine">
        {CUISINES.map((cuisine) => (
          <Check
            key={cuisine}
            label={cuisine}
            checked={csvValues("cuisine").includes(cuisine)}
            onChange={() => toggleCsv("cuisine", cuisine)}
          />
        ))}
      </Group>

      <Group title="Dietary">
        {DIETARY_TAGS.map((tag) => (
          <Check
            key={tag.value}
            label={tag.label}
            checked={csvValues("dietary").includes(tag.value)}
            onChange={() => toggleCsv("dietary", tag.value)}
          />
        ))}
      </Group>

      <Group title="Price">
        {PRICE_BUCKETS.map((bucket) => (
          <Check
            key={bucket.value}
            label={bucket.label}
            checked={searchParams.get("price") === bucket.value}
            onChange={() => setSingle("price", bucket.value)}
          />
        ))}
      </Group>

      <Group title="Pickup window">
        {PICKUP_WINDOW_OPTIONS.map((option) => (
          <Check
            key={option.value}
            label={option.label}
            checked={csvValues("pickup").includes(option.value)}
            onChange={() => toggleCsv("pickup", option.value)}
          />
        ))}
      </Group>
    </aside>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3.5">
      <span className="font-display text-[15px] font-semibold tracking-[-0.01em] text-forest">
        {title}
      </span>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="flex items-center gap-2.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="h-3.5 w-3.5 rounded-[3px] accent-forest"
        />
        <span className={`text-[13px] text-forest ${checked ? "font-medium" : ""}`}>
          {label}
        </span>
      </span>
    </label>
  );
}
