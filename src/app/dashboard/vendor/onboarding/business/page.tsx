import { OnboardingShell } from "@/components/vendor/OnboardingShell";
import { BusinessInfoForm } from "@/components/vendor/BusinessInfoForm";
import { getOwnVendor } from "@/lib/vendors-data";

export const metadata = { title: "Your kitchen · FreshFork" };

export default async function BusinessStepPage() {
  const vendor = await getOwnVendor();

  return (
    <OnboardingShell
      vendor={vendor}
      current="business"
      title="Tell us about your kitchen."
      intro="This is what neighbors read before they order. Keep it honest and specific — the story is what sells the food."
    >
      <BusinessInfoForm vendor={vendor} />
    </OnboardingShell>
  );
}
