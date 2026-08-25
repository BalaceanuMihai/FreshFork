import Link from "next/link";

import { getMenuItems, getOwnVendor, publicPhotoUrl } from "@/lib/vendors-data";
import { deleteMenuItem, toggleMenuItemAvailability } from "@/lib/actions/menu";
import { formatPrice } from "@/lib/format";
import { dietaryLabel } from "@/lib/constants/taxonomy";
import { redirect } from "next/navigation";

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
    <div>
      <h1>Your menu — {vendor.business_name}</h1>
      <p>
        {vendor.is_live
          ? "These dishes are visible to neighbors right now."
          : "Add dishes now — they go public the moment your listing is approved."}
      </p>
      <p>
        <Link href="/dashboard/vendor/menu/new">Add a dish</Link>
      </p>

      {items.length === 0 ? (
        <p>No dishes yet. The first one takes about a minute.</p>
      ) : (
        sections.map((section) => (
          <div key={section}>
            <h2>{section}</h2>
            <ul>
              {withPhotos
                .filter(({ item }) => item.section === section)
                .map(({ item, photoUrl }) => (
                  <li key={item.id}>
                    {item.name}
                    {!item.is_available ? " (Hidden)" : ""} — {formatPrice(item.price_cents, vendor.currency)}
                    {item.quantity_available !== null ? ` · ${item.quantity_available} portions` : ""}
                    {item.prep_note ? ` · ${item.prep_note}` : ""}
                    {item.dietary_tags.length > 0 ? ` · ${item.dietary_tags.map(dietaryLabel).join(", ")}` : ""}
                    {photoUrl ? (
                      <>
                        {" "}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photoUrl} alt="" width={40} height={40} />
                      </>
                    ) : null}
                    {" — "}
                    <form action={toggleMenuItemAvailability} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="next" value={(!item.is_available).toString()} />
                      <button type="submit">{item.is_available ? "Hide" : "Show"}</button>
                    </form>{" "}
                    <Link href={`/dashboard/vendor/menu/${item.id}/edit`}>Edit</Link>{" "}
                    <form action={deleteMenuItem} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit">Delete</button>
                    </form>
                  </li>
                ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
