import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { getAllVendorsForAdmin } from "@/lib/vendors-data";
import type { Vendor, VendorStatus } from "@/lib/supabase/database.types";

export const metadata = { title: "Verification queue · FreshFork" };

const STATUS_LABEL: Record<VendorStatus, string> = {
  draft: "Draft",
  pending_review: "Awaiting review",
  changes_requested: "Changes requested",
  approved: "Approved",
  suspended: "Suspended",
};

export default async function AdminVendorsPage() {
  await requireRole("admin", "/dashboard/admin/vendors");
  const vendors = await getAllVendorsForAdmin();

  const queue = vendors.filter((v) => v.status === "pending_review" || v.status === "changes_requested");
  const rest = vendors.filter((v) => v.status !== "pending_review" && v.status !== "changes_requested");

  return (
    <div>
      <h1>Verification queue</h1>
      <p>Every cook is read by a person before their food reaches a neighbor.</p>

      <VendorTable title={`Waiting on you (${queue.length})`} vendors={queue} emptyCopy="Nothing waiting." />
      {rest.length > 0 ? <VendorTable title="Everyone else" vendors={rest} emptyCopy="" /> : null}
    </div>
  );
}

function VendorTable({ title, vendors, emptyCopy }: { title: string; vendors: Vendor[]; emptyCopy: string }) {
  return (
    <div>
      <h2>{title}</h2>
      {vendors.length === 0 ? (
        <p>{emptyCopy}</p>
      ) : (
        <ul>
          {vendors.map((vendor) => (
            <li key={vendor.id}>
              <Link href={`/dashboard/admin/vendors/${vendor.id}`}>{vendor.business_name}</Link> —{" "}
              {vendor.cuisine ?? "No cuisine set"}
              {vendor.pickup_city ? ` · ${vendor.pickup_city}` : ""} · {STATUS_LABEL[vendor.status]} ·{" "}
              {vendor.stripe_connect_status === "complete" ? "Stripe ready" : "Stripe pending"}
              {vendor.is_live ? " · Live" : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
