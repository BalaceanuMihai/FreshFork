import { redirect } from "next/navigation";

import { OnboardingShell } from "@/components/vendor/OnboardingShell";
import { PickupWindowsForm } from "@/components/vendor/PickupWindowsForm";
import { getOwnVendor, getPickupWindows } from "@/lib/vendors-data";

export const metadata = { title: "Pickup hours · FreshFork" };

export default async function WindowsStepPage() {
  const vendor = await getOwnVendor();
  if (!vendor) redirect("/dashboard/vendor/onboarding/business");

  const windows = await getPickupWindows(vendor.id);

  return (
    <OnboardingShell
      vendor={vendor}
      current="windows"
      title="When can people collect?"
      intro="Set the weekly rhythm you actually cook to. You can change it any time, and dishes can be switched off individually when you sell out."
    >
      <PickupWindowsForm windows={windows} />
    </OnboardingShell>
  );
}
