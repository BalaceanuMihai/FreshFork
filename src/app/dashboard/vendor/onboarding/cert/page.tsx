import { redirect } from "next/navigation";

import { CertForm } from "./CertForm";
import { getOwnVendor } from "@/lib/vendors-data";

export const metadata = { title: "Certification · FreshFork" };

export default async function CertStepPage() {
  const vendor = await getOwnVendor();
  if (!vendor) redirect("/dashboard/vendor/onboarding/business");

  return (
    <div>
      <h1>Show us your paperwork.</h1>
      <p>Verification is manual — stored privately, never shown on your public profile.</p>
      <CertForm vendor={vendor} />
    </div>
  );
}
