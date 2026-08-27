import { redirect } from "next/navigation";

import { WindowsForm } from "./WindowsForm";
import { getOwnVendor, getPickupWindows } from "@/lib/vendors-data";

export const metadata = { title: "Pickup hours · FreshFork" };

export default async function WindowsStepPage() {
  const vendor = await getOwnVendor();
  if (!vendor) redirect("/dashboard/vendor/onboarding/business");

  const windows = await getPickupWindows(vendor.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold">When can people collect?</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Set the weekly rhythm you actually cook to.</p>
      </div>
      <div className="bg-card rounded-2xl border border-border p-5">
        <WindowsForm windows={windows} />
      </div>
    </div>
  );
}
