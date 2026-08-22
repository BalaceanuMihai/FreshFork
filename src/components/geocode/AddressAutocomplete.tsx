"use client";

import { useEffect, useId, useRef, useState } from "react";

import { inputClass } from "@/components/ui/Form";

export type GeocodeSelection = {
  label: string;
  addressLine: string;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  lat: number;
  lng: number;
};

/**
 * Debounced address search against `/api/geocode`.
 *
 * The Mapbox session token is a client-generated UUID per search session —
 * Mapbox groups the keystrokes behind one billed lookup, so it's regenerated
 * after each selection rather than per request.
 */
export function AddressAutocomplete({
  name = "address",
  defaultValue = "",
  placeholder = "Start typing an address…",
  onSelect,
  autoFocus = false,
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  onSelect: (result: GeocodeSelection | null) => void;
  autoFocus?: boolean;
}) {
  const listId = useId();
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState<GeocodeSelection[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const sessionToken = useRef<string>(crypto.randomUUID());
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    // Too short to search. Clearing happens in the change handler so this
    // effect never sets state synchronously.
    if (query.trim().length < 3) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: query.trim(),
          session_token: sessionToken.current,
        });
        const response = await fetch(`/api/geocode?${params}`, {
          signal: controller.signal,
        });
        const body = (await response.json()) as {
          results?: GeocodeSelection[];
          error?: string;
        };
        setResults(body.results ?? []);
        setNotice(body.error ?? null);
        setOpen(true);
      } catch {
        // Aborted or offline — leave the previous suggestions in place.
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  function choose(result: GeocodeSelection) {
    skipNextSearch.current = true;
    setQuery(result.label || result.addressLine);
    setResults([]);
    setOpen(false);
    sessionToken.current = crypto.randomUUID();
    onSelect(result);
  }

  return (
    <div className="relative">
      <input
        type="text"
        name={name}
        value={query}
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        className={inputClass}
        onChange={(event) => {
          const value = event.target.value;
          setQuery(value);
          onSelect(null);
          if (value.trim().length < 3) setResults([]);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
      />

      {loading ? (
        <span className="absolute right-4 top-3.5 font-mono text-[10px] tracking-[0.1em] text-ink-50">
          …
        </span>
      ) : null}

      {notice ? <p className="mt-2 text-xs text-ink-50">{notice}</p> : null}

      {open && results.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-line bg-card shadow-lg"
        >
          {results.map((result) => (
            <li key={`${result.lat},${result.lng},${result.label}`}>
              <button
                type="button"
                role="option"
                aria-selected="false"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(result)}
                className="flex w-full flex-col gap-0.5 border-b border-line px-4 py-3 text-left last:border-b-0 hover:bg-buttermilk"
              >
                <span className="text-sm font-medium text-forest">
                  {result.addressLine}
                </span>
                <span className="text-xs text-ink-50">{result.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
