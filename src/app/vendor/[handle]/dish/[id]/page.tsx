import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ChefHat, ChevronRight, MapPin } from "lucide-react";

import { requireViewer } from "@/lib/auth";
import { getVendorByHandle, publicPhotoUrl } from "@/lib/vendors-data";
import { formatPrice } from "@/lib/format";
import { allergenLabel } from "@/lib/constants/taxonomy";
import { features } from "@/lib/env";
import { DietaryBadge, AllergenTag } from "@/components/ui/badge";
import { AddToCartBar } from "./AddToCartBar";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/vendor/[handle]/dish/[id]">) {
  const { handle, id } = await props.params;
  const vendor = await getVendorByHandle(handle);
  const dish = vendor?.menu_items.find((item) => item.id === id);
  return {
    title: dish ? `${dish.name} · ${vendor?.business_name} · FreshFork` : "Dish not found · FreshFork",
  };
}

export default async function DishDetailPage(props: PageProps<"/vendor/[handle]/dish/[id]">) {
  const { handle, id } = await props.params;
  await requireViewer(`/vendor/${handle}/dish/${id}`);
  const vendor = await getVendorByHandle(handle);
  if (!vendor) notFound();

  const dish = vendor.menu_items.find((item) => item.id === id && item.is_available);
  if (!dish) notFound();

  const photoUrl = await publicPhotoUrl(dish.photo_path);
  const canOrder = vendor.is_live && features.ordering;
  const soldOut = dish.quantity_available !== null && dish.quantity_available <= 0;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-32 md:pb-10">
      {/* Hero image */}
      <div className="relative aspect-video bg-muted overflow-hidden rounded-2xl shadow-sm">
        {photoUrl ? (
          <Image src={photoUrl} alt={dish.name} fill sizes="(min-width: 768px) 42rem, 100vw" className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ChefHat className="w-10 h-10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />
        <Link
          href={`/vendor/${handle}`}
          className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm text-white rounded-full p-2.5 hover:bg-black/60 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        {soldOut ? (
          <span className="absolute top-4 right-4 bg-background text-foreground text-xs font-semibold px-3 py-1.5 rounded-full">
            Sold out
          </span>
        ) : null}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 flex flex-col gap-1">
          <h1 className="font-display text-2xl font-semibold text-white leading-tight">{dish.name}</h1>
          <p className="font-display text-xl font-bold text-white/90">{formatPrice(dish.price_cents, vendor.currency)}</p>
        </div>
      </div>

      <div className="px-1 sm:px-2 pt-6 pb-8 flex flex-col gap-7">
        {/* Dietary + allergens */}
        {dish.dietary_tags.length > 0 || dish.allergens.length > 0 ? (
          <div className="flex flex-col gap-2">
            {dish.dietary_tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {dish.dietary_tags.map((tag) => (
                  <DietaryBadge key={tag} tag={tag} />
                ))}
              </div>
            ) : null}
            {dish.allergens.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground shrink-0">Contains:</span>
                {dish.allergens.map((a) => (
                  <AllergenTag key={a} label={allergenLabel(a)} />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Cook row */}
        <Link
          href={`/vendor/${handle}`}
          className="flex items-center gap-3 bg-secondary rounded-2xl px-4 py-3 hover:bg-muted transition-colors w-full text-left"
        >
          <div className="w-11 h-11 rounded-full bg-card flex items-center justify-center shrink-0 overflow-hidden">
            <ChefHat className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <span className="text-sm font-semibold text-foreground">{vendor.business_name}</span>
            {vendor.pickup_city ? (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3 shrink-0" />
                <span>{vendor.pickup_city}</span>
              </div>
            ) : null}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </Link>

        {/* Description */}
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-semibold">About this dish</h2>
          {dish.description ? <p className="text-sm text-muted-foreground leading-relaxed">{dish.description}</p> : null}
          <p className="text-xs text-muted-foreground">
            {dish.prep_note ?? (dish.quantity_available !== null ? `${dish.quantity_available} portions available today` : "Made to order")}
          </p>
        </div>
      </div>

      {canOrder ? (
        <AddToCartBar vendorId={dish.vendor_id} menuItemId={dish.id} soldOut={soldOut} price={formatPrice(dish.price_cents, vendor.currency)} />
      ) : null}
    </div>
  );
}
