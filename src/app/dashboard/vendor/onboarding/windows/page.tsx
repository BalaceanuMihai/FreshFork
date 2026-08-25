import { redirect } from "next/navigation";

import { WindowsForm } from "./WindowsForm";
import { getOwnVendor, getPickupWindows } from "@/lib/vendors-data";

export const metadata = { title: "Pickup hours · FreshFork" };

export default async function WindowsStepPage() {
  const vendor = await getOwnVendor();
  if (!vendor) redirect("/dashboard/vendor/onboarding/business");

  const windows = await getPickupWindows(vendor.id);

  return (
    <div>
      <h1>When can people collect?</h1>
      <p>Set the weekly rhythm you actually cook to.</p>
      <WindowsForm windows={windows} />
    </div>
  );
}
