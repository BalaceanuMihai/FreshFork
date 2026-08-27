"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

type GeocodeResult = {
  label: string;
  city: string | null;
  lat: number;
  lng: number;
};

/**
 * Browse page's location bar. Typing a city or address geocodes it (via the
 * same `/api/geocode` proxy the vendor address step uses) and picking a
 * result fills the form's hidden lat/lng and re-submits — that's what turns
 * "radius" into an actual same-city filter, since kitchens on this platform
 * are hundreds of kilometres apart. Before this existed the field only wrote
 * a label; lat/lng stayed empty and the search ignored location entirely.
 */
export function LocationSearch({ formId, defaultValue }: { formId: string; defaultValue?: string | null }) {
  const [query, setQuery] = useState(defaultValue ?? "");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const pickedLabel = useRef(defaultValue ?? "");
  const sessionToken = useRef(crypto.randomUUID());

  useEffect(() => {
    if (query.length < 3 || query === pickedLabel.current) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}&session_token=${sessionToken.current}`);
        const body = (await res.json()) as { results: GeocodeResult[] };
        setResults(body.results ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function pick(result: GeocodeResult) {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    pickedLabel.current = result.city ?? result.label;
    setQuery(result.city ?? result.label);
    setOpen(false);
    setResults([]);
    if (!form) return;
    (form.elements.namedItem("lat") as HTMLInputElement).value = String(result.lat);
    (form.elements.namedItem("lng") as HTMLInputElement).value = String(result.lng);
    form.requestSubmit();
  }

  return (
    <div className="flex-1 min-w-0 relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        name="loc"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          // A hand-edited query that hasn't been re-picked no longer matches
          // the coordinates we last submitted — drop them rather than search
          // against a stale point the visible text no longer describes.
          if (e.target.value !== pickedLabel.current) {
            const form = document.getElementById(formId) as HTMLFormElement | null;
            if (form) {
              (form.elements.namedItem("lat") as HTMLInputElement).value = "";
              (form.elements.namedItem("lng") as HTMLInputElement).value = "";
            }
          }
        }}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Your address, postcode, or city…"
        autoComplete="off"
        className="w-full h-11 pl-9 pr-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      {open && results.length > 0 ? (
        <ul className="absolute z-10 mt-1 w-full bg-card border border-border rounded-xl shadow-md overflow-hidden">
          {results.map((result) => (
            <li key={`${result.lat}-${result.lng}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(result)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors"
              >
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
