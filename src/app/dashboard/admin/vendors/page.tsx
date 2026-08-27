import Link from "next/link";
import { BadgeCheck } from "lucide-react";

import { requireRole } from "@/lib/auth";
import { getAllVendorsForAdmin } from "@/lib/vendors-data";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill, type StatusTone } from "@/components/ui/badge";
import type { Vendor, VendorStatus } from "@/lib/supabase/database.types";

export const metadata = { title: "Verification queue · FreshFork" };

const STATUS_LABEL: Record<VendorStatus, string> = {
  draft: "Draft",
  pending_review: "Awaiting review",
  changes_requested: "Changes requested",
  approved: "Approved",
  suspended: "Suspended",
};

const STATUS_TONE: Record<VendorStatus, StatusTone> = {
  draft: "neutral",
  pending_review: "warning",
  changes_requested: "info",
  approved: "success",
  suspended: "danger",
};

export default async function AdminVendorsPage() {
  await requireRole("admin", "/dashboard/admin/vendors");
  const vendors = await getAllVendorsForAdmin();

  const queue = vendors.filter((v) => v.status === "pending_review" || v.status === "changes_requested");
  const rest = vendors.filter((v) => v.status !== "pending_review" && v.status !== "changes_requested");

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Verification queue</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Every cook is read by a person before their food reaches a neighbor.</p>
      </div>

      <VendorTable title={`Waiting on you (${queue.length})`} vendors={queue} emptyCopy="Nothing waiting." />
      {rest.length > 0 ? <VendorTable title="Everyone else" vendors={rest} emptyCopy="" /> : null}
    </div>
  );
}

function VendorTable({ title, vendors, emptyCopy }: { title: string; vendors: Vendor[]; emptyCopy: string }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h2>
      {vendors.length === 0 ? (
        emptyCopy ? <EmptyState icon={BadgeCheck} title="All caught up" body={emptyCopy} /> : null
      ) : (
        <div className="space-y-2">
          {vendors.map((vendor) => (
            <Link
              key={vendor.id}
              href={`/dashboard/admin/vendors/${vendor.id}`}
              className="flex items-center justify-between gap-3 bg-card rounded-xl border border-border p-4 hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{vendor.business_name}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {vendor.cuisine ?? "No cuisine set"}
                  {vendor.pickup_city ? ` · ${vendor.pickup_city}` : ""} ·{" "}
                  {vendor.stripe_connect_status === "complete" ? "Stripe ready" : "Stripe pending"}
                  {vendor.is_live ? " · Live" : ""}
                </p>
              </div>
              <StatusPill label={STATUS_LABEL[vendor.status]} tone={STATUS_TONE[vendor.status]} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
