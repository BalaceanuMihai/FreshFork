import { redirect } from "next/navigation";

import { OnboardingShell } from "@/components/vendor/OnboardingShell";
import { CertUploadForm } from "@/components/vendor/CertUploadForm";
import { getOwnVendor } from "@/lib/vendors-data";

export const metadata = { title: "Certification · FreshFork" };

export default async function CertStepPage() {
  const vendor = await getOwnVendor();
  if (!vendor) redirect("/dashboard/vendor/onboarding/business");

  return (
    <OnboardingShell
      vendor={vendor}
      current="cert"
      title="Show us your paperwork."
      intro="Verification is manual — a person on our team reads this. It is stored privately and never shown on your public profile."
    >
      <CertUploadForm vendor={vendor} />
    </OnboardingShell>
  );
}
