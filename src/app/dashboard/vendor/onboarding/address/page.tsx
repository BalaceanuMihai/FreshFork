import { AddressStepForm } from "./AddressStepForm";
import { getOwnVendor } from "@/lib/vendors-data";

export const metadata = { title: "Pickup address · FreshFork" };

export default async function AddressStepPage() {
  const vendor = await getOwnVendor();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold">Where do people pick up?</h1>
        <p className="text-sm text-muted-foreground mt-0.5">We map your kitchen so neighbors within range can find you.</p>
      </div>
      <div className="bg-card rounded-2xl border border-border p-5">
        <AddressStepForm vendor={vendor} />
      </div>
    </div>
  );
}
