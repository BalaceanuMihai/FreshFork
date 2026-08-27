import { redirect } from "next/navigation";

import { CertForm } from "./CertForm";
import { getOwnVendor } from "@/lib/vendors-data";

export const metadata = { title: "Certification · FreshFork" };

export default async function CertStepPage() {
  const vendor = await getOwnVendor();
  if (!vendor) redirect("/dashboard/vendor/onboarding/business");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold">Show us your paperwork.</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Verification is manual — stored privately, never shown on your public profile.
        </p>
      </div>
      <div className="bg-card rounded-2xl border border-border p-5">
        <CertForm vendor={vendor} />
      </div>
    </div>
  );
}
