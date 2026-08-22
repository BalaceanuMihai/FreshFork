import Link from "next/link";

import { SiteNav } from "@/components/marketplace/SiteNav";
import { Pill } from "@/components/marketplace/Pill";
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

  const queue = vendors.filter(
    (v) => v.status === "pending_review" || v.status === "changes_requested",
  );
  const rest = vendors.filter(
    (v) => v.status !== "pending_review" && v.status !== "changes_requested",
  );

  return (
    <div className="flex flex-1 flex-col">
      <SiteNav />
      <section className="mx-auto w-full max-w-[980px] px-6 py-14">
        <div className="flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-persimmon" aria-hidden />
          <span className="font-mono text-[11px] tracking-[0.18em] text-forest">
            ADMIN
          </span>
        </div>
        <h1 className="mt-5 font-display text-[42px] font-semibold leading-[1.06] tracking-[-0.02em] text-forest">
          Verification queue
        </h1>
        <p className="mt-3 max-w-xl text-[16px] leading-[1.55] text-ink-70">
          Every cook is read by a person before their food reaches a neighbor.
          Approving opens one of two gates — Stripe opens the other.
        </p>

        <VendorTable
          title={`Waiting on you (${queue.length})`}
          vendors={queue}
          emptyCopy="Nothing waiting. Good place to be."
        />

        {rest.length > 0 ? (
          <VendorTable title="Everyone else" vendors={rest} emptyCopy="" />
        ) : null}
      </section>
    </div>
  );
}

function VendorTable({
  title,
  vendors,
  emptyCopy,
}: {
  title: string;
  vendors: Vendor[];
  emptyCopy: string;
}) {
  return (
    <div className="mt-12 flex flex-col gap-4">
      <h2 className="font-display text-[22px] font-semibold tracking-tight text-forest">
        {title}
      </h2>

      {vendors.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-card px-6 py-10 text-center text-[15px] text-ink-70">
          {emptyCopy}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {vendors.map((vendor) => (
            <li key={vendor.id}>
              <Link
                href={`/dashboard/admin/vendors/${vendor.id}`}
                className="flex items-center gap-6 rounded-2xl border border-line bg-card px-5 py-4"
              >
                <div className="flex flex-1 flex-col gap-1">
                  <span className="font-display text-[18px] font-semibold text-forest">
                    {vendor.business_name}
                  </span>
                  <span className="text-[13px] text-ink-50">
                    {vendor.cuisine ?? "No cuisine set"}
                    {vendor.pickup_city ? ` · ${vendor.pickup_city}` : ""} · updated{" "}
                    {new Date(vendor.updated_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <Pill tone={vendor.status === "approved" ? "solid" : "outline"}>
                  {STATUS_LABEL[vendor.status]}
                </Pill>
                <Pill
                  tone={
                    vendor.stripe_connect_status === "complete" ? "ghost" : "outline"
                  }
                >
                  {vendor.stripe_connect_status === "complete"
                    ? "Stripe ready"
                    : "Stripe pending"}
                </Pill>
                {vendor.is_live ? <Pill tone="solid">Live</Pill> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
