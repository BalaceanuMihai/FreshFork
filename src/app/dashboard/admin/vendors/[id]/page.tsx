import Link from "next/link";
import { notFound } from "next/navigation";

import { VendorDecisionForms } from "./VendorDecisionForms";
import { requireRole } from "@/lib/auth";
import { getMenuItems, getPickupWindows, getVendorById, signedCertUrl } from "@/lib/vendors-data";
import { formatPrice, formatTime } from "@/lib/format";
import { WEEKDAYS } from "@/lib/constants/taxonomy";

export const metadata = { title: "Review a cook · FreshFork" };

const DAY_LABELS = new Map(WEEKDAYS.map((d) => [d.value as number, d.label]));

export default async function AdminVendorDetailPage(props: PageProps<"/dashboard/admin/vendors/[id]">) {
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
    <div>
      <Link href="/dashboard/admin/vendors">← Back to queue</Link>

      <h1>{vendor.business_name}</h1>
      <p>
        {vendor.status.replace("_", " ")} · Stripe: {vendor.stripe_connect_status.replace("_", " ")}
        {vendor.is_live ? " · Live in search" : ""}
      </p>
      {vendor.is_live ? <p><Link href={`/vendor/${vendor.handle}`}>View public page</Link></p> : null}

      <dl>
        <dt>Cuisine</dt>
        <dd>{vendor.cuisine ?? "—"}</dd>
        <dt>Kitchen</dt>
        <dd>{vendor.kitchen_type ?? "—"}</dd>
        <dt>Pickup</dt>
        <dd>
          {vendor.pickup_address_line
            ? `${vendor.pickup_address_line}${vendor.pickup_city ? `, ${vendor.pickup_city}` : ""}`
            : "Not set"}
        </dd>
        <dt>Mapped</dt>
        <dd>{vendor.location ? "Geocoded ✓" : "No location"}</dd>
        <dt>Certification</dt>
        <dd>{vendor.certification_label ?? "—"}</dd>
        <dt>Certificate</dt>
        <dd>
          {certUrl ? (
            <a href={certUrl} target="_blank" rel="noreferrer">
              Open document →
            </a>
          ) : (
            "Not uploaded"
          )}
        </dd>
      </dl>

      {vendor.story ? (
        <>
          <h2>Their story</h2>
          <p>{vendor.story}</p>
        </>
      ) : null}

      <h2>Pickup windows ({windows.length})</h2>
      {windows.length === 0 ? (
        <p>None set yet.</p>
      ) : (
        <ul>
          {windows.map((window) => (
            <li key={window.id}>
              {DAY_LABELS.get(window.day_of_week)} {formatTime(window.start_time)}–{formatTime(window.end_time)}
            </li>
          ))}
        </ul>
      )}

      <h2>Menu ({items.length})</h2>
      {items.length === 0 ? (
        <p>No dishes yet.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              {item.name}
              {item.allergens.length > 0 ? ` · contains ${item.allergens.join(", ")}` : ""} —{" "}
              {formatPrice(item.price_cents)}
            </li>
          ))}
        </ul>
      )}

      <VendorDecisionForms vendor={vendor} />
    </div>
  );
}
