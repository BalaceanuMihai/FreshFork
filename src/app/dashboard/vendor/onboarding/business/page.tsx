import { BusinessForm } from "./BusinessForm";
import { getOwnVendor } from "@/lib/vendors-data";

export const metadata = { title: "Your kitchen · FreshFork" };

export default async function BusinessStepPage() {
  const vendor = await getOwnVendor();

  return (
    <div>
      <h1>Tell us about your kitchen.</h1>
      <p>This is what neighbors read before they order.</p>
      <BusinessForm vendor={vendor} />
    </div>
  );
}
