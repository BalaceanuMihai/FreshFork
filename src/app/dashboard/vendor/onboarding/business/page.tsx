import { BusinessForm } from "./BusinessForm";
import { getOwnVendor } from "@/lib/vendors-data";

export const metadata = { title: "Your kitchen · FreshFork" };

export default async function BusinessStepPage() {
  const vendor = await getOwnVendor();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold">Tell us about your kitchen.</h1>
        <p className="text-sm text-muted-foreground mt-0.5">This is what neighbors read before they order.</p>
      </div>
      <div className="bg-card rounded-2xl border border-border p-5">
        <BusinessForm vendor={vendor} />
      </div>
    </div>
  );
}
