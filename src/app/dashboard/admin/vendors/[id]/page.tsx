import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteNav } from "@/components/marketplace/SiteNav";
import { Pill } from "@/components/marketplace/Pill";
import { VendorDecisionForms } from "@/components/admin/VendorDecisionForms";
import { requireRole } from "@/lib/auth";
import {
  getMenuItems,
  getPickupWindows,
  getVendorById,
  signedCertUrl,
} from "@/lib/vendors-data";
import { formatPrice, formatTime } from "@/lib/format";
import { WEEKDAYS } from "@/lib/constants/taxonomy";
import type { ReactNode } from "react";

export const metadata = { title: "Review a cook · FreshFork" };

const DAY_LABELS = new Map(WEEKDAYS.map((d) => [d.value as number, d.label]));

export default async function AdminVendorDetailPage(
  props: PageProps<"/dashboard/admin/vendors/[id]">,
) {
  await requireRole("admin", "/dashboard/admin/vendors");
  const { id } = await props.params;

  const vendor = await getVendorById(id);
  if (!vendor) notFound();

  const [certUrl, items, windows] = await Promise.all([
    signedCertUrl(vendor.cert_doc_path),
    getMenuItems(vendor.id),
    getPickupWindows(vendor.id),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <SiteNav />
      <section className="mx-auto w-full max-w-[980px] px-6 py-14">
        <Link href="/dashboard/admin/vendors" className="text-sm text-ink-70">
          ← Back to queue
        </Link>

        <div className="mt-6 flex items-start justify-between gap-8">
          <div className="flex flex-col gap-3">
            <h1 className="font-display text-[42px] font-semibold leading-[1.06] tracking-[-0.02em] text-forest">
              {vendor.business_name}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="outline">{vendor.status.replace("_", " ")}</Pill>
              <Pill
                tone={vendor.stripe_connect_status === "complete" ? "ghost" : "outline"}
              >
                Stripe: {vendor.stripe_connect_status.replace("_", " ")}
              </Pill>
              {vendor.is_live ? <Pill tone="solid">Live in search</Pill> : null}
            </div>
          </div>
          {vendor.is_live ? (
            <Link
              href={`/vendor/${vendor.handle}`}
              className="shrink-0 rounded-full border border-line px-5 py-2.5 text-[13px] font-medium text-forest"
            >
              View public page
            </Link>
          ) : null}
        </div>

        <div className="mt-12 flex items-start gap-10">
          <div className="flex flex-1 flex-col gap-10">
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line">
              <Row label="Cuisine" value={vendor.cuisine ?? "—"} />
              <Row label="Kitchen" value={vendor.kitchen_type ?? "—"} />
              <Row
                label="Pickup"
                value={
                  vendor.pickup_address_line
                    ? `${vendor.pickup_address_line}${
                        vendor.pickup_city ? `, ${vendor.pickup_city}` : ""
                      }`
                    : "Not set"
                }
              />
              <Row label="Mapped" value={vendor.location ? "Geocoded ✓" : "No location"} />
              <Row label="Certification" value={vendor.certification_label ?? "—"} />
              <Row
                label="Certificate"
                value={
                  certUrl ? (
                    <a
                      href={certUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-forest underline"
                    >
                      Open document →
                    </a>
                  ) : (
                    "Not uploaded"
                  )
                }
              />
            </dl>

            {vendor.story ? (
              <div className="flex flex-col gap-3">
                <h2 className="font-mono text-[11px] tracking-[0.12em] text-ink-50">
                  THEIR STORY
                </h2>
                <p className="text-[15px] leading-[1.6] text-ink-70">{vendor.story}</p>
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              <h2 className="font-mono text-[11px] tracking-[0.12em] text-ink-50">
                PICKUP WINDOWS ({windows.length})
              </h2>
              {windows.length === 0 ? (
                <p className="text-sm text-ink-70">None set yet.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {windows.map((window) => (
                    <li key={window.id}>
                      <Pill tone="outline">
                        {DAY_LABELS.get(window.day_of_week)} {formatTime(window.start_time)}
                        –{formatTime(window.end_time)}
                      </Pill>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <h2 className="font-mono text-[11px] tracking-[0.12em] text-ink-50">
                MENU ({items.length})
              </h2>
              {items.length === 0 ? (
                <p className="text-sm text-ink-70">No dishes yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-3"
                    >
                      <span className="text-sm text-forest">
                        <span className="font-medium">{item.name}</span>
                        {item.allergens.length > 0
                          ? ` · contains ${item.allergens.join(", ")}`
                          : ""}
                      </span>
                      <span className="font-mono text-[13px] text-forest">
                        {formatPrice(item.price_cents)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="w-[380px] shrink-0">
            <VendorDecisionForms vendor={vendor} />
          </div>
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 bg-card px-5 py-4">
      <dt className="font-mono text-[11px] tracking-[0.12em] text-ink-50">
        {label.toUpperCase()}
      </dt>
      <dd className="text-[14px] text-forest">{value}</dd>
    </div>
  );
}
