"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { formatPrice } from "@/lib/format";

export type MapPin = {
  id: string;
  handle: string;
  vendorName: string;
  dishName: string;
  priceCents: number;
  lat: number;
  lng: number;
};

/**
 * Result pins. Uses mapbox-gl directly rather than a React wrapper — the map
 * is a leaf node here (plot pins, click through to the cook), so the wrapper's
 * declarative markers would only add a dependency.
 */
export function ResultsMap({
  pins,
  token,
  center,
}: {
  pins: MapPin[];
  token: string | null;
  center: { lat: number; lng: number } | null;
}) {
  const router = useRouter();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!token || !container.current || map.current) return;

    mapboxgl.accessToken = token;

    const start = center ?? (pins[0] ? { lat: pins[0].lat, lng: pins[0].lng } : null);

    map.current = new mapboxgl.Map({
      container: container.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: start ? [start.lng, start.lat] : [-73.9738, 40.6899],
      zoom: start ? 13 : 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [token, center, pins]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || pins.length === 0) return;

    const markers = pins.map((pin) => {
      const element = document.createElement("button");
      element.type = "button";
      element.className =
        "rounded-full border border-forest bg-buttermilk px-2.5 py-1 font-mono text-[11px] font-medium text-forest shadow";
      element.textContent = formatPrice(pin.priceCents);
      element.addEventListener("click", () => {
        router.push(`/vendor/${pin.handle}`);
      });

      return new mapboxgl.Marker({ element })
        .setLngLat([pin.lng, pin.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 16, closeButton: false }).setText(
            `${pin.dishName} · ${pin.vendorName}`,
          ),
        )
        .addTo(instance);
    });

    const bounds = new mapboxgl.LngLatBounds();
    for (const pin of pins) bounds.extend([pin.lng, pin.lat]);
    if (pins.length > 1) instance.fitBounds(bounds, { padding: 64, maxZoom: 15 });

    return () => {
      for (const marker of markers) marker.remove();
    };
  }, [pins, router]);

  if (!token) {
    return (
      <div className="flex h-[560px] w-full items-center justify-center rounded-2xl border border-dashed border-line bg-card px-8 text-center text-[15px] text-ink-70">
        Map view is unavailable — a Mapbox token has not been configured yet.
      </div>
    );
  }

  return (
    <div
      ref={container}
      className="h-[560px] w-full overflow-hidden rounded-2xl border border-line"
    />
  );
}
