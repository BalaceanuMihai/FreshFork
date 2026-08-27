"use client";

import { useState } from "react";
import { LocateFixed } from "lucide-react";

import { cn } from "@/lib/cn";

export function UseMyLocationButton({ formId }: { formId: string }) {
  const [state, setState] = useState<"idle" | "locating" | "error">("idle");

  function locate() {
    if (!("geolocation" in navigator)) {
      setState("error");
      return;
    }
    setState("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const form = document.getElementById(formId) as HTMLFormElement | null;
        if (!form) return;
        (form.elements.namedItem("lat") as HTMLInputElement).value = String(position.coords.latitude);
        (form.elements.namedItem("lng") as HTMLInputElement).value = String(position.coords.longitude);
        (form.elements.namedItem("loc") as HTMLInputElement).value = "Your location";
        form.requestSubmit();
      },
      () => setState("error"),
      { timeout: 8000 },
    );
  }

  return (
    <button
      type="button"
      onClick={locate}
      className={cn(
        "h-11 px-3 rounded-xl border flex items-center gap-1.5 text-sm transition-colors shrink-0",
        state === "error" ? "border-destructive/40 text-destructive" : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      <LocateFixed className="w-4 h-4" />
      <span className="hidden sm:inline">
        {state === "locating" ? "Locating…" : state === "error" ? "Couldn't locate" : "Near me"}
      </span>
    </button>
  );
}
