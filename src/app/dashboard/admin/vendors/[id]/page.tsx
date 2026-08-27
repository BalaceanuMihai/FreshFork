import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";

import { VendorDecisionForms } from "./VendorDecisionForms";
import { requireRole } from "@/lib/auth";
import { getMenuItems, getPickupWindows, getVendorById, signedCertUrl } from "@/lib/vendors-data";
import { formatPrice, formatTime } from "@/lib/format";
import { WEEKDAYS } from "@/lib/constants/taxonomy";
import { StatusPill } from "@/components/ui/badge";

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
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <Link href="/dashboard/admin/vendors" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to queue
      </Link>

      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="font-display text-2xl font-semibold">{vendor.business_name}</h1>
        <StatusPill label={vendor.status.replace("_", " ")} tone="neutral" />
        {vendor.is_live ? <StatusPill label="Live in search" tone="success" /> : null}
      </div>

      <p className="text-sm text-muted-foreground">
        Stripe: {vendor.stripe_connect_status.replace("_", " ")}
        {vendor.is_live ? (
          <>
            {" · "}
            <Link href={`/vendor/${vendor.handle}`} className="text-primary hover:underline inline-flex items-center gap-1">
              View public page <ExternalLink className="w-3 h-3" />
            </Link>
          </>
        ) : null}
      </p>

      <div className="bg-card rounded-xl border border-border p-4 grid grid-cols-2 gap-4 text-sm">
        <InfoField label="Cuisine" value={vendor.cuisine ?? "—"} />
        <InfoField label="Kitchen" value={vendor.kitchen_type ?? "—"} />
        <InfoField
          label="Pickup"
          value={vendor.pickup_address_line ? `${vendor.pickup_address_line}${vendor.pickup_city ? `, ${vendor.pickup_city}` : ""}` : "Not set"}
        />
        <InfoField label="Mapped" value={vendor.location ? "Geocoded ✓" : "No location"} />
        <InfoField label="Certification" value={vendor.certification_label ?? "—"} />
        <div>
          <p className="text-xs text-muted-foreground">Certificate</p>
          {certUrl ? (
            <a href={certUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" /> Open document
            </a>
          ) : (
            <p className="text-sm">Not uploaded</p>
          )}
        </div>
      </div>

      {vendor.story ? (
        <div className="bg-card rounded-xl border border-border p-4 space-y-1">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Their story</h2>
          <p className="text-sm leading-relaxed">{vendor.story}</p>
        </div>
      ) : null}

      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pickup windows ({windows.length})</h2>
        {windows.length === 0 ? (
          <p className="text-sm text-muted-foreground">None set yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {windows.map((window) => (
              <li key={window.id} className="text-xs px-2.5 py-1 bg-secondary rounded-lg text-secondary-foreground border border-border">
                {DAY_LABELS.get(window.day_of_week)} {formatTime(window.start_time)}–{formatTime(window.end_time)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Menu ({items.length})</h2>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No dishes yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between text-sm bg-card rounded-lg border border-border px-3 py-2">
                <span>
                  {item.name}
                  {item.allergens.length > 0 ? (
                    <span className="text-xs text-muted-foreground"> · contains {item.allergens.join(", ")}</span>
                  ) : null}
                </span>
                <span className="text-muted-foreground shrink-0">{formatPrice(item.price_cents)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <VendorDecisionForms vendor={vendor} />
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}
