import Link from "next/link";
import { redirect } from "next/navigation";

import { Pill } from "@/components/marketplace/Pill";
import { getMenuItems, getOwnVendor, publicPhotoUrl } from "@/lib/vendors-data";
import { deleteMenuItem, toggleMenuItemAvailability } from "@/lib/actions/menu";
import { formatPrice } from "@/lib/format";
import { dietaryLabel } from "@/lib/constants/taxonomy";

export const metadata = { title: "Your menu · FreshFork" };

export default async function MenuPage() {
  const vendor = await getOwnVendor();
  if (!vendor) redirect("/dashboard/vendor/onboarding/business");

  const items = await getMenuItems(vendor.id);
  const withPhotos = await Promise.all(
    items.map(async (item) => ({
      item,
      photoUrl: await publicPhotoUrl(item.photo_path),
    })),
  );

  const sections = [...new Set(items.map((i) => i.section))];

  return (
    <section className="mx-auto w-full max-w-[900px] px-6 py-14">
      <div className="flex items-start justify-between gap-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-persimmon" aria-hidden />
            <span className="font-mono text-[11px] tracking-[0.18em] text-forest">
              {vendor.business_name.toUpperCase()}
            </span>
          </div>
          <h1 className="font-display text-[42px] font-semibold leading-[1.06] tracking-[-0.02em] text-forest">
            Your menu
          </h1>
          <p className="max-w-lg text-[16px] leading-[1.55] text-ink-70">
            {vendor.is_live
              ? "These dishes are visible to neighbors right now."
              : "Add dishes now — they go public the moment your listing is approved."}
          </p>
        </div>
        <Link
          href="/dashboard/vendor/menu/new"
          className="shrink-0 rounded-full bg-forest px-6 py-3 text-sm font-semibold text-buttermilk"
        >
          Add a dish
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="mt-12 rounded-2xl border border-dashed border-line bg-card px-6 py-12 text-center text-[15px] text-ink-70">
          No dishes yet. The first one takes about a minute.
        </p>
      ) : (
        <div className="mt-12 flex flex-col gap-12">
          {sections.map((section) => (
            <div key={section} className="flex flex-col gap-4">
              <h2 className="font-display text-[22px] font-semibold tracking-tight text-forest">
                {section}
              </h2>
              <ul className="flex flex-col gap-3">
                {withPhotos
                  .filter(({ item }) => item.section === section)
                  .map(({ item, photoUrl }) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-5 rounded-2xl border border-line bg-card p-4"
                    >
                      <div
                        className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-line bg-straw-soft"
                        style={
                          photoUrl
                            ? {
                                backgroundImage: `url(${photoUrl})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }
                            : undefined
                        }
                        aria-hidden
                      />
                      <div className="flex flex-1 flex-col gap-1.5">
                        <div className="flex items-center gap-3">
                          <span className="font-display text-[18px] font-semibold text-forest">
                            {item.name}
                          </span>
                          {!item.is_available ? (
                            <Pill tone="outline">Hidden</Pill>
                          ) : null}
                        </div>
                        <span className="text-[13px] text-ink-50">
                          {formatPrice(item.price_cents)}
                          {item.quantity_available !== null
                            ? ` · ${item.quantity_available} portions`
                            : ""}
                          {item.prep_note ? ` · ${item.prep_note}` : ""}
                        </span>
                        {item.dietary_tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {item.dietary_tags.map((tag) => (
                              <Pill key={tag} tone="ghost">
                                {dietaryLabel(tag)}
                              </Pill>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <form action={toggleMenuItemAvailability}>
                          <input type="hidden" name="id" value={item.id} />
                          <input
                            type="hidden"
                            name="next"
                            value={(!item.is_available).toString()}
                          />
                          <button
                            type="submit"
                            className="rounded-full border border-line px-4 py-2 text-[13px] font-medium text-forest"
                          >
                            {item.is_available ? "Hide" : "Show"}
                          </button>
                        </form>
                        <Link
                          href={`/dashboard/vendor/menu/${item.id}/edit`}
                          className="text-[13px] font-medium text-forest underline"
                        >
                          Edit
                        </Link>
                        <form action={deleteMenuItem}>
                          <input type="hidden" name="id" value={item.id} />
                          <button
                            type="submit"
                            className="text-[13px] font-medium text-persimmon"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
