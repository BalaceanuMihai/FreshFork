import Link from "next/link";
import { notFound } from "next/navigation";

import { getVendorByHandle, publicPhotoUrl, type VendorWithMenu } from "@/lib/vendors-data";
import { formatPrice, formatTime } from "@/lib/format";
import { allergenLabel, dietaryLabel, WEEKDAYS } from "@/lib/constants/taxonomy";
import { AddToCart } from "./AddToCart";
import { CART_LIMITS } from "@/lib/cart-limits";
import { features } from "@/lib/env";
import type { MenuItem } from "@/lib/supabase/database.types";

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
  const vendor = await getVendorByHandle(handle);
  if (!vendor) notFound();

  const dishes = vendor.menu_items.filter((item) => item.is_available);
  const sections = [...new Set(dishes.map((d) => d.section))];
  const heroUrl = await publicPhotoUrl(vendor.hero_image_path);

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
    <div>
      <h1>{vendor.business_name}</h1>
      <p>
        {vendor.cuisine ?? "Home cooking"}
        {vendor.pickup_city ? ` · ${vendor.pickup_city}` : ""}
        {vendor.verified_since ? ` · Verified cook since ${new Date(vendor.verified_since).getFullYear()}` : ""}
      </p>
      {heroUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={heroUrl} alt="" width={200} />
      ) : null}

      <p>
        {dishes.length} {dishes.length === 1 ? "dish" : "dishes"} on the menu
        {vendor.pickup_windows.length > 0
          ? ` · ${vendor.pickup_windows.length} pickup ${vendor.pickup_windows.length === 1 ? "window" : "windows"} a week`
          : ""}
      </p>

      {vendor.story ? <p>&ldquo;{vendor.story}&rdquo;</p> : null}

      <dl>
        <dt>Certification</dt>
        <dd>{vendor.certification_label ?? "On file"}</dd>
        <dt>Kitchen</dt>
        <dd>{vendor.kitchen_type ?? "Home kitchen"}</dd>
        <dt>Pickup</dt>
        <dd>{vendor.pickup_address_line ?? "By arrangement"}</dd>
      </dl>

      <Menu
        vendor={vendor}
        sections={sections}
        dishes={dishes}
        photos={photos}
        canOrder={canOrder}
      />

      <h2>Pickup windows</h2>
      {vendor.pickup_windows.length === 0 ? (
        <p>This cook hasn&apos;t published pickup times yet.</p>
      ) : (
        <ul>
          {vendor.pickup_windows.map((window) => (
            <li key={window.id}>
              {DAY_LABELS.get(window.day_of_week)} {formatTime(window.start_time)}–{formatTime(window.end_time)}
            </li>
          ))}
        </ul>
      )}

      <h2>Why {vendor.business_name.split(" ")[0]} is verified</h2>
      <ul>
        <li>{vendor.certification_label ?? "Food-handler certification"}</li>
        <li>Reviewed by a person</li>
        <li>Payouts verified — identity and bank details checked by Stripe</li>
        <li>12% platform fee set aside from your total</li>
      </ul>

      {canOrder ? (
        <p>
          <Link href="/checkout">Go to your basket</Link>
        </p>
      ) : (
        <p>
          {vendor.is_live
            ? "Ordering is unavailable right now."
            : "This kitchen isn't taking orders at the moment."}
        </p>
      )}
    </div>
  );
}

function Menu({
  vendor,
  sections,
  dishes,
  photos,
  canOrder,
}: {
  vendor: VendorWithMenu;
  sections: string[];
  dishes: MenuItem[];
  photos: Map<string, string | null>;
  canOrder: boolean;
}) {
  if (dishes.length === 0) {
    return <p>{vendor.business_name} hasn&apos;t posted any dishes yet. Check back soon.</p>;
  }

  return (
    <>
      {sections.map((section) => (
        <div key={section}>
          <h2>{section}</h2>
          <ul>
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
          </ul>
        </div>
      ))}
    </>
  );
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

  return (
    <li>
      <strong>{dish.name}</strong> — {formatPrice(dish.price_cents, currency)} per serving ·{" "}
      {dish.prep_note ?? (remaining !== null ? `${remaining} left` : "Made to order")}
      {dish.description ? <p>{dish.description}</p> : null}
      {dish.dietary_tags.length > 0 ? ` · ${dish.dietary_tags.map(dietaryLabel).join(", ")}` : ""}
      {dish.allergens.length > 0 ? ` · Contains ${dish.allergens.map(allergenLabel).join(", ").toLowerCase()}` : ""}
      {photoUrl ? (
        <>
          {" "}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="" width={80} />
        </>
      ) : null}

      {canOrder ? (
        <AddToCart
          vendorId={dish.vendor_id}
          menuItemId={dish.id}
          soldOut={remaining !== null && remaining <= 0}
          // The form's own cap; `create_order()` enforces the real one against
          // live stock at checkout.
          max={Math.min(remaining ?? CART_LIMITS.maxQuantity, CART_LIMITS.maxQuantity)}
        />
      ) : null}
    </li>
  );
}
