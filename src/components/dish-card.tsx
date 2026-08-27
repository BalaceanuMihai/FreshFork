import Link from "next/link";
import Image from "next/image";
import { ChefHat, MapPin } from "lucide-react";

import { DietaryBadge } from "@/components/ui/badge";
import { formatDistance, formatPrice } from "@/lib/format";
import type { DishResult } from "@/lib/discovery-options";

export function DishCard({ result, photoUrl }: { result: DishResult; photoUrl: string | null }) {
  const prep =
    result.prep_note ??
    (result.quantity_available !== null ? `${result.quantity_available} left` : "Made to order");
  const dishHref = `/vendor/${result.vendor_handle}/dish/${result.menu_item_id}`;
  const vendorHref = `/vendor/${result.vendor_handle}`;

  return (
    <div className="flex flex-col bg-card rounded-2xl border border-border overflow-hidden hover:border-primary/40 hover:shadow-sm transition-all group">
      <Link href={dishHref} aria-label={`View ${result.dish_name} details`}>
        <div className="relative aspect-video bg-muted overflow-hidden">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={result.dish_name}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ChefHat className="w-8 h-8" />
            </div>
          )}
          {result.dietary_tags.length > 0 ? (
            <div className="absolute top-2 right-2 flex gap-1">
              {result.dietary_tags.slice(0, 2).map((tag) => (
                <DietaryBadge key={tag} tag={tag} />
              ))}
            </div>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-col flex-1 p-4 gap-2">
        <Link href={dishHref} className="min-w-0">
          <p className="font-display text-base font-semibold text-foreground leading-snug">{result.dish_name}</p>
        </Link>
        <Link
          href={vendorHref}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors min-w-0 -mt-1 w-fit"
        >
          <span className="truncate font-medium">{result.vendor_name}</span>
          {result.vendor_city ? (
            <>
              <span className="shrink-0">·</span>
              <span className="truncate">{result.vendor_city}</span>
            </>
          ) : null}
          {result.distance_m !== null ? (
            <>
              <span className="shrink-0">·</span>
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="shrink-0">{formatDistance(result.distance_m)}</span>
            </>
          ) : null}
        </Link>
        <div className="flex items-center justify-between gap-2 mt-auto pt-1">
          <span className="font-display text-lg font-bold text-foreground">
            {formatPrice(result.price_cents, result.currency)}
          </span>
          <span className="text-xs text-muted-foreground">{prep}</span>
        </div>
      </div>
    </div>
  );
}
