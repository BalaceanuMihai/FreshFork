import { AddressStepForm } from "./AddressStepForm";
import { getOwnVendor } from "@/lib/vendors-data";

export const metadata = { title: "Pickup address · FreshFork" };

export default async function AddressStepPage() {
  const vendor = await getOwnVendor();

  return (
    <div>
      <h1>Where do people pick up?</h1>
      <p>We map your kitchen so neighbors within range can find you.</p>
      <AddressStepForm vendor={vendor} />
    </div>
  );
}
