import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ChefHat, Edit3, Plus, Trash2 } from "lucide-react";

import { getMenuItems, getOwnVendor, publicPhotoUrl } from "@/lib/vendors-data";
import { deleteMenuItem, toggleMenuItemAvailability } from "@/lib/actions/menu";
import { formatPrice } from "@/lib/format";
import { DietaryBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { MenuItem } from "@/lib/supabase/database.types";

export const metadata = { title: "Your menu · FreshFork" };

export default async function MenuPage() {
  const vendor = await getOwnVendor();
  if (!vendor) redirect("/dashboard/vendor/onboarding/business");

  const items = await getMenuItems(vendor.id);
  const withPhotos = await Promise.all(
    items.map(async (item) => ({ item, photoUrl: await publicPhotoUrl(item.photo_path) })),
  );
  const sections = [...new Set(items.map((i) => i.section))];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Your menu</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {vendor.is_live
              ? `${items.length} ${items.length === 1 ? "dish" : "dishes"} · visible to neighbors right now`
              : "Add dishes now — they go public the moment your listing is approved."}
          </p>
        </div>
        <Link href="/dashboard/vendor/menu/new" className={buttonClasses("primary", "shrink-0")}>
          <Plus className="w-4 h-4" /> Add dish
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={ChefHat} title="No dishes yet" body="Add your first dish to start receiving orders." />
      ) : (
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section} className="space-y-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{section}</h2>
              {withPhotos
                .filter(({ item }) => item.section === section)
                .map(({ item, photoUrl }) => (
                  <MenuItemRow key={item.id} item={item} photoUrl={photoUrl} currency={vendor.currency} />
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MenuItemRow({ item, photoUrl, currency }: { item: MenuItem; photoUrl: string | null; currency: string }) {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden flex">
      {photoUrl ? (
        <Image src={photoUrl} alt={item.name} width={96} height={96} className="w-24 h-24 object-cover shrink-0" />
      ) : (
        <div className="w-24 h-24 bg-muted shrink-0 flex items-center justify-center text-muted-foreground">
          <ChefHat className="w-6 h-6" />
        </div>
      )}
      <div className="flex-1 p-4 flex flex-col justify-between min-w-0 gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{item.name}</p>
            {item.description ? <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.description}</p> : null}
            {item.dietary_tags.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {item.dietary_tags.map((tag) => (
                  <DietaryBadge key={tag} tag={tag} />
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex gap-1 shrink-0">
            <Link
              href={`/dashboard/vendor/menu/${item.id}/edit`}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
              aria-label="Edit"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </Link>
            <form action={deleteMenuItem}>
              <input type="hidden" name="id" value={item.id} />
              <button
                type="submit"
                className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                aria-label="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-display font-semibold text-sm">{formatPrice(item.price_cents, currency)}</span>
          <form action={toggleMenuItemAvailability}>
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="next" value={(!item.is_available).toString()} />
            <button
              type="submit"
              className={cn(
                "text-xs px-2.5 py-1 rounded-full font-medium transition-colors border",
                item.is_available ? "bg-green-50 text-green-700 border-green-200" : "bg-secondary text-muted-foreground border-border",
              )}
            >
              {item.is_available ? "Available" : "Sold out"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
