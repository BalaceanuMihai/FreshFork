import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BadgeCheck, Calendar, ChefHat, MapPin } from "lucide-react";

import { requireViewer } from "@/lib/auth";
import { getVendorByHandle, publicPhotoUrl, type VendorWithMenu } from "@/lib/vendors-data";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, formatTime } from "@/lib/format";
import { allergenLabel, WEEKDAYS } from "@/lib/constants/taxonomy";
import { AddToCart } from "./AddToCart";
import { ReportVendorForm } from "./ReportVendorForm";
import { CART_LIMITS } from "@/lib/cart-limits";
import { features } from "@/lib/env";
import { DietaryBadge, AllergenTag } from "@/components/ui/badge";
import { Stars } from "@/components/ui/stars";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import type { MenuItem, Review } from "@/lib/supabase/database.types";

const DAY_LABELS = new Map(WEEKDAYS.map((d) => [d.value as number, d.label]));

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/vendor/[handle]">) {
  const { handle } = await props.params;
  const vendor = await getVendorByHandle(handle);
  return {
    title: vendor ? `${vendor.business_name} · FreshFork` : "Cook not found · FreshFork",
  };
}

export default async function VendorProfilePage(props: PageProps<"/vendor/[handle]">) {
  const { handle } = await props.params;
  await requireViewer(`/vendor/${handle}`);
  const vendor = await getVendorByHandle(handle);
  if (!vendor) notFound();

  const dishes = vendor.menu_items.filter((item) => item.is_available);
  const sections = [...new Set(dishes.map((d) => d.section))];
  const [avatarUrl, ratingRow, reviews] = await Promise.all([
    publicPhotoUrl(vendor.avatar_image_path),
    getVendorRating(vendor.id),
    getVendorReviews(vendor.id),
  ]);

  // Both gates have to be open: the kitchen has to be live, and this
  // deployment has to be able to take a payment at all.
  const canOrder = vendor.is_live && features.ordering;

  const photos = new Map<string, string | null>();
  await Promise.all(
    dishes.map(async (dish) => {
      photos.set(dish.id, await publicPhotoUrl(dish.photo_path));
    }),
  );

  return (
    <div className="max-w-5xl mx-auto px-4 pt-4 pb-10">
      <Link
        href="/browse"
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        ← Back
      </Link>

      <div>
        {/* Profile header */}
        <div className="flex items-center gap-4 mb-5">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={vendor.business_name}
              width={80}
              height={80}
              className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover shadow-sm shrink-0"
            />
          ) : (
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-secondary flex items-center justify-center shadow-sm shrink-0">
              <ChefHat className="w-7 h-7 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl font-semibold text-foreground">{vendor.business_name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mt-0.5">
              {vendor.pickup_city ? (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {vendor.pickup_city}
                </span>
              ) : null}
              {ratingRow && ratingRow.review_count ? (
                <>
                  <Stars rating={ratingRow.average_rating ?? 0} />
                  <span>({ratingRow.review_count})</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Cuisine */}
        {vendor.cuisine ? (
          <div className="flex flex-wrap gap-2 mb-5">
            <span className="text-xs px-2.5 py-1 bg-secondary rounded-full border border-border text-secondary-foreground">
              {vendor.cuisine}
            </span>
          </div>
        ) : null}

        {/* Trust signals */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-1.5 text-xs bg-green-50 text-green-800 border border-green-200 px-2.5 py-1.5 rounded-lg">
            <BadgeCheck className="w-3.5 h-3.5 shrink-0" /> {vendor.certification_label ?? "Certified kitchen"}
          </div>
          {vendor.verified_since ? (
            <div className="flex items-center gap-1.5 text-xs bg-secondary text-secondary-foreground border border-border px-2.5 py-1.5 rounded-lg">
              <Calendar className="w-3.5 h-3.5" /> Verified since {new Date(vendor.verified_since).getFullYear()}
            </div>
          ) : null}
        </div>

        {/* Report */}
        <div className="mb-5">
          <ReportVendorForm vendorId={vendor.id} />
        </div>

        {/* Bio */}
        {vendor.story ? (
          <div className="bg-card rounded-xl border border-border p-4 mb-6">
            <h3 className="font-display text-base font-semibold mb-2">About {vendor.business_name.split(" ")[0]}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">&ldquo;{vendor.story}&rdquo;</p>
          </div>
        ) : null}

        {/* Menu */}
        <h2 className="font-display text-xl font-semibold mb-4">Menu</h2>
        {dishes.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-8">
            {vendor.business_name} hasn&apos;t posted any dishes yet. Check back soon.
          </p>
        ) : (
          <div className="space-y-6 mb-8">
            {sections.map((section) => (
              <div key={section}>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">{section}</h3>
                <div className="space-y-3">
                  {dishes
                    .filter((dish) => dish.section === section)
                    .map((dish) => (
                      <MenuRow
                        key={dish.id}
                        dish={dish}
                        photoUrl={photos.get(dish.id) ?? null}
                        canOrder={canOrder}
                        currency={vendor.currency}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pickup location + schedule */}
        <h2 className="font-display text-xl font-semibold mb-4">Pickup</h2>
        <div className="bg-card rounded-xl border border-border p-4 mb-8 space-y-4">
          {vendor.pickup_address_line ? (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">{vendor.pickup_address_line}</p>
                <p className="text-muted-foreground">
                  {[vendor.pickup_city, vendor.pickup_postal_code].filter(Boolean).join(", ")}
                </p>
              </div>
            </div>
          ) : null}
          {vendor.pickup_windows.length === 0 ? (
            <p className="text-sm text-muted-foreground">This cook hasn&apos;t published pickup times yet.</p>
          ) : (
            <div className={cn("space-y-3", vendor.pickup_address_line ? "border-t border-border pt-4" : undefined)}>
              {groupWindows(vendor).map(([day, windows]) => (
                <div key={day} className="flex items-start gap-4">
                  <span className="w-24 text-sm font-medium text-foreground shrink-0">{day}</span>
                  <div className="flex flex-wrap gap-2">
                    {windows.map((w) => (
                      <span
                        key={w.id}
                        className="text-xs px-2.5 py-1 bg-secondary rounded-lg text-secondary-foreground border border-border"
                      >
                        {formatTime(w.start_time)}–{formatTime(w.end_time)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reviews */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">Reviews</h2>
          {ratingRow && ratingRow.review_count ? (
            <div className="flex items-center gap-2">
              <Stars rating={ratingRow.average_rating ?? 0} />
              <span className="text-sm text-muted-foreground">({ratingRow.review_count})</span>
            </div>
          ) : null}
        </div>
        {reviews.length === 0 ? (
          <EmptyState
            icon={ChefHat}
            title="No reviews yet"
            body="Reviews appear here once customers pick up their first order."
          />
        ) : (
          <div className="space-y-4 mb-8">
            {reviews.map((review) => (
              <div key={review.id} className="bg-card rounded-xl border border-border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Stars rating={review.rating} small />
                  <span className="text-xs text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                {review.body ? <p className="text-sm text-muted-foreground leading-relaxed">{review.body}</p> : null}
                {review.vendor_reply ? (
                  <div className="bg-secondary rounded-lg p-3 mt-2 border-l-2 border-primary">
                    <p className="text-xs font-medium text-primary mb-1">{vendor.business_name.split(" ")[0]} replied:</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{review.vendor_reply}</p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {!canOrder ? (
          <div className="bg-secondary rounded-xl px-4 py-3 text-sm text-muted-foreground text-center mb-6">
            {vendor.is_live ? "Ordering is unavailable right now." : "This kitchen isn't taking orders at the moment."}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function groupWindows(vendor: VendorWithMenu) {
  const map = new Map<string, VendorWithMenu["pickup_windows"]>();
  for (const window of vendor.pickup_windows) {
    const label = DAY_LABELS.get(window.day_of_week) ?? String(window.day_of_week);
    map.set(label, [...(map.get(label) ?? []), window]);
  }
  return [...map.entries()];
}

async function getVendorRating(vendorId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("vendor_ratings").select("*").eq("vendor_id", vendorId).maybeSingle();
  return data;
}

async function getVendorReviews(vendorId: string): Promise<Review[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("*")
    .eq("vendor_id", vendorId)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

function MenuRow({
  dish,
  photoUrl,
  canOrder,
  currency,
}: {
  dish: MenuItem;
  photoUrl: string | null;
  canOrder: boolean;
  currency: string;
}) {
  const remaining = dish.quantity_available;
  const soldOut = remaining !== null && remaining <= 0;

  return (
    <div className="bg-card rounded-xl border border-border p-4 flex gap-4">
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={dish.name}
          width={80}
          height={80}
          className="w-20 h-20 rounded-lg object-cover bg-muted shrink-0"
        />
      ) : (
        <div className="w-20 h-20 rounded-lg bg-muted shrink-0 flex items-center justify-center text-muted-foreground">
          <ChefHat className="w-6 h-6" />
        </div>
      )}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-foreground text-sm">{dish.name}</p>
          <span className="font-display font-semibold shrink-0">{formatPrice(dish.price_cents, currency)}</span>
        </div>
        {dish.description ? <p className="text-xs text-muted-foreground leading-relaxed">{dish.description}</p> : null}
        {dish.dietary_tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {dish.dietary_tags.map((tag) => (
              <DietaryBadge key={tag} tag={tag} />
            ))}
          </div>
        ) : null}
        {dish.allergens.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {dish.allergens.map((a) => (
              <AllergenTag key={a} label={allergenLabel(a)} />
            ))}
          </div>
        ) : null}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">
            {soldOut ? (
              <span className="text-destructive font-medium">Sold out</span>
            ) : (
              dish.prep_note ?? (remaining !== null ? `${remaining} left` : "Made to order")
            )}
          </span>
          {canOrder ? (
            <AddToCart
              vendorId={dish.vendor_id}
              menuItemId={dish.id}
              soldOut={soldOut}
              max={Math.min(remaining ?? CART_LIMITS.maxQuantity, CART_LIMITS.maxQuantity)}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
