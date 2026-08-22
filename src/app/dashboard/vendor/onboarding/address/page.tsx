import { OnboardingShell } from "@/components/vendor/OnboardingShell";
import { AddressForm } from "@/components/vendor/AddressForm";
import { getOwnVendor } from "@/lib/vendors-data";
import { features } from "@/lib/env";

export const metadata = { title: "Pickup address · FreshFork" };

export default async function AddressStepPage() {
  const vendor = await getOwnVendor();

  return (
    <OnboardingShell
      vendor={vendor}
      current="address"
      title="Where do people pick up?"
      intro="We map your kitchen so neighbors within range can find you. Your exact unit is never shown — only the street and the distance."
    >
      <AddressForm vendor={vendor} mapboxReady={features.mapbox} />
    </OnboardingShell>
  );
}
